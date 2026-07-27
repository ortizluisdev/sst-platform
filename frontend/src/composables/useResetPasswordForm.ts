import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createResetPasswordSchema, type ResetPasswordFormValues } from '@/types/auth'
import { AuthRequestError, postResetPassword } from '@/services/auth.service'

export type AuthSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

/** @param token — leído por la vista desde `?token=...` en la URL del enlace de correo. */
export function useResetPasswordForm(token: string) {
  const { t } = useI18n()
  const status = ref<AuthSubmitStatus>('idle')
  const errorMessage = ref('')

  const validationSchema = computed(() =>
    toTypedSchema(
      createResetPasswordSchema({
        tokenRequired: t('auth.validation.tokenRequired'),
        passwordMin: t('auth.validation.passwordMin'),
        passwordLowercase: t('auth.validation.passwordLowercase'),
        passwordUppercase: t('auth.validation.passwordUppercase'),
        passwordNumber: t('auth.validation.passwordNumber'),
        passwordSpecial: t('auth.validation.passwordSpecial'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors } = useForm<ResetPasswordFormValues>({
    validationSchema,
    initialValues: { token, newPassword: '' },
  })

  const [newPassword, newPasswordAttrs] = defineField('newPassword')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await postResetPassword(values)
      status.value = 'success'
    } catch (err) {
      status.value = 'error'
      errorMessage.value = err instanceof AuthRequestError ? err.message : t('auth.form.genericError')
    }
  })

  return { status, errorMessage, errors, newPassword, newPasswordAttrs, submit }
}
