import Fastify from 'fastify';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { appRouter } from './router';
import { createContext } from './context';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import cors from '@fastify/cors';
import { rooms, defaultRoomId } from './rooms';

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

// Fastify CORSプラグインを登録
fastify.register(cors, {
  origin: "*", // 開発時は全てのオリジンからの接続を許可
});

// tRPCプラグインをFastifyに登録
fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc', // tRPCエンドポイントのプレフィックス
  trpcOptions: {
    router: appRouter, // 定義したtRPCルーター
    // tRPCコンテキストを作成する関数。Fastifyのリクエスト、レスポンス、Socket.IOインスタンスを渡す
    createContext: ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => createContext({ req, res, io }),
  },
});

// Socket.IOの接続イベントハンドラ
io.on('connection', (socket) => {
  console.log(`a user connected: ${socket.id}`);

  // 接続時にユーザーをデフォルトルームに参加させる（初期化処理）
  // socket.data に現在のルームIDを保存
  socket.data.roomId = defaultRoomId;
  socket.join(defaultRoomId);

  // ルーム内の全ユーザーに現在のユーザーリストを送信
  io.to(defaultRoomId).emit('roomUsers', rooms[defaultRoomId].users);

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
    if (!roomId || !rooms[roomId]) return; // ルームが存在しない場合は何もしない

    // ルーム内のユーザー情報を更新
    const userIndex = rooms[roomId].users.findIndex(user => user.id === socket.id);
    if (userIndex > -1) {
      rooms[roomId].users[userIndex].status = status;
      rooms[roomId].users[userIndex].studyTime = studyTime;
    }

    // ルーム内の全ユーザーに更新されたユーザーリストをブロードキャスト
    io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントにルームの人数更新を通知
    io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });
  });

  /**
   * ユーザーの切断イベントハンドラ。
   * ユーザーがSocket.IOから切断されたときに実行されます。
   */
  socket.on('disconnect', () => {
    console.log(`user disconnected: ${socket.id}`);
    const roomId = socket.data.roomId; // 切断時のルームIDを取得
    if (!roomId || !rooms[roomId]) return; // ルームが存在しない場合は何もしない

    // ルームからユーザーを削除
    rooms[roomId].users = rooms[roomId].users.filter(user => user.id !== socket.id);

    // ルーム内の全ユーザーに更新されたユーザーリストをブロードキャスト
    io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントにルームの人数更新を通知
    io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });
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
