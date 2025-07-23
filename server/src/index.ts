import Fastify from 'fastify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { appRouter } from './router';
import { createContext } from './context';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import cors from '@fastify/cors';
// // import { rooms, defaultRoomId } from './rooms'; // RoomService経由でアクセスするため不要
import RoomService from './roomService';

// Fastifyアプリケーションインスタンスを作成
const fastify = Fastify({
  logger: true // ロギングを有効にする
});

// HTTPサーバーを作成し、Fastifyインスタンスをアタッチ
const httpServer = createServer(fastify.server);

// Socket.IOサーバーをHTTPサーバーにアタッチ
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // 開発時は全てのオリジンからの接続を許可
    methods: ["GET", "POST"] // 許可するHTTPメソッド
  }
});

// RoomServiceのインスタンスを作成
const roomService = new RoomService(io);

// Fastify CORSプラグインを登録
fastify.register(cors, {
  origin: "*", // 開発時は全てのオリジンからの接続を許可
});

// tRPCプラグインをFastifyに登録
fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc', // tRPCエンドポイントのプレフィックス
  trpcOptions: {
    router: appRouter, // 定義したtRPCルーター
    // tRPCコンテキストを作成する関数。Fastifyのリクエスト、レスポンス、Socket.IOインスタンス、RoomServiceを渡す
    createContext: ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => createContext({ req, res, io, roomService }),
  },
});

// Socket.IOの接続イベントハンドラ
io.on('connection', (socket) => {
  console.log(`a user connected: ${socket.id}`);

  // 接続時にユーザーをデフォルトルームに参加させる（初期化処理）
  // socket.data に現在のルームIDを保存
  // RoomServiceに処理を委譲
  socket.data.roomId = 'default-room'; // デフォルトルームIDを直接設定
  socket.join(socket.data.roomId);
  roomService.handleUserConnect(socket);

  /**
   * ユーザーのステータス更新イベントハンドラ。
   * クライアントから 'updateStatus' イベントが送信されたときに実行されます。
   * @param {Object} data - 更新データ
   * @param {'集中中' | '休憩中'} data.status - ユーザーの新しいステータス
   * @param {number} data.studyTime - ユーザーの現在の学習時間
   * @param {string} data.roomId - ユーザーが現在いるルームのID
   */
  socket.on('updateStatus', (data: { status: '集中中' | '休憩中'; studyTime: number; roomId: string }) => {
    const { status, studyTime, roomId } = data;
    // RoomServiceに処理を委譲
    roomService.updateUserStatus(socket.id, status, studyTime, roomId);
  });

  /**
   * ユーザーの切断イベントハンドラ。
   * ユーザーがSocket.IOから切断されたときに実行されます。
   */
  socket.on('disconnect', () => {
    console.log(`user disconnected: ${socket.id}`);
    const roomId = socket.data.roomId; // 切断時のルームIDを取得
    // RoomServiceに処理を委譲
    roomService.handleUserDisconnect(socket.id, roomId);
  });
});

/**
 * サーバーを起動する関数。
 * FastifyサーバーとSocket.IOサーバーをそれぞれ異なるポートでリッスンします。
 */
const start = async () => {
  try {
    await fastify.listen({ port: 3000 }); // Fastifyサーバーをポート3000でリッスン
    httpServer.listen(3001, () => { // Socket.IOサーバーをポート3001でリッスン
      console.log('Socket.IO server listening on port 3001');
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1); // エラー発生時はプロセスを終了
  }
};

// サーバー起動関数を呼び出す
start();
