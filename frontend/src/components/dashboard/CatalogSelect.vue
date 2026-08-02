<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from 'lucide-vue-next'
import { listOrgCatalog, createOrgCatalogItem, type CatalogItem, type CatalogTipo } from '@/services/orgCatalogs.service'

const props = defineProps<{
  organizationId: string
  tipo: CatalogTipo
  label: string
  modelValue: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const items = ref<CatalogItem[]>([])
const showAdd = ref(false)
const newName = ref('')
const adding = ref(false)

async function load() {
  items.value = await listOrgCatalog(props.organizationId, props.tipo)
}

onMounted(load)
watch(() => props.organizationId, load)

async function addItem() {
  const nombre = newName.value.trim()
  if (!nombre) return
  adding.value = true
  try {
    const item = await createOrgCatalogItem(props.organizationId, props.tipo, nombre)
    items.value = [...items.value, item].sort((a, b) => a.nombre.localeCompare(b.nombre))
    emit('update:modelValue', item.id)
    newName.value = ''
    showAdd.value = false
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div>
    <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{ label }}</label>
    <div class="flex gap-2">
      <select
        :value="modelValue"
        class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>{{ t('dashboard.uploadForm.catalogSelectPlaceholder') }}</option>
        <option v-for="item in items" :key="item.id" :value="item.id">{{ item.nombre }}</option>
      </select>
      <button
        type="button"
        class="flex shrink-0 items-center justify-center rounded-sm border border-line-strong px-2.5 text-navy-700 hover:border-navy-900"
        :aria-label="t('dashboard.uploadForm.catalogAddNew')"
        @click="showAdd = !showAdd"
      >
        <Plus class="h-4 w-4" />
      </button>
    </div>
    <div v-if="showAdd" class="mt-2 flex gap-2">
      <input
        v-model="newName"
        type="text"
        :placeholder="t('dashboard.uploadForm.catalogNewPlaceholder')"
        class="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
        @keyup.enter="addItem"
      />
      <button
        type="button"
        class="shrink-0 rounded-sm bg-[var(--org-primary,#0b1a33)] px-3 py-2 text-xs font-semibold text-cream hover:opacity-90 disabled:opacity-50"
        :disabled="adding || !newName.trim()"
        @click="addItem"
      >
        {{ t('dashboard.uploadForm.catalogAddConfirm') }}
      </button>
    </div>
  </div>
</template>
