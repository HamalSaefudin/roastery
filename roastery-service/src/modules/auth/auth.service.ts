import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { DRIZZLE } from '../../database/drizzle.constants';
import type {
  DrizzleDB,
  DrizzleDbOrTx,
} from '../../database/drizzle.constants';
import { refreshTokens, users } from './auth.schema';
import { REFRESH_TOKEN_TTL_MS } from './auth.constants';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

const BCRYPT_COST = 10;

type User = typeof users.$inferSelect;

interface AuthResult {
  user: { id: string; email: string; role: string; status: string };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const [user] = await this.db
      .insert(users)
      .values({
        email: dto.email,
        passwordHash,
        role: 'retail',
        status: 'active',
      })
      .returning();

    const tokens = await this.issueTokens(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Akun disuspend');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async refresh(refreshTokenRaw: string | undefined): Promise<AuthResult> {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException('Refresh token tidak ada');
    }

    const tokenHash = this.hashToken(refreshTokenRaw);
    const existing = await this.db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });
    if (!existing) {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau kedaluwarsa',
      );
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, existing.userId),
    });
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const tokens = await this.db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, existing.id));
      return this.issueTokens(user, tx);
    });

    return { user: this.toSafeUser(user), ...tokens };
  }

  async logout(refreshTokenRaw: string | undefined): Promise<void> {
    if (!refreshTokenRaw) {
      return;
    }
    const tokenHash = this.hashToken(refreshTokenRaw);
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async getMe(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }
    if (user.status === 'suspended') {
      throw new ForbiddenException('Akun disuspend');
    }
    return this.toSafeUser(user);
  }

  private async issueTokens(
    user: User,
    tx: DrizzleDbOrTx = this.db,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenRaw = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await tx
      .insert(refreshTokens)
      .values({ userId: user.id, tokenHash, expiresAt });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }
}
