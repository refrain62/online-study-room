import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { z } from 'zod';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure
    .query(() => {
      return { status: 'ok' };
    }),
  saveStudyRecord: publicProcedure
    .input(z.object({
      userId: z.string(),
      studyTime: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      console.log(`User ${input.userId} studied for ${input.studyTime} seconds.`);
      // ここにデータベース保存ロジックなどを追加
      return { success: true, message: 'Study record saved' };
    }),
});

export type AppRouter = typeof appRouter;
