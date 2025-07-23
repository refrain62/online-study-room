import { useEffect, useState, useRef } from 'react';
import { Container, Typography, Box, Button, Grid, Paper, TextField, List, ListItem, ListItemText } from '@mui/material';
import { trpc } from './trpc';
import { io, Socket } from 'socket.io-client';

interface UserStatus {
  id: string;
  status: '集中中' | '休憩中';
  studyTime: number;
}

interface Room {
  id: string;
  name: string;
  users: UserStatus[];
}

function App() {
  const health = trpc.health.useQuery();
  const [socketStatus, setSocketStatus] = useState('Connecting...');
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomNameInput, setRoomNameInput] = useState('');

  const { data: rooms, refetch: refetchRooms } = trpc.getRooms.useQuery();
  const createRoomMutation = trpc.createRoom.useMutation();
  const joinRoomMutation = trpc.joinRoom.useMutation();

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('Connected');
      setMySocketId(socket.id);
      console.log('Connected with socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    socket.on('roomUsers', (data: UserStatus[]) => {
      setUsers(data);
    });

    // 新しいイベントハンドラを追加
    socket.on('roomCountUpdate', (data: { roomId: string; count: number }) => {
      refetchRooms();
    });

    return () => {
      socket.disconnect();
    };
  }, [refetchRooms]); // timerSeconds を依存配列に追加

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimerSeconds((prevSeconds) => {
          const newSeconds = prevSeconds + 1;
          // 5秒に1回だけステータスを更新
          if (newSeconds % 5 === 0 && socketRef.current && currentRoomId) {
            socketRef.current.emit('updateStatus', { status: '集中中', studyTime: newSeconds, roomId: currentRoomId });
          }
          return newSeconds;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, currentRoomId]); // timerSeconds を依存配列から削除

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

  const handleStart = () => {
    setIsRunning(true);
    if (socketRef.current && currentRoomId) {
      socketRef.current.emit('updateStatus', { status: '集中中', studyTime: timerSeconds, roomId: currentRoomId });
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    if (socketRef.current && currentRoomId) {
      socketRef.current.emit('updateStatus', { status: '休憩中', studyTime: timerSeconds, roomId: currentRoomId });
    }
  };

  const handleCreateRoom = async () => {
    if (!roomNameInput.trim()) return;
    try {
      const newRoom = await createRoomMutation.mutateAsync({ roomName: roomNameInput });
      await handleJoinRoom(newRoom.id);
      setRoomNameInput('');
      refetchRooms();
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!socketRef.current) return;
    try {
      await joinRoomMutation.mutateAsync({ roomId, socketId: socketRef.current.id });
      setCurrentRoomId(roomId);
      // ルーム参加後、現在のステータスを送信
      socketRef.current.emit('updateStatus', { status: isRunning ? '集中中' : '休憩中', studyTime: timerSeconds, roomId: roomId });
      refetchRooms();
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