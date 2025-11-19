import type { FastifyPluginAsync } from "fastify";
import { Types } from "mongoose";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";

const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/conversations",
    { preHandler: fastify.authenticate },
    async (request) => {
      const userId = request.user!.id;

      const conversations = await Conversation.find({ participants: userId })
        .populate("participants", "displayName email avatarUrl")
        .sort({ updatedAt: -1 })
        .lean();

      return { conversations };
    }
  );

  fastify.post(
    "/conversations",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const body = request.body as {
        participantIds: string[];
        title?: string;
        isGroup?: boolean;
      };
      const userId = request.user!.id;

      // Validate and convert participant IDs
      const participantIdArray = Array.from(
        new Set([userId, ...(body.participantIds || [])])
      ).filter((id): id is string => Boolean(id));

      // Validate all IDs are valid MongoDB ObjectIds
      const invalidIds = participantIdArray.filter(
        (id) => !Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        reply.badRequest(`Invalid participant IDs: ${invalidIds.join(", ")}`);
        return;
      }

      const participants = participantIdArray.map(
        (id) => new Types.ObjectId(id)
      );

      if (!body.isGroup && participants.length !== 2) {
        reply.badRequest("Direct messages require exactly two participants");
        return;
      }

      if (!body.isGroup) {
        const existing = await Conversation.findOne({
          isGroup: false,
          participants: { $all: participants, $size: participants.length },
        }).exec();

        if (existing) {
          return { conversation: existing };
        }
      }

      try {
        const conversation = await Conversation.create({
          title: body.title,
          isGroup: Boolean(body.isGroup),
          participants,
        });

        // Populate participants for the response
        await conversation.populate(
          "participants",
          "displayName email avatarUrl"
        );

        const participantRooms = participants.map(
          (id) => `user:${id.toString()}`
        );
        fastify.io?.to(participantRooms).emit("conversation:new", {
          conversationId: conversation._id.toString(),
        });

        reply.code(201).send({ conversation });
      } catch (error) {
        fastify.log.error(error);
        reply.internalServerError("Failed to create conversation");
      }
    }
  );

  fastify.get(
    "/conversations/:conversationId/messages",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const userId = request.user!.id;

      const conversation = await Conversation.findById(conversationId).exec();
      if (!conversation) {
        reply.notFound("Conversation not found");
        return;
      }

      if (
        !conversation.participants.some(
          (participant) => participant.toString() === userId
        )
      ) {
        reply.forbidden("Not a member of this conversation");
        return;
      }

      const messages = await Message.find({ conversation: conversationId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return { messages: messages.reverse() };
    }
  );

  fastify.post(
    "/conversations/:conversationId/messages",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as {
        content?: string;
        attachments?: Array<{
          url: string;
          type: "image" | "file";
          name: string;
          size: number;
        }>;
      };
      const userId = request.user!.id;

      const conversation = await Conversation.findById(conversationId).exec();
      if (!conversation) {
        reply.notFound("Conversation not found");
        return;
      }

      if (
        !conversation.participants.some(
          (participant) => participant.toString() === userId
        )
      ) {
        reply.forbidden("Not a member of this conversation");
        return;
      }

      if (!body.content && !body.attachments?.length) {
        reply.badRequest("Message content or attachments are required");
        return;
      }

      const message = await Message.create({
        conversation: conversation._id,
        sender: userId,
        content: body.content,
        attachments: body.attachments || [],
      });

      conversation.lastMessageAt = new Date();
      await conversation.save();

      const payload = {
        conversationId: conversation._id.toString(),
        message: {
          id: message._id.toString(),
          sender: message.sender.toString(),
          content: message.content,
          attachments: message.attachments,
          createdAt: message.createdAt,
        },
      };

      fastify.io
        ?.to(`conversation:${conversationId}`)
        .emit("message:new", payload);

      reply.code(201).send(payload);
    }
  );
};

export default chatRoutes;
