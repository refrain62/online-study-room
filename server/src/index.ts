import Fastify from 'fastify';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { appRouter } from './router';
import { createContext } from './context';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import cors from '@fastify/cors';

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
  trpcOptions: {
    prefix: '/trpc',
    router: appRouter,
    createContext,
  },
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
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
