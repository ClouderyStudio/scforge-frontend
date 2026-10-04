<script setup lang="ts">
/**
 * Up/down vote control shared by plugins and comments.
 *
 * The parent owns the authoritative counts and the API call; this component is
 * controlled (v-model:vote) and only reports the *desired* new direction.
 */
import { computed } from 'vue'
import { IconThumbDown, IconThumbUp } from '@/icons'
import { M3Icon } from '@/components/m3'
import { formatCount } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    upvotes: number
    downvotes: number
    vote: 1 | -1 | 0
    size?: 'sm' | 'md'
    /** Stack the buttons vertically (catalogue side panel). */
    vertical?: boolean
    /** Secondary caption, e.g. "评分". */
    label?: string
    disabled?: boolean
  }>(),
  { size: 'md', vertical: false, label: undefined, disabled: false },
)

const emit = defineEmits<{ (e: 'update:vote', value: 1 | -1 | 0): void }>()

const score = computed(() => props.upvotes - props.downvotes)
const scoreLabel = computed(() => (score.value > 0 ? `+${formatCount(score.value)}` : formatCount(score.value)))

function choose(direction: 1 | -1): void {
  if (props.disabled) return
  // Clicking the active direction clears the vote.
  emit('update:vote', props.vote === direction ? 0 : direction)
}
</script>

<template>
  <div class="sc-vote" :class="[`sc-vote--${size}`, { 'sc-vote--vertical': vertical }]">
    <button
      type="button"
      class="sc-vote__button"
      :class="{ 'is-active': vote === 1 }"
      :aria-pressed="vote === 1"
      :disabled="disabled"
      :title="`赞同（${formatCount(upvotes)}）`"
      @click.stop.prevent="choose(1)"
    >
      <M3Icon :icon="IconThumbUp" :size="size === 'sm' ? 16 : 18" />
      <span class="sc-vote__count md-typescale-label-medium">{{ formatCount(upvotes) }}</span>
      <span class="sr-only">赞同</span>
    </button>

    <span class="sc-vote__score" :title="label ?? '评分'">
      <span class="md-typescale-title-small">{{ scoreLabel }}</span>
      <span v-if="label" class="sc-vote__label md-typescale-label-small">{{ label }}</span>
    </span>

    <button
      type="button"
      class="sc-vote__button"
      :class="{ 'is-active': vote === -1 }"
      :aria-pressed="vote === -1"
      :disabled="disabled"
      :title="`反对（${formatCount(downvotes)}）`"
      @click.stop.prevent="choose(-1)"
    >
      <M3Icon :icon="IconThumbDown" :size="size === 'sm' ? 16 : 18" />
      <span class="sc-vote__count md-typescale-label-medium">{{ formatCount(downvotes) }}</span>
      <span class="sr-only">反对</span>
    </button>
  </div>
</template>

<style scoped>
.sc-vote {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
}

.sc-vote--vertical {
  flex-direction: column;
  gap: 2px;
  border-radius: var(--md-sys-shape-corner-large);
  padding: 6px 4px;
}

.sc-vote__button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding-inline: 10px;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-vote--sm .sc-vote__button {
  height: 28px;
  padding-inline: 8px;
}

@media (hover: hover) {
  .sc-vote__button:hover:not(:disabled) {
    background-color: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-on-surface);
  }
}

.sc-vote__button.is-active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.sc-vote__button:disabled {
  cursor: default;
  opacity: var(--md-sys-state-disabled-content-opacity);
}

.sc-vote__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
  padding-inline: 4px;
  color: var(--md-sys-color-on-surface);
  line-height: 1.1;
}

.sc-vote__label {
  color: var(--md-sys-color-on-surface-variant);
}
</style>
