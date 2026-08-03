<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { listOrganizationsFull } from '@/services/organizations.service'
import type { OrganizationListItem } from '@/types/organization'
import type {
  CreateNotificationInput,
  NotificationRecipientMode,
  NotificationSeverity,
  UpdateNotificationInput,
} from '@/types/notification'

const props = defineProps<{
  mode: 'create' | 'edit'
  initialMessage?: string
  initialSeverity?: NotificationSeverity
}>()

const emit = defineEmits<{
  close: []
  submitCreate: [input: CreateNotificationInput]
  submitEdit: [input: UpdateNotificationInput]
}>()

const { t } = useI18n()

const recipientMode = ref<NotificationRecipientMode>('user')
const organizationId = ref('')
const organizations = ref<OrganizationListItem[]>([])
const message = ref(props.initialMessage ?? '')
const severity = ref<NotificationSeverity>(props.initialSeverity ?? 'INFO')
const sendEmail = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  if (props.mode === 'create') {
    try {
      organizations.value = await listOrganizationsFull()
    } catch {
      organizations.value = []
    }
  }
})

const showOrgSelect = computed(() => recipientMode.value === 'user')

async function handleSubmit() {
  errorMessage.value = ''
  if (!message.value.trim()) {
    errorMessage.value = t('dashboard.notificationsAdmin.form.messageLabel')
    return
  }
  if (props.mode === 'edit') {
    emit('submitEdit', { message: message.value.trim(), severity: severity.value })
    return
  }

  if (recipientMode.value === 'user') {
    const org = organizations.value.find((o) => o.id === organizationId.value)
    if (!org?.responsable) {
      errorMessage.value = t('dashboard.notificationsAdmin.form.organizationPlaceholder')
      return
    }
    submitting.value = true
    try {
      emit('submitCreate', {
        message: message.value.trim(),
        severity: severity.value,
        sendEmail: sendEmail.value,
        recipientMode: 'user',
        recipientId: org.responsable.id,
      })
    } finally {
      submitting.value = false
    }
    return
  }

  emit('submitCreate', {
    message: message.value.trim(),
    severity: severity.value,
    sendEmail: sendEmail.value,
    recipientMode: recipientMode.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-lg overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">
            {{ mode === 'create' ? t('dashboard.notificationsAdmin.form.createTitle') : t('dashboard.notificationsAdmin.form.editTitle') }}
          </h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.notificationsAdmin.form.cancel')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-4 grid gap-4" @submit.prevent="handleSubmit">
          <template v-if="mode === 'create'">
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
                {{ t('dashboard.notificationsAdmin.form.recipientModeLabel') }}
              </label>
              <select
                v-model="recipientMode"
                class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
              >
                <option value="user">{{ t('dashboard.notificationsAdmin.form.recipientModeUser') }}</option>
                <option value="admins">{{ t('dashboard.notificationsAdmin.form.recipientModeAdmins') }}</option>
                <option value="all_clients">{{ t('dashboard.notificationsAdmin.form.recipientModeAllClients') }}</option>
              </select>
            </div>

            <div v-if="showOrgSelect">
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
                {{ t('dashboard.notificationsAdmin.form.organizationLabel') }}
              </label>
              <select
                v-model="organizationId"
                class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
              >
                <option value="" disabled>{{ t('dashboard.notificationsAdmin.form.organizationPlaceholder') }}</option>
                <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.nombre }}</option>
              </select>
            </div>
          </template>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('dashboard.notificationsAdmin.form.messageLabel') }}
            </label>
            <textarea
              v-model="message"
              rows="4"
              :placeholder="t('dashboard.notificationsAdmin.form.messagePlaceholder')"
              class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('dashboard.notificationsAdmin.form.severityLabel') }}
            </label>
            <select
              v-model="severity"
              class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
            >
              <option value="INFO">{{ t('dashboard.notifications.severity.info') }}</option>
              <option value="WARNING">{{ t('dashboard.notifications.severity.warning') }}</option>
              <option value="CRITICAL">{{ t('dashboard.notifications.severity.critical') }}</option>
            </select>
          </div>

          <label v-if="mode === 'create'" class="flex items-center gap-2 text-sm text-navy-900">
            <input v-model="sendEmail" type="checkbox" class="h-4 w-4 rounded-sm border-line-strong" />
            {{ t('dashboard.notificationsAdmin.form.sendEmailLabel') }}
          </label>

          <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ errorMessage }}
          </p>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
              @click="emit('close')"
            >
              {{ t('dashboard.notificationsAdmin.form.cancel') }}
            </button>
            <SubmitButton
              :loading="submitting"
              :loading-label="mode === 'create' ? t('dashboard.notificationsAdmin.form.submitting') : t('dashboard.notificationsAdmin.form.saving')"
            >
              {{ mode === 'create' ? t('dashboard.notificationsAdmin.form.submit') : t('dashboard.notificationsAdmin.form.save') }}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
