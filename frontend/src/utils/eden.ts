import type { apiAppTypes } from "@backend/apiApp";
import { treaty } from "@elysia/eden";
import { removeSlashes } from "./url.utils";
import { env } from "../config"

export const backend = treaty<apiAppTypes>(removeSlashes(env.API_FULL_URL))