import axios, { type InternalAxiosRequestConfig } from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // 35s: el backend en el free tier de Render "duerme" tras 15 min sin tráfico
  // y la primera petición tras eso puede tardar 30-50s en despertar. Un timeout
  // corto perdería ese primer lead con un error de red aunque el backend sí
  // responda, solo que tarde.
  timeout: 35_000,
  // La sesión vive en cookies httpOnly (access + refresh token), no en un
  // header Authorization — sin esto el navegador no las envía ni las guarda
  // en requests cross-origin (dev: localhost:5173 → localhost:3000).
  withCredentials: true,
})

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean
}

// Endpoints donde un 401 es una respuesta esperada del propio flujo de auth
// (credenciales inválidas, refresh sin cookie, etc.), no una señal de "sesión
// expirada a mitad de uso" — intentar refrescar ahí sería o un loop (refresh
// llamándose a sí mismo) o ruido inútil.
const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/password-reset']

function redirectToLogin() {
  const match = window.location.pathname.match(/^\/(es|en)(\/|$)/)
  const locale = match ? match[1] : 'es'
  const loginPath = `/${locale}/ingresar`
  // Sin este chequeo: la propia página de login dispara fetchMe() al cargar
  // (guard "guestOnly" en router/index.ts) para saber si redirigir a un
  // usuario ya logueado — un visitante sin sesión recibe 401 ahí también, y
  // recargar a la MISMA ruta de login retrigger-ea el mismo fetchMe(),
  // reload tras reload sin parar (loop real, visto en pruebas: cientos de
  // peticiones por segundo hasta agotar el rate limit de /auth/refresh).
  if (window.location.pathname === loginPath) return
  window.location.href = loginPath
}

// El access token dura 15 min — sin esto, una petición que falla a mitad de
// sesión por token vencido solo mostraba un error genérico en el componente,
// dejando al usuario "atrapado" en la pantalla hasta que recargaba la página
// a mano. Un solo intento de refresh compartido entre peticiones concurrentes
// (el refresh token rota y no es reutilizable: dos llamadas simultáneas a
// /auth/refresh harían que la segunda falle con el token ya revocado por la
// primera).
let refreshPromise: Promise<boolean> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableRequestConfig | undefined
    const status = error.response?.status

    if (status !== 401 || !config || AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH.some((path) => config.url?.includes(path))) {
      return Promise.reject(error)
    }

    if (config._retriedAfterRefresh) {
      redirectToLogin()
      return Promise.reject(error)
    }
    config._retriedAfterRefresh = true

    refreshPromise ??= apiClient
      .post('/auth/refresh')
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })

    const refreshed = await refreshPromise
    if (!refreshed) {
      redirectToLogin()
      return Promise.reject(error)
    }

    return apiClient(config)
  },
)
