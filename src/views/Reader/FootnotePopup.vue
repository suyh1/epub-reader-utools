<script lang="ts" setup>
import { X } from 'lucide-vue-next'
import type { FootnoteData } from '@/core/duokan/FootnoteHandler'

defineProps<{
  data: FootnoteData
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as Element).classList.contains('footnote-overlay')) {
    emit('close')
  }
}
</script>

<template>
  <div class="footnote-overlay" @click="handleOverlayClick">
    <div class="footnote-popup">
      <div class="popup-handle" />
      <header class="footnote-header">
        <span class="footnote-label">注释</span>
        <button class="footnote-close" @click="emit('close')">
          <X :size="16" />
        </button>
      </header>
      <div class="footnote-content" v-html="data.content" />
    </div>
  </div>
</template>

<style lang="less" scoped>
.footnote-overlay {
  position: absolute;
  inset: 0;
  z-index: 70;
  background: var(--overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.footnote-popup {
  width: 100%;
  max-height: 50%;
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp var(--duration-slow) var(--ease-out);
  box-shadow: var(--shadow-xl);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.popup-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  margin: 8px auto 0;
  flex-shrink: 0;
}

.footnote-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.footnote-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.footnote-close {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

.footnote-content {
  padding: 16px 20px 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(a) {
    color: var(--primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
