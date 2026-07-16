import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { contactSchema, type ContactFormValues } from '@/types/contact'
import { postContact } from '@/services/contact.service'

export type ContactSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useContactForm() {
  const status = ref<ContactSubmitStatus>('idle')
  const errorMessage = ref('')

  const { defineField, handleSubmit, errors, resetForm } = useForm<ContactFormValues>({
    validationSchema: toTypedSchema(contactSchema),
    initialValues: { nombre: '', correo: '', telefono: '', empresa: '', mensaje: '' },
  })

  const [nombre, nombreAttrs] = defineField('nombre')
  const [correo, correoAttrs] = defineField('correo')
  const [telefono, telefonoAttrs] = defineField('telefono')
  const [empresa, empresaAttrs] = defineField('empresa')
  const [mensaje, mensajeAttrs] = defineField('mensaje')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await postContact(values)
      status.value = 'success'
      resetForm()
    } catch (err) {
      status.value = 'error'
      errorMessage.value = err instanceof Error ? err.message : 'No pudimos enviar tu mensaje. Intenta de nuevo.'
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
    submit,
  }
}
