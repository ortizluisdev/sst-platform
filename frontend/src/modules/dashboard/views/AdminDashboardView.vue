<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { Briefcase, Building2 } from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import ClientStatCard from '@/components/dashboard/client/ClientStatCard.vue'
import ServiceDistributionDonut from '@/components/dashboard/ServiceDistributionDonut.vue'
import MonthlyCountChart from '@/components/dashboard/MonthlyCountChart.vue'
import ComplianceRing from '@/components/dashboard/ComplianceRing.vue'
import { computeAdminDashboardStats, computeMonthlyRegistrations, type ResponsableAccountStatus } from '@/utils/adminDashboardStats'
import { iconForService } from '@/utils/serviceIcon'
import { serviceLabel } from '@/utils/serviceLabel'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'
import type { CategoryCardStatus, GlobalCompliance } from '@/types/dashboard'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()

useHead(() => ({ title: t('dashboard.adminGeneralDashboard.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

// Mismos refs que AdminShell.vue ya provee a admin-operacion (ver
// HigieneIndustrialPanel.vue/RoadSafetyAdminPanel.vue) — sin petición
// nueva al backend, este dashboard solo agrega lo que ya se cargó.
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const services = inject<Ref<ServiceOption[]>>('operacionServices', ref<ServiceOption[]>([]))

const stats = computed(() => computeAdminDashboardStats(organizations.value, services.value))
const monthlyRegistrations = computed(() => computeMonthlyRegistrations(organizations.value))

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

// verde/amarillo/rojo = ACTIVE/PENDING_ACTIVATION/SUSPENDED, mismo mapeo de
// accountStatusCards de arriba. `total` es la suma de esos 3 (no
// stats.totalClientes): así el anillo siempre grafica exactamente lo que
// suma, incluso en el caso teórico de una organización sin responsable
// (nunca ocurre hoy — toda alta crea uno en la misma transacción — pero
// así el % del centro del anillo nunca queda inconsistente con sus propios
// arcos).
const accountStatusCompliance = computed<GlobalCompliance>(() => {
  const { ACTIVE, PENDING_ACTIVATION, SUSPENDED } = stats.value.cuentasPorEstado
  const total = ACTIVE + PENDING_ACTIVATION + SUSPENDED
  return {
    pct: total > 0 ? Math.round((ACTIVE / total) * 100) : 0,
    verde: ACTIVE,
    amarillo: PENDING_ACTIVATION,
    rojo: SUSPENDED,
    total,
  }
})

// Paleta categórica fija para el donut de servicios — mismos tonos 500 que
// iconColorForCategory() usa para las categorías de Higiene Industrial
// (amber/sky/emerald/violet/rose), acá en hex porque Chart.js no acepta
// clases de Tailwind. El sky-500 es el valor de marca de este proyecto
// (#3a6eab, ver style.css @theme), no el sky-500 genérico de Tailwind.
const SERVICE_DONUT_PALETTE = ['#f59e0b', '#3a6eab', '#10b981', '#8b5cf6', '#f43f5e']

const serviceDonutSlices = computed(() =>
  stats.value.clientesPorServicio.map((service, index) => ({
    label: serviceLabel(service.slug, service.nombre, locale.value as Locale),
    value: service.count,
    color: SERVICE_DONUT_PALETTE[index % SERVICE_DONUT_PALETTE.length]!,
  })),
)

// Mismo criterio de badge que ClientsListView.vue:184-188 — duplicado acá
// (3 líneas) en vez de extraído a un util compartido: con un solo
// consumidor más no amerita la indirección.
function statusBadgeClass(accountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED'): string {
  if (accountStatus === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (accountStatus === 'SUSPENDED') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-line-strong bg-cream text-navy-700/60'
}
</script>

<template>
  <div class="grid gap-3">
    <SectionTitleBanner :title="t('dashboard.adminGeneralDashboard.pageTitle')" />

    <section>
      <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.adminGeneralDashboard.resumenTitle') }}
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.clientesRegistrados')"
          :valor="String(stats.totalClientes)"
          :icon="Building2"
          compact
        />
        <ClientStatCard
          :titulo="t('dashboard.adminGeneralDashboard.serviciosActivos')"
          :valor="String(stats.totalServicios)"
          :icon="Briefcase"
          compact
        />
      </div>
    </section>

    <div class="grid gap-3 lg:grid-cols-2">
      <section>
        <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.adminGeneralDashboard.clientesPorServicioTitle') }}
        </p>
        <div class="grid grid-cols-[1fr_auto] gap-3">
          <div class="grid grid-cols-2 gap-2">
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
              compact
            />
          </div>
          <ServiceDistributionDonut :slices="serviceDonutSlices" class="w-40 shrink-0" />
        </div>
      </section>

      <section>
        <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.adminGeneralDashboard.accountStatusTitle') }}
        </p>
        <div class="grid grid-cols-[1fr_auto] gap-3">
          <div class="grid grid-cols-2 gap-2">
            <ClientStatCard
              v-for="card in accountStatusCards"
              :key="card.status"
              :titulo="card.label"
              :valor="card.valor"
              :estado="card.estado"
              compact
            />
          </div>
          <ComplianceRing :compliance="accountStatusCompliance" hide-title compact class="w-40 shrink-0" />
        </div>
      </section>
    </div>

    <div class="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
      <section class="flex min-h-0 min-w-0 flex-col">
        <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.adminGeneralDashboard.monthlyRegistrationsTitle') }}
        </p>
        <MonthlyCountChart :data="monthlyRegistrations" class="min-w-0 flex-1" />
      </section>

      <section class="flex min-h-0 min-w-0 flex-col">
        <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.adminGeneralDashboard.organizationsTableTitle') }}
        </p>
        <div class="max-h-52 overflow-y-auto rounded-lg border border-line-strong bg-white">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr class="sticky top-0 bg-sky-100 text-left text-[10px] uppercase tracking-wide text-navy-700">
                <th class="px-3 py-2 font-semibold">{{ t('dashboard.adminGeneralDashboard.table.nombre') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('dashboard.adminGeneralDashboard.table.servicios') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('dashboard.adminGeneralDashboard.table.estado') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="org in organizations" :key="org.id" class="border-t border-line">
                <td class="px-3 py-1.5">
                  <p class="font-semibold text-navy-900">{{ org.nombre }}</p>
                  <p class="text-[10px] text-navy-700/60">{{ t('organizations.form.nit') }}: {{ org.nit ?? '—' }}</p>
                </td>
                <td class="px-3 py-1.5 text-navy-700">
                  <span v-if="org.services.length === 0">—</span>
                  <span v-else>{{
                    org.services.map((s) => serviceLabel(s.slug, s.nombre, locale as Locale)).join(', ')
                  }}</span>
                </td>
                <td class="px-3 py-1.5">
                  <span
                    v-if="org.responsable"
                    class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
                    :class="statusBadgeClass(org.responsable.accountStatus)"
                  >
                    {{ t(`organizations.list.responsableStatus.${org.responsable.accountStatus}`) }}
                  </span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
