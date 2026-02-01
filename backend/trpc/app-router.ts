import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { usersRouter } from "./routes/users";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
