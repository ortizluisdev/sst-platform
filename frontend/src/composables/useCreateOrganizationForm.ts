import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createOrganizationSchema, type CreateOrganizationFormValues, type ServiceOption } from '@/types/organization'
import {
  createOrganization,
  listServices,
  OrganizationRequestError,
  OrganizationValidationError,
} from '@/services/organizations.service'

export type OrganizationSubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export function useCreateOrganizationForm() {
  const { t } = useI18n()
  const status = ref<OrganizationSubmitStatus>('idle')
  const errorMessage = ref('')
  const services = ref<ServiceOption[]>([])
  const servicesLoadError = ref('')

  onMounted(async () => {
    try {
      services.value = await listServices()
    } catch {
      servicesLoadError.value = t('organizations.form.loadServicesError')
    }
  })

  const validationSchema = computed(() =>
    toTypedSchema(
      createOrganizationSchema({
        nombreRequired: t('organizations.validation.nombreRequired'),
        nitInvalid: t('organizations.validation.nitInvalid'),
        contactEmailInvalid: t('organizations.validation.contactEmailInvalid'),
        serviceRequired: t('organizations.validation.serviceRequired'),
        responsableDocumentInvalid: t('organizations.validation.responsableDocumentInvalid'),
        responsableNombreRequired: t('organizations.validation.responsableNombreRequired'),
        responsableEmailInvalid: t('organizations.validation.responsableEmailInvalid'),
        responsableCargoRequired: t('organizations.validation.responsableCargoRequired'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors, resetForm } = useForm<CreateOrganizationFormValues>({
    validationSchema,
    initialValues: {
      nombre: '',
      nit: '',
      contactEmail: '',
      serviceSlug: '',
      responsable: { documentType: 'CC', documentNumber: '', nombre: '', email: '', cargo: '' },
    },
  })

  const [nombre, nombreAttrs] = defineField('nombre')
  const [nit, nitAttrs] = defineField('nit')
  const [contactEmail, contactEmailAttrs] = defineField('contactEmail')
  const [serviceSlug, serviceSlugAttrs] = defineField('serviceSlug')
  const [responsableDocumentType, responsableDocumentTypeAttrs] = defineField('responsable.documentType')
  const [responsableDocumentNumber, responsableDocumentNumberAttrs] = defineField('responsable.documentNumber')
  const [responsableNombre, responsableNombreAttrs] = defineField('responsable.nombre')
  const [responsableEmail, responsableEmailAttrs] = defineField('responsable.email')
  const [responsableCargo, responsableCargoAttrs] = defineField('responsable.cargo')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await createOrganization(values)
      status.value = 'success'
      resetForm()
    } catch (err) {
      status.value = 'error'
      if (err instanceof OrganizationValidationError) {
        errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('organizations.form.genericError')
      } else if (err instanceof OrganizationRequestError) {
        errorMessage.value = err.message
      } else {
        errorMessage.value = t('organizations.form.genericError')
      }
    }
  })

  return {
    status,
    errorMessage,
    errors,
    services,
    servicesLoadError,
    nombre,
    nombreAttrs,
    nit,
    nitAttrs,
    contactEmail,
    contactEmailAttrs,
    serviceSlug,
    serviceSlugAttrs,
    responsableDocumentType,
    responsableDocumentTypeAttrs,
    responsableDocumentNumber,
    responsableDocumentNumberAttrs,
    responsableNombre,
    responsableNombreAttrs,
    responsableEmail,
    responsableEmailAttrs,
    responsableCargo,
    responsableCargoAttrs,
    submit,
  }
}
