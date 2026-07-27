import { defineStore } from 'pinia'
import { apiClient } from '@/services/api'

export interface CurrentUser {
  id: string
  documentNumber: string
  nombre: string
}

interface AuthState {
  user: CurrentUser | null
  organizationId: string | null
  permissions: string[]
  /** null = todavía no se consultó /api/auth/me; false/true = resultado conocido. */
  isAuthenticated: boolean | null
  /** true tras login/fetchMe si la cuenta debe completar su perfil antes de
   * usar el resto del dashboard (ver Fase B.5 — todavía sin guard aplicado). */
  mustUpdateProfile: boolean
}

/**
 * La sesión vive en cookies httpOnly — este store nunca guarda el token, solo
 * el resultado de preguntarle al backend "quién soy" (GET /api/auth/me).
 * El router lo consulta antes de entrar a una ruta protegida.
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    organizationId: null,
    permissions: [],
    isAuthenticated: null,
    mustUpdateProfile: false,
  }),

  getters: {
    hasPermission: (state) => (key: string) => state.permissions.includes('*') || state.permissions.includes(key),
    /** Clave de i18n (no el texto ya traducido) para el badge del navbar —
     * deriva del mismo permiso que ya distingue super-admin/cliente en el
     * guard de rutas y el redirect post-login, en vez de duplicar la lógica.
     * El componente que la consume decide cuándo traducirla con t(). */
    roleLabelKey: (state): string =>
      state.permissions.includes('*') || state.permissions.includes('platform.variables.upload')
        ? 'dashboard.roleLabel.superAdmin'
        : 'dashboard.roleLabel.cliente',
  },

  actions: {
    async fetchMe() {
      try {
        const { data } = await apiClient.get('/auth/me')
        this.user = data.user
        this.organizationId = data.organizationId
        this.permissions = data.permissions
        this.mustUpdateProfile = data.mustUpdateProfile
        this.isAuthenticated = true
      } catch {
        this.$reset()
        this.isAuthenticated = false
      }
      return this.isAuthenticated
    },

    async logout() {
      try {
        await apiClient.post('/auth/logout')
      } finally {
        this.$reset()
        this.isAuthenticated = false
      }
    },
  },
})
