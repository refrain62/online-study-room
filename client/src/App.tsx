import { useEffect, useState, useRef } from 'react';
import { Container, Typography, Box, Button, Grid, Paper, TextField, List, ListItem, ListItemText } from '@mui/material';
import { trpc } from './trpc';
import { io, Socket } from 'socket.io-client';

/**
 * ユーザーのステータス情報を定義するインターフェース。
 */
interface UserStatus {
  id: string;
  status: '集中中' | '休憩中';
  studyTime: number;
}

/**
 * ルーム情報を定義するインターフェース。
 */
interface Room {
  id: string;
  name: string;
  users: UserStatus[];
}

/**
 * メインアプリケーションコンポーネント。
 * オンライン学習室のUIとロジックを管理します。
 */
function App() {
  // tRPCのヘルスチェッククエリ
  const health = trpc.health.useQuery();

  // ステート変数
  const [socketStatus, setSocketStatus] = useState('Connecting...'); // Socket.IO接続ステータス
  const [mySocketId, setMySocketId] = useState<string | null>(null); // 自身のSocket.IO ID
  const [timerSeconds, setTimerSeconds] = useState(0); // タイマーの秒数
  const [isRunning, setIsRunning] = useState(false); // タイマーが実行中かどうかのフラグ
  const intervalRef = useRef<number | null>(null); // タイマーのインターバルID
  const socketRef = useRef<Socket | null>(null); // Socket.IOクライアントインスタンス
  const [users, setUsers] = useState<UserStatus[]>([]); // 現在のルームのユーザーリスト
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null); // 現在参加しているルームのID
  const [roomNameInput, setRoomNameInput] = useState(''); // 新しいルーム名入力フィールドの値

  // tRPCのルーム関連クエリとミューテーション
  const { data: rooms, refetch: refetchRooms } = trpc.getRooms.useQuery(); // ルーム一覧取得
  const createRoomMutation = trpc.createRoom.useMutation(); // ルーム作成ミューテーション
  const joinRoomMutation = trpc.joinRoom.useMutation(); // ルーム参加ミューテーション

  /**
   * Socket.IOの接続とイベントリスナーの設定。
   * コンポーネントのマウント時に一度だけ実行されます。
   */
  useEffect(() => {
    // Socket.IOサーバーに接続
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    // 接続成功時のイベントハンドラ
    socket.on('connect', () => {
      setSocketStatus('Connected');
      setMySocketId(socket.id);
      console.log('Connected with socket ID:', socket.id);
    });

    // 切断時のイベントハンドラ
    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    // ルーム内のユーザーリスト更新イベントハンドラ
    socket.on('roomUsers', (data: UserStatus[]) => {
      setUsers(data);
    });

    // ルームの人数更新イベントハンドラ（ルーム一覧を再フェッチ）
    socket.on('roomCountUpdate', (data: { roomId: string; count: number }) => {
      refetchRooms();
    });

    // クリーンアップ関数：コンポーネントのアンマウント時にソケットを切断
    return () => {
      socket.disconnect();
    };
  }, [refetchRooms]); // refetchRoomsが変更された場合に再実行

  /**
   * タイマーのロジック。
   * isRunningステートとcurrentRoomIdが変更されたときに実行されます。
   */
  useEffect(() => {
    if (isRunning) {
      // タイマーが実行中の場合、1秒ごとに秒数を更新
      intervalRef.current = window.setInterval(() => {
        setTimerSeconds((prevSeconds) => {
          const newSeconds = prevSeconds + 1;
          // 5秒に1回、サーバーにステータスを更新
          if (newSeconds % 5 === 0 && socketRef.current && currentRoomId) {
            socketRef.current.emit('updateStatus', { status: '集中中', studyTime: newSeconds, roomId: currentRoomId });
          }
          return newSeconds;
        });
      }, 1000);
    } else if (intervalRef.current) {
      // タイマーが停止した場合、インターバルをクリア
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // クリーンアップ関数：コンポーネントのアンマウント時や依存配列の変更時にインターバルをクリア
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, currentRoomId]); // isRunningとcurrentRoomIdが変更された場合に再実行

  /**
   * 秒数をHH:MM:SS形式にフォーマットするヘルパー関数。
   */
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  };

  /**
   * タイマー開始ボタンのハンドラ。
   * タイマーを開始し、サーバーにステータスを送信します。
   */
  const handleStart = () => {
    setIsRunning(true);
    if (socketRef.current && currentRoomId) {
      socketRef.current.emit('updateStatus', { status: '集中中', studyTime: timerSeconds, roomId: currentRoomId });
    }
  };

  /**
   * タイマー停止ボタンのハンドラ。
   * タイマーを停止し、サーバーにステータスを送信します。
   */
  const handleStop = () => {
    setIsRunning(false);
    if (socketRef.current && currentRoomId) {
      socketRef.current.emit('updateStatus', { status: '休憩中', studyTime: timerSeconds, roomId: currentRoomId });
    }
  };

  /**
   * ルーム作成ボタンのハンドラ。
   * 新しいルームを作成し、そのルームに参加します。
   */
  const handleCreateRoom = async () => {
    if (!roomNameInput.trim()) return; // 入力がない場合は何もしない
    try {
      const newRoom = await createRoomMutation.mutateAsync({ roomName: roomNameInput });
      await handleJoinRoom(newRoom.id); // 作成したルームに参加
      setRoomNameInput(''); // 入力フィールドをクリア
      refetchRooms(); // ルーム一覧を再フェッチ
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  /**
   * ルーム参加ボタンのハンドラ。
   * 指定されたルームに参加し、サーバーにステータスを送信します。
   */
  const handleJoinRoom = async (roomId: string) => {
    if (!socketRef.current) return; // ソケットがない場合は何もしない
    try {
      await joinRoomMutation.mutateAsync({ roomId, socketId: socketRef.current.id });
      setCurrentRoomId(roomId); // 現在のルームIDを更新
      // ルーム参加後、現在のステータスをサーバーに送信
      socketRef.current.emit('updateStatus', { status: isRunning ? '集中中' : '休憩中', studyTime: timerSeconds, roomId: roomId });
      refetchRooms(); // ルーム一覧を再フェッチ
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          オンライン学習室
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          tRPC Health Check: {health.data?.status}
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          Socket.IO Status: {socketStatus}
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          My Socket ID: {mySocketId || 'Connecting...'}
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          現在のルーム: {currentRoomId ? (rooms?.find(room => room.id === currentRoomId)?.name || currentRoomId) : '未参加'}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 4 }}>
          <Grid xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>ルーム一覧</Typography>
              <TextField
                label="新しいルーム名"
                variant="outlined"
                fullWidth
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleCreateRoom} fullWidth sx={{ mb: 2 }}>
                ルームを作成
              </Button>
              <List>
                {rooms?.map((room) => (
                  <ListItem key={room.id} disablePadding>
                    <ListItemText primary={`${room.name} (${room.users.length}人)`} />
                    <Button variant="outlined" onClick={() => handleJoinRoom(room.id)} disabled={currentRoomId === room.id}>
                      参加
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>参加者リスト</Typography>
              {users.length === 0 ? (
                <Typography>（まだ参加者はいません）</Typography>
              ) : (
                users.map((user) => (
                  <Box key={user.id} sx={{ mb: 1 }}>
                    <Typography variant="body1">ID: {user.id.substring(0, 5)}... - ステータス: {user.status} - 時間: {formatTime(user.studyTime)}</Typography>
                  </Box>
                ))
              )}
              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                ※参加者リストは5秒ごとに更新されます。
              </Typography>
            </Paper>
          </Grid>
          <Grid xs={12}>
            <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
              <Typography variant="h5" gutterBottom>個人タイマー</Typography>
              <Typography variant="h3" align="center" sx={{ my: 2 }}>
                {formatTime(timerSeconds)}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button variant="contained" color="primary" onClick={handleStart} disabled={isRunning || !currentRoomId}>開始</Button>
                <Button variant="outlined" color="secondary" onClick={handleStop} disabled={!isRunning || !currentRoomId}>停止</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;
