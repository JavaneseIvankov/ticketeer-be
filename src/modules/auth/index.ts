import { factory } from "@/config/app";
import { env } from "@/config/env";
import { db } from "@/db/client";
import { CONSTRAINT } from "@/db/schema";
import { isConstraint, NotFoundError } from "@/db/utils";
import {
  createJwtToken,
  hashPassword,
  isPasswordValid,
  requireAuth,
} from "@/shared/auth";
import { err, ok } from "@/shared/http";
import { zValidator } from "@/shared/validation";
import {
  createAccount,
  createOrganizer,
  createUser,
  getAccountByUserId,
  getUserByEmail,
  getUserById,
} from "./operations";
import { loginBodySchema, registerBodySchema } from "./schemas";

// Purpose: `src/modules/auth/index.ts` is the collapsed entrypoint for the auth
// domain. It can temporarily hold auth schemas, queries, logic, and direct route
// registration until the module is split into focused files.
export const authRoutes = factory
  .createApp()

  .get("/auth/me", requireAuth, async (c) => {
    const session = c.var.jwtPayload;
    const user = await getUserById(db)(session.userId);

    return c.json(
      ok("Fetched current user", {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    );
  })

  .post("/auth/register", zValidator("json", registerBodySchema), async (c) => {
    try {
      const body = c.req.valid("json");
      const user = await register(body);

      return c.json(
        ok("User registered successfully", {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }),
      );
    } catch (e) {
      if (isConstraint(e, CONSTRAINT.UNIQUE_EMAIL)) {
        return c.json(
          err("Email is already registered", "EMAIL_ALREADY_REGISTERED"),
          409,
        );
      }
      throw e;
    }
  })

  .post("/auth/login", zValidator("json", loginBodySchema), async (c) => {
    try {
      const body = c.req.valid("json");
      const { token } = await login(body);

      return c.json(
        ok("Logged in successfully", {
          token,
        }),
      );
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message === "INVALID_PASSWORD" || e instanceof NotFoundError)
      ) {
        return c.json(err("Invalid credentials", "INVALID_CREDENTIALS"), 401);
      }

      throw e;
    }
  });

export const register = (payload: {
  email: string;
  password: string;
  name: string;
  role: "ORGANIZER" | "ADMIN" | "USER";
}) => {
  return db.transaction(async (tx) => {
    const createUserFn = createUser(tx);
    const createAccountFn = createAccount(tx);
    const createOrganizerFn = createOrganizer(tx);

    const userRes = await createUserFn({
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });
    if (payload.role === "ORGANIZER") {
      await createOrganizerFn({
        userId: userRes.id,
        organizerName: payload.name,
      });
    }
    await createAccountFn({
      hashedPassword: hashPassword(payload.password),
      userId: userRes.id,
    });
    return userRes;
  });
};

export const login = async (payload: { email: string; password: string }) => {
  const user = await getUserByEmail(db)(payload.email);
  const account = await getAccountByUserId(db)(user.id);
  if (!isPasswordValid(payload.password, account.hashedPassword)) {
    throw new Error("INVALID_PASSWORD");
  }
  const token = await createJwtToken(
    {
      userId: user.id,
      role: user.role,
      expirySeconds: env.JWT_EXPIRES_IN_SECONDS,
    },
    env.JWT_SECRET,
  );

  return {
    token: token,
  };
};
