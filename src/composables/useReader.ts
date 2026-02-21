/** 阅读器交互逻辑 composable */
import { ref, onUnmounted } from 'vue'
import type { FootnoteData } from '@/core/duokan/FootnoteHandler'
import type { ChapterBackground } from '@/core/renderer/ContentRenderer'
import { useReaderStore } from '@/stores/reader'
import { useBookshelfStore } from '@/stores/bookshelf'
import { useEpub } from './useEpub'

export function useReader() {
  const epub = useEpub()
  const readerStore = useReaderStore()
  const bookshelfStore = useBookshelfStore()

  const iframeRef = ref<HTMLIFrameElement | null>(null)
  const containerRef = ref<HTMLDivElement | null>(null)
  const footnoteData = ref<FootnoteData | null>(null)
  const showFootnote = ref(false)
  /** 当前章节的背景图信息（从 EPUB 中提取，由 Reader 组件渲染到外层） */
  const chapterBackground = ref<ChapterBackground>({ image: null, size: 'cover', position: 'center', repeat: 'no-repeat' })

  let footnoteCleanup: (() => void) | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null
  /** 防止并发操作的锁 */
  let navigating = false

  /** 打开并渲染第一章（或恢复进度） */
  async function openBook(filePath: string): Promise<void> {
    const book = await epub.openFromFile(filePath)
    const spineIndex = readerStore.pagination.spineIndex
    await goToChapter(spineIndex)

    // 恢复阅读位置：优先用 chapterProgress（比例），不受窗口大小影响
    const savedProgress = bookshelfStore.getProgress(book.id)

    if (savedProgress) {
      const ratio = savedProgress.chapterProgress ?? 0
      if (ratio > 0) {
        epub.paginator.goToProgressRatio(ratio)
      } else if (savedProgress.pageInChapter > 0) {
        // 兼容旧数据：没有 chapterProgress 时回退到 pageInChapter
        epub.paginator.goToPage(savedProgress.pageInChapter)
      }
      readerStore.updatePagination({
        currentPage: epub.paginator.getState().currentPage,
      })
    }

    // 定时保存进度
    progressTimer = setInterval(() => epub.saveProgress(), 30000)
  }

  /** 跳转到指定章节 */
  async function goToChapter(spineIndex: number): Promise<void> {
    if (!iframeRef.value || !containerRef.value) return
    if (navigating) return
    navigating = true

    try {
      const chapter = await epub.loadChapter(spineIndex)

      // 使用 iframe 的实际尺寸（已被外层 padding 缩小）
      const iframeRect = iframeRef.value!.getBoundingClientRect()
      const { totalPages, background } = await epub.renderChapter(
        iframeRef.value!, chapter, iframeRect.width, iframeRect.height,
      )

      chapterBackground.value = background

      readerStore.updatePagination({
        spineIndex,
        currentPage: 0,
        totalPages,
      })

      // 绑定脚注处理
      attachFootnoteHandler(chapter.href)
    } finally {
      navigating = false
    }
  }

  /** 下一页 */
  async function nextPage(): Promise<void> {
    if (navigating) return

    const success = epub.paginator.nextPage()
    if (success) {
      readerStore.updatePagination({
        currentPage: epub.paginator.getState().currentPage,
      })
    } else {
      // 切换到下一章
      const book = readerStore.currentBook
      if (!book) return
      const nextIndex = readerStore.pagination.spineIndex + 1
      if (nextIndex >= book.spine.length) return
      await goToChapter(nextIndex)
    }
  }

  /** 上一页 */
  async function prevPage(): Promise<void> {
    if (navigating) return

    const success = epub.paginator.prevPage()
    if (success) {
      readerStore.updatePagination({
        currentPage: epub.paginator.getState().currentPage,
      })
    } else {
      // 切换到上一章最后一页
      const prevIndex = readerStore.pagination.spineIndex - 1
      if (prevIndex < 0) return

      await goToChapter(prevIndex)
      // 跳到最后一页
      epub.paginator.goToLastPage()
      readerStore.updatePagination({
        currentPage: epub.paginator.getState().currentPage,
      })
    }
  }

  /** 下一章 */
  async function nextChapter(): Promise<void> {
    const book = readerStore.currentBook
    if (!book) return
    const nextIndex = readerStore.pagination.spineIndex + 1
    if (nextIndex >= book.spine.length) return
    await goToChapter(nextIndex)
  }

  /** 上一章 */
  async function prevChapter(goToEnd = false): Promise<void> {
    const prevIndex = readerStore.pagination.spineIndex - 1
    if (prevIndex < 0) return

    await goToChapter(prevIndex)

    if (goToEnd) {
      epub.paginator.goToLastPage()
      readerStore.updatePagination({
        currentPage: epub.paginator.getState().currentPage,
      })
    }
  }

  /** 跳转到目录项 */
  async function goToTocItem(href: string): Promise<void> {
    const book = readerStore.currentBook
    if (!book) return

    const hrefPath = href.split('#')[0]
    const spineIndex = book.spine.findIndex((item) => {
      return item.href === hrefPath || hrefPath.endsWith(item.href)
    })

    if (spineIndex >= 0) {
      await goToChapter(spineIndex)
      readerStore.showToc = false
    }
  }

  /** 处理内容区域点击（由 overlay 层调用） */
  function handleContentClick(e: MouseEvent): void {
    if (!containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const zone = x / width

    if (zone < 0.33) {
      prevPage()
    } else if (zone > 0.67) {
      nextPage()
    } else {
      readerStore.toggleToolbar()
    }
  }

  /** 窗口大小变化时重新分页（轻量级，不重写 iframe） */
  async function handleResize(): Promise<void> {
    if (!readerStore.currentChapter || !iframeRef.value || !containerRef.value) return
    if (navigating) return
    navigating = true

    try {
      // 先记住当前阅读位置（比例）
      const ratio = epub.paginator.getProgressRatio()
      const iframeRect = iframeRef.value!.getBoundingClientRect()

      const result = epub.repaginate(
        iframeRef.value!,
        iframeRect.width,
        iframeRect.height,
      )

      if (result) {
        chapterBackground.value = result.background
        // 用比例恢复到正确位置
        epub.paginator.goToProgressRatio(ratio)
        readerStore.updatePagination({
          currentPage: epub.paginator.getState().currentPage,
          totalPages: result.totalPages,
        })
      }
    } finally {
      navigating = false
    }
  }

  /** 关闭脚注弹窗 */
  function closeFootnote(): void {
    showFootnote.value = false
    footnoteData.value = null
  }

  /** 返回书架 */
  function backToShelf(): void {
    epub.destroy()
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  function attachFootnoteHandler(chapterHref: string): void {
    if (footnoteCleanup) footnoteCleanup()
    if (!iframeRef.value) return

    const handler = epub.getFootnoteHandler()
    if (!handler) return

    footnoteCleanup = handler.attachToIframe(
      iframeRef.value,
      chapterHref,
      (data) => {
        footnoteData.value = data
        showFootnote.value = true
      },
    )
  }

  onUnmounted(() => {
    if (footnoteCleanup) footnoteCleanup()
    if (progressTimer) clearInterval(progressTimer)
    epub.saveProgress()
  })

  return {
    epub,
    iframeRef,
    containerRef,
    footnoteData,
    showFootnote,
    chapterBackground,
    openBook,
    goToChapter,
    nextPage,
    prevPage,
    nextChapter,
    prevChapter,
    goToTocItem,
    handleContentClick,
    handleResize,
    closeFootnote,
    backToShelf,
  }
}
