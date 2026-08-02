<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import CareerSelector from './CareerSelector.vue'
import type { Career } from '@/types/game'

interface Props {
  modelValue: boolean
  selectedCareerId?: string
  playerName?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedCareerId: '',
  playerName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', careerId: string): void
}>()

const localCareerId = ref(props.selectedCareerId)

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      localCareerId.value = props.selectedCareerId
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (localCareerId.value) {
    emit('confirm', localCareerId.value)
    close()
  }
}

function onSelect(career: Career) {
  // 选中后自动确认
  // 不自动确认，让用户点击确认按钮
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- 遮罩 -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="close"
        />

        <!-- 弹窗内容 -->
        <Transition name="modal-scale">
          <div
            v-if="modelValue"
            class="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-[var(--radius-md)] shadow-2xl max-h-[85vh] flex flex-col"
          >
            <!-- 头部 -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 class="text-base font-semibold text-foreground">
                  选择职业
                </h3>
                <p v-if="playerName" class="text-xs text-muted-foreground mt-0.5">
                  {{ playerName }}
                </p>
              </div>
              <button
                type="button"
                class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                @click="close"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex-1 overflow-y-auto px-5 py-4">
              <CareerSelector
                v-model="localCareerId"
                :show-random="true"
                @select="onSelect"
              />
            </div>

            <!-- 底部 -->
            <div class="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-[var(--radius-md)] transition-colors"
                @click="close"
              >
                取消
              </button>
              <button
                type="button"
                class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 rounded-[var(--radius-md)] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="!localCareerId"
                @click="confirm"
              >
                确认选择
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>
