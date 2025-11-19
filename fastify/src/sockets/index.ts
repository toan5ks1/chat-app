import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';

interface MessagePayload {
  id: string;
  conversation: string;
  sender: string;
  content?: string;
  attachments: unknown[];
  createdAt: Date;
}

interface ServerToClientEvents {
  'conversation:new': (payload: { conversationId: string }) => void;
  'message:new': (payload: { conversationId: string; message: MessagePayload }) => void;
  'conversation:typing': (payload: { conversationId: string; userId: string; typing: boolean }) => void;
}

interface ClientToServerEvents {
  'conversation:join': (conversationId: string) => void;
  'conversation:typing': (payload: { conversationId: string; typing: boolean }) => void;
  'message:send': (payload: { conversationId: string; content?: string }) => void;
}

interface SocketData {
  userId: string;
}

export function registerSocketServer(fastify: FastifyInstance) {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    fastify.server,
    {
      cors: {
        origin: env.CLIENT_ORIGIN,
        credentials: true
      }
    }
  );

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      // Verify JWT token
      const decoded = fastify.jwt.verify(token) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>) => {
    const { userId } = socket.data;
    socket.join(`user:${userId}`);

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:typing', ({ conversationId, typing }) => {
      socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
        conversationId,
        typing,
        userId
      });
    });

    socket.on('message:send', async ({ conversationId, content }) => {
      if (!content?.trim()) {
        return;
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: userId,
        content,
        attachments: []
      });

      await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() }).exec();

      const payload = {
        id: message._id.toString(),
        conversation: message.conversation.toString(),
        sender: message.sender.toString(),
        content: message.content,
        attachments: message.attachments,
        createdAt: message.createdAt
      };

      io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        message: payload
      });
    });
  });

  fastify.addHook('onClose', async () => {
    await io.close();
  });

  return io;
}
