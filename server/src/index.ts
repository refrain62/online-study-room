import Fastify from 'fastify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { appRouter } from './router';
import { createContext } from './context';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import cors from '@fastify/cors';
import { rooms, defaultRoomId } from './rooms';

const fastify = Fastify({
  logger: true
});

const httpServer = createServer(fastify.server);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // 開発時は全て許可
    methods: ["GET", "POST"]
  }
});

fastify.register(cors, {
  origin: "*", // 開発時は全て許可
});

fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => createContext({ req, res, io }),
  },
});

io.on('connection', (socket) => {
  console.log(`a user connected: ${socket.id}`);

  // 接続時にユーザーをデフォルトルームに参加させる（初期化）
  // socket.data に現在のルームIDを保存
  socket.data.roomId = defaultRoomId;
  socket.join(defaultRoomId);

  // ルーム内の全ユーザーに現在のユーザーリストを送信
  io.to(defaultRoomId).emit('roomUsers', rooms[defaultRoomId].users);

  socket.on('updateStatus', (data: { status: '集中中' | '休憩中'; studyTime: number; roomId: string }) => {
    const { status, studyTime, roomId } = data;
    if (!roomId || !rooms[roomId]) return;

    // ルーム内のユーザー情報を更新
    const userIndex = rooms[roomId].users.findIndex(user => user.id === socket.id);
    if (userIndex > -1) {
      rooms[roomId].users[userIndex].status = status;
      rooms[roomId].users[userIndex].studyTime = studyTime;
    }

    // ルーム内の全ユーザーに更新されたユーザーリストを送信
    io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントにルームの人数更新を通知
    io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });
  });

  socket.on('disconnect', () => {
    console.log(`user disconnected: ${socket.id}`);
    const roomId = socket.data.roomId; // 切断時のルームIDを取得
    if (!roomId || !rooms[roomId]) return;

    // ルームからユーザーを削除
    rooms[roomId].users = rooms[roomId].users.filter(user => user.id !== socket.id);

    // ルーム内の全ユーザーに更新されたユーザーリストを送信
    io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントにルームの人数更新を通知
    io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    httpServer.listen(3001, () => {
      console.log('Socket.IO server listening on port 3001');
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
