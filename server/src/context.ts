import { FastifyRequest, FastifyReply } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

/**
 * tRPCコンテキストを作成する関数。
 * Fastifyのリクエスト、レスポンス、Socket.IOサーバーインスタンスをコンテキストとして提供します。
 * これにより、tRPCプロシージャ内でこれらのオブジェクトにアクセスできるようになります。
 * @param {Object} params - パラメータオブジェクト
 * @param {FastifyRequest} params.req - Fastifyのリクエストオブジェクト
 * @param {FastifyReply} params.res - Fastifyのレスポンスオブジェクト
 * @param {SocketIOServer} params.io - Socket.IOサーバーインスタンス
 * @returns {Object} コンテキストオブジェクト
 */
export function createContext({ req, res, io }: { req: FastifyRequest; res: FastifyReply; io: SocketIOServer }) {
  return {
    req,
    res,
    io,
  };
}

/**
 * createContext関数の戻り値の型定義。
 * tRPCプロシージャのコンテキストとして使用されます。
 */
export type Context = ReturnType<typeof createContext>;
