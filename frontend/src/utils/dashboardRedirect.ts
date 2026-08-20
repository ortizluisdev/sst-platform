import type { useAuthStore } from '@/stores/auth'

/**
 * A qué dashboard mandar a un usuario ya autenticado — misma lógica de
 * permisos que decide el redirect post-login (LoginView.vue) y el guard de
 * rutas "guestOnly" (router/index.ts), centralizada acá para que no se
 * desincronicen si cambian las claves de permiso.
 */
export function getDashboardPath(auth: ReturnType<typeof useAuthStore>, locale: string): string {
  if (auth.hasPermission('platform.variables.upload')) return `/${locale}/dashboard/admin/dashboard`
  // Un cliente puede tener más de un servicio contratado (permisos
  // "dashboard.<slug>.view") — no hay forma de saber cuál es "el" servicio
  // sin asumir uno, así que se toma el primero que aparezca y se deja que
  // DashboardSidebar.vue muestre el selector si hay más de uno.
  const firstServicePermission = auth.permissions.find((p) => p.startsWith('dashboard.') && p.endsWith('.view'))
  if (firstServicePermission) {
    const slug = firstServicePermission.slice('dashboard.'.length, -'.view'.length)
    return `/${locale}/dashboard/${slug}`
  }
  return `/${locale}/`
}
