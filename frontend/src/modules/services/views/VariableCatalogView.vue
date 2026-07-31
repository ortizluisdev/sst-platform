<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import {
  listVariableCatalog,
  updateVariableCatalogItem,
  VariableCatalogRequestError,
} from '@/services/variableCatalog.service'
import type { VariableCatalogCategory, MeasurementType } from '@/types/variableCatalog'

const { t } = useI18n()
const route = useRoute()
const serviceSlug = route.params.serviceSlug as string

useHead(() => ({ title: t('variableCatalog.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const categories = ref<VariableCatalogCategory[]>([])
const savingId = ref<string | null>(null)
const drafts = ref<Record<string, { tipo: MeasurementType | ''; instrumento: string; incertidumbre: string }>>({})

async function load() {
  status.value = 'loading'
  try {
    categories.value = await listVariableCatalog(serviceSlug)
    for (const cat of categories.value) {
      for (const v of cat.variables) {
        drafts.value[v.id] = {
          tipo: v.tipo ?? '',
          instrumento: v.instrumento ?? '',
          incertidumbre: v.incertidumbre ?? '',
        }
      }
    }
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof VariableCatalogRequestError ? err.message : t('variableCatalog.loadError')
  }
}

onMounted(load)

async function handleSave(variableId: string) {
  const draft = drafts.value[variableId]
  if (!draft) return
  savingId.value = variableId
  errorMessage.value = ''
  try {
    await updateVariableCatalogItem(serviceSlug, variableId, {
      tipo: draft.tipo || undefined,
      instrumento: draft.instrumento.trim() || undefined,
      incertidumbre: draft.incertidumbre.trim() || undefined,
    })
    await load()
  } catch (err) {
    errorMessage.value = err instanceof VariableCatalogRequestError ? err.message : t('variableCatalog.actionError')
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="text-xl font-bold text-navy-900">{{ t('variableCatalog.pageTitle') }}</h1>
    <p class="mt-1 text-sm text-navy-700/70">{{ t('variableCatalog.pageSubtitle') }}</p>

    <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('variableCatalog.loading') }}</p>
    <p v-else-if="status === 'error'" class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <template v-else>
      <p v-if="errorMessage" class="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </p>

      <div v-for="cat in categories" :key="cat.categoria" class="mt-6 overflow-hidden rounded-lg border border-line-strong bg-white">
        <p class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ cat.categoria }}
        </p>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-line text-left text-[11px] uppercase tracking-wide text-navy-700 opacity-70">
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.codigo') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.nombre') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.tipo') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.instrumento') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.incertidumbre') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.acciones') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in cat.variables" :key="v.id" class="border-t border-line">
                <td class="px-4 py-3 font-mono text-xs text-navy-700/60">{{ v.codigo }}</td>
                <td class="px-4 py-3 text-navy-900">{{ v.nombre }}</td>
                <td class="px-4 py-3">
                  <select
                    v-model="drafts[v.id].tipo"
                    class="w-full rounded-sm border border-line-strong bg-white px-2 py-1.5 text-sm text-navy-900"
                  >
                    <option value="">{{ t('variableCatalog.pending') }}</option>
                    <option value="MEDICION">{{ t('variableCatalog.tipo.MEDICION') }}</option>
                    <option value="CALCULO">{{ t('variableCatalog.tipo.CALCULO') }}</option>
                    <option value="INSPECCION">{{ t('variableCatalog.tipo.INSPECCION') }}</option>
                  </select>
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="drafts[v.id].instrumento"
                    type="text"
                    :placeholder="t('variableCatalog.pending')"
                    class="w-full rounded-sm border border-line-strong bg-white px-2 py-1.5 text-sm text-navy-900 placeholder:text-navy-700/40"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="drafts[v.id].incertidumbre"
                    type="text"
                    :placeholder="t('variableCatalog.pending')"
                    class="w-full rounded-sm border border-line-strong bg-white px-2 py-1.5 text-sm text-navy-900 placeholder:text-navy-700/40"
                  />
                </td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-[var(--org-primary,#0b1a33)] disabled:opacity-50"
                    :disabled="savingId === v.id"
                    @click="handleSave(v.id)"
                  >
                    {{ t('variableCatalog.save') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
