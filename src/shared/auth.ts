// Purpose: `src/shared/auth.ts` holds transport-level authentication helpers
// such as token parsing, session lookup, and request user extraction.
import { env } from "@/config/env";
import { err } from "@/shared/http";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { JwtTokenExpired, JwtTokenInvalid, JwtTokenSignatureMismatched } from "hono/utils/jwt/types";

type Bindings = {
   JWT_SECRET: string
}

type Variables = {
   jwtPayload: TJwtSession
}

type Env = {
   Bindings: Bindings
   Variables: Variables
}

// TODO: move to dedicated domain file once established
type TRole = "ORGANIZER" | "ADMIN" | "USER"

type TSession = {
   userId: string;
   role: TRole;
}

// https://github.com/honojs/hono/blob/main/packages/hono/src/utils/jwt/types.ts
type TStrictJWTPayload = {
   exp?: number;
   nbf?: number;
   iat?: number;
   iss?: string;
   aud?: string | string[];
}

type TJwtSession = TSession & TStrictJWTPayload;

function isSession(payload: any): payload is TJwtSession {
   return typeof payload.userId === "string" && typeof payload.role === "string"
}

export const requireAuth = createMiddleware<Env>(async (c, next) => {
   const header = c.req.header('Authorization')
   const token = header?.split(' ')[1]

   if (!token) {
      throw new HTTPException(401, {
         res: Response.json(err('no token provided', "NO_TOKEN_PROVIDED"))
      })
   }

   try {
      const verified = await verify(token, env.JWT_SECRET, { alg: 'HS256' })

      if (!isSession(verified)) {
         throw new HTTPException(401, {
            res: Response.json(err('invalid token', "INVALID_TOKEN"))
         })
      }

      c.set('jwtPayload', verified)
      await next()
   } catch (error) {
      if (error instanceof JwtTokenExpired) {
         throw new HTTPException(401, {
            res: Response.json(err('token expired', "TOKEN_EXPIRED"))
         })
      }
      if (error instanceof JwtTokenSignatureMismatched) {
         throw new HTTPException(401, {
            res: Response.json(err('invalid signature', "INVALID_SIGNATURE"))
         })
      }
      if (error instanceof JwtTokenInvalid) {
         throw new HTTPException(401, {
            res: Response.json(err('invalid token', "INVALID_TOKEN"))
         })
      }

      throw new HTTPException(500, {
         res: Response.json(err('internal server error', "INTERNAL_SERVER_ERROR"))
      })
   }
})

export const requireRole = (roles: TRole[]) =>
   createMiddleware<Env>(
      async (c, next) => {

         await requireAuth(c, next)

         const role = c.get('jwtPayload').role

         if (!roles.includes(role)) {
            throw new HTTPException(401, {
               res: Response.json(err('unauthorized', "UNAUTHORIZED"))
            })
         }
      }
   )

