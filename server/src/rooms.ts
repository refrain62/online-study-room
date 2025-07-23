interface Room {
  id: string;
  name: string;
  users: { id: string; status: '集中中' | '休憩中'; studyTime: number }[];
}

const rooms: Record<string, Room> = {};

// デフォルトのルームを作成
const defaultRoomId = 'default-room';
rooms[defaultRoomId] = {
  id: defaultRoomId,
  name: 'デフォルト学習室',
  users: [],
};

export { rooms, Room, defaultRoomId };
