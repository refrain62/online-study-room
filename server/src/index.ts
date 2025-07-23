import Fastify from 'fastify';
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
    createContext: ({ req, res }) => createContext({ req, res, io }),
  },
});

io.on('connection', (socket) => {
  console.log(`a user connected: ${socket.id}`);

  // ユーザーをデフォルトルームに参加させる
  socket.join(defaultRoomId);
  // socket.data に現在のルームIDを保存
  socket.data.roomId = defaultRoomId;

  // ユーザー情報をルームに追加
  const currentUser = { id: socket.id, status: '休憩中', studyTime: 0 };
  rooms[defaultRoomId].users.push(currentUser);

  // ルーム内の全ユーザーに現在のユーザーリストを送信
  io.to(defaultRoomId).emit('roomUsers', rooms[defaultRoomId].users);

  socket.on('updateStatus', (data: { status: '集中中' | '休憩中'; studyTime: number }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    // ルーム内のユーザー情報を更新
    const userIndex = rooms[roomId].users.findIndex(user => user.id === socket.id);
    if (userIndex > -1) {
      rooms[roomId].users[userIndex].status = data.status;
      rooms[roomId].users[userIndex].studyTime = data.studyTime;
    }

    // ルーム内の全ユーザーに更新されたユーザーリストを送信
    io.to(roomId).emit('roomUsers', rooms[roomId].users);
  });

  socket.on('disconnect', () => {
    console.log(`user disconnected: ${socket.id}`);
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    // ルームからユーザーを削除
    rooms[roomId].users = rooms[roomId].users.filter(user => user.id !== socket.id);

    // ルーム内の全ユーザーに更新されたユーザーリストを送信
    io.to(roomId).emit('roomUsers', rooms[roomId].users);
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
