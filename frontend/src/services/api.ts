import axios from 'axios'

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
