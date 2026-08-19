<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Circle } from 'lucide-vue-next'
import { PASSWORD_REQUIREMENTS } from '@/types/auth'

/**
 * Recordatorio de los 5 requisitos de contraseña, siempre visible (no solo
 * tras un error) — feedback directo de cliente: al crear la contraseña en
 * la activación de cuenta, no había ninguna pista de qué exigía el campo,
 * así que un intento fallido se sentía como "la plataforma no funciona" en
 * vez de "te falta una mayúscula". Cada ítem se marca en vivo mientras se
 * escribe, usando exactamente las mismas reglas que el schema de
 * validación (PASSWORD_REQUIREMENTS en types/auth.ts) — nunca puede
 * quedar desincronizado del validador real.
 */
const props = defineProps<{ password: string }>()
const { t } = useI18n()

const items = computed(() =>
  PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: t(`auth.passwordRequirements.${requirement.id}`),
    met: requirement.met(props.password),
  })),
)
</script>

<template>
  <div class="mt-1.5">
    <p class="text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-60">
      {{ t('auth.passwordRequirements.title') }}
    </p>
    <ul class="mt-1 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-1.5 text-xs transition-colors"
        :class="item.met ? 'text-emerald-600' : 'text-navy-700/50'"
      >
        <Check v-if="item.met" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <Circle v-else class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>
