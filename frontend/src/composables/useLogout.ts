import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

/** Compartido entre DashboardLayout.vue (navbar, páginas sin sidebar) y
 * AdminNavSidebar.vue/DashboardSidebar.vue (esquina inferior izquierda,
 * 2026-08, "quitar cerrar sesión del navbar") — mismo comportamiento en
 * los tres: cierra sesión y vuelve al login en el idioma actual. */
export function useLogout() {
  const auth = useAuthStore()
  const router = useRouter()
  const { locale } = useI18n()

  return async function logout() {
    await auth.logout()
    router.push(`/${locale.value}/ingresar`)
  }
}
