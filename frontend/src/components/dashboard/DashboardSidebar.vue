<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { TabDef } from '@/types/dashboardTabs'
import { useSidebarDrawer } from '@/composables/useSidebarDrawer'

defineProps<{ tabs: TabDef[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const drawer = useSidebarDrawer()

function selectTab(key: string) {
  emit('update:modelValue', key)
  drawer.close()
}
</script>

<template>
  <div
    v-if="drawer.isOpen.value"
    class="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
    aria-hidden="true"
    @click="drawer.close()"
  />

  <nav
    class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] -translate-x-full overflow-y-auto border-r border-line-strong bg-white p-2 transition-transform duration-300 ease-in-out print:hidden lg:sticky lg:top-6 lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:rounded-lg lg:border"
    :class="{ 'translate-x-0': drawer.isOpen.value }"
    :aria-label="t('dashboard.sidebar.navAriaLabel')"
  >
    <div class="mb-1 flex items-center justify-between px-1 py-1 lg:hidden">
      <span class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{ t('dashboard.sidebar.navLabel') }}</span>
      <button
        type="button"
        class="rounded-sm p-1.5 text-navy-700 transition-colors hover:bg-sky-400/10"
        :aria-label="t('dashboard.sidebar.closeMenu')"
        @click="drawer.close()"
      >
        <X class="h-4.5 w-4.5" />
      </button>
    </div>

    <ul class="flex flex-col gap-1">
      <li v-for="tab in tabs" :key="tab.key">
        <button
          type="button"
          class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors"
          :class="
            tab.key === modelValue
              ? 'bg-[var(--org-primary,#0f2a4a)] text-cream shadow-sm'
              : 'text-navy-700 hover:bg-sky-400/10'
          "
          @click="selectTab(tab.key)"
        >
          <component :is="tab.icon" class="h-5 w-5 shrink-0" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </li>
    </ul>
  </nav>
</template>
