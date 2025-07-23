import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import theme from './theme';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './trpc';
import { httpBatchLink } from '@trpc/client';

// React QueryのQueryClientを初期化
const queryClient = new QueryClient();

// tRPCクライアントを初期化
const trpcClient = trpc.createClient({
  links: [
    // tRPCのHTTPバッチリンクを設定
    httpBatchLink({
      url: 'http://localhost:3000/trpc', // tRPCサーバーのエンドポイント
    }),
  ],
});

// ReactアプリケーションをDOMにレンダリング
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* tRPCプロバイダーでアプリケーションをラップし、tRPCクライアントとQueryClientを渡す */}
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {/* React Queryプロバイダーでアプリケーションをラップし、QueryClientを渡す */}
      <QueryClientProvider client={queryClient}>
        {/* Material-UIのテーマプロバイダーでアプリケーションをラップし、テーマを適用 */}
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);

