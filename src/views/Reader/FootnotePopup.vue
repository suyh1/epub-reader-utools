<script lang="ts" setup>
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
      <header class="footnote-header">
        <span class="footnote-label">注释</span>
        <button class="footnote-close" @click="emit('close')">✕</button>
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
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.footnote-popup {
  width: 100%;
  max-height: 50%;
  background: #fff;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.footnote-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.footnote-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.footnote-close {
  background: none;
  border: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: #333;
  }
}

.footnote-content {
  padding: 16px 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.8;
  color: #444;

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(a) {
    color: #8b7355;
  }
}
</style>
