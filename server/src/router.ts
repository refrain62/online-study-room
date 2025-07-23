import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  // ここにプロシージャを定義していく
  health: publicProcedure
    .query(() => {
      return { status: 'ok' };
    }),
});

export type AppRouter = typeof appRouter;
