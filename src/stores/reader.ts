/** 阅读器状态管理 */
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { EpubBook, TocItem, ChapterContent } from '@/types/epub'
import type { ReaderSettings } from '@/types/reader'
import { DEFAULT_SETTINGS } from '@/types/reader'
import type { PaginationState } from '@/core/pagination/Paginator'
import { storage } from '@/utils/storage'

const SETTINGS_KEY = 'reader_settings'

export const useReaderStore = defineStore('reader', () => {
  /** 当前打开的书籍 */
  const currentBook = shallowRef<EpubBook | null>(null)
  /** 当前章节内容 */
  const currentChapter = shallowRef<ChapterContent | null>(null)
  /** 分页状态 */
  const pagination = ref<PaginationState>({
    currentPage: 0,
    totalPages: 1,
    spineIndex: 0,
  })
  /** 阅读设置 */
  const settings = ref<ReaderSettings>(loadSettings())
  /** 是否显示工具栏 */
  const showToolbar = ref(false)
  /** 是否显示目录侧栏 */
  const showToc = ref(false)
  /** 是否显示设置面板 */
  const showSettings = ref(false)
  /** 加载状态 */
  const loading = ref(false)
  /** 错误信息 */
  const error = ref<string | null>(null)

  /** 全书进度百分比 */
  function getOverallProgress(): number {
    if (!currentBook.value) return 0
    const spineLen = currentBook.value.spine.length
    if (spineLen === 0) return 0

    const spineProgress = pagination.value.spineIndex / spineLen
    const pageProgress = pagination.value.totalPages > 0
      ? pagination.value.currentPage / pagination.value.totalPages / spineLen
      : 0

    return Math.min(100, Math.round((spineProgress + pageProgress) * 100))
  }

  /** 获取当前章节标题 */
  function getCurrentChapterTitle(): string {
    if (!currentBook.value || !currentChapter.value) return ''
    const spineItem = currentBook.value.spine[pagination.value.spineIndex]
    if (!spineItem) return ''

    // 在目录中查找匹配的标题
    const title = findTocTitle(currentBook.value.toc, spineItem.href)
    return title || `第 ${pagination.value.spineIndex + 1} 章`
  }

  /** 更新分页状态 */
  function updatePagination(state: Partial<PaginationState>): void {
    Object.assign(pagination.value, state)
  }

  /** 切换工具栏显示 */
  function toggleToolbar(): void {
    showToolbar.value = !showToolbar.value
    if (!showToolbar.value) {
      showToc.value = false
      showSettings.value = false
    }
  }

  /** 更新设置 */
  function updateSettings(newSettings: Partial<ReaderSettings>): void {
    Object.assign(settings.value, newSettings)
    storage.set(SETTINGS_KEY, settings.value)
  }

  /** 重置 */
  function reset(): void {
    currentBook.value = null
    currentChapter.value = null
    pagination.value = { currentPage: 0, totalPages: 1, spineIndex: 0 }
    showToolbar.value = false
    showToc.value = false
    showSettings.value = false
    loading.value = false
    error.value = null
  }

  return {
    currentBook,
    currentChapter,
    pagination,
    settings,
    showToolbar,
    showToc,
    showSettings,
    loading,
    error,
    getOverallProgress,
    getCurrentChapterTitle,
    updatePagination,
    toggleToolbar,
    updateSettings,
    reset,
  }
})

function loadSettings(): ReaderSettings {
  return storage.get<ReaderSettings>(SETTINGS_KEY, { ...DEFAULT_SETTINGS })
}

/** 在目录树中查找匹配 href 的标题 */
function findTocTitle(toc: TocItem[], href: string): string | null {
  for (const item of toc) {
    const tocHref = item.href.split('#')[0]
    if (tocHref === href || href.endsWith(tocHref)) {
      return item.label
    }
    if (item.children.length > 0) {
      const found = findTocTitle(item.children, href)
      if (found) return found
    }
  }
  return null
}
