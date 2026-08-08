export interface BrandingFormValues {
  logoBase64: string
  primaryColor: string
  secondaryColor: string
}

/** GET del branding actual — a diferencia de BrandingFormValues, los campos
 * son nullable: una empresa puede no haber completado branding todavía. */
export interface CurrentBranding {
  logoBase64: string | null
  primaryColor: string | null
  secondaryColor: string | null
}
