import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createLoginSchema, type LoginFormValues } from '@/types/auth'
import { AuthRequestError, AuthValidationError, postLogin, type AuthenticatedUser } from '@/services/auth.service'

export type AuthSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useLoginForm() {
  const { t } = useI18n()
  const status = ref<AuthSubmitStatus>('idle')
  const errorMessage = ref('')
  const user = ref<AuthenticatedUser | null>(null)

  const validationSchema = computed(() =>
    toTypedSchema(
      createLoginSchema({
        emailInvalid: t('auth.validation.emailInvalid'),
        passwordRequired: t('auth.validation.passwordRequired'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors } = useForm<LoginFormValues>({
    validationSchema,
    initialValues: { email: '', password: '' },
  })

  const [email, emailAttrs] = defineField('email')
  const [password, passwordAttrs] = defineField('password')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      const result = await postLogin(values)
      user.value = result.user
      status.value = 'success'
    } catch (err) {
      status.value = 'error'
      if (err instanceof AuthValidationError) {
        errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('auth.form.genericError')
      } else if (err instanceof AuthRequestError) {
        errorMessage.value = err.message
      } else {
        errorMessage.value = t('auth.form.genericError')
      }
    }
  })

  return { status, errorMessage, user, errors, email, emailAttrs, password, passwordAttrs, submit }
}
