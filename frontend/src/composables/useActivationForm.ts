import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createActivationSchema, type ActivationFormValues } from '@/types/activation'
import { ActivationRequestError, confirmActivation } from '@/services/activation.service'

export type ActivationSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

/** @param token — leído por la vista desde `?token=...` en la URL del enlace de correo. */
export function useActivationForm(token: string) {
  const { t } = useI18n()
  const status = ref<ActivationSubmitStatus>('idle')
  const errorMessage = ref('')

  const validationSchema = computed(() =>
    toTypedSchema(
      createActivationSchema({
        tokenRequired: t('auth.validation.tokenRequired'),
        passwordMin: t('auth.validation.passwordMin'),
        passwordLowercase: t('auth.validation.passwordLowercase'),
        passwordUppercase: t('auth.validation.passwordUppercase'),
        passwordNumber: t('auth.validation.passwordNumber'),
        passwordSpecial: t('auth.validation.passwordSpecial'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors } = useForm<ActivationFormValues>({
    validationSchema,
    initialValues: { token, newPassword: '' },
  })

  const [newPassword, newPasswordAttrs] = defineField('newPassword')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await confirmActivation(values)
      status.value = 'success'
    } catch (err) {
      status.value = 'error'
      errorMessage.value = err instanceof ActivationRequestError ? err.message : t('auth.form.genericError')
    }
  })

  return { status, errorMessage, errors, newPassword, newPasswordAttrs, submit }
}
