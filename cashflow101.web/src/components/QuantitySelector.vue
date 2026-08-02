<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: number
  maxQuantity: number
  unitPrice: number
  mode?: 'buy' | 'sell'
  availableCash?: number
  assetType?: 'stock' | 'real_estate' | 'business' | 'other'
  unitLabel?: string
  showQuickButtons?: boolean
}>(), {
  mode: 'buy',
  availableCash: Infinity,
  assetType: 'stock',
  unitLabel: '股',
  showQuickButtons: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'confirm'): void
}>()

const inputValue = ref<string>(String(props.modelValue))

// Watch modelValue from parent to keep local input in sync
watch(
  () => props.modelValue,
  (val) => {
    inputValue.value = String(val)
  },
)

// Effective maximum: in buy mode, also limited by available cash
const effectiveMax = computed(() => {
  if (props.mode === 'buy' && props.availableCash !== undefined && props.availableCash !== Infinity && props.unitPrice > 0) {
    const cashMax = Math.floor(props.availableCash / props.unitPrice)
    return Math.min(props.maxQuantity, Math.max(0, cashMax))
  }
  return props.maxQuantity
})

const canDecrease = computed(() => props.modelValue > 1)
const canIncrease = computed(() => props.modelValue < effectiveMax.value)

const totalPrice = computed(() => props.modelValue * props.unitPrice)

const isCashInsufficient = computed(() => {
  if (props.mode !== 'buy') return false
  if (props.availableCash === undefined || props.availableCash === Infinity) return false
  return totalPrice.value > props.availableCash
})

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function clampQuantity(val: number): number {
  const min = 1
  const max = Math.max(min, effectiveMax.value)
  return Math.min(Math.max(val, min), max)
}

function handleDecrease() {
  if (!canDecrease.value) return
  const next = props.modelValue - 1
  emit('update:modelValue', next)
}

function handleIncrease() {
  if (!canIncrease.value) return
  const next = props.modelValue + 1
  emit('update:modelValue', next)
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  inputValue.value = target.value
}

function handleBlur() {
  const raw = parseInt(inputValue.value, 10)
  const val = Number.isFinite(raw) ? raw : 1
  const clamped = clampQuantity(val)
  inputValue.value = String(clamped)
  if (clamped !== props.modelValue) {
    emit('update:modelValue', clamped)
  }
}

function setQuantity(val: number) {
  const clamped = clampQuantity(val)
  emit('update:modelValue', clamped)
}

function setPercentage(pct: number) {
  const val = Math.max(1, Math.floor(effectiveMax.value * pct))
  setQuantity(val)
}

const quickPercentages = [0.25, 0.5, 0.75, 1] as const
</script>

<template>
  <div
    class="rounded-2xl border border-border bg-background p-5 space-y-4"
  >
    <!-- Quantity stepper -->
    <div class="flex items-center justify-center gap-4">
      <!-- Decrease button -->
      <button
        class="h-9 w-9 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="!canDecrease"
        @click="handleDecrease"
        aria-label="减少"
      >
        <Minus class="w-4 h-4" />
      </button>

      <!-- Number input -->
      <div class="flex-1 max-w-[160px]">
        <input
          :value="inputValue"
          type="number"
          min="1"
          :max="effectiveMax"
          class="w-full h-11 text-center text-xl font-bold bg-background border border-input rounded-[var(--radius-sm)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          @input="handleInput"
          @blur="handleBlur"
        />
      </div>

      <!-- Increase button -->
      <button
        class="h-9 w-9 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="!canIncrease"
        @click="handleIncrease"
        aria-label="增加"
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>

    <!-- Unit label -->
    <div class="text-center text-xs text-muted-foreground">
      单位：{{ unitLabel }}
    </div>

    <!-- Quick buttons -->
    <div v-if="showQuickButtons" class="flex flex-wrap justify-center gap-2">
      <button
        v-for="pct in quickPercentages"
        :key="pct"
        class="px-3 py-1.5 rounded-full text-xs bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="Math.floor(effectiveMax * pct) < 1"
        @click="setPercentage(pct)"
      >
        {{ Math.round(pct * 100) }}%
      </button>
    </div>

    <!-- Bottom info bar -->
    <div
      class="rounded-[var(--radius-sm)] border border-border p-3 space-y-1.5 bg-secondary/30"
    >
      <div class="flex justify-between items-center text-sm">
        <span class="text-muted-foreground">
          总计
        </span>
        <span
          class="font-semibold"
          :class="isCashInsufficient ? 'text-destructive' : 'text-foreground'"
        >
          {{ formatMoney(totalPrice) }}
        </span>
      </div>

      <div class="flex justify-between items-center text-xs">
        <span class="text-muted-foreground">
          可买/可卖
        </span>
        <span class="text-muted-foreground">
          {{ effectiveMax.toLocaleString() }} {{ unitLabel }}
        </span>
      </div>

      <div v-if="mode === 'buy' && availableCash !== undefined && availableCash !== Infinity" class="flex justify-between items-center text-xs">
        <span class="text-muted-foreground">可用现金</span>
        <span class="text-muted-foreground">
          {{ formatMoney(availableCash) }}
        </span>
      </div>

      <div v-if="isCashInsufficient" class="text-xs text-destructive text-right">
        现金不足
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide number input spinners for cleaner look */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
}
</style>
