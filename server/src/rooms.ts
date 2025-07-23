/**
 * ルームの構造を定義するインターフェース。
 * @property {string} id - ルームの一意なID。
 * @property {string} name - ルームの名前。
 * @property {Array<Object>} users - ルームに参加しているユーザーのリスト。
 * @property {string} users[].id - ユーザーのSocket.IO ID。
 * @property {'集中中' | '休憩中'} users[].status - ユーザーの現在のステータス（集中中または休憩中）。
 * @property {number} users[].studyTime - ユーザーの学習時間（秒）。
 */
interface Room {
  id: string;
  name: string;
  users: { id: string; status: '集中中' | '休憩中'; studyTime: number }[];
}

/**
 * 全てのルームを管理するオブジェクト。
 * キーはルームID、値はRoomオブジェクト。
 */
const rooms: Record<string, Room> = {};

// デフォルトのルームIDを定義
const defaultRoomId = 'default-room';

// アプリケーション起動時にデフォルトルームを作成し、roomsオブジェクトに追加
rooms[defaultRoomId] = {
  id: defaultRoomId,
  name: 'デフォルト学習室',
  users: [],
};

export { rooms, Room, defaultRoomId };
