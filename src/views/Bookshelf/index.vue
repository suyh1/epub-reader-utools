<script lang="ts" setup>
import { ref, computed } from 'vue'
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
    // 浏览器环境回退
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

function formatProgress(progress: number): string {
  return progress > 0 ? `${progress}%` : '未读'
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
    <header class="bookshelf-header">
      <h1 class="bookshelf-title">📚 书架</h1>
      <div class="bookshelf-actions">
        <input
          v-model="searchQuery"
          class="search-input"
          type="text"
          placeholder="搜索书名或作者..."
        />
        <select v-model="bookshelfStore.sortBy" class="sort-select">
          <option value="lastRead">最近阅读</option>
          <option value="title">书名</option>
          <option value="addedTime">添加时间</option>
        </select>
        <button class="import-btn" @click="handleImport">+ 导入</button>
      </div>
    </header>

    <!-- 拖拽提示 -->
    <div v-if="isDragOver" class="drop-overlay">
      <div class="drop-hint">📖 松开以导入 EPUB 文件</div>
    </div>

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
      <div class="empty-icon">📖</div>
      <p class="empty-text">书架空空如也</p>
      <p class="empty-hint">点击"导入"按钮或拖拽 EPUB 文件到此处</p>
      <button class="import-btn large" @click="handleImport">导入 EPUB</button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.bookshelf {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f6f1;
  position: relative;
  overflow: hidden;
}

.bookshelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e4dc;
  background: #fff;
  flex-shrink: 0;
}

.bookshelf-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.bookshelf-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  width: 180px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #8b7355;
  }
}

.sort-select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  outline: none;
  cursor: pointer;
}

.import-btn {
  padding: 6px 16px;
  background: #8b7355;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
  line-height: 1.5;

  &:hover {
    background: #6d5a43;
  }

  &.large {
    padding: 10px 28px;
    font-size: 15px;
  }
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(139, 115, 85, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border: 3px dashed #8b7355;
  border-radius: 8px;
  margin: 8px;
}

.drop-hint {
  font-size: 18px;
  color: #8b7355;
  font-weight: 500;
}

.book-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 24px;
  align-content: start;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  margin: 0 0 8px;
  color: #666;
}

.empty-hint {
  font-size: 13px;
  margin: 0 0 24px;
}
</style>
