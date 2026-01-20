import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { clientsRouter } from "./routes/clients";
import { machinesRouter } from "./routes/machines";
import { dataRouter } from "./routes/data";
import { syncRouter } from "./routes/sync";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  clients: clientsRouter,
  machines: machinesRouter,
  data: dataRouter,
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
