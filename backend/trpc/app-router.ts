import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { usersRouter } from "./routes/users";
import { woocommerceRouter } from "./routes/woocommerce";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  users: usersRouter,
  woocommerce: woocommerceRouter,
});

export type AppRouter = typeof appRouter;
