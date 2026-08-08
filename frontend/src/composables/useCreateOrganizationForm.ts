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
        nombreNewlines: t('organizations.validation.nombreNewlines'),
        nitInvalid: t('organizations.validation.nitInvalid'),
        contactEmailInvalid: t('organizations.validation.contactEmailInvalid'),
        serviceRequired: t('organizations.validation.serviceRequired'),
        responsableDocumentInvalid: t('organizations.validation.responsableDocumentInvalid'),
        responsableNombreRequired: t('organizations.validation.responsableNombreRequired'),
        responsableCargoRequired: t('organizations.validation.responsableCargoRequired'),
        responsableTelefonoRequired: t('organizations.validation.responsableTelefonoRequired'),
        responsableTelefonoInvalid: t('organizations.validation.responsableTelefonoInvalid'),
      }),
    ),
  )

  const { defineField, handleSubmit, errors, resetForm, setFieldValue, values } = useForm<CreateOrganizationFormValues>({
    validationSchema,
    initialValues: {
      nombre: '',
      nit: '',
      contactEmail: '',
      serviceSlugs: [],
      logoBase64: '',
      // Arranca en los colores de RoMa como punto de partida razonable — el
      // admin los personaliza desde ahí (mismo criterio que UpdateProfileView.vue).
      primaryColor: '#0b1a33',
      secondaryColor: '#5b8dc7',
      responsable: { documentType: 'CC', documentNumber: '', nombre: '', cargo: '', telefono: '' },
    },
  })

  const [nombre, nombreAttrs] = defineField('nombre')
  const [nit, nitAttrs] = defineField('nit')
  const [contactEmail, contactEmailAttrs] = defineField('contactEmail')
  const serviceSlugs = computed(() => values.serviceSlugs ?? [])
  function toggleService(slug: string, checked: boolean) {
    const current = values.serviceSlugs ?? []
    setFieldValue('serviceSlugs', checked ? [...current, slug] : current.filter((s) => s !== slug))
  }
  const [logoBase64] = defineField('logoBase64')
  const [primaryColor] = defineField('primaryColor')
  const [secondaryColor] = defineField('secondaryColor')
  const [responsableDocumentType, responsableDocumentTypeAttrs] = defineField('responsable.documentType')
  const [responsableDocumentNumber, responsableDocumentNumberAttrs] = defineField('responsable.documentNumber')
  const [responsableNombre, responsableNombreAttrs] = defineField('responsable.nombre')
  const [responsableCargo, responsableCargoAttrs] = defineField('responsable.cargo')
  const [responsableTelefono, responsableTelefonoAttrs] = defineField('responsable.telefono')

  const submit = handleSubmit(async (values) => {
    status.value = 'loading'
    errorMessage.value = ''
    // El logo es obligatorio para "crear la empresa completa" — se valida acá
    // (no en el schema zod) porque es una regla de flujo (archivo subido), no
    // de formato, mismo patrón que UpdateProfileView.vue.
    if (!values.logoBase64) {
      status.value = 'error'
      errorMessage.value = t('organizations.form.logoRequired')
      return
    }
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
    serviceSlugs,
    toggleService,
    logoBase64,
    primaryColor,
    secondaryColor,
    responsableDocumentType,
    responsableDocumentTypeAttrs,
    responsableDocumentNumber,
    responsableDocumentNumberAttrs,
    responsableNombre,
    responsableNombreAttrs,
    responsableCargo,
    responsableCargoAttrs,
    responsableTelefono,
    responsableTelefonoAttrs,
    submit,
  }
}
