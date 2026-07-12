import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle.constants';
import { nextCode } from '../../../common/sequence.util';
import { customerProfiles } from '../../customers/customers.schema';
import { equipmentUnits } from '../../inventory/inventory.schema';
import { products } from '../../catalog/catalog.schema';
import { machineDetails } from '../../catalog/machines/machines.schema';
import { grinderDetails } from '../../catalog/grinders/grinders.schema';
import { orders } from '../../orders/orders.schema';
import { warranties } from './warranty.schema';
import type { RegisterWarrantyDto } from './dto/register-warranty.dto';

@Injectable()
export class WarrantyService {
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

  private mapWarranty(row: {
    id: string;
    warrantyNumber: string;
    serialNumber: string;
    startsAt: string;
    endsAt: string;
    productName: string | null;
  }) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: row.id,
      warrantyNumber: row.warrantyNumber,
      serialNumber: row.serialNumber,
      productName: row.productName,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isActive: today <= row.endsAt,
    };
  }

  async register(userId: string, dto: RegisterWarrantyDto) {
    const profile = await this.getProfile(userId);

    const unit = await this.db.query.equipmentUnits.findFirst({
      where: eq(equipmentUnits.serialNumber, dto.serialNumber),
    });
    if (!unit) {
      throw new NotFoundException('Nomor seri tidak ditemukan');
    }
    if (unit.status !== 'sold') {
      throw new BadRequestException('Unit belum terjual');
    }
    const existing = await this.db.query.warranties.findFirst({
      where: eq(warranties.equipmentUnitId, unit.id),
    });
    if (existing) {
      throw new ConflictException('Unit ini sudah teregistrasi garansi');
    }

    if (dto.orderId) {
      const order = await this.db.query.orders.findFirst({
        where: eq(orders.id, dto.orderId),
      });
      if (!order || order.customerId !== profile.id) {
        throw new BadRequestException('Order tidak ditemukan');
      }
    }

    const product = await this.db.query.products.findFirst({
      where: eq(products.id, unit.productId),
    });
    if (!product) {
      throw new NotFoundException('Produk unit ini tidak ditemukan');
    }
    let warrantyMonths: number | undefined;
    if (product.type === 'machine') {
      const detail = await this.db.query.machineDetails.findFirst({
        where: eq(machineDetails.productId, product.id),
      });
      warrantyMonths = detail?.warrantyMonths;
    } else if (product.type === 'grinder') {
      const detail = await this.db.query.grinderDetails.findFirst({
        where: eq(grinderDetails.productId, product.id),
      });
      warrantyMonths = detail?.warrantyMonths;
    }
    if (warrantyMonths === undefined) {
      throw new BadRequestException('Produk ini tidak punya masa garansi');
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + warrantyMonths);
    const startsAtStr = startsAt.toISOString().slice(0, 10);
    const endsAtStr = endsAt.toISOString().slice(0, 10);

    const warranty = await this.db.transaction(async (tx) => {
      const warrantyNumber = await nextCode(tx, {
        prefix: 'WRT',
        scope: 'global',
        width: 6,
        counter: 'warranty',
      });
      const [row] = await tx
        .insert(warranties)
        .values({
          warrantyNumber,
          equipmentUnitId: unit.id,
          customerId: profile.id,
          orderId: dto.orderId,
          serialNumber: dto.serialNumber,
          startsAt: startsAtStr,
          endsAt: endsAtStr,
        })
        .returning();
      return row;
    });

    return this.mapWarranty({ ...warranty, productName: product.name });
  }

  async listMine(userId: string) {
    const profile = await this.getProfile(userId);
    const rows = await this.db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        serialNumber: warranties.serialNumber,
        startsAt: warranties.startsAt,
        endsAt: warranties.endsAt,
        productId: equipmentUnits.productId,
        productName: products.name,
      })
      .from(warranties)
      .innerJoin(
        equipmentUnits,
        eq(warranties.equipmentUnitId, equipmentUnits.id),
      )
      .innerJoin(products, eq(equipmentUnits.productId, products.id))
      .where(eq(warranties.customerId, profile.id));
    return { data: rows.map((r) => this.mapWarranty(r)) };
  }
}
