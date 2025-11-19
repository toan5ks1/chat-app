import type { FastifyPluginAsync } from 'fastify';
import { uploadFile } from '../services/storageService';

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/uploads', { preHandler: fastify.authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      reply.badRequest('File is required');
      return;
    }

    const buffer = await file.toBuffer();
    const uploaded = await uploadFile({
      buffer,
      filename: file.filename,
      mimetype: file.mimetype
    });

    reply.send({
      file: {
        url: uploaded.url,
        key: uploaded.key,
        provider: uploaded.provider,
        name: file.filename,
        size: buffer.length,
        type: file.mimetype.startsWith('image/') ? 'image' : 'file'
      }
    });
  });
};

export default uploadRoutes;
