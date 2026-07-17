import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n'

const OG_LOCALE_MAP: Record<string, string> = { es: 'es_CO', en: 'en_US' }

/** Reactive per-locale SEO: title, description, OG/Twitter tags, hreflang alternates, and JSON-LD. */
export function useSeoHead() {
  const { t, locale } = useI18n()
  const siteUrl = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')

  useHead(() => {
    const canonicalUrl = `${siteUrl}/${locale.value}/`
    const ogImage = `${siteUrl}/og-image.png`

    return {
      htmlAttrs: { lang: locale.value },
      title: t('meta.title'),
      meta: [
        { name: 'description', content: t('meta.description') },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'RoMa — Ciencia Aplicada' },
        { property: 'og:title', content: t('meta.title') },
        { property: 'og:description', content: t('meta.ogDescription') },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:image', content: ogImage },
        { property: 'og:locale', content: OG_LOCALE_MAP[locale.value] ?? 'es_CO' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'RoMa — Ciencia Aplicada' },
        { name: 'twitter:description', content: t('meta.twitterDescription') },
        { name: 'twitter:image', content: ogImage },
      ],
      link: [
        { rel: 'canonical', href: canonicalUrl },
        ...SUPPORTED_LOCALES.map((l) => ({ rel: 'alternate' as const, hreflang: l, href: `${siteUrl}/${l}/` })),
        { rel: 'alternate' as const, hreflang: 'x-default', href: `${siteUrl}/${DEFAULT_LOCALE}/` },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'RoMa — Ciencia Aplicada',
            url: canonicalUrl,
            logo: `${siteUrl}/apple-touch-icon.png`,
            description: t('meta.jsonLdDescription'),
            areaServed: 'CO',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              telephone: `+${import.meta.env.VITE_WHATSAPP_NUMBER}`,
            },
            sameAs: [
              import.meta.env.VITE_FACEBOOK_URL,
              import.meta.env.VITE_INSTAGRAM_URL,
              import.meta.env.VITE_TIKTOK_URL,
              import.meta.env.VITE_X_URL,
            ],
          }),
        },
      ],
    }
  })
}
