<script lang="ts" setup>
import { computed } from 'vue'
import { X, Trash2, BookmarkIcon } from 'lucide-vue-next'
import { useReaderStore } from '@/stores/reader'
import type { Bookmark } from '@/types/book'

const emit = defineEmits<{
  (e: 'select', bookmark: Bookmark): void
  (e: 'close'): void
}>()

const readerStore = useReaderStore()

const sortedBookmarks = computed(() => {
  return [...readerStore.bookmarks].sort((a, b) => b.createdAt - a.createdAt)
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${h}:${m}`
}

function handleSelect(bookmark: Bookmark): void {
  emit('select', bookmark)
}

function handleDelete(e: MouseEvent, id: string): void {
  e.stopPropagation()
  readerStore.removeBookmark(id)
}

function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as Element).classList.contains('bookmark-overlay')) {
    emit('close')
  }
}
</script>

<template>
  <transition name="bm-fade">
    <div class="bookmark-overlay" @click="handleOverlayClick">
      <transition name="bm-slide" appear>
        <aside class="bookmark-sidebar">
          <header class="bm-header">
            <h2>书签</h2>
            <button class="close-btn" @click="emit('close')">
              <X :size="18" />
            </button>
          </header>

          <div v-if="sortedBookmarks.length > 0" class="bm-list">
            <div
              v-for="bm in sortedBookmarks"
              :key="bm.id"
              class="bm-item"
              @click="handleSelect(bm)"
            >
              <div class="bm-icon">
                <BookmarkIcon :size="14" />
              </div>
              <div class="bm-content">
                <div class="bm-chapter">{{ bm.chapterTitle }}</div>
                <div class="bm-meta">
                  <span>第 {{ bm.pageInChapter + 1 }} 页</span>
                  <span class="bm-dot">·</span>
                  <span>{{ bm.percentage }}%</span>
                  <span class="bm-dot">·</span>
                  <span>{{ formatTime(bm.createdAt) }}</span>
                </div>
              </div>
              <button class="bm-delete" @click="handleDelete($event, bm.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div v-else class="bm-empty">
            <BookmarkIcon :size="32" stroke-width="1.2" />
            <p>还没有书签</p>
            <p class="bm-empty-hint">阅读时点击书签按钮或按 Ctrl+B 添加</p>
          </div>
        </aside>
      </transition>
    </div>
  </transition>
</template>

<style lang="less" scoped>
.bookmark-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: var(--overlay);
}

.bookmark-sidebar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  max-width: 85%;
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.bm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }
}

.close-btn {
  width: 32px;
  height: 32px;
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

.bm-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.bm-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 18px;
  cursor: pointer;
  transition: background var(--duration-fast);

  &:hover {
    background: var(--bg-hover);

    .bm-delete {
      opacity: 1;
    }
  }
}

.bm-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.bm-content {
  flex: 1;
  min-width: 0;
}

.bm-chapter {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.bm-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bm-dot {
  opacity: 0.5;
}

.bm-delete {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: all var(--duration-fast);

  &:hover {
    background: rgba(220, 60, 60, 0.1);
    color: #dc3c3c;
  }
}

.bm-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  gap: 8px;
  padding: 32px;

  p {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.bm-empty-hint {
  font-size: 12px !important;
  color: var(--text-tertiary) !important;
}

/* 动画 */
.bm-slide-enter-active {
  transition: transform var(--duration-slow) var(--ease-out);
}
.bm-slide-leave-active {
  transition: transform var(--duration-normal) var(--ease-in-out);
}
.bm-slide-enter-from,
.bm-slide-leave-to {
  transform: translateX(100%);
}

.bm-fade-enter-active,
.bm-fade-leave-active {
  transition: opacity var(--duration-normal);
}
.bm-fade-enter-from,
.bm-fade-leave-to {
  opacity: 0;
}
</style>
