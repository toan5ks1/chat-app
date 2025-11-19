import fp from "fastify-plugin";
import { User } from "../models/User";

export default fp(async (fastify) => {
  fastify.decorate("authenticate", async (request, reply) => {
    try {
      // Verify JWT token from Authorization header
      await request.jwtVerify();

      // request.user now contains the decoded JWT payload
      // Fetch full user details from database
      const userId = (request.user as any).userId;
      const user = await User.findById(userId)
        .select("_id email displayName avatarUrl")
        .lean();

      if (!user) {
        throw reply.unauthorized("User not found");
      }

      // Attach full user details to request
      (request as any).user = {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      };
    } catch (error) {
      throw reply.unauthorized("Authentication required");
    }
  });
});
