import type {
  PrismaClient,
  EmailVerificationToken as PrismaEmailVerificationToken,
  PasswordResetToken as PrismaPasswordResetToken,
  RefreshToken as PrismaRefreshToken,
  User as PrismaUser,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

import type {
  AuthRepository,
  CreateUserInput,
  RefreshTokenWithUser,
  SaveRefreshTokenInput,
} from "./auth-repository";
import type {
  AuditEventInput,
  AuthUser,
  AuthUserWithSecrets,
  EmailVerificationTokenRecord,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
} from "../domain/models";

function mapUser(user: PrismaUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    planTier: user.planTier,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    timezone: user.timezone,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function mapRefreshToken(record: PrismaRefreshToken): RefreshTokenRecord {
  return {
    id: record.id,
    userId: record.userId,
    tokenHash: record.tokenHash,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    replacedByTokenId: record.replacedByTokenId ?? null,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
  };
}

function mapEmailToken(record: PrismaEmailVerificationToken): EmailVerificationTokenRecord {
  return {
    id: record.id,
    userId: record.userId,
    token: record.token,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
    createdAt: record.createdAt,
  };
}

function mapPasswordResetToken(record: PrismaPasswordResetToken): PasswordResetTokenRecord {
  return {
    id: record.id,
    userId: record.userId,
    token: record.token,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
    createdAt: record.createdAt,
  };
}


export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          planTier: input.planTier,
          firstName: input.firstName,
          lastName: input.lastName,
          timezone: input.timezone,
        },
      });

      await tx.passwordCredential.create({
        data: {
          userId: created.id,
          passwordHash: input.passwordHash,
        },
      });

      return created;
    });

    return mapUser(user);
  }

  async findUserByEmail(email: string): Promise<AuthUserWithSecrets | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { passwordCredential: true },
    });

    if (!user || !user.passwordCredential) {
      return null;
    }

    return {
      ...mapUser(user),
      passwordHash: user.passwordCredential.passwordHash,
    };
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async markEmailVerified(userId: string, verifiedAt: Date): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: verifiedAt,
        status: "active",
      },
    });

    return mapUser(user);
  }

  async saveEmailVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<EmailVerificationTokenRecord> {
    const record = await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return mapEmailToken(record);
  }

  async consumeEmailVerificationToken(
    token: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || record.consumedAt) {
      return null;
    }

    const consumedAt = new Date();

    if (record.expiresAt.getTime() < consumedAt.getTime()) {
      return null;
    }

    const updated = await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt },
    });

    return mapEmailToken(updated);
  }

  async saveRefreshToken(input: SaveRefreshTokenInput): Promise<RefreshTokenRecord> {
    const record = await this.prisma.refreshToken.create({
      data: {
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    return mapRefreshToken(record);
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenWithUser | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!record) {
      return null;
    }

    return {
      ...mapRefreshToken(record),
      user: mapUser(record.user),
    };
  }

  async revokeRefreshToken(
    id: string,
    revokedAt: Date,
    replacedByTokenId?: string | null,
  ): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt,
        replacedByTokenId: replacedByTokenId ?? null,
      },
    });
  }

  async revokeRefreshTokensForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetTokenRecord> {
    const record = await this.prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return mapPasswordResetToken(record);
  }

  async consumePasswordResetToken(
    token: string,
    consumedAt: Date,
  ): Promise<PasswordResetTokenRecord | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.consumedAt) {
      return null;
    }

    if (record.expiresAt.getTime() < consumedAt.getTime()) {
      return null;
    }

    const updated = await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt },
    });

    return mapPasswordResetToken(updated);
  }

  async updatePasswordHash(userId: string, passwordHash: string, when: Date): Promise<void> {
    await this.prisma.passwordCredential.update({
      where: { userId },
      data: {
        passwordHash,
        updatedAt: when,
      },
    });
  }

  async updateLastLogin(userId: string, when: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: when },
    });
  }

  async createAuditEvent(event: AuditEventInput): Promise<void> {
    const metadataValue =
      event.metadata === undefined || event.metadata === null
        ? Prisma.DbNull
        : (event.metadata as Prisma.JsonObject);

    await this.prisma.auditEvent.create({
      data: {
        userId: event.userId ?? null,
        actor: event.actor,
        action: event.action,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: metadataValue,
      },
    });
  }
}
