import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
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
