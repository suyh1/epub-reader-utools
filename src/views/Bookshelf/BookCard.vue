<script lang="ts" setup>
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

function handleContextMenu(e: MouseEvent): void {
  e.preventDefault()
  if (confirm(`确定要从书架移除《${props.book.title}》吗？`)) {
    emit('delete')
  }
}
</script>

<template>
  <div class="book-card" @click="emit('click')" @contextmenu="handleContextMenu">
    <div class="book-cover">
      <img v-if="book.coverBase64" :src="book.coverBase64" :alt="book.title" />
      <div v-else class="cover-placeholder">
        <span class="cover-title">{{ book.title }}</span>
        <span class="cover-author">{{ book.creator }}</span>
      </div>
      <div class="progress-badge" :class="{ unread: book.progress.percentage <= 0 }">
        {{ formatProgress(book.progress.percentage) }}
      </div>
    </div>
    <div class="book-info">
      <div class="book-title" :title="book.title">{{ book.title }}</div>
      <div class="book-author" :title="book.creator">{{ book.creator }}</div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.book-card {
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }

  &:active {
    transform: translateY(-2px);
  }
}

.book-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 2px 0 4px rgba(0, 0, 0, 0.1);
  background: #e8e4dc;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: linear-gradient(135deg, #8b7355 0%, #a08b6d 100%);
  color: #fff;
  text-align: center;
  gap: 8px;
}

.cover-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cover-author {
  font-size: 11px;
  opacity: 0.8;
}

.progress-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  border-radius: 3px;

  &.unread {
    background: rgba(139, 115, 85, 0.8);
  }
}

.book-info {
  padding: 8px 2px 0;
}

.book-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-author {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
