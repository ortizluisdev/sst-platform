import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createRegisterSchema, type RegisterFormValues } from '@/types/auth'
import { AuthRequestError, AuthValidationError, postRegister } from '@/services/auth.service'

export type AuthSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useRegisterForm() {
  const { t } = useI18n()
  const status = ref<AuthSubmitStatus>('idle')
  const errorMessage = ref('')
  const successMessage = ref('')

  const validationSchema = computed(() =>
    toTypedSchema(
      createRegisterSchema({
        nombreRequired: t('auth.validation.nombreRequired'),
        emailInvalid: t('auth.validation.emailInvalid'),
        organizationNameRequired: t('auth.validation.organizationNameRequired'),
        passwordMin: t('auth.validation.passwordMin'),
        passwordLowercase: t('auth.validation.passwordLowercase'),
        passwordUppercase: t('auth.validation.passwordUppercase'),
        passwordNumber: t('auth.validation.passwordNumber'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors } = useForm<RegisterFormValues>({
    validationSchema,
    initialValues: { nombre: '', email: '', organizationName: '', password: '' },
  })

  const [nombre, nombreAttrs] = defineField('nombre')
  const [email, emailAttrs] = defineField('email')
  const [organizationName, organizationNameAttrs] = defineField('organizationName')
  const [password, passwordAttrs] = defineField('password')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      const result = await postRegister(values)
      successMessage.value = result.message
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

  return {
    status,
    errorMessage,
    successMessage,
    errors,
    nombre,
    nombreAttrs,
    email,
    emailAttrs,
    organizationName,
    organizationNameAttrs,
    password,
    passwordAttrs,
    submit,
  }
}
