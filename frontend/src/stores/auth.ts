import { defineStore } from 'pinia'
import { apiClient } from '@/services/api'

export interface CurrentUser {
  id: string
  documentNumber: string
  nombre: string
}

export interface OrganizationBranding {
  primaryColor: string
  secondaryColor: string
}

interface AuthState {
  user: CurrentUser | null
  organizationId: string | null
  permissions: string[]
  /** null = todavía no se consultó /api/auth/me; false/true = resultado conocido. */
  isAuthenticated: boolean | null
  /** true tras login/fetchMe si la cuenta debe completar su perfil (branding)
   * antes de usar el resto del dashboard — el guard de rutas del frontend lo
   * fuerza (ver router/index.ts). */
  mustUpdateProfile: boolean
  branding: OrganizationBranding | null
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
    branding: null,
  }),

  getters: {
    hasPermission: (state) => (key: string) => state.permissions.includes('*') || state.permissions.includes(key),
    // Único rol con permiso '*' (super-admin/adminsystem, ver prisma/seed.ts
    // ROLES) — cliente siempre tiene permisos acotados a "dashboard.*", nunca
    // el comodín. Chequeo limpio para renderizado condicional por rol.
    isAdmin: (state): boolean => state.permissions.includes('*'),
    roleLabelKey: (state): string =>
      state.permissions.includes('*') || state.permissions.includes('platform.variables.upload')
        ? 'dashboard.roleLabel.superAdmin'
        : 'dashboard.roleLabel.cliente',
    /** Variables CSS del branding del cliente — vacío para admin o para un
     * cliente que aún no ha guardado logo/colores, así los estilos que las
     * referencian caen a su valor de respaldo (--org-primary,#hex) sin
     * ninguna lógica condicional adicional en cada componente. */
    brandingCssVars: (state): Record<string, string> =>
      state.branding
        ? { '--org-primary': state.branding.primaryColor, '--org-secondary': state.branding.secondaryColor }
        : {},
  },

  actions: {
    async fetchMe() {
      try {
        const { data } = await apiClient.get('/auth/me')
        this.user = data.user
        this.organizationId = data.organizationId
        this.permissions = data.permissions
        this.mustUpdateProfile = data.mustUpdateProfile
        this.branding = data.branding
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
