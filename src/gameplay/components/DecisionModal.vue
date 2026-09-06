<script setup lang="ts">
import { CheckCircle2, TriangleAlert, X } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger' | 'success'
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="dm-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
      >
        <div class="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="
                  variant === 'danger'
                    ? 'bg-destructive/15 text-destructive'
                    : variant === 'success'
                      ? 'bg-success/15 text-success'
                      : 'bg-primary/15 text-primary'
                "
              >
                <TriangleAlert v-if="variant === 'danger'" class="h-5 w-5" />
                <CheckCircle2 v-else class="h-5 w-5" />
              </span>
              <h2 class="text-lg font-bold text-foreground">{{ title }}</h2>
            </div>
            <button
              type="button"
              class="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="关闭"
              @click="emit('close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <p v-if="description" class="mt-4 text-sm leading-relaxed text-muted-foreground">
            {{ description }}
          </p>

          <div class="mt-6 flex gap-3">
            <button
              v-if="cancelLabel"
              type="button"
              class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
              :disabled="disabled"
              @click="emit('cancel')"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              data-testid="decision-confirm"
              class="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40"
              :class="
                variant === 'danger'
                  ? 'bg-destructive text-destructive-foreground hover:brightness-95'
                  : variant === 'success'
                    ? 'bg-success text-success-foreground hover:brightness-95'
                    : 'bg-primary text-primary-foreground hover:brightness-95'
              "
              :disabled="disabled"
              @click="emit('confirm')"
            >
              {{ confirmLabel ?? '确认' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dm-fade-enter-active,
.dm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dm-fade-enter-from,
.dm-fade-leave-to {
  opacity: 0;
}
</style>
