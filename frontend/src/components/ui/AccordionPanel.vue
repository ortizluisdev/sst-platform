<script setup lang="ts">
import { ref } from 'vue'

export interface AccordionItem {
  id: string | number
  num: string
  label: string
  /** Inline SVG markup, small icon shown on the collapsed panel */
  iconMini: string
  /** Inline SVG markup, larger icon shown on the expanded panel */
  iconBig: string
  title: string
  tagline: string
}

const props = withDefaults(
  defineProps<{
    items: AccordionItem[]
    modelValue?: number
  }>(),
  { modelValue: 0 },
)

const emit = defineEmits<{ 'update:modelValue': [index: number] }>()

const activeIndex = ref(props.modelValue)

function activate(index: number) {
  if (activeIndex.value === index) return
  activeIndex.value = index
  emit('update:modelValue', index)
}
</script>

<template>
  <div
    class="flex h-auto flex-col overflow-hidden rounded-md border border-line-strong shadow-[0_24px_60px_rgba(11,26,51,0.08)] max-[860px]:h-auto md:h-[560px] md:flex-row md:gap-0.5"
  >
    <article
      v-for="(item, index) in items"
      :key="item.id"
      class="relative min-w-16 cursor-pointer overflow-hidden border-b border-line bg-white transition-[flex,background] duration-500 [transition-timing-function:cubic-bezier(.65,0,.35,1)] max-[860px]:h-16 max-[860px]:flex-none max-[860px]:border-b max-[860px]:border-r-0 md:h-full md:border-b-0 md:border-r md:border-line md:last:border-r-0"
      :class="[
        index === activeIndex
          ? 'cursor-default bg-white md:flex-[5.6] max-[860px]:h-auto max-[860px]:min-h-[420px]'
          : 'hover:bg-sky-100 md:flex-1',
      ]"
      @click="activate(index)"
    >
      <!-- collapsed label -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-end gap-0 px-0 py-8 pb-7 transition-opacity duration-300 max-[860px]:flex-row max-[860px]:items-center max-[860px]:justify-start max-[860px]:gap-4 max-[860px]:px-5 max-[860px]:py-0"
        :class="index === activeIndex ? 'pointer-events-none opacity-0' : 'opacity-100'"
      >
        <span class="font-serif mb-4 text-[15px] italic text-sky-400 opacity-90 max-[860px]:mb-0">{{ item.num }}</span>
        <span
          class="mb-5 h-9 w-9 opacity-95 max-[860px]:mb-0 max-[860px]:h-[26px] max-[860px]:w-[26px] [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          v-html="item.iconMini"
        />
        <span
          class="whitespace-nowrap text-[13.5px] font-semibold uppercase tracking-wide text-navy-900 [writing-mode:vertical-rl] rotate-180 max-[860px]:[writing-mode:horizontal-tb] max-[860px]:rotate-0"
        >
          {{ item.label }}
        </span>
      </div>

      <!-- expanded content -->
      <div
        class="absolute inset-0 flex flex-col overflow-y-auto px-7 pb-10 pt-12 transition-[opacity,transform] delay-[120ms] duration-[400ms] sm:px-9 max-[860px]:static max-[860px]:px-5 max-[860px]:pb-8 max-[860px]:pt-6"
        :class="index === activeIndex ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'"
      >
        <div class="mb-5 flex items-start justify-between gap-6">
          <span class="h-14 w-14 flex-shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full" v-html="item.iconBig" />
          <span class="font-serif whitespace-nowrap text-[15px] italic text-sky-400 opacity-85"
            >{{ item.num }} / {{ items.length.toString().padStart(2, '0') }}</span
          >
        </div>

        <h3 class="font-serif mb-1.5 text-[clamp(22px,2.2vw,28px)] font-semibold leading-tight text-navy-900">
          {{ item.title }}
        </h3>
        <p class="font-serif mb-[18px] text-[14.5px] font-medium italic text-sky-400">{{ item.tagline }}</p>

        <slot name="content" :item="item" :index="index" />
      </div>
    </article>
  </div>
</template>
