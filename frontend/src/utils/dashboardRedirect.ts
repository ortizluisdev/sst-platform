import type { useAuthStore } from '@/stores/auth'

/**
 * A qué dashboard mandar a un usuario ya autenticado — misma lógica de
 * permisos que decide el redirect post-login (LoginView.vue) y el guard de
 * rutas "guestOnly" (router/index.ts), centralizada acá para que no se
 * desincronicen si cambian las claves de permiso.
 */
export function getDashboardPath(auth: ReturnType<typeof useAuthStore>, locale: string): string {
  if (auth.hasPermission('platform.variables.upload')) return `/${locale}/dashboard/admin/dashboard`
  // Un cliente con al menos un servicio contratado aterriza en su propio
  // "Dashboard" de resumen (ClientHomeView.vue) — igual que Admin siempre
  // aterriza en /dashboard/admin/dashboard, no en un servicio específico.
  // Antes se mandaba directo al primer servicio contratado (sin forma real
  // de saber cuál era "el primero" ni mostrar un resumen cruzado); ahora
  // esa pantalla intermedia sí existe.
  const hasAnyService = auth.permissions.some((p) => p.startsWith('dashboard.') && p.endsWith('.view'))
  if (hasAnyService) return `/${locale}/dashboard/resumen`
  return `/${locale}/`
}
