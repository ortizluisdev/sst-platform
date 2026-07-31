import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { isDarkColor } from '@/utils/colorContrast'

const DEFAULT_ORG_PRIMARY = '#0f2a4a'

/** Clases de texto con contraste garantizado sobre un fondo/borde pintado
 * con el color de marca del cliente (--org-primary). Un cliente puede
 * elegir cualquier color, incluido uno claro — no se puede asumir texto
 * blanco siempre, como sí era seguro con el navy fijo de antes. Reutilizable
 * en cualquier botón/pill "primario" del dashboard (cliente y admin).
 *
 * Devuelve las variantes plain y hover como strings COMPLETOS y literales
 * (nunca construidos por interpolación en el componente que las usa) — el
 * escaneo estático de Tailwind busca substrings de clase completos en el
 * código fuente; una clase armada en runtime como `hover:${x}` nunca
 * aparece así en ningún archivo y Tailwind no genera el CSS para ella. */
export function useOrgPrimaryTextClass() {
  const auth = useAuthStore()
  return computed(() => {
    const hex = auth.branding?.primaryColor ?? DEFAULT_ORG_PRIMARY
    const dark = isDarkColor(hex)
    return {
      text: dark ? 'text-cream' : 'text-navy-900',
      hoverText: dark ? 'hover:text-cream' : 'hover:text-navy-900',
    }
  })
}
