import { Cookies } from 'quasar'
import { env } from "src/config";

const cookieName = "DashboardAuth"

export function logout() {
  Cookies.remove(cookieName, { path: "/" })
  //Почему-то vue-router не работает в этом месте, поэтому используем ванильный JS
  //Возможно потому что useRouter вызывается не внутри компонента
  window.location.href = env.DASHBOARD_FRONTEND_BASE_URL+"/auth"
}


