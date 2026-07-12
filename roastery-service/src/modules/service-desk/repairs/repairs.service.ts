import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { nextCode } from '../../../common/sequence.util';
import { users } from '../../auth/auth.schema';
import { customerProfiles } from '../../customers/customers.schema';
import { equipmentUnits } from '../../inventory/inventory.schema';
import { warranties } from '../warranty/warranty.schema';
import { repairTickets, repairUpdates } from './repairs.schema';
import type { CreateRepairDto } from './dto/create-repair.dto';
import type { UpdateRepairDto } from './dto/update-repair.dto';

type RepairStatus =
  | 'open'
  | 'diagnosing'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'cancelled';

const TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  open: ['diagnosing', 'cancelled'],
  diagnosing: ['in_progress', 'cancelled'],
  in_progress: ['waiting_parts', 'completed'],
  waiting_parts: ['in_progress'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class RepairsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async getProfile(userId: string) {
    const profile = await this.db.query.customerProfiles.findFirst({
      where: eq(customerProfiles.userId, userId),
    });
    if (!profile) {
      throw new NotFoundException('Profil customer tidak ditemukan');
    }
    return profile;
  }

  async create(userId: string, dto: CreateRepairDto) {
    const profile = await this.getProfile(userId);

    let equipmentUnitId: string | undefined;
    if (dto.serialNumber) {
      const unit = await this.db.query.equipmentUnits.findFirst({
        where: eq(equipmentUnits.serialNumber, dto.serialNumber),
      });
      if (!unit) {
        throw new NotFoundException('Nomor seri tidak ditemukan');
      }
      equipmentUnitId = unit.id;
    }

    let isWarranty = false;
    let warrantyId: string | undefined;
    if (dto.warrantyId) {
      const warranty = await this.db.query.warranties.findFirst({
        where: eq(warranties.id, dto.warrantyId),
      });
      const today = new Date().toISOString().slice(0, 10);
      if (
        warranty &&
        warranty.customerId === profile.id &&
        today <= warranty.endsAt
      ) {
        isWarranty = true;
        warrantyId = warranty.id;
      }
      // Klaim tidak valid (bukan milik sendiri / kadaluarsa / tidak ada) -> tiket tetap dibuat, is_warranty=false.
    }

    const ticket = await this.db.transaction(async (tx) => {
      const ticketNumber = await nextCode(tx, {
        prefix: 'RPR',
        scope: 'daily',
        width: 3,
        counter: 'repair_ticket',
      });
      const [row] = await tx
        .insert(repairTickets)
        .values({
          ticketNumber,
          customerId: profile.id,
          equipmentUnitId,
          warrantyId,
          isWarranty,
          issue: dto.issue,
          status: 'open',
        })
        .returning();
      await tx
        .insert(repairUpdates)
        .values({ ticketId: row.id, status: 'open' });
      return row;
    });

    return { ticket };
  }

  async listMine(userId: string) {
    const profile = await this.getProfile(userId);
    const rows = await this.db
      .select()
      .from(repairTickets)
      .where(eq(repairTickets.customerId, profile.id))
      .orderBy(desc(repairTickets.createdAt));
    return { data: rows };
  }

  async listAdmin(
    status: string | undefined,
    assignedTo: string | undefined,
    page: number,
    limit: number,
  ) {
    const conditions: SQL[] = [];
    if (status)
      conditions.push(eq(repairTickets.status, status as RepairStatus));
    if (assignedTo) conditions.push(eq(repairTickets.assignedTo, assignedTo));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(repairTickets)
        .where(where)
        .orderBy(desc(repairTickets.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(repairTickets)
        .where(where),
    ]);
    return { data: rows, total: totalRows[0]?.count ?? 0 };
  }

  async update(id: string, dto: UpdateRepairDto) {
    const existing = await this.db.query.repairTickets.findFirst({
      where: eq(repairTickets.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }
    const current = existing.status;
    if (dto.status && !TRANSITIONS[current].includes(dto.status)) {
      throw new ConflictException(
        `Transisi status ${current} -> ${dto.status} tidak diizinkan`,
      );
    }
    if (dto.cost !== undefined && existing.isWarranty) {
      throw new BadRequestException(
        'Servis garansi gratis, tidak boleh ada biaya',
      );
    }
    if (dto.assignedTo) {
      const technician = await this.db.query.users.findFirst({
        where: eq(users.id, dto.assignedTo),
      });
      if (!technician) {
        throw new NotFoundException('User teknisi tidak ditemukan');
      }
    }

    return this.db.transaction(async (tx) => {
      const patch: Partial<typeof repairTickets.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (dto.status) patch.status = dto.status;
      if (dto.assignedTo !== undefined) patch.assignedTo = dto.assignedTo;
      if (dto.cost !== undefined) patch.cost = dto.cost;
      if (dto.scheduledAt !== undefined)
        patch.scheduledAt = new Date(dto.scheduledAt);

      const [ticket] = await tx
        .update(repairTickets)
        .set(patch)
        .where(eq(repairTickets.id, id))
        .returning();
      await tx.insert(repairUpdates).values({
        ticketId: id,
        status: dto.status ?? current,
        note: dto.note,
        parts: dto.parts,
      });
      return { ticket };
    });
  }
}
