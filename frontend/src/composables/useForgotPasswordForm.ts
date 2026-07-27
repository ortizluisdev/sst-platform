import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createForgotPasswordSchema, type ForgotPasswordFormValues } from '@/types/auth'
import { AuthRequestError, postForgotPassword } from '@/services/auth.service'

export type AuthSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useForgotPasswordForm() {
  const { t } = useI18n()
  const status = ref<AuthSubmitStatus>('idle')
  const errorMessage = ref('')

  const validationSchema = computed(() =>
    toTypedSchema(createForgotPasswordSchema({ documentInvalid: t('auth.validation.documentInvalid') })),
  )

  const { defineField, handleSubmit, errors } = useForm<ForgotPasswordFormValues>({
    validationSchema,
    initialValues: { documentNumber: '' },
  })

  const [documentNumber, documentNumberAttrs] = defineField('documentNumber')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await postForgotPassword(values)
      // El backend responde 200 exista o no el documento — nunca hay un caso
      // de error "de negocio" acá, solo fallas de red/servidor.
      status.value = 'success'
    } catch (err) {
      status.value = 'error'
      errorMessage.value = err instanceof AuthRequestError ? err.message : t('auth.form.genericError')
    }
  })

  return { status, errorMessage, errors, documentNumber, documentNumberAttrs, submit }
}
