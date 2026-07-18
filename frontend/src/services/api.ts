import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // 35s: el backend en el free tier de Render "duerme" tras 15 min sin tráfico
  // y la primera petición tras eso puede tardar 30-50s en despertar. Un timeout
  // corto perdería ese primer lead con un error de red aunque el backend sí
  // responda, solo que tarde.
  timeout: 35_000,
})

/**
 * No-op today — there is no auth store yet. Once the dashboard phase adds one,
 * read the token here and attach it, without touching call sites.
 */
apiClient.interceptors.request.use((config) => {
  const token: string | null = null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
