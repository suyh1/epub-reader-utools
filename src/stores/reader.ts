/** 阅读器状态管理 */
import { defineStore } from 'pinia'
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import type { EpubBook, TocItem, ChapterContent } from '@/types/epub'
import type { ReaderSettings, ThemeKey } from '@/types/reader'
import type { Bookmark } from '@/types/book'
import { DEFAULT_SETTINGS, THEMES } from '@/types/reader'
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
  /** 是否显示书签面板 */
  const showBookmarks = ref(false)
  /** 是否显示搜索面板 */
  const showSearch = ref(false)
  /** 加载状态 */
  const loading = ref(false)
  /** 错误信息 */
  const error = ref<string | null>(null)
  /** 当前书籍的书签列表 */
  const bookmarks = ref<Bookmark[]>([])
  /** 本次阅读开始时间 */
  const sessionStartTime = ref(0)
  /** 本次阅读已计时长（秒） */
  const sessionDuration = ref(0)

  /** 自动深色模式监听 */
  let darkModeQuery: MediaQueryList | null = null
  let darkModeHandler: ((e: MediaQueryListEvent) => void) | null = null
  /** 自动深色模式切换前的主题 */
  let themeBeforeAuto: ThemeKey | null = null

  function setupAutoTheme(): void {
    cleanupAutoTheme()
    if (!settings.value.autoTheme) return

    darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeHandler = (e: MediaQueryListEvent) => {
      if (!settings.value.autoTheme) return
      applyAutoTheme(e.matches)
    }
    darkModeQuery.addEventListener('change', darkModeHandler)
    applyAutoTheme(darkModeQuery.matches)
  }

  function applyAutoTheme(isDark: boolean): void {
    if (isDark) {
      if (settings.value.theme !== 'dark' && settings.value.theme !== 'ink' && settings.value.theme !== 'dusk') {
        themeBeforeAuto = settings.value.theme
        settings.value.theme = 'dark'
      }
    } else {
      if (themeBeforeAuto && (settings.value.theme === 'dark' || settings.value.theme === 'ink' || settings.value.theme === 'dusk')) {
        settings.value.theme = themeBeforeAuto
        themeBeforeAuto = null
      }
    }
  }

  function cleanupAutoTheme(): void {
    if (darkModeQuery && darkModeHandler) {
      darkModeQuery.removeEventListener('change', darkModeHandler)
    }
    darkModeQuery = null
    darkModeHandler = null
    themeBeforeAuto = null
  }

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
      showBookmarks.value = false
      showSearch.value = false
    }
  }

  /** 更新设置 */
  function updateSettings(newSettings: Partial<ReaderSettings>): void {
    Object.assign(settings.value, newSettings)
    storage.set(SETTINGS_KEY, settings.value)
    if ('autoTheme' in newSettings) {
      setupAutoTheme()
    }
  }

  // ---- 书签功能 ----

  /** 加载书签 */
  function loadBookmarks(bookId: string): void {
    bookmarks.value = storage.get<Bookmark[]>(`bookmarks_${bookId}`, [])
  }

  /** 保存书签 */
  function saveBookmarks(bookId: string): void {
    storage.set(`bookmarks_${bookId}`, bookmarks.value)
  }

  /** 添加书签 */
  function addBookmark(): Bookmark | null {
    if (!currentBook.value) return null
    const bookId = currentBook.value.id

    // 检查是否已存在相同位置的书签
    const exists = bookmarks.value.find(
      b => b.spineIndex === pagination.value.spineIndex && b.pageInChapter === pagination.value.currentPage
    )
    if (exists) return exists

    const bookmark: Bookmark = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      spineIndex: pagination.value.spineIndex,
      pageInChapter: pagination.value.currentPage,
      chapterTitle: getCurrentChapterTitle(),
      createdAt: Date.now(),
      percentage: getOverallProgress(),
    }
    bookmarks.value.unshift(bookmark)
    saveBookmarks(bookId)
    return bookmark
  }

  /** 移除书签 */
  function removeBookmark(id: string): void {
    if (!currentBook.value) return
    const idx = bookmarks.value.findIndex(b => b.id === id)
    if (idx >= 0) {
      bookmarks.value.splice(idx, 1)
      saveBookmarks(currentBook.value.id)
    }
  }

  /** 当前页是否有书签 */
  function isCurrentPageBookmarked(): boolean {
    return bookmarks.value.some(
      b => b.spineIndex === pagination.value.spineIndex && b.pageInChapter === pagination.value.currentPage
    )
  }

  /** 切换当前页书签 */
  function toggleBookmark(): boolean {
    const existing = bookmarks.value.find(
      b => b.spineIndex === pagination.value.spineIndex && b.pageInChapter === pagination.value.currentPage
    )
    if (existing) {
      removeBookmark(existing.id)
      return false
    } else {
      addBookmark()
      return true
    }
  }

  // ---- 阅读计时 ----

  function startSession(): void {
    sessionStartTime.value = Date.now()
    sessionDuration.value = 0
  }

  function getSessionSeconds(): number {
    if (sessionStartTime.value === 0) return 0
    return Math.floor((Date.now() - sessionStartTime.value) / 1000)
  }

  /** 重置 */
  function reset(): void {
    currentBook.value = null
    currentChapter.value = null
    pagination.value = { currentPage: 0, totalPages: 1, spineIndex: 0 }
    showToolbar.value = false
    showToc.value = false
    showSettings.value = false
    showBookmarks.value = false
    showSearch.value = false
    loading.value = false
    error.value = null
    bookmarks.value = []
    sessionStartTime.value = 0
    sessionDuration.value = 0
    cleanupAutoTheme()
  }

  return {
    currentBook,
    currentChapter,
    pagination,
    settings,
    showToolbar,
    showToc,
    showSettings,
    showBookmarks,
    showSearch,
    loading,
    error,
    bookmarks,
    sessionStartTime,
    sessionDuration,
    getOverallProgress,
    getCurrentChapterTitle,
    updatePagination,
    toggleToolbar,
    updateSettings,
    loadBookmarks,
    addBookmark,
    removeBookmark,
    isCurrentPageBookmarked,
    toggleBookmark,
    startSession,
    getSessionSeconds,
    setupAutoTheme,
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
