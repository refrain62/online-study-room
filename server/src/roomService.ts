import { Server as SocketIOServer } from 'socket.io';
import { rooms, Room, defaultRoomId } from './rooms';

/**
 * ルームとユーザーの管理に関するドメインロジックを提供するサービス。
 * Socket.IOインスタンスを通じてリアルタイムイベントのブロードキャストも行います。
 */
class RoomService {
  private io: SocketIOServer;

  /**
   * RoomServiceのコンストラクタ。
   * @param {SocketIOServer} io - Socket.IOサーバーインスタンス。
   */
  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * ユーザーが接続した際の初期処理。
   * ユーザーをデフォルトルームに参加させ、ルーム内のユーザーリストを更新します。
   * @param {string} socketId - 接続したユーザーのSocket.IO ID。
   */
  public handleUserConnect(socketId: string) {
    // ユーザーをデフォルトルームに追加
    const currentUser = { id: socketId, status: '休憩中' as '休憩中' | '集中中', studyTime: 0 };
    rooms[defaultRoomId].users.push(currentUser);

    // デフォルトルーム内の全ユーザーに更新されたユーザーリストを送信
    this.io.to(defaultRoomId).emit('roomUsers', rooms[defaultRoomId].users);
    // 全クライアントにデフォルトルームの人数更新を通知
    this.io.emit('roomCountUpdate', { roomId: defaultRoomId, count: rooms[defaultRoomId].users.length });
  }

  /**
   * 新しいルームを作成します。
   * @param {string} roomName - 作成するルームの名前。
   * @returns {Room} 作成されたルームオブジェクト。
   */
  public createRoom(roomName: string): Room {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    const newRoom: Room = {
      id: newRoomId,
      name: roomName,
      users: [],
    };
    rooms[newRoomId] = newRoom;
    console.log(`Room created: ${newRoom.name} (${newRoom.id})`);
    // 全クライアントに新しいルームの人数更新を通知 (初期人数は0)
    this.io.emit('roomCountUpdate', { roomId: newRoomId, count: 0 });
    return newRoom;
  }

  /**
   * ユーザーを指定されたルームに参加させます。
   * 以前参加していたルームからユーザーを削除し、新しいルームに追加します。
   * 関連するSocket.IOイベントをブロードキャストします。
   * @param {string} socketId - 参加するユーザーのSocket.IO ID。
   * @param {string} roomId - 参加するルームのID。
   * @param {string | undefined} previousRoomId - ユーザーが以前参加していたルームのID（存在する場合）。
   * @returns {{ success: boolean; message: string }} 処理結果。
   * @throws {Error} ルームが見つからない場合。
   */
  public joinRoom(socketId: string, roomId: string, previousRoomId: string | undefined): { success: boolean; message: string } {
    if (!rooms[roomId]) {
      throw new Error('Room not found');
    }

    // 以前のルームからユーザーを削除し、関連イベントをブロードキャスト
    if (previousRoomId && rooms[previousRoomId]) {
      rooms[previousRoomId].users = rooms[previousRoomId].users.filter(user => user.id !== socketId);
      this.io.to(previousRoomId).emit('roomUsers', rooms[previousRoomId].users);
      this.io.emit('roomCountUpdate', { roomId: previousRoomId, count: rooms[previousRoomId].users.length });
    }

    // 新しいルームにユーザーを追加
    const currentUser = { id: socketId, status: '休憩中' as '休憩中' | '集中中', studyTime: 0 }; // 初期ステータス
    rooms[roomId].users.push(currentUser);
    // 新しいルームの全ユーザーに更新されたユーザーリストを送信
    this.io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントに新しいルームの人数更新を通知
    this.io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });

    console.log(`User ${socketId} joined room ${roomId}`);
    return { success: true, message: `Joined room ${roomId}` };
  }

  /**
   * ユーザーのステータスと学習時間を更新します。
   * @param {string} socketId - 更新するユーザーのSocket.IO ID。
   * @param {'集中中' | '休憩中'} status - 新しいステータス。
   * @param {number} studyTime - 新しい学習時間。
   * @param {string} roomId - ユーザーが現在いるルームのID。
   */
  public updateUserStatus(socketId: string, status: '集中中' | '休憩中', studyTime: number, roomId: string) {
    if (!roomId || !rooms[roomId]) return;

    const userIndex = rooms[roomId].users.findIndex(user => user.id === socketId);
    if (userIndex > -1) {
      rooms[roomId].users[userIndex].status = status;
      rooms[roomId].users[userIndex].studyTime = studyTime;
    }

    // ルーム内の全ユーザーに更新されたユーザーリストを送信
    this.io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントにルームの人数更新を通知
    this.io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });
  }

  /**
   * ユーザーが切断した際の処理。
   * ルームからユーザーを削除し、関連イベントをブロードキャストします。
   * @param {string} socketId - 切断したユーザーのSocket.IO ID。
   * @param {string} roomId - ユーザーが切断時にいたルームのID。
   */
  public handleUserDisconnect(socketId: string, roomId: string) {
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].users = rooms[roomId].users.filter(user => user.id !== socketId);
    // ルーム内の全ユーザーに更新されたユーザーリストを送信
    this.io.to(roomId).emit('roomUsers', rooms[roomId].users);
    // 全クライアントにルームの人数更新を通知
    this.io.emit('roomCountUpdate', { roomId, count: rooms[roomId].users.length });
  }

  /**
   * 全てのルームのリストを取得します。
   * @returns {Room[]} ルームの配列。
   */
  public getRooms(): Room[] {
    return Object.values(rooms);
  }
}

export default RoomService;