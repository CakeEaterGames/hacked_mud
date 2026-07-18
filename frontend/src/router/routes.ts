import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: async () => import("layouts/MainLayout.vue"),
    children: [{ path: "", component: async () => import("pages/MainPage.vue") }],
  },
  {
    path: "/:catchAll(.*)*",
    component: async () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
