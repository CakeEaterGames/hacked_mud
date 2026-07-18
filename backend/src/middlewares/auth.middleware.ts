import Elysia, { status } from "elysia";
import jwt from "jsonwebtoken";
import { env } from "@backend/config";

const SECRET = env.JWT_SECRET;

type authConfig = {
  requreAuth: boolean;
};

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .derive(({ cookie: { DashboardAuth } }) => {
    if (!DashboardAuth) return { dashboardSession: null };
    try {
      const dashboardSession = jwt.verify(DashboardAuth.value as string, SECRET); //as DashboardSessionJwt;
      return { dashboardSession };
    } catch (e) {
      void e;
      return { dashboardSession: null };
    }
  })
  .macro({
    authConfig: (config: authConfig) => ({
      beforeHandle({ dashboardSession }) {
        if (!config.requreAuth) return;
        if (!dashboardSession) throw status("Unauthorized");
      },
    }),
  })
  .as("scoped");
