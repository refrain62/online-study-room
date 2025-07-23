import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { z } from 'zod';
import { rooms, Room } from './rooms';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure
    .query(() => {
      return { status: 'ok' };
    }),
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
  getRooms: publicProcedure
    .query(() => {
      return Object.values(rooms);
    }),
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

export type AppRouter = typeof appRouter;
