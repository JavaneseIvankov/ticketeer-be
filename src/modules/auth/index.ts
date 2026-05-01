import { z } from "zod";
import { factory } from "@/config/app";
import { env } from "@/config/env";
import { db } from "@/db/client";
import { createJwtToken, hashPassword, requireAuth } from "@/shared/auth";
import { ok } from "@/shared/http";
import { zValidator } from "@/shared/validation";
import {
  createAccount,
  createOrganizer,
  createUser,
  getAccountByUserId,
  getUserByEmail,
} from "./operations";

// Purpose: `src/modules/auth/index.ts` is the collapsed entrypoint for the auth
// domain. It can temporarily hold auth schemas, queries, logic, and direct route
// registration until the module is split into focused files.
export const authRoutes = factory.createApp();

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["ORGANIZER", "USER"]),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const meResponseDataSchema = z.object({
  userId: z.string().nullable(),
  role: z.enum(["USER", "ORGANIZER", "ADMIN"]).nullable(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type MeResponseData = z.infer<typeof meResponseDataSchema>;

authRoutes.get("/auth/me", requireAuth, (c) =>
  c.json(ok("Fetched current user", { userId: null, role: null })),
);

authRoutes.post(
  "/auth/register",
  zValidator("json", registerBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const user = await register(body);

    return c.json(
      ok("User registered successfully", {
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    );
  },
);

authRoutes.post(
  "/auth/login",
  zValidator("json", loginBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const { token } = await login(body);

    return c.json(
      ok("Logged in successfully", {
        token,
      }),
    );
  },
);

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
      const _ = await createOrganizerFn({
        userId: userRes.id,
        organizerName: payload.name,
      });
    }
    // FIXME: hash password before storing
    const _ = createAccountFn({
      hashedPassword: hashPassword(payload.password),
      userId: userRes.id,
    });
    return userRes;
  });
};

export const login = async (payload: { email: string; password: string }) => {
  const user = await getUserByEmail(db)(payload.email);
  const account = await getAccountByUserId(db)(user.id);
  if (account.hashedPassword !== hashPassword(payload.password)) {
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
