import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { DEFAULT_LOCALE, isSupportedLocale, setLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { getDashboardPath } from '@/utils/dashboardRedirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    /** Función en vez de string fijo cuando el permiso depende de un
     * parámetro de la ruta (ej. dashboard/:serviceSlug — el slug decide
     * qué permiso "dashboard.<slug>.view" hace falta, no se puede fijar de
     * antemano un único string para todos los servicios posibles). */
    permission?: string | ((to: RouteLocationNormalized) => string)
    /** Rutas solo para visitantes sin sesión (login) — un usuario ya
     * autenticado que navega acá manualmente se redirige a su dashboard en
     * vez de ver el formulario de nuevo. */
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    { path: '/', redirect: `/${DEFAULT_LOCALE}/` },
    {
      path: '/:locale(es|en)/',
      name: 'landing',
      component: () => import('@/modules/landing/views/LandingView.vue'),
    },
    {
      path: '/:locale(es|en)/politica-de-privacidad',
      name: 'privacy-policy',
      component: () => import('@/modules/legal/views/PrivacyPolicyView.vue'),
    },
    {
      path: '/:locale(es|en)/ingresar',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/:locale(es|en)/recuperar-contrasena',
      name: 'forgot-password',
      component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
    },
    {
      path: '/:locale(es|en)/restablecer-contrasena',
      name: 'reset-password',
      component: () => import('@/modules/auth/views/ResetPasswordView.vue'),
    },
    {
      path: '/:locale(es|en)/activar-cuenta',
      name: 'activate-account',
      component: () => import('@/modules/auth/views/ActivateAccountView.vue'),
    },
    {
      path: '/:locale(es|en)/dashboard/completar-perfil',
      name: 'complete-profile',
      component: () => import('@/modules/profile/views/UpdateProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:locale(es|en)/dashboard/resumen',
      name: 'dashboard-resumen',
      component: () => import('@/modules/dashboard/views/ClientHomeView.vue'),
      meta: { requiresAuth: true },
    },
    // Ruta paramétrica: sirve cualquier servicio contratado, no solo Higiene
    // Industrial — sigue funcionando para bookmarks/links viejos a
    // /dashboard/higiene-industrial porque ese slug encaja igual acá.
    {
      path: '/:locale(es|en)/dashboard/:serviceSlug',
      name: 'dashboard-service',
      component: () => import('@/modules/dashboard/views/ClientDashboardView.vue'),
      meta: { requiresAuth: true, permission: (to) => `dashboard.${to.params.serviceSlug}.view` },
    },
    {
      path: '/:locale(es|en)/dashboard/notificaciones',
      name: 'dashboard-notificaciones',
      component: () => import('@/modules/notifications/views/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    // Fase C: navegación admin unificada bajo un sidebar único (Operación +
    // Administración) en vez de repartida entre banner y rutas sueltas —
    // ver docs/superpowers/specs si se documenta después.
    {
      path: '/:locale(es|en)/dashboard/admin',
      component: () => import('@/layouts/AdminShell.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'admin-dashboard' } },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/modules/dashboard/views/AdminDashboardView.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
        {
          path: 'operacion/:orgId?/:serviceSlug?',
          name: 'admin-operacion',
          component: () => import('@/modules/dashboard/views/AdminOperacionView.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
        {
          path: 'clientes',
          name: 'admin-clientes',
          component: () => import('@/modules/clients/views/ClientsListView.vue'),
          meta: { permission: 'platform.organizations.manage' },
        },
        // "Empresas" y "Cuentas" se fusionaron en una sola pestaña "Clientes"
        // — estos puentes evitan romper enlaces/marcadores de antes de ese
        // ajuste. El formulario de "Crear empresa" también vive en un modal
        // dentro de este mismo listado, no en una ruta aparte.
        { path: 'empresas', redirect: { name: 'admin-clientes' } },
        { path: 'empresas/crear', redirect: { name: 'admin-clientes' } },
        { path: 'cuentas', redirect: { name: 'admin-clientes' } },
        {
          path: 'servicios',
          name: 'admin-servicios',
          component: () => import('@/modules/services/views/ServicesListView.vue'),
          meta: { permission: 'platform.services.manage' },
        },
        {
          path: 'servicios/:serviceSlug/variables',
          name: 'admin-variable-catalog',
          component: () => import('@/modules/services/views/VariableCatalogView.vue'),
          meta: { permission: 'platform.variables.manage' },
        },
        {
          path: 'notificaciones',
          name: 'admin-notificaciones',
          component: () => import('@/modules/notifications/components/NotificationsPanel.vue'),
          // Sin permiso específico de gestión (es la bandeja propia del
          // admin, no una acción administrativa), pero igual solo para
          // personal de plataforma — nunca para un cliente. Mismo permiso
          // que ya gatea la ruta por defecto del shell admin (operacion).
          meta: { permission: 'platform.variables.upload' },
        },
        {
          path: 'notificaciones/gestion',
          name: 'admin-gestion-notificaciones',
          component: () => import('@/modules/notifications/components/NotificationsAdminPanel.vue'),
          meta: { permission: 'platform.notifications.manage' },
        },
        {
          path: 'mi-perfil',
          name: 'admin-mi-perfil',
          component: () => import('@/modules/profile/components/MyProfilePanel.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
        {
          path: 'configuracion',
          name: 'admin-configuracion',
          component: () => import('@/modules/settings/components/GeneralSettingsPanel.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
      ],
    },
    // Puente de compatibilidad: la vista de administración de Higiene
    // Industrial vivía en esta ruta de nivel raíz antes de la Fase C.
    {
      path: '/:locale(es|en)/admin/higiene-industrial',
      redirect: (to) => `/${to.params.locale}/dashboard/admin/operacion`,
    },
    // El backend genera estos links SIN prefijo de idioma (no conoce el
    // locale del usuario): FRONTEND_URL/restablecer-contrasena?token=... —
    // sin esta ruta puente, caerían en el catch-all de abajo y el token se
    // perdería.
    {
      path: '/restablecer-contrasena',
      redirect: (to) => ({ path: `/${DEFAULT_LOCALE}/restablecer-contrasena`, query: to.query }),
    },
    {
      path: '/activar-cuenta',
      redirect: (to) => ({ path: `/${DEFAULT_LOCALE}/activar-cuenta`, query: to.query }),
    },
    { path: '/:pathMatch(.*)*', redirect: `/${DEFAULT_LOCALE}/` },
  ],
})

router.beforeEach(async (to) => {
  const rawLocale = to.params.locale
  const locale = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale
  if (!isSupportedLocale(locale)) return `/${DEFAULT_LOCALE}/`
  await setLocale(locale)

  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    if (auth.isAuthenticated === null) await auth.fetchMe()
    if (!auth.isAuthenticated) return `/${locale}/ingresar`

    // Fase B.5: cargo/teléfono obligatorios en el primer login — bloquea
    // cualquier otra ruta protegida hasta completarlos. Se excluye a sí
    // misma para no crear un loop de redirect.
    if (auth.mustUpdateProfile && to.name !== 'complete-profile') {
      return `/${locale}/dashboard/completar-perfil`
    }

    const permission = typeof to.meta.permission === 'function' ? to.meta.permission(to) : to.meta.permission
    if (permission && !auth.hasPermission(permission)) return `/${locale}/`
  }

  if (to.meta.guestOnly) {
    const auth = useAuthStore()
    if (auth.isAuthenticated === null) await auth.fetchMe()
    if (auth.isAuthenticated) return getDashboardPath(auth, locale)
  }

  return true
})

export default router
