<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
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
const items = ref<CategoryConfigItem[]>([])
const togglingCategoria = ref<HigieneCategoria | null>(null)

async function load() {
  status.value = 'loading'
  try {
    items.value = await listCategoryConfig(props.organizationId)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.loadError'))
  }
}

onMounted(load)

async function handleToggle(item: CategoryConfigItem) {
  togglingCategoria.value = item.categoria
  const nextHabilitada = !item.habilitada
  try {
    await updateCategoryConfig(props.organizationId, item.categoria, nextHabilitada)
    item.habilitada = nextHabilitada
  } catch (err) {
    const message = err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.actionError')
    useToast().error(message)
  } finally {
    togglingCategoria.value = null
  }
}
</script>

<template>
  <Modal title="" scrollable @close="emit('cancel')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('clients.categoryConfig.title') }}</h2>
        <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
      </div>
    </template>

    <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.categoryConfig.hint') }}</p>

    <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
    <div v-else-if="status === 'ready'" class="mt-4 grid gap-2">
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

    <div class="mt-5 flex justify-end">
      <button
        type="button"
        class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
        @click="emit('cancel')"
      >
        {{ t('dashboard.servicesManagement.modal.close') }}
      </button>
    </div>
  </Modal>
</template>
