import { FastifyRequest, FastifyReply } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import RoomService from './roomService';

/**
 * tRPCコンテキストを作成する関数。
 * Fastifyのリクエスト、レスポンス、Socket.IOサーバーインスタンス、およびRoomServiceをコンテキストとして提供します。
 * これにより、tRPCプロシージャ内でこれらのオブジェクトにアクセスできるようになります。
 * @param {Object} params - パラメータオブジェクト
 * @param {FastifyRequest} params.req - Fastifyのリクエストオブジェクト
 * @param {FastifyReply} params.res - Fastifyのレスポンスオブジェクト
 * @param {SocketIOServer} params.io - Socket.IOサーバーインスタンス
 * @param {RoomService} params.roomService - RoomServiceインスタンス
 * @returns {Object} コンテキストオブジェクト
 */
export function createContext({ req, res, io, roomService }: { req: FastifyRequest; res: FastifyReply; io: SocketIOServer; roomService: RoomService }) {
  return {
    req,
    res,
    io,
    roomService,
  };
}

/**
 * createContext関数の戻り値の型定義。
 * tRPCプロシージャのコンテキストとして使用されます。
 */
export type Context = ReturnType<typeof createContext>;
