import { FastifyRequest, FastifyReply } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

export function createContext({ req, res, io }: { req: FastifyRequest; res: FastifyReply; io: SocketIOServer }) {
  return {
    req,
    res,
    io,
  };
}

export type Context = ReturnType<typeof createContext>;
