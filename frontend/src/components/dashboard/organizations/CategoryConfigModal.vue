<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
import {
  listCategoryConfig,
  updateCategoryConfig,
  CategoryConfigRequestError,
  type CategoryConfigItem,
  type HigieneCategoria,
} from '@/services/organizationCategoryConfig.service'

const props = defineProps<{ organizationId: string; organizationNombre: string }>()
const emit = defineEmits<{ cancel: [] }>()

const { t } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const items = ref<CategoryConfigItem[]>([])
const togglingCategoria = ref<HigieneCategoria | null>(null)

async function load() {
  status.value = 'loading'
  try {
    items.value = await listCategoryConfig(props.organizationId)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.loadError')
  }
}

onMounted(load)

async function handleToggle(item: CategoryConfigItem) {
  togglingCategoria.value = item.categoria
  errorMessage.value = ''
  const nextHabilitada = !item.habilitada
  try {
    await updateCategoryConfig(props.organizationId, item.categoria, nextHabilitada)
    item.habilitada = nextHabilitada
  } catch (err) {
    errorMessage.value = err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.actionError')
  } finally {
    togglingCategoria.value = null
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ t('clients.categoryConfig.title') }}</h2>
            <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.servicesManagement.modal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.categoryConfig.hint') }}</p>

        <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
        <p
          v-else-if="status === 'error'"
          class="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
        >
          {{ errorMessage }}
        </p>
        <div v-else class="mt-4 grid gap-2">
          <label
            v-for="item in items"
            :key="item.categoria"
            class="flex items-center justify-between gap-3 rounded-sm border border-line-strong px-3 py-2.5"
          >
            <span class="text-sm font-medium text-navy-900">{{ t(`clients.categoryConfig.categorias.${item.categoria}`) }}</span>
            <input
              type="checkbox"
              class="h-4 w-4 rounded-sm border-line-strong"
              :checked="item.habilitada"
              :disabled="togglingCategoria === item.categoria"
              @change="handleToggle(item)"
            />
          </label>
        </div>

        <p v-if="status === 'ready' && errorMessage" class="mt-3 text-sm text-red-700">{{ errorMessage }}</p>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
            @click="emit('cancel')"
          >
            {{ t('dashboard.servicesManagement.modal.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
