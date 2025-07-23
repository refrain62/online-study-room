# オンライン学習室Webアプリ 開発仕様書兼作業記録

## 1. 概要
高校生をターゲットとし、自宅にいながら図書館の自習室のような一体感と適度な緊張感の中で学習に集中できる環境を提供することを目的としたWebアプリケーション。

## 2. 主要機能要件
- **学習ルーム機能:** ユーザーが学習ルームを作成、または既存のルームに参加できる。
- **参加者リストとリアルタイムステータス表示:**
    - ルーム内の参加者を一覧表示する。
    - 各参加者の現在の状態（例：「集中中」「休憩中」）と、そのセッションでの累計学習時間をリアルタイムで表示する。
- **個人用カウントアップタイマー:**
    - 各ユーザーが個別に操作できるストップウォッチ形式のタイマー。
    - タイマーの開始/停止に応じて、ステータスがリアルタイムで他の参加者に共有される。
- **学習記録機能:**
    - ルーム退出時に、そのセッションでの合計学習時間をサーバーに記録する。

## 3. 技術スタック
- **パッケージマネージャー:** pnpm
- **フロントエンド:** React (TypeScript), Vite, Material-UI (MUI)
- **バックエンド:** Fastify (Node.js)
- **API通信:** tRPC
- **リアルタイム通信:** WebSocket (socket.io)

## 4. プロジェクト構成 (現在)
```
online-study-room/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── theme.ts
│   │   └── trpc.ts
│   ├── .eslintrc.cjs
│   ├── index.html
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   └── vite.config.ts
└── server/
    ├── src/
    │   ├── context.ts
    │   ├── index.ts
    │   ├── router.ts
    │   └── users.ts (仮)
    ├── package.json
    ├── pnpm-lock.yaml
    └── tsconfig.json
```

## 5. 作業計画と進捗

### ステップ1: 環境構築
- **ステータス:** 完了
- **完了済みの作業:**
    - `online-study-room` プロジェクトディレクトリの作成。
    - `client` および `server` ディレクトリの作成。
    - `client` ディレクトリにて、`pnpm` を使用してVite (React+TS)プロジェクトを初期化。
    - `client` ディレクトリに必要なライブラリ (`@mui/material`, `@trpc/client`, `socket.io-client`, `@tanstack/react-query`等) を`pnpm`でインストール。
    - `server` ディレクトリで `pnpm init` を実行し、Node.jsプロジェクトを初期化。
    - `server` ディレクトリに必要なライブラリ (Fastify, tRPC, Zod, Socket.IO等) を`pnpm`でインストール。

### ステップ2: バックエンドAPIとtRPCルーターの定義
- **ステータス:** 完了
- **完了済みの作業:**
    - `server/src` ディレクトリの作成。
    - `server/src/index.ts` (Fastifyサーバーのエントリーポイント) の作成と基本的な設定。
    - `server/src/router.ts` (tRPCルーターの定義) の作成と基本的な設定。
    - `server/src/context.ts` (tRPCコンテキストの定義) の作成。
    - `server/tsconfig.json` の作成。
    - `server/package.json` に `dev` スクリプトを追加。
    - `server/src/index.ts` の `fastifyTRPCPlugin` のオプションの修正。
    - `server/src/index.ts` に `@fastify/cors` を追加し、CORSを有効化。
    - `server/src/router.ts` に `saveStudyRecord` tRPCプロシージャを追加。

### ステップ3: UIコンポーネント作成
- **ステータス:** 完了
- **完了済みの作業:**
    - `client/src/theme.ts` (MUIテーマの定義) の作成。
    - `client/src/trpc.ts` (tRPCクライアントの初期化) の作成。
    - `client/src/main.tsx` に `ThemeProvider` と `QueryClientProvider` を設定。
    - `client/src/App.tsx` をオンライン学習室の基本的なUIに置き換え。
    - `client/src/App.tsx` のMUI Gridに関する警告を修正。
    - `client/src/App.tsx` に個人タイマーのロジックとUIを実装。

### ステップ4: 機能実装 (フロントエンド + バックエンド連携)
- **ステータス:** 完了
- **完了済みの作業:**
    - タイマーの開始/停止イベントをトリガーとしたWebSocket経由でのステータスと学習時間のサーバーへの送信を実装。
    - 参加者リストのリアルタイム更新を実装。
    - ルーム退出時に学習記録を保存するtRPCプロシージャの呼び出しを実装。

### ステップ5: 統合とテスト
- **ステータス:** 未着手

## 6. 次の作業
アプリケーション全体の動作確認とテストを行う。