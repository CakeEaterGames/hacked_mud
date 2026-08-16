import axios from "axios";
import { env } from "src/config";
import { removeSlashes } from "./url.utils";


export const backendAxios = axios.create({
  baseURL: removeSlashes(env.API_FULL_URL),
  headers: { 'Content-Type': 'application/json', "Accept": "application/json" },
  withCredentials: true, // sending/receiving cookies
})


// Response interceptor middleware
backendAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const url = "/" + removeSlashes(env.DASHBOARD_FRONTEND_BASE_URL) + "/auth"
        window.location.href = url
      }
    }
    return Promise.reject(error as Error);
  }
);

// Looking for cookies
backendAxios.interceptors.response.use(
  (response) => {
    // initAuth()
    return response
  },
  async (error) => {
    return Promise.reject(error as Error);
  }
);





