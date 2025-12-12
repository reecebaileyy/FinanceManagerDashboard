import { getServerEnv, loadServerEnv, resetServerEnvCache } from "./server";

export { getServerEnv, loadServerEnv, resetServerEnvCache };
export type { ServerEnv } from "./server";
export type { AppEnv, NodeEnv } from "./schema";
export { appEnvSchema, nodeEnvSchema } from "./schema";

export function getAppEnvironment() {
  return getServerEnv().APP_ENV;
}

export function isLocalEnvironment() {
  return getAppEnvironment() === "local";
}
