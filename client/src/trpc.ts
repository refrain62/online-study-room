import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/router'; // バックエンドのルーターの型をインポート

export const trpc = createTRPCReact<AppRouter>();
