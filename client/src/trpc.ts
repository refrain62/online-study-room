import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/router'; // バックエンドのルーターの型をインポート

/**
 * tRPCクライアントを初期化します。
 * これにより、Reactコンポーネント内で型安全なtRPCプロシージャを呼び出すことができます。
 * AppRouterの型定義をインポートすることで、バックエンドのAPIエンドポイントの型情報が利用可能になります。
 */
export const trpc = createTRPCReact<AppRouter>();
