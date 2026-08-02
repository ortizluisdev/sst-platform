<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import HigieneIndustrialPanel from '@/components/dashboard/operacion/HigieneIndustrialPanel.vue'
import RoadSafetyAdminPanel from '@/components/dashboard/operacion/RoadSafetyAdminPanel.vue'
import ServicePanelPlaceholder from '@/components/dashboard/operacion/ServicePanelPlaceholder.vue'
import type { ServiceOption } from '@/types/organization'

const route = useRoute()
const { t } = useI18n()

useHead(() => ({ title: t('dashboard.adminView.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

// AdminShell.vue (el layout padre de esta ruta) siempre provee esto — el
// default vacío solo evita un crash si esta vista se monta fuera de ese árbol.
const services = inject<Ref<ServiceOption[]>>('operacionServices', ref<ServiceOption[]>([]))

const orgId = computed(() => route.params.orgId as string | undefined)
const serviceSlug = computed(() => route.params.serviceSlug as string | undefined)

const activeServiceNombre = computed(
  () => services.value.find((s) => s.slug === serviceSlug.value)?.nombre ?? serviceSlug.value ?? '',
)
</script>

<template>
  <HigieneIndustrialPanel v-if="orgId && serviceSlug === 'higiene-industrial'" key="higiene" :organization-id="orgId" />
  <RoadSafetyAdminPanel
    v-else-if="orgId && serviceSlug === 'seguridad-vial'"
    key="seguridad-vial"
    :organization-id="orgId"
  />
  <ServicePanelPlaceholder v-else-if="orgId && serviceSlug" :key="serviceSlug" :nombre="activeServiceNombre" />
  <p v-else key="empty" class="text-sm text-navy-700">{{ t('dashboard.adminView.noOrgs') }}</p>
</template>
