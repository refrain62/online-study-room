import { FastifyRequest, FastifyReply } from 'fastify';

export function createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }) {
  // ここで認証情報などを取得し、コンテキストに含める
  return {
    req,
    res,
  };
}

export type Context = ReturnType<typeof createContext>;
