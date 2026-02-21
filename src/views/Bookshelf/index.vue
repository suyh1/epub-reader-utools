<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Search, Plus, BookOpen, ArrowDownUp } from 'lucide-vue-next'
import { useBookshelfStore } from '@/stores/bookshelf'
import type { BookRecord } from '@/types/book'
import BookCard from './BookCard.vue'

const emit = defineEmits<{
  (e: 'open-book', record: BookRecord): void
  (e: 'open-file', filePath: string): void
}>()

const bookshelfStore = useBookshelfStore()
bookshelfStore.loadBooks()

const searchQuery = ref('')
const isDragOver = ref(false)

const filteredBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return bookshelfStore.sortedBooks
  return bookshelfStore.sortedBooks.filter(
    (b) => b.title.toLowerCase().includes(q) || b.creator.toLowerCase().includes(q),
  )
})

function handleImport(): void {
  if (window.utools) {
    const files = window.utools.showOpenDialog({
      title: '选择 EPUB 文件',
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
      properties: ['openFile'],
    })
    if (files && files.length > 0) {
      emit('open-file', files[0])
    }
  } else {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.epub'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) emit('open-file', (file as any).path || file.name)
    }
    input.click()
  }
}

function handleDrop(e: DragEvent): void {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.epub')) {
    emit('open-file', (file as any).path || file.name)
  }
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(): void {
  isDragOver.value = false
}

function handleDelete(id: string): void {
  bookshelfStore.removeBook(id)
}

const sortLabels: Record<string, string> = {
  lastRead: '最近阅读',
  title: '书名',
  addedTime: '添加时间',
}

function cycleSortBy(): void {
  const keys = ['lastRead', 'title', 'addedTime'] as const
  const idx = keys.indexOf(bookshelfStore.sortBy)
  bookshelfStore.sortBy = keys[(idx + 1) % keys.length]
}
</script>

<template>
  <div
    class="bookshelf"
    @drop.prevent="handleDrop"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
  >
    <!-- 顶部栏 -->
    <header class="shelf-header">
      <div class="shelf-brand">
        <BookOpen :size="22" stroke-width="1.8" />
        <h1>书架</h1>
      </div>

      <div class="shelf-actions">
        <div class="search-box">
          <Search :size="15" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索书名或作者"
            class="search-input"
          />
        </div>

        <button class="sort-btn" @click="cycleSortBy" :title="`排序: ${sortLabels[bookshelfStore.sortBy]}`">
          <ArrowDownUp :size="15" />
          <span>{{ sortLabels[bookshelfStore.sortBy] }}</span>
        </button>

        <button class="import-btn" @click="handleImport">
          <Plus :size="16" stroke-width="2.5" />
          <span>导入</span>
        </button>
      </div>
    </header>

    <!-- 拖拽提示 -->
    <transition name="fade">
      <div v-if="isDragOver" class="drop-overlay">
        <div class="drop-zone">
          <BookOpen :size="40" stroke-width="1.5" />
          <span>松开以导入 EPUB 文件</span>
        </div>
      </div>
    </transition>

    <!-- 书籍网格 -->
    <div v-if="filteredBooks.length > 0" class="book-grid">
      <BookCard
        v-for="book in filteredBooks"
        :key="book.id"
        :book="book"
        @click="emit('open-book', book)"
        @delete="handleDelete(book.id)"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-visual">
        <BookOpen :size="56" stroke-width="1" />
      </div>
      <p class="empty-title">书架空空如也</p>
      <p class="empty-desc">点击导入按钮或拖拽 EPUB 文件到此处</p>
      <button class="empty-action" @click="handleImport">
        <Plus :size="18" stroke-width="2.5" />
        <span>导入 EPUB</span>
      </button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.bookshelf {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}

/* 顶部栏 */
.shelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 16px;
}

.shelf-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
  flex-shrink: 0;

  h1 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }
}

.shelf-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  padding: 7px 12px 7px 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  width: 200px;
  background: var(--bg);
  color: var(--text-primary);
  transition: all var(--duration-fast);

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:focus {
    border-color: var(--primary);
    background: var(--bg-elevated);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--duration-fast);

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--primary);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--primary-hover);
    box-shadow: var(--shadow-sm);
  }

  &:active {
    transform: scale(0.97);
  }
}

/* 拖拽 */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: rgba(247, 245, 242, 0.92);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.drop-zone {
  width: 100%;
  height: 100%;
  border: 2px dashed var(--primary);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--primary);
  font-size: 16px;
  font-weight: 500;
}

/* 书籍网格 */
.book-grid {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 28px 24px;
  align-content: start;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.empty-visual {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  margin-bottom: 20px;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 24px;
}

.empty-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: var(--primary);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--primary-hover);
    box-shadow: var(--shadow-md);
  }

  &:active {
    transform: scale(0.97);
  }
}

/* 过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
