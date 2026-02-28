import { SetMetadata } from "@nestjs/common";

export const AUTH_TYPE_KEY = "auth_type";

export type AuthTypeEnum = "public" | "web" | "partner" | "api-key";

/**
 * Decorator to specify the authentication type(s) required for a route.
 * Can accept a single type or an array of types for endpoints that support multiple auth methods.
 */
export const AuthType = (type: AuthTypeEnum | AuthTypeEnum[]) =>
  SetMetadata(AUTH_TYPE_KEY, type);
