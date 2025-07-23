import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { z } from 'zod';
import { rooms, Room } from './rooms';

/**
 * tRPCサーバーの初期化。
 * createContextで定義されたコンテキストを使用します。
 */
const t = initTRPC.context<Context>().create();

/**
 * tRPCルーターの基盤となるオブジェクト。
 */
export const router = t.router;
/**
 * 認証不要な公開プロシージャを定義するためのオブジェクト。
 */
export const publicProcedure = t.procedure;

/**
 * アプリケーションのtRPCルーター定義。
 * ここにAPIエンドポイントを定義します。
 */
export const appRouter = router({
  /**
   * ヘルスチェックエンドポイント。
   * サーバーが正常に動作しているかを確認するために使用します。
   */
  health: publicProcedure
    .query(() => {
      return { status: 'ok' };
    }),

  /**
   * 学習記録を保存するエンドポイント。
   * ユーザーIDと学習時間を受け取り、記録をコンソールに出力します。
   * 実際にはデータベースへの保存ロジックなどを追加します。
   */
  saveStudyRecord: publicProcedure
    .input(z.object({
      userId: z.string(),
      studyTime: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      console.log(`User ${input.userId} studied for ${input.studyTime} seconds.`);
      // ここにデータベース保存ロジックなどを追加
      return { success: true, message: 'Study record saved' };
    }),

  /**
   * 新しい学習ルームを作成するエンドポイント。
   * ルーム名を受け取り、ユニークなIDを持つ新しいルームを作成します。
   */
  createRoom: publicProcedure
    .input(z.object({
      roomName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const newRoomId = Math.random().toString(36).substring(2, 9);
      const newRoom: Room = {
        id: newRoomId,
        name: input.roomName,
        users: [],
      };
      rooms[newRoomId] = newRoom;
      console.log(`Room created: ${newRoom.name} (${newRoom.id})`);
      return newRoom;
    }),

  /**
   * 全ての学習ルームのリストを取得するエンドポイント。
   */
  getRooms: publicProcedure
    .query(() => {
      return Object.values(rooms);
    }),

  /**
   * ユーザーが指定されたルームに参加するエンドポイント。
   * ルームIDとSocket.IOのソケットIDを受け取り、ユーザーをルームに参加させます。
   * 以前参加していたルームからは離脱させ、ルーム内のユーザーリストを更新してブロードキャストします。
   */
  joinRoom: publicProcedure
    .input(z.object({
      roomId: z.string(),
      socketId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { roomId, socketId } = input;
      const { io } = ctx;

      const targetSocket = io.sockets.sockets.get(socketId);

      if (!targetSocket) {
        throw new Error('Socket not found');
      }

      if (!rooms[roomId]) {
        throw new Error('Room not found');
      }

      // 以前のルームから離脱
      const previousRoomId = targetSocket.data.roomId;
      if (previousRoomId && rooms[previousRoomId]) {
        targetSocket.leave(previousRoomId); // 明示的にルームから離脱
        rooms[previousRoomId].users = rooms[previousRoomId].users.filter(user => user.id !== socketId);
        io.to(previousRoomId).emit('roomUsers', rooms[previousRoomId].users);
        io.emit('roomCountUpdate', { roomId: previousRoomId, count: rooms[previousRoomId].users.length });
      }

      // 新しいルームに参加
      targetSocket.join(roomId);
      targetSocket.data.roomId = roomId;

      // ユーザー情報を新しいルームに追加
      const currentUser: { id: string; status: '休憩中' | '集中中'; studyTime: number } = { id: socketId, status: '休憩中', studyTime: 0 }; // 初期ステータス
      rooms[roomId].users.push(currentUser);

      // 新しいルームの全ユーザーに更新されたユーザーリストを送信
      io.to(roomId).emit('roomUsers', rooms[roomId].users);

      console.log(`User ${socketId} joined room ${roomId}`);
      return { success: true, message: `Joined room ${roomId}` };
    }),
});

/**
 * appRouterの型定義。
 * クライアント側で型安全なtRPC呼び出しを行うために使用されます。
 */
export type AppRouter = typeof appRouter;

