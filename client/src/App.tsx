import { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material';
import { trpc } from './trpc';
import { io } from 'socket.io-client';

function App() {
  const health = trpc.health.useQuery();
  const [socketStatus, setSocketStatus] = useState('Connecting...');

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      setSocketStatus('Connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>参加者リスト</Typography>
              {/* ここにリアルタイム参加者リストを表示 */}
              <Typography>（まだ参加者はいません）</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>個人タイマー</Typography>
              <Typography variant="h3" align="center" sx={{ my: 2 }}>
                00:00:00
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button variant="contained" color="primary">開始</Button>
                <Button variant="outlined" color="secondary">停止</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;