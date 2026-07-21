import { createRouter, createWebHistory } from 'vue-router'
import { DEFAULT_LOCALE, isSupportedLocale, setLocale } from '@/i18n'

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
    },
    {
      path: '/:locale(es|en)/registro',
      name: 'register',
      component: () => import('@/modules/auth/views/RegisterView.vue'),
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
    // El backend genera el link de reset SIN prefijo de idioma (no conoce el
    // locale del usuario): FRONTEND_URL/restablecer-contrasena?token=...
    // Sin esta ruta puente, ese link caería en el catch-all de abajo y el
    // token se perdería.
    {
      path: '/restablecer-contrasena',
      redirect: (to) => ({ path: `/${DEFAULT_LOCALE}/restablecer-contrasena`, query: to.query }),
    },
    { path: '/:pathMatch(.*)*', redirect: `/${DEFAULT_LOCALE}/` },
  ],
})

router.beforeEach(async (to) => {
  const rawLocale = to.params.locale
  const locale = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale
  if (isSupportedLocale(locale)) {
    await setLocale(locale)
    return true
  }
  return `/${DEFAULT_LOCALE}/`
})

export default router
