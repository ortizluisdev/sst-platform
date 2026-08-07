<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
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
  if (!message.value.trim()) {
    useToast().error(t('dashboard.notificationsAdmin.form.messageLabel'))
    return
  }
  if (props.mode === 'edit') {
    emit('submitEdit', { message: message.value.trim(), severity: severity.value })
    return
  }

  if (recipientMode.value === 'user') {
    const org = organizations.value.find((o) => o.id === organizationId.value)
    if (!org?.responsable) {
      useToast().error(t('dashboard.notificationsAdmin.form.organizationPlaceholder'))
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
  <Modal
    :title="mode === 'create' ? t('dashboard.notificationsAdmin.form.createTitle') : t('dashboard.notificationsAdmin.form.editTitle')"
    max-width="lg"
    @close="emit('close')"
  >
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
  </Modal>
</template>
