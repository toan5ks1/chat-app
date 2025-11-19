import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import { env } from '../config/env';

async function mongoosePlugin() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('MongoDB connection error:', errorMessage);
    throw new Error(`Failed to connect to MongoDB: ${errorMessage}`);
  }
}

export default fp(async (fastify) => {
  await mongoosePlugin();

  fastify.log.info('MongoDB connected');

  fastify.addHook('onClose', async () => {
    await mongoose.connection.close();
  });
});
