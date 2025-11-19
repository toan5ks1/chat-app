import "@fastify/jwt";
import "@fastify/oauth2";
import type { FastifyOAuth2 } from "@fastify/oauth2";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Server as SocketIOServer } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: FastifyOAuth2;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    io?: SocketIOServer;
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      displayName: string;
      avatarUrl?: string;
      userId?: string;
    };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string };
    user: {
      userId: string;
      id?: string;
      email?: string;
      displayName?: string;
      avatarUrl?: string;
    };
  }
}
