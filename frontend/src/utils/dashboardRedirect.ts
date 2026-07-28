import type { useAuthStore } from '@/stores/auth'

/**
 * A qué dashboard mandar a un usuario ya autenticado — misma lógica de
 * permisos que decide el redirect post-login (LoginView.vue) y el guard de
 * rutas "guestOnly" (router/index.ts), centralizada acá para que no se
 * desincronicen si cambian las claves de permiso.
 */
export function getDashboardPath(auth: ReturnType<typeof useAuthStore>, locale: string): string {
  if (auth.hasPermission('platform.variables.upload')) return `/${locale}/dashboard/admin/operacion`
  if (auth.hasPermission('dashboard.higiene-industrial.view')) return `/${locale}/dashboard/higiene-industrial`
  return `/${locale}/`
}
