import { useEffect, useState, useRef } from 'react';
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material';
import { trpc } from './trpc';
import { io, Socket } from 'socket.io-client';

interface UserStatus {
  id: string;
  status: '集中中' | '休憩中';
  studyTime: number;
}

function App() {
  const health = trpc.health.useQuery();
  const [socketStatus, setSocketStatus] = useState('Connecting...');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [users, setUsers] = useState<UserStatus[]>([]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('Connected');
      // 接続時に自分のステータスを送信
      socket.emit('updateStatus', { id: socket.id, status: '休憩中', studyTime: 0 });
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    socket.on('roomUsers', (data: UserStatus[]) => {
      setUsers(data);
    });

    return () => {
      socket.disconnect();
      // コンポーネントアンマウント時に学習記録を保存
      if (socketRef.current && timerSeconds > 0) {
        trpc.saveStudyRecord.mutate({
          userId: socketRef.current.id,
          studyTime: timerSeconds,
        });
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimerSeconds((prevSeconds) => {
          const newSeconds = prevSeconds + 1;
          if (socketRef.current) {
            socketRef.current.emit('updateStatus', { id: socketRef.current.id, status: '集中中', studyTime: newSeconds });
          }
          return newSeconds;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (socketRef.current) {
        socketRef.current.emit('updateStatus', { id: socketRef.current.id, status: '休憩中', studyTime: timerSeconds });
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timerSeconds]); // timerSeconds を依存配列に追加

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
  };

  const handleStop = () => {
    setIsRunning(false);
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

        <Grid container spacing={2} sx={{ mt: 4 }}>
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
          <Grid xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>個人タイマー</Typography>
              <Typography variant="h3" align="center" sx={{ my: 2 }}>
                {formatTime(timerSeconds)}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button variant="contained" color="primary" onClick={handleStart} disabled={isRunning}>開始</Button>
                <Button variant="outlined" color="secondary" onClick={handleStop} disabled={!isRunning}>停止</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;

