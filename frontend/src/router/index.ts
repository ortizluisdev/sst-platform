import { createRouter, createWebHistory } from 'vue-router'
import { DEFAULT_LOCALE, isSupportedLocale, setLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { getDashboardPath } from '@/utils/dashboardRedirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permission?: string
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
      path: '/:locale(es|en)/dashboard/higiene-industrial',
      name: 'dashboard-higiene-industrial',
      component: () => import('@/modules/dashboard/views/ClientDashboardView.vue'),
      meta: { requiresAuth: true, permission: 'dashboard.higiene-industrial.view' },
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
        { path: '', redirect: { name: 'admin-operacion' } },
        {
          path: 'operacion/:orgId?/:serviceSlug?',
          name: 'admin-operacion',
          component: () => import('@/modules/dashboard/views/AdminOperacionView.vue'),
          meta: { permission: 'platform.variables.upload' },
        },
        {
          path: 'empresas',
          name: 'admin-empresas',
          component: () => import('@/modules/organizations/views/OrganizationsListView.vue'),
          meta: { permission: 'platform.organizations.manage' },
        },
        // El formulario de "Crear empresa" ahora vive en un modal dentro del
        // listado — este puente evita romper enlaces/marcadores viejos.
        { path: 'empresas/crear', redirect: { name: 'admin-empresas' } },
        {
          path: 'cuentas',
          name: 'admin-gestion-cuentas',
          component: () => import('@/modules/notifications/views/AccountManagementView.vue'),
          meta: { permission: 'platform.users.approve' },
        },
        {
          path: 'servicios',
          name: 'admin-servicios',
          component: () => import('@/modules/services/views/ServicesListView.vue'),
          meta: { permission: 'platform.services.manage' },
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

    const permission = to.meta.permission as string | undefined
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
