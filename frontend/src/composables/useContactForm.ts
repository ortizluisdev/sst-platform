import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createContactSchema, type ContactFormValues } from '@/types/contact'
import { ContactValidationError, postContact } from '@/services/contact.service'

export type ContactSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useContactForm() {
  const { t } = useI18n()
  const status = ref<ContactSubmitStatus>('idle')
  const errorMessage = ref('')

  const validationSchema = computed(() =>
    toTypedSchema(
      createContactSchema({
        nombreRequired: t('contacto.validation.nombreRequired'),
        correoInvalid: t('contacto.validation.correoInvalid'),
        telefonoRequired: t('contacto.validation.telefonoRequired'),
        telefonoInvalid: t('contacto.validation.telefonoInvalid'),
        mensajeRequired: t('contacto.validation.mensajeRequired'),
        consentRequired: t('contacto.validation.consentRequired'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors, resetForm, setErrors } = useForm<ContactFormValues>({
    validationSchema,
    initialValues: { nombre: '', correo: '', telefono: '', empresa: '', mensaje: '', consent: false, website: '' },
  })

  const [nombre, nombreAttrs] = defineField('nombre')
  const [correo, correoAttrs] = defineField('correo')
  const [telefono, telefonoAttrs] = defineField('telefono')
  const [empresa, empresaAttrs] = defineField('empresa')
  const [mensaje, mensajeAttrs] = defineField('mensaje')
  const [consent, consentAttrs] = defineField('consent')
  // Honeypot — nunca se muestra ni se llena en un envío real, ver ContactoSection.vue.
  const [website, websiteAttrs] = defineField('website')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await postContact(values)
      status.value = 'success'
      resetForm()
    } catch (err) {
      if (err instanceof ContactValidationError) {
        // El backend es la fuente de verdad final: si detecta algo que el
        // cliente dejó pasar, los errores se muestran inline por campo, igual
        // que la validación local — sin mensaje genérico.
        setErrors(err.fieldErrors)
        status.value = 'idle'
        return
      }
      status.value = 'error'
      errorMessage.value = err instanceof Error ? err.message : t('contacto.form.genericError')
    }
  })

  return {
    status,
    errorMessage,
    errors,
    nombre,
    nombreAttrs,
    correo,
    correoAttrs,
    telefono,
    telefonoAttrs,
    empresa,
    empresaAttrs,
    mensaje,
    mensajeAttrs,
    consent,
    consentAttrs,
    website,
    websiteAttrs,
    submit,
  }
}
