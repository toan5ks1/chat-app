import type { FastifyPluginAsync } from "fastify";
import { request as undiciRequest } from "undici";
import { env } from "../config/env";
import { User } from "../models/User";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/google", async (request, reply) => {
    const authorizationUri =
      await fastify.googleOAuth2.generateAuthorizationUri(request, reply);
    return reply.redirect(authorizationUri);
  });

  fastify.get("/google/callback", async (request, reply) => {
    try {
      const result =
        await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );

      fastify.log.info({ result }, "Received OAuth token");

      // The token structure from @fastify/oauth2 is result.token.access_token
      const accessToken = result.token?.access_token || result.access_token;

      if (!accessToken) {
        fastify.log.error({ result }, "No access token found in result");
        throw new Error("Failed to obtain access token from Google");
      }

      fastify.log.info({ accessToken }, "Using access token");

      const { body } = await undiciRequest(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const profile = (await body.json()) as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      fastify.log.info({ profile }, "Received Google profile");

      // Validate profile data
      if (!profile.id || !profile.email || !profile.name) {
        fastify.log.error({ profile }, "Invalid profile data from Google");
        throw new Error(
          "Failed to get complete profile information from Google"
        );
      }

      let user = await User.findOne({ googleId: profile.id }).exec();

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.picture,
        });
        fastify.log.info({ userId: user._id }, "Created new user");
      } else {
        user.displayName = profile.name;
        user.avatarUrl = profile.picture;
        await user.save();
        fastify.log.info({ userId: user._id }, "Updated existing user");
      }

      // Generate JWT token
      const token = fastify.jwt.sign({ userId: user._id.toString() });

      // Redirect to frontend with token in URL
      const redirectUrl = new URL(env.CLIENT_REDIRECT_URL);
      redirectUrl.searchParams.set("token", token);

      return reply.redirect(redirectUrl.toString());
    } catch (error) {
      fastify.log.error({ error }, "OAuth callback error");
      throw error;
    }
  });

  fastify.get("/me", { preHandler: fastify.authenticate }, async (request) => {
    return { user: request.user };
  });

  fastify.post(
    "/logout",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      // With JWT, logout is handled client-side by deleting the token
      // Optionally, you could implement a token blacklist here
      reply.send({ success: true });
    }
  );
};

export default authRoutes;
