import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constants';
import type {
  DrizzleDB,
  DrizzleDbOrTx,
} from '../../../database/drizzle.constants';
import { nextCode } from '../../../common/sequence.util';
import { customerProfiles } from '../../customers/customers.schema';
import { orders } from '../../orders/orders.schema';
import { OrdersService } from '../../orders/orders.service';
import { PaymentsService } from '../../payments/payments.service';
import { drivers } from '../drivers/drivers.schema';
import { codSettlements, deliveries, deliveryEvents } from './dispatch.schema';
import type {
  AssignDeliveryDto,
  CreateCodSettlementDto,
  UpdateDeliveryStatusDto,
} from './dto/dispatch.dto';

type DeliveryStatus =
  'pending' | 'assigned' | 'picked_up' | 'en_route' | 'delivered' | 'failed';

const TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['assigned'],
  assigned: ['picked_up', 'pending'],
  picked_up: ['en_route'],
  en_route: ['delivered', 'failed'],
  failed: ['assigned'],
  delivered: [],
};

@Injectable()
export class DispatchService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private async mapDelivery(delivery: typeof deliveries.$inferSelect) {
    const driver = delivery.driverId
      ? await this.db.query.drivers.findFirst({
          where: eq(drivers.id, delivery.driverId),
        })
      : null;
    return {
      id: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      orderId: delivery.orderId,
      status: delivery.status,
      driver: driver
        ? { id: driver.id, name: driver.name, phone: driver.phone }
        : null,
      scheduledSlot: delivery.scheduledSlot,
      deliveredAt: delivery.deliveredAt,
      codAmount: delivery.codAmount,
      codCollectedAt: delivery.codCollectedAt,
    };
  }

  /** Dipanggil OrdersService saat checkout (order delivery + zona internal) — via DI, dalam transaksi checkout. */
  async createForOrder(
    orderId: string,
    zoneId: string,
    codAmount: number | null,
    tx: DrizzleDbOrTx = this.db,
  ) {
    const deliveryNumber = await nextCode(tx, {
      prefix: 'DLV',
      scope: 'daily',
      width: 4,
      counter: 'delivery',
    });
    const [delivery] = await tx
      .insert(deliveries)
      .values({ deliveryNumber, orderId, zoneId, codAmount })
      .returning();
    return delivery;
  }

  async listDispatchBoard(status?: string) {
    const where = status
      ? eq(deliveries.status, status as DeliveryStatus)
      : undefined;
    const rows = await this.db
      .select({
        delivery: deliveries,
        orderNumber: orders.orderNumber,
        deliveryAddress: orders.deliveryAddress,
      })
      .from(deliveries)
      .innerJoin(orders, eq(deliveries.orderId, orders.id))
      .where(where)
      .orderBy(desc(deliveries.createdAt));

    return Promise.all(
      rows.map(async (row) => ({
        ...(await this.mapDelivery(row.delivery)),
        order: { orderNumber: row.orderNumber, address: row.deliveryAddress },
      })),
    );
  }

  async assign(deliveryId: string, dto: AssignDeliveryDto) {
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.id, deliveryId),
    });
    if (!delivery) {
      throw new NotFoundException('Delivery tidak ditemukan');
    }
    if (!TRANSITIONS[delivery.status].includes('assigned')) {
      throw new ConflictException(
        `Delivery status ${delivery.status} tidak bisa di-assign`,
      );
    }
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.id, dto.driverId),
    });
    if (!driver) {
      throw new NotFoundException('Driver tidak ditemukan');
    }
    if (!driver.isAvailable) {
      throw new ConflictException('Driver sedang tidak tersedia');
    }

    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(deliveries)
        .set({
          driverId: dto.driverId,
          scheduledSlot: dto.scheduledSlot,
          assignedAt: new Date(),
          status: 'assigned',
        })
        .where(eq(deliveries.id, deliveryId))
        .returning();
      await tx
        .insert(deliveryEvents)
        .values({ deliveryId, status: 'assigned' });
      return row;
    });
    return this.mapDelivery(updated);
  }

  async updateStatus(
    deliveryId: string,
    userId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
    });
    if (!driver) {
      throw new NotFoundException('Profil driver tidak ditemukan');
    }
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.id, deliveryId),
    });
    if (!delivery) {
      throw new NotFoundException('Delivery tidak ditemukan');
    }
    if (delivery.driverId !== driver.id) {
      throw new ForbiddenException('Bukan job Anda');
    }
    const current = delivery.status;
    if (!TRANSITIONS[current].includes(dto.status)) {
      throw new ConflictException(
        `Transisi status ${current} -> ${dto.status} tidak diizinkan`,
      );
    }
    if (
      dto.status === 'delivered' &&
      delivery.codAmount !== null &&
      !delivery.codCollectedAt
    ) {
      throw new ConflictException(
        'COD belum dikonfirmasi, tidak bisa set delivered',
      );
    }

    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(deliveries)
        .set({
          status: dto.status,
          deliveredAt:
            dto.status === 'delivered' ? new Date() : delivery.deliveredAt,
        })
        .where(eq(deliveries.id, deliveryId))
        .returning();
      await tx.insert(deliveryEvents).values({
        deliveryId,
        status: dto.status,
        lat: dto.lat,
        lng: dto.lng,
        note: dto.note,
      });

      if (dto.status === 'delivered') {
        await this.ordersService.changeStatus(
          delivery.orderId,
          'delivered',
          userId,
          undefined,
          tx,
        );
      }
      return row;
    });
    return this.mapDelivery(updated);
  }

  async trackByOrderId(orderId: string, userId: string, isStaff: boolean) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    if (!isStaff) {
      const profile = await this.db.query.customerProfiles.findFirst({
        where: eq(customerProfiles.userId, userId),
      });
      if (!profile || order.customerId !== profile.id) {
        throw new NotFoundException('Order tidak ditemukan');
      }
    }
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.orderId, orderId),
    });
    if (!delivery) {
      throw new NotFoundException('Delivery untuk order ini tidak ditemukan');
    }
    const events = await this.db
      .select({
        status: deliveryEvents.status,
        note: deliveryEvents.note,
        createdAt: deliveryEvents.createdAt,
      })
      .from(deliveryEvents)
      .where(eq(deliveryEvents.deliveryId, delivery.id))
      .orderBy(deliveryEvents.createdAt);

    return { delivery: await this.mapDelivery(delivery), events };
  }

  async listDriverJobs(userId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
    });
    if (!driver) {
      throw new NotFoundException('Profil driver tidak ditemukan');
    }
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.driverId, driver.id))
      .orderBy(desc(deliveries.createdAt));
    return Promise.all(rows.map((row) => this.mapDelivery(row)));
  }

  async codCollect(deliveryId: string, userId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
    });
    if (!driver) {
      throw new NotFoundException('Profil driver tidak ditemukan');
    }
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.id, deliveryId),
    });
    if (!delivery) {
      throw new NotFoundException('Delivery tidak ditemukan');
    }
    if (delivery.driverId !== driver.id) {
      throw new ForbiddenException('Bukan job Anda');
    }
    if (delivery.codAmount === null) {
      throw new ConflictException('Bukan delivery COD');
    }
    if (delivery.codCollectedAt) {
      throw new ConflictException('COD sudah dikonfirmasi sebelumnya');
    }

    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(deliveries)
        .set({ codCollectedAt: new Date() })
        .where(eq(deliveries.id, deliveryId))
        .returning();
      await this.paymentsService.markCodPaid(delivery.orderId, tx);
      return row;
    });
    return this.mapDelivery(updated);
  }

  async driverCodBalance(userId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
    });
    if (!driver) {
      throw new NotFoundException('Profil driver tidak ditemukan');
    }
    return this.codBalanceForDriverId(driver.id);
  }

  /** Dipakai CMS staff (halaman Setoran COD step 09) — preview saldo per driver sebelum bikin settlement. */
  async codBalanceForDriver(driverId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(drivers.id, driverId),
    });
    if (!driver) {
      throw new NotFoundException('Driver tidak ditemukan');
    }
    return this.codBalanceForDriverId(driverId);
  }

  private async codBalanceForDriverId(driverId: string) {
    const rows = await this.db
      .select({
        deliveryNumber: deliveries.deliveryNumber,
        codAmount: deliveries.codAmount,
        codCollectedAt: deliveries.codCollectedAt,
      })
      .from(deliveries)
      .where(
        and(
          eq(deliveries.driverId, driverId),
          isNotNull(deliveries.codCollectedAt),
          isNull(deliveries.codSettlementId),
        ),
      );
    const balance = rows.reduce((sum, r) => sum + (r.codAmount ?? 0), 0);
    return { balance, deliveries: rows };
  }

  async createCodSettlement(dto: CreateCodSettlementDto) {
    const unsettled = await this.db
      .select()
      .from(deliveries)
      .where(
        and(
          eq(deliveries.driverId, dto.driverId),
          isNotNull(deliveries.codCollectedAt),
          isNull(deliveries.codSettlementId),
        ),
      );
    if (unsettled.length === 0) {
      throw new ConflictException('Tidak ada uang yang perlu disetor');
    }
    const amount = unsettled.reduce((sum, d) => sum + (d.codAmount ?? 0), 0);

    return this.db.transaction(async (tx) => {
      const settlementNumber = await nextCode(tx, {
        prefix: 'STL',
        scope: 'daily',
        width: 2,
        counter: 'cod_settlement',
      });
      const [settlement] = await tx
        .insert(codSettlements)
        .values({
          settlementNumber,
          driverId: dto.driverId,
          amount,
          status: 'pending',
        })
        .returning();
      await tx
        .update(deliveries)
        .set({ codSettlementId: settlement.id })
        .where(
          and(
            eq(deliveries.driverId, dto.driverId),
            isNotNull(deliveries.codCollectedAt),
            isNull(deliveries.codSettlementId),
          ),
        );
      return settlement;
    });
  }

  async confirmCodSettlement(id: string, confirmedByUserId: string) {
    const settlement = await this.db.query.codSettlements.findFirst({
      where: eq(codSettlements.id, id),
    });
    if (!settlement) {
      throw new NotFoundException('Settlement tidak ditemukan');
    }
    if (settlement.status === 'confirmed') {
      throw new ConflictException('Settlement sudah dikonfirmasi');
    }
    const [updated] = await this.db
      .update(codSettlements)
      .set({
        status: 'confirmed',
        confirmedBy: confirmedByUserId,
        confirmedAt: new Date(),
      })
      .where(eq(codSettlements.id, id))
      .returning();
    return updated;
  }

  /** Dipakai CMS staff (halaman Setoran COD step 09) — riwayat settlement, opsional per driver. */
  async listCodSettlements(driverId?: string) {
    const where = driverId ? eq(codSettlements.driverId, driverId) : undefined;
    return this.db
      .select()
      .from(codSettlements)
      .where(where)
      .orderBy(desc(codSettlements.createdAt));
  }
}
