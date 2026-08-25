<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import NotificationsPanel from '@/modules/notifications/components/NotificationsPanel.vue'
import { listMyContractedServices } from '@/services/dashboard.service'
import type { ServiceOption } from '@/types/organization'
import type { TabDef } from '@/types/dashboardTabs'

const router = useRouter()
const { locale } = useI18n()

const services = ref<ServiceOption[]>([])
onMounted(async () => {
  services.value = await listMyContractedServices()
})

// Mismo patrón que ClientHomeView.vue: esta pantalla no tiene "servicio
// seleccionado" ni pestañas propias, así que el sidebar recibe tabs vacío
// y arranca en la clave reservada 'notificaciones' (ya estamos acá).
const emptyTabs: TabDef[] = []
const activeTab = ref('notificaciones')

watch(activeTab, (value) => {
  if (value === 'notificaciones') return // ya estamos acá, no-op
  if (value === 'inicio') {
    router.push({ name: 'dashboard-resumen' })
    return
  }
  if (services.value.length === 0) return
  router.push(`/${locale.value}/dashboard/${services.value[0]!.slug}?tab=${value}`)
})

function selectService(slug: string) {
  router.push(`/${locale.value}/dashboard/${slug}`)
}
</script>

<template>
  <DashboardLayout enhanced with-sidebar>
    <DashboardSidebar
      v-model="activeTab"
      :tabs="emptyTabs"
      :services="services"
      selected-service-slug=""
      @update:selected-service-slug="selectService"
    />
    <NotificationsPanel />
  </DashboardLayout>
</template>
