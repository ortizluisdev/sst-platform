import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createProfileSchema, type ProfileFormValues } from '@/types/profile'
import { ProfileRequestError, ProfileValidationError, updateProfile } from '@/services/profile.service'

export type ProfileSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useUpdateProfileForm() {
  const { t } = useI18n()
  const status = ref<ProfileSubmitStatus>('idle')
  const errorMessage = ref('')

  const validationSchema = computed(() =>
    toTypedSchema(
      createProfileSchema({
        cargoRequired: t('profile.validation.cargoRequired'),
        telefonoRequired: t('profile.validation.telefonoRequired'),
        telefonoInvalid: t('profile.validation.telefonoInvalid'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors } = useForm<ProfileFormValues>({
    validationSchema,
    initialValues: { cargo: '', telefono: '' },
  })

  const [cargo, cargoAttrs] = defineField('cargo')
  const [telefono, telefonoAttrs] = defineField('telefono')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await updateProfile(values)
      status.value = 'success'
    } catch (err) {
      status.value = 'error'
      if (err instanceof ProfileValidationError) {
        errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('auth.form.genericError')
      } else if (err instanceof ProfileRequestError) {
        errorMessage.value = err.message
      } else {
        errorMessage.value = t('auth.form.genericError')
      }
    }
  })

  return { status, errorMessage, errors, cargo, cargoAttrs, telefono, telefonoAttrs, submit }
}
