<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import {
  listCategoryConfig,
  updateCategoryConfig,
  CategoryConfigRequestError,
  type CategoryConfigItem,
  type HigieneCategoria,
} from '@/services/organizationCategoryConfig.service'
import { listOrgCatalog, createOrgCatalogItem, updateOrgCatalogItem, type CatalogItem, type CatalogTipo } from '@/services/orgCatalogs.service'
import { DashboardRequestError } from '@/services/dashboard.service'

const props = defineProps<{ organizationId: string }>()
const { t } = useI18n()

// --- Categorías habilitadas ------------------------------------------------
const categoryStatus = ref<'loading' | 'ready' | 'error'>('loading')
const categoryError = ref('')
const categoryItems = ref<CategoryConfigItem[]>([])
const togglingCategoria = ref<HigieneCategoria | null>(null)

async function loadCategories() {
  categoryStatus.value = 'loading'
  try {
    categoryItems.value = await listCategoryConfig(props.organizationId)
    categoryStatus.value = 'ready'
  } catch (err) {
    categoryStatus.value = 'error'
    categoryError.value = err instanceof CategoryConfigRequestError ? err.message : t('dashboard.higieneConfig.categories.loadError')
  }
}

async function toggleCategoria(item: CategoryConfigItem) {
  togglingCategoria.value = item.categoria
  categoryError.value = ''
  const next = !item.habilitada
  try {
    await updateCategoryConfig(props.organizationId, item.categoria, next)
    item.habilitada = next
  } catch (err) {
    categoryError.value = err instanceof CategoryConfigRequestError ? err.message : t('dashboard.higieneConfig.categories.actionError')
  } finally {
    togglingCategoria.value = null
  }
}

// --- Catálogos de la organización (zona/sección/cargo/trabajador) --------
const CATALOG_TIPOS: CatalogTipo[] = ['zona', 'seccion', 'cargo', 'trabajador']
const activeTipo = ref<CatalogTipo>('zona')
const catalogStatus = ref<'loading' | 'ready' | 'error'>('loading')
const catalogError = ref('')
const catalogItems = ref<CatalogItem[]>([])

const editingId = ref<string | null>(null)
const editingNombre = ref('')
const savingId = ref<string | null>(null)

const newNombre = ref('')
const creating = ref(false)

async function loadCatalog() {
  catalogStatus.value = 'loading'
  editingId.value = null
  try {
    catalogItems.value = await listOrgCatalog(props.organizationId, activeTipo.value)
    catalogStatus.value = 'ready'
  } catch (err) {
    catalogStatus.value = 'error'
    catalogError.value = err instanceof DashboardRequestError ? err.message : t('dashboard.higieneConfig.catalogs.loadError')
  }
}

function switchTipo(tipo: CatalogTipo) {
  activeTipo.value = tipo
  loadCatalog()
}

