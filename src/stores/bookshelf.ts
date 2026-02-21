/** 书架状态管理 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BookRecord, ReadingProgress } from '@/types/book'
import { storage } from '@/utils/storage'

const BOOKS_KEY = 'books_index'

export const useBookshelfStore = defineStore('bookshelf', () => {
  const books = ref<BookRecord[]>([])
  const sortBy = ref<'lastRead' | 'title' | 'addedTime'>('lastRead')
  const viewMode = ref<'grid' | 'list'>('grid')

  /** 排序后的书籍列表 */
  const sortedBooks = computed(() => {
    const list = [...books.value]
    switch (sortBy.value) {
      case 'lastRead':
        return list.sort((a, b) => b.lastReadTime - a.lastReadTime)
      case 'title':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'zh'))
      case 'addedTime':
        return list.sort((a, b) => b.addedTime - a.addedTime)
      default:
        return list
    }
  })

  /** 从存储加载书籍列表 */
  function loadBooks(): void {
    books.value = storage.get<BookRecord[]>(BOOKS_KEY, [])
  }

  /** 保存书籍列表到存储 */
  function saveBooks(): void {
    storage.set(BOOKS_KEY, books.value)
  }

  /** 添加书籍 */
  function addBook(book: BookRecord): void {
    // 去重检查
    const existing = books.value.find((b) => b.id === book.id)
    if (existing) {
      // 更新已有记录
      Object.assign(existing, book)
    } else {
      books.value.push(book)
    }
    saveBooks()
  }

  /** 删除书籍 */
  function removeBook(id: string): void {
    const index = books.value.findIndex((b) => b.id === id)
    if (index >= 0) {
      const book = books.value[index]
      // 删除数据目录中的文件
      try {
        const filename = `${book.id}.epub`
        window.services?.deleteFromDataDir(filename)
      } catch { /* ignore */ }

      books.value.splice(index, 1)
      // 清除阅读进度
      storage.remove(`progress_${id}`)
      saveBooks()
    }
  }

  /** 更新阅读进度 */
  function updateProgress(id: string, progress: ReadingProgress): void {
    const book = books.value.find((b) => b.id === id)
    if (book) {
      book.progress = progress
      book.lastReadTime = progress.timestamp
      saveBooks()
    }
    // 同时单独存储进度（方便快速读取）
    storage.set(`progress_${id}`, progress)
  }

  /** 获取阅读进度 */
  function getProgress(id: string): ReadingProgress | null {
    return storage.get<ReadingProgress | null>(`progress_${id}`, null)
  }

  /** 获取书籍 */
  function getBook(id: string): BookRecord | undefined {
    return books.value.find((b) => b.id === id)
  }

  return {
    books,
    sortBy,
    viewMode,
    sortedBooks,
    loadBooks,
    addBook,
    removeBook,
    updateProgress,
    getProgress,
    getBook,
  }
})
