<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useContactForm } from '@/composables/useContactForm'

const { t } = useI18n()

const {
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
} = useContactForm()

const inputClasses =
  'w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-700/40 focus:border-sky-400'
</script>

<template>
  <section id="contacto" class="relative overflow-hidden bg-cream px-6 py-[120px] pb-[130px] sm:px-8 md:px-16">
    <div class="relative z-[2] mx-auto max-w-[720px]">
      <div v-reveal class="mx-auto mb-12 max-w-[560px] text-center">
        <div
          class="mb-5 inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-navy-700 before:h-px before:w-[26px] before:content-[''] before:bg-line-strong after:h-px after:w-[26px] after:content-[''] after:bg-line-strong"
        >
          {{ t('contacto.eyebrow') }}
        </div>
        <i18n-t
          keypath="contacto.title"
          tag="h2"
          class="font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.28] text-navy-900"
        >
          <template #accent
            ><em class="font-medium italic text-sky-400">{{ t('contacto.titleAccent') }}</em></template
          >
        </i18n-t>
        <p class="mt-[18px] text-[15px] leading-relaxed text-navy-700 opacity-85">
          {{ t('contacto.subtitle') }}
        </p>
      </div>

      <form
        v-if="status !== 'success'"
        class="grid gap-5 rounded-lg border border-line-strong bg-white p-7 shadow-[0_24px_60px_rgba(11,26,51,0.06)] sm:p-10"
        novalidate
        @submit.prevent="submit"
      >
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label for="nombre" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
              >{{ t('contacto.form.nombre') }} *</label
            >
            <input
              id="nombre"
              v-model="nombre"
              v-bind="nombreAttrs"
              type="text"
              :class="inputClasses"
              :placeholder="t('contacto.form.nombrePlaceholder')"
            />
            <p v-if="errors.nombre" class="mt-1.5 text-xs text-red-600">{{ errors.nombre }}</p>
          </div>
          <div>
            <label for="correo" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
              >{{ t('contacto.form.correo') }} *</label
            >
            <input
              id="correo"
              v-model="correo"
              v-bind="correoAttrs"
              type="email"
              :class="inputClasses"
              :placeholder="t('contacto.form.correoPlaceholder')"
            />
            <p v-if="errors.correo" class="mt-1.5 text-xs text-red-600">{{ errors.correo }}</p>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label for="telefono" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
              >{{ t('contacto.form.telefono') }} *</label
            >
            <input
              id="telefono"
              v-model="telefono"
              v-bind="telefonoAttrs"
              type="tel"
              :class="inputClasses"
              :placeholder="t('contacto.form.telefonoPlaceholder')"
            />
            <p v-if="errors.telefono" class="mt-1.5 text-xs text-red-600">{{ errors.telefono }}</p>
          </div>
          <div>
            <label for="empresa" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('contacto.form.empresa')
            }}</label>
            <input
              id="empresa"
              v-model="empresa"
              v-bind="empresaAttrs"
              type="text"
              :class="inputClasses"
              :placeholder="t('contacto.form.empresaPlaceholder')"
            />
          </div>
        </div>

        <div>
          <label for="mensaje" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
            >{{ t('contacto.form.mensaje') }} *</label
          >
          <textarea
            id="mensaje"
            v-model="mensaje"
            v-bind="mensajeAttrs"
            rows="4"
            :class="inputClasses"
            :placeholder="t('contacto.form.mensajePlaceholder')"
          />
          <p v-if="errors.mensaje" class="mt-1.5 text-xs text-red-600">{{ errors.mensaje }}</p>
        </div>

        <p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="status === 'loading'"
          class="inline-flex items-center justify-center gap-2 rounded-sm border border-navy-900 bg-navy-900 px-7 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-[250ms] hover:bg-transparent hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            v-if="status === 'loading'"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path
              class="opacity-75"
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
          {{ status === 'loading' ? t('contacto.form.submitting') : t('contacto.form.submit') }}
        </button>
      </form>

      <div
        v-else
        class="flex flex-col items-center gap-3.5 rounded-lg border border-line-strong bg-white p-12 text-center shadow-[0_24px_60px_rgba(11,26,51,0.06)]"
      >
        <svg class="h-10 w-10 text-sky-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M8 12.5l2.5 2.5L16 9.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h3 class="font-serif text-xl font-semibold text-navy-900">{{ t('contacto.form.successTitle') }}</h3>
        <p class="max-w-sm text-sm leading-relaxed text-navy-700">{{ t('contacto.form.successBody') }}</p>
        <button
          type="button"
          class="text-sm font-semibold text-sky-500 underline underline-offset-4"
          @click="status = 'idle'"
        >
          {{ t('contacto.form.sendAnother') }}
        </button>
      </div>
    </div>
  </section>
</template>