function startEdit(item: CatalogItem) {
  editingId.value = item.id
  editingNombre.value = item.nombre
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(item: CatalogItem) {
  const nombre = editingNombre.value.trim()
  if (!nombre || nombre === item.nombre) {
    editingId.value = null
    return
  }
  savingId.value = item.id
  catalogError.value = ''
  try {
    await updateOrgCatalogItem(props.organizationId, activeTipo.value, item.id, { nombre })
    item.nombre = nombre
    editingId.value = null
  } catch (err) {
    catalogError.value = err instanceof DashboardRequestError ? err.message : t('dashboard.higieneConfig.catalogs.actionError')
  } finally {
    savingId.value = null
  }
}

async function deactivate(item: CatalogItem) {
  if (!confirm(t('dashboard.higieneConfig.catalogs.deactivateConfirm', { nombre: item.nombre }))) return
  savingId.value = item.id
  catalogError.value = ''
  try {
    await updateOrgCatalogItem(props.organizationId, activeTipo.value, item.id, { isActive: false })
    catalogItems.value = catalogItems.value.filter((i) => i.id !== item.id)
  } catch (err) {
    catalogError.value = err instanceof DashboardRequestError ? err.message : t('dashboard.higieneConfig.catalogs.actionError')
  } finally {
    savingId.value = null
  }
}

async function submitNew() {
  const nombre = newNombre.value.trim()
  if (!nombre) return
  creating.value = true
  catalogError.value = ''
  try {
    const item = await createOrgCatalogItem(props.organizationId, activeTipo.value, nombre)
    catalogItems.value.push(item)
    catalogItems.value.sort((a, b) => a.nombre.localeCompare(b.nombre))
    newNombre.value = ''
  } catch (err) {
    catalogError.value = err instanceof DashboardRequestError ? err.message : t('dashboard.higieneConfig.catalogs.actionError')
  } finally {
    creating.value = false
  }
}

const tipoTabs = computed(() => CATALOG_TIPOS.map((tipo) => ({ tipo, label: t(`dashboard.higieneConfig.catalogs.tipo.${tipo}`) })))

onMounted(() => {
  loadCategories()
  loadCatalog()
})
</script>

<template>
  <div class="grid gap-6">
    <p class="text-sm text-navy-700 opacity-70">{{ t('dashboard.higieneConfig.subtitle') }}</p>

    <!-- Categorías habilitadas -->
    <section>
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.higieneConfig.categories.title') }}
      </p>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('dashboard.higieneConfig.categories.hint') }}</p>

      <p v-if="categoryStatus === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.higieneConfig.loading') }}</p>
      <p
        v-else-if="categoryStatus === 'error'"
        class="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
      >
        {{ categoryError }}
      </p>
      <div v-else class="grid gap-2 sm:grid-cols-2">
        <label
          v-for="item in categoryItems"
          :key="item.categoria"
          class="flex items-center justify-between gap-3 rounded-sm border border-line-strong bg-white px-3 py-2.5"
        >
          <span class="text-sm font-medium text-navy-900">{{ t(`clients.categoryConfig.categorias.${item.categoria}`) }}</span>
          <input
            type="checkbox"
            class="h-4 w-4 rounded-sm border-line-strong"
            :checked="item.habilitada"
            :disabled="togglingCategoria === item.categoria"
            @change="toggleCategoria(item)"
          />
        </label>
      </div>
      <p v-if="categoryStatus === 'ready' && categoryError" class="mt-2 text-sm text-red-700">{{ categoryError }}</p>
    </section>

    <!-- Catálogos de la organización -->
    <section>
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.higieneConfig.catalogs.title') }}
      </p>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('dashboard.higieneConfig.catalogs.hint') }}</p>

      <div class="mb-3 flex gap-2">
        <button
          v-for="tab in tipoTabs"
          :key="tab.tipo"
          type="button"
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTipo === tab.tipo ? 'bg-navy-900 text-cream' : 'border border-line-strong text-navy-700'"
          @click="switchTipo(tab.tipo)"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="catalogStatus === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.higieneConfig.loading') }}</p>
      <p
        v-else-if="catalogStatus === 'error'"
        class="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
      >
        {{ catalogError }}
      </p>
      <template v-else>
        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <ul class="divide-y divide-line">
            <li v-for="item in catalogItems" :key="item.id" class="flex items-center justify-between gap-3 px-4 py-2.5">
              <template v-if="editingId === item.id">
                <input
                  v-model="editingNombre"
                  type="text"
                  class="w-full rounded-sm border border-line-strong px-2.5 py-1.5 text-sm text-navy-900"
                  @keyup.enter="saveEdit(item)"
                  @keyup.escape="cancelEdit"
                />
                <div class="flex shrink-0 gap-1">
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                    :disabled="savingId === item.id"
                    :aria-label="t('dashboard.higieneConfig.catalogs.save')"
                    @click="saveEdit(item)"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-navy-700 hover:bg-cream"
                    :aria-label="t('dashboard.higieneConfig.catalogs.cancel')"
                    @click="cancelEdit"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
              </template>
              <template v-else>
                <span class="text-sm text-navy-900">{{ item.nombre }}</span>
                <div class="flex shrink-0 gap-1">
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-navy-700 hover:bg-sky-100"
                    :aria-label="t('dashboard.higieneConfig.catalogs.rename')"
                    @click="startEdit(item)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    :disabled="savingId === item.id"
                    :aria-label="t('dashboard.higieneConfig.catalogs.deactivate')"
                    @click="deactivate(item)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </template>
            </li>
            <li v-if="catalogItems.length === 0" class="px-4 py-6 text-center text-sm text-navy-700/60">
              {{ t('dashboard.higieneConfig.catalogs.empty') }}
            </li>
          </ul>
        </div>

        <form class="mt-3 flex gap-2" @submit.prevent="submitNew">
          <input
            v-model="newNombre"
            type="text"
            class="w-full max-w-sm rounded-sm border border-line-strong px-3 py-2 text-sm text-navy-900"
            :placeholder="t('dashboard.higieneConfig.catalogs.addPlaceholder')"
          />
          <button
            type="submit"
            class="inline-flex items-center gap-1.5 rounded-sm bg-[var(--org-primary,#0b1a33)] px-3 py-2 text-sm font-semibold text-cream disabled:opacity-50"
            :disabled="creating || !newNombre.trim()"
          >
            <Plus class="h-4 w-4" />
            {{ t('dashboard.higieneConfig.catalogs.addButton') }}
          </button>
        </form>
      </template>
    </section>
  </div>
</template>
