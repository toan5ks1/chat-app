import fp from "fastify-plugin";
import mongoose from "mongoose";
import { env } from "../config/env";

export default fp(
  async (fastify) => {
    if (mongoose.connection.readyState === 1) {
      fastify.log.info("MongoDB already connected");
      return;
    }

    try {
      fastify.log.info("Attempting to connect to MongoDB...");
      fastify.log.info(`MONGODB_URI is set: ${!!env.MONGODB_URI}`);

      await mongoose.connect(env.MONGODB_URI, {
        autoIndex: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });

      fastify.log.info("MongoDB connected successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      fastify.log.error(
        { err: error },
        "MongoDB connection error: %s",
        errorMessage
      );
      throw new Error(`Failed to connect to MongoDB: ${errorMessage}`);
    }

    fastify.addHook("onClose", async () => {
      await mongoose.connection.close();
      fastify.log.info("MongoDB connection closed");
    });
  },
  {
    name: "mongoose",
    fastify: "5.x",
  }
);
