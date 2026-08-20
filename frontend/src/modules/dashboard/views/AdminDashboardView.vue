<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { Briefcase, Building2 } from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import ClientStatCard from '@/components/dashboard/client/ClientStatCard.vue'
import { computeAdminDashboardStats, type ResponsableAccountStatus } from '@/utils/adminDashboardStats'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'
import type { CategoryCardStatus } from '@/types/dashboard'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()

useHead(() => ({ title: t('dashboard.adminGeneralDashboard.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

// Mismos refs que AdminShell.vue ya provee a admin-operacion (ver
// HigieneIndustrialPanel.vue/RoadSafetyAdminPanel.vue) — sin petición
// nueva al backend, este dashboard solo agrega lo que ya se cargó.
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const services = inject<Ref<ServiceOption[]>>('operacionServices', ref<ServiceOption[]>([]))

const stats = computed(() => computeAdminDashboardStats(organizations.value, services.value))

const ACCOUNT_STATUS_SEMAPHORE: Record<ResponsableAccountStatus, CategoryCardStatus> = {
  ACTIVE: 'VERDE',
  PENDING_ACTIVATION: 'AMARILLO',
  SUSPENDED: 'ROJO',
}
const ACCOUNT_STATUS_ORDER: ResponsableAccountStatus[] = ['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED']

const accountStatusCards = computed(() =>
  ACCOUNT_STATUS_ORDER.map((status) => ({
    status,
    label: t(`dashboard.adminGeneralDashboard.accountStatus.${status}`),
    valor: String(stats.value.cuentasPorEstado[status]),
    estado: ACCOUNT_STATUS_SEMAPHORE[status],
  })),
)
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="t('dashboard.adminGeneralDashboard.pageTitle')" />

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.resumenTitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.clientesRegistrados')"
          :valor="String(stats.totalClientes)"
          :icon="Building2"
        />
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.serviciosActivos')"
          :valor="String(stats.totalServicios)"
          :icon="Briefcase"
        />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.clientesPorServicioTitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientStatCard
          v-for="service in stats.clientesPorServicio"
          :key="service.slug"
          :titulo="
            t('dashboard.adminGeneralDashboard.clientesDeServicio', {
              service: serviceLabel(service.slug, service.nombre, locale as Locale),
            })
          "
          :valor="String(service.count)"
          :icon="iconForService(service.slug)"
        />
      </div>
    </section>

    <section>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.accountStatusTitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-3">
        <ClientStatCard
          v-for="card in accountStatusCards"
          :key="card.status"
          :titulo="card.label"
          :valor="card.valor"
          :estado="card.estado"
        />
      </div>
    </section>
  </div>
</template>
