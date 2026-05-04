// Purpose: `src/shared/auth.ts` holds transport-level authentication helpers
// such as token parsing, session lookup, and request user extraction.

import { compareSync, hashSync } from "bcrypt-ts";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";
import {
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenSignatureMismatched,
} from "hono/utils/jwt/types";
import { env } from "@/config/env";
import { err } from "@/shared/http";

type Bindings = {
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: TJwtSession;
};

type Env = {
  Bindings: Bindings;
  Variables: Variables;
};

// TODO: move to dedicated domain file once established
type TRole = "ORGANIZER" | "ADMIN" | "USER";

type TSession = {
  userId: string;
  role: TRole;
};

// https://github.com/honojs/hono/blob/main/packages/hono/src/utils/jwt/types.ts
type TStrictJWTPayload = {
  exp?: number;
  nbf?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
};

type TJwtSession = TSession & TStrictJWTPayload;

function isSession(payload: unknown): payload is TJwtSession {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    "role" in payload &&
    typeof payload.userId === "string" &&
    typeof payload.role === "string"
  );
}

export function hashPassword(password: string) {
  return hashSync(password, 10);
}

export function isPasswordValid(password: string, hashedPassword: string) {
  return compareSync(password, hashedPassword);
}

export function createJwtToken(
  payload: {
    userId: string;
    role: TRole;
    expirySeconds?: number;
  },
  secret: string,
) {
  return sign(
    {
      ...payload,
      exp:
        Math.floor(Date.now() / 1000) +
        (payload.expirySeconds || env.JWT_EXPIRES_IN_SECONDS),
    },
    secret,
  );
}

const unauthorizedResponse = (reason: string) =>
  Response.json(
    err("Unauthorized", "UNAUTHORIZED", {
      code: "UNAUTHORIZED",
      detail: { reason },
    }),
  );

const authenticateRequest = async (c: Context<Env>) => {
  const header = c.req.header("Authorization");
  const token = header?.split(" ")[1];

  if (!token) {
    throw new HTTPException(401, {
      res: unauthorizedResponse("missing_token"),
    });
  }

  try {
    const verified = await verify(token, env.JWT_SECRET, { alg: "HS256" });

    if (!isSession(verified)) {
      throw new HTTPException(401, {
        res: unauthorizedResponse("invalid_session"),
      });
    }

    c.set("jwtPayload", verified);
    return verified;
  } catch (error) {
    if (error instanceof JwtTokenExpired) {
      throw new HTTPException(401, {
        res: unauthorizedResponse("token_expired"),
      });
    }
    if (error instanceof JwtTokenSignatureMismatched) {
      throw new HTTPException(401, {
        res: unauthorizedResponse("invalid_signature"),
      });
    }
    if (error instanceof JwtTokenInvalid) {
      throw new HTTPException(401, {
        res: unauthorizedResponse("invalid_token"),
      });
    }

    throw new HTTPException(500, {
      res: Response.json(err("Internal server error", "INTERNAL_ERROR")),
    });
  }
};

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  await authenticateRequest(c);
  await next();
});

export const requireRole = (roles: TRole[]) =>
  createMiddleware<Env>(async (c, next) => {
    const session = await authenticateRequest(c);

    if (!roles.includes(session.role)) {
      throw new HTTPException(403, {
        res: Response.json(
          err("Forbidden", "FORBIDDEN", {
            code: "FORBIDDEN",
            detail: { requiredRoles: roles },
          }),
        ),
      });
    }

    await next();
  });
