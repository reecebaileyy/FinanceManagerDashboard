import { buildApp } from "./app";
import { env } from "./env";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info("auth service listening on port " + env.PORT);
  } catch (error) {
    app.log.error(error, "failed to start auth service");
    process.exitCode = 1;
    await app.close();
  }
}

start();
