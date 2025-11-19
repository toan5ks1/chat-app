import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import jwt from "@fastify/jwt";
import oauthPlugin from "@fastify/oauth2";
import sensible from "@fastify/sensible";
import { env } from "./config/env";
import mongoosePlugin from "./plugins/mongoose";
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import healthRoutes from "./routes/healthRoutes";
import userRoutes from "./routes/userRoutes";
import authenticatePlugin from "./plugins/authenticate";
import { registerSocketServer } from "./sockets";

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: env.CLIENT_ORIGIN,
  credentials: true,
});

fastify.register(sensible);

fastify.register(multipart, {
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
});

fastify.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: "7d", // Token expires in 7 days
  },
});

fastify.register(oauthPlugin, {
  name: "googleOAuth2",
  scope: ["profile", "email"],
  credentials: {
    client: {
      id: env.GOOGLE_CLIENT_ID,
      secret: env.GOOGLE_CLIENT_SECRET,
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION,
  },
  callbackUri: env.GOOGLE_CALLBACK_URL,
});

fastify.register(mongoosePlugin);
fastify.register(authenticatePlugin);

fastify.register(healthRoutes, { prefix: "/api" });
fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(chatRoutes, { prefix: "/api" });
fastify.register(uploadRoutes, { prefix: "/api" });
fastify.register(userRoutes, { prefix: "/api" });

fastify.decorate("io", registerSocketServer(fastify));

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: env.HOST });
    fastify.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
