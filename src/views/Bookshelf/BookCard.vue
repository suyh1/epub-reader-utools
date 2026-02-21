<script lang="ts" setup>
import { Trash2 } from 'lucide-vue-next'
import type { BookRecord } from '@/types/book'

const props = defineProps<{
  book: BookRecord
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'delete'): void
}>()

function formatProgress(p: number): string {
  if (p <= 0) return '未读'
  if (p >= 100) return '已读完'
  return `${p}%`
}

function handleDelete(e: MouseEvent): void {
  e.stopPropagation()
  emit('delete')
}
</script>

<template>
  <div class="book-card" @click="emit('click')">
    <div class="book-cover">
      <img v-if="book.coverBase64" :src="book.coverBase64" :alt="book.title" />
      <div v-else class="cover-placeholder">
        <span class="cover-title">{{ book.title }}</span>
        <span class="cover-author">{{ book.creator }}</span>
      </div>

      <!-- 悬浮操作层 -->
      <div class="cover-overlay">
        <button class="delete-btn" title="从书架移除" @click="handleDelete">
          <Trash2 :size="16" />
        </button>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${Math.max(book.progress.percentage, 0)}%` }"
        />
      </div>
    </div>

    <div class="book-meta">
      <div class="book-title" :title="book.title">{{ book.title }}</div>
      <div class="book-author" :title="book.creator">{{ book.creator || '未知作者' }}</div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.book-card {
  cursor: pointer;
  transition: transform var(--duration-normal) var(--ease-out);
  position: relative;

  &:hover {
    transform: translateY(-6px);

    .cover-overlay {
      opacity: 1;
    }

    .book-cover {
      box-shadow: var(--shadow-lg);
    }
  }

  &:active {
    transform: translateY(-3px);
  }
}

.book-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  background: #E8E4DC;
  transition: box-shadow var(--duration-normal) var(--ease-out);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: linear-gradient(145deg, #6B5344 0%, #8B7355 50%, #A08B6D 100%);
  color: #fff;
  text-align: center;
  gap: 8px;
}

.cover-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  letter-spacing: 0.5px;
}

.cover-author {
  font-size: 11px;
  opacity: 0.75;
  letter-spacing: 0.3px;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 100%);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
  display: flex;
  justify-content: flex-end;
  padding: 8px;
}

.delete-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast);

  &:hover {
    background: rgba(220, 60, 60, 0.85);
    transform: scale(1.1);
  }
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.15);
}

.progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 0 2px 2px 0;
  transition: width var(--duration-slow) var(--ease-out);
}

.book-meta {
  padding: 10px 2px 0;
}

.book-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.book-author {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
