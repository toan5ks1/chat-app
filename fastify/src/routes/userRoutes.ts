import type { FastifyPluginAsync } from 'fastify';
import { User } from '../models/User';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all users (excluding current user)
  fastify.get('/users', { preHandler: fastify.authenticate }, async (request) => {
    const currentUserId = request.user!.id;

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('_id email displayName avatarUrl')
      .sort({ displayName: 1 })
      .lean();

    return { users };
  });

  // Get user by ID
  fastify.get('/users/:userId', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const user = await User.findById(userId)
      .select('_id email displayName avatarUrl')
      .lean();

    if (!user) {
      reply.notFound('User not found');
      return;
    }

    return { user };
  });
};

export default userRoutes;

