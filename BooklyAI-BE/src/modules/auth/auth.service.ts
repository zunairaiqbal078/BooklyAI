import bcrypt from "bcryptjs";
import type { Prisma, User, UserRole } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import type { AuthUser } from "../../types/index.js";
import { ConflictError, UnauthorizedError } from "../../utils/app-error.js";
import { signAccessToken } from "../../utils/jwt.js";
import { slugify } from "../../utils/slug.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

const BCRYPT_ROUNDS = 12;

type DbClient = Prisma.TransactionClient | typeof prisma;

function toAuthUser(
  user: Pick<User, "id" | "email" | "name" | "role">,
  business: { id: string; onboardingComplete: boolean } | null,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessId: business?.id ?? null,
    onboardingComplete: user.role === "BUSINESS" ? (business?.onboardingComplete ?? false) : null,
  };
}

async function resolveBusiness(
  userId: string,
  role: UserRole,
  db: DbClient = prisma,
): Promise<{ id: string; onboardingComplete: boolean } | null> {
  if (role !== "BUSINESS") {
    return null;
  }

  const business = await db.business.findUnique({
    where: { ownerId: userId },
    select: { id: true, onboardingComplete: true },
  });

  return business;
}

async function uniqueBusinessSlug(name: string, db: DbClient = prisma): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let attempt = 0;

  while (attempt < 20) {
    const existing = await db.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    const email = input.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("EMAIL_IN_USE", "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: input.name,
          role: input.role,
          passwordHash,
        },
      });

      let business: { id: string; onboardingComplete: boolean } | null = null;

      if (input.role === "BUSINESS") {
        const businessName = input.businessName ?? "Business";
        const slug = await uniqueBusinessSlug(businessName, tx);
        const createdBusiness = await tx.business.create({
          data: {
            ownerId: user.id,
            name: businessName,
            slug,
            timezone: "UTC",
            onboardingComplete: false,
            isPublished: false,
          },
        });
        business = {
          id: createdBusiness.id,
          onboardingComplete: createdBusiness.onboardingComplete,
        };
      }

      return { user, business };
    });

    const token = signAccessToken({ sub: created.user.id, role: created.user.role });
    const user = toAuthUser(created.user, created.business);

    logger.info(
      { userId: user.id, role: user.role, event: "auth.register" },
      "User registered",
    );

    return { user, token };
  }

  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      logger.info({ email, event: "auth.login_failed" }, "Login failed");
      throw new UnauthorizedError("Invalid email or password.");
    }

    const business = await resolveBusiness(user.id, user.role);
    const token = signAccessToken({ sub: user.id, role: user.role });
    const authUser = toAuthUser(user, business);

    logger.info({ userId: user.id, role: user.role, event: "auth.login" }, "User logged in");

    return { user: authUser, token };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedError("Session is no longer valid.");
    }

    const business = await resolveBusiness(user.id, user.role);
    return toAuthUser(user, business);
  }

  async getUserFromTokenSubject(userId: string): Promise<AuthUser> {
    return this.me(userId);
  }
}

export const authService = new AuthService();
