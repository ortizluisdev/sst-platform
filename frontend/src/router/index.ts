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
