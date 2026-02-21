/** EPUB 加载与管理 composable */
import { markRaw } from 'vue'
import { EpubParser } from '@/core/parser/EpubParser'
import { ContentRenderer } from '@/core/renderer/ContentRenderer'
import { FootnoteHandler } from '@/core/duokan/FootnoteHandler'
import { Paginator } from '@/core/pagination/Paginator'
import type { EpubBook, ChapterContent } from '@/types/epub'
import type { BookRecord } from '@/types/book'
import type { ChapterBackground } from '@/core/renderer/ContentRenderer'
import { useBookshelfStore } from '@/stores/bookshelf'
import { useReaderStore } from '@/stores/reader'

// 引擎对象不能被 Vue 代理（包含 Map、JSZip 等不可克隆对象）
// 使用模块级变量而非 ref
let _parser: EpubParser | null = null
let _renderer: ContentRenderer | null = null
let _footnoteHandler: FootnoteHandler | null = null
const _paginator = new Paginator()

export function useEpub() {
  const bookshelfStore = useBookshelfStore()
  const readerStore = useReaderStore()

  /** 暴露 paginator（普通对象，不需要响应式） */
  const paginator = _paginator

  /** 从文件路径打开 EPUB */
  async function openFromFile(filePath: string): Promise<EpubBook> {
    readerStore.loading = true
    readerStore.error = null

    try {
      // 清理旧实例
      cleanupEngines()

      // 读取文件
      const data = window.services.readBinaryFile(filePath)
      const fileHash = window.services.fileHash(filePath)
      const fileSize = window.services.fileSize(filePath)

      // 解析 EPUB
      const ep = new EpubParser()
      const book = await ep.parse(data)
      book.id = fileHash
      book.filePath = filePath

      _parser = ep

      // 初始化渲染器
      const cr = new ContentRenderer(ep)
      await cr.init()
      _renderer = cr

      // 初始化脚注处理器
      _footnoteHandler = new FootnoteHandler(ep)

      // 提取封面
      const coverBase64 = await extractCoverBase64(ep, book)

      // 保存到书架（只存纯数据，不存 Map 等复杂对象）
      // 保留已有的阅读时长
      const existingBook = bookshelfStore.getBook(fileHash)
      const record: BookRecord = {
        id: book.id,
        title: book.metadata.title,
        creator: book.metadata.creator,
        coverBase64,
        filePath,
        fileSize,
        addedTime: existingBook?.addedTime || Date.now(),
        lastReadTime: Date.now(),
        progress: existingBook?.progress || {
          spineIndex: 0,
          pageInChapter: 0,
          percentage: 0,
          timestamp: Date.now(),
        },
        readingTime: existingBook?.readingTime || 0,
      }

      // 复制文件到数据目录
      try {
        window.services.copyToDataDir(filePath, `${book.id}.epub`)
      } catch { /* 可能已存在 */ }

      bookshelfStore.addBook(record)

      // markRaw 防止 Vue 深度代理 EpubBook（内含 Map 等不可克隆对象）
      readerStore.currentBook = markRaw(book)

      // 恢复阅读进度
      const savedProgress = bookshelfStore.getProgress(book.id)
      if (savedProgress) {
        readerStore.updatePagination({
          spineIndex: savedProgress.spineIndex,
          currentPage: savedProgress.pageInChapter,
        })
      }

      // 加载书签
      readerStore.loadBookmarks(book.id)

      // 开始阅读计时
      readerStore.startSession()

      // 初始化自动主题
      readerStore.setupAutoTheme()

      return book
    } catch (err: any) {
      readerStore.error = formatEpubError(err)
      throw err
    } finally {
      readerStore.loading = false
    }
  }

  /** 从书架记录打开 EPUB */
  async function openFromRecord(record: BookRecord): Promise<EpubBook> {
    const dataPath = `${window.services.getDataDir()}/${record.id}.epub`
    const filePath = window.services.fileExists(dataPath) ? dataPath : record.filePath
    return openFromFile(filePath)
  }

  /** 加载章节 */
  async function loadChapter(spineIndex: number): Promise<ChapterContent> {
    if (!_parser) throw new Error('EPUB not loaded')

    readerStore.loading = true
    try {
      const chapter = await _parser.readChapter(spineIndex)
      readerStore.currentChapter = markRaw(chapter)
      readerStore.updatePagination({ spineIndex })
      return chapter
    } finally {
      readerStore.loading = false
    }
  }

  /** 渲染章节到 iframe，返回 { totalPages, background } */
  async function renderChapter(
    iframe: HTMLIFrameElement,
    chapter: ChapterContent,
    pageWidth: number,
    pageHeight: number,
  ): Promise<{ totalPages: number; background: ChapterBackground }> {
    if (!_renderer) throw new Error('Renderer not initialized')

    const settings = readerStore.settings
    const { totalPages, background } = await _renderer.renderChapter(
      iframe, chapter, settings, pageWidth, pageHeight,
    )

    // 设置分页器
    _paginator.attach(
      iframe, pageWidth,
      settings.columns,
    )
    _paginator.setTotalPages(totalPages, chapter.spineIndex)

    readerStore.updatePagination({ totalPages })

    return { totalPages, background }
  }

  /** 轻量级重分页（不重写 iframe 内容） */
  function repaginate(
    iframe: HTMLIFrameElement,
    pageWidth: number,
    pageHeight: number,
  ): { totalPages: number; background: ChapterBackground } | null {
    if (!_renderer) return null

    const settings = readerStore.settings
    const result = _renderer.repaginate(iframe, settings, pageWidth, pageHeight)

    _paginator.attach(iframe, pageWidth, settings.columns)
    _paginator.setTotalPages(result.totalPages, readerStore.pagination.spineIndex)

    readerStore.updatePagination({ totalPages: result.totalPages })
    return result
  }

  /** 保存当前阅读进度 */
  function saveProgress(): void {
    const book = readerStore.currentBook
    if (!book) return

    const state = _paginator.getState()
    bookshelfStore.updateProgress(book.id, {
      spineIndex: state.spineIndex,
      pageInChapter: state.currentPage,
      percentage: readerStore.getOverallProgress(),
      timestamp: Date.now(),
    })
  }

  /** 获取 parser（供搜索等功能使用） */
  function getParser(): EpubParser | null {
    return _parser
  }

  /** 获取脚注处理器 */
  function getFootnoteHandler(): FootnoteHandler | null {
    return _footnoteHandler
  }

  /** 清理资源 */
  function destroy(): void {
    saveProgress()
    // 保存阅读时长
    const book = readerStore.currentBook
    if (book) {
      const sessionSecs = readerStore.getSessionSeconds()
      if (sessionSecs > 0) {
        bookshelfStore.addReadingTime(book.id, sessionSecs)
      }
    }
    cleanupEngines()
    readerStore.reset()
  }

  return {
    paginator,
    getParser,
    getFootnoteHandler,
    openFromFile,
    openFromRecord,
    loadChapter,
    renderChapter,
    repaginate,
    saveProgress,
    destroy,
  }
}

function cleanupEngines(): void {
  _renderer?.destroy()
  _footnoteHandler?.clearCache()
  _parser?.destroy()
  _parser = null
  _renderer = null
  _footnoteHandler = null
}

/** 提取封面图片为 base64 缩略图 */
async function extractCoverBase64(parser: EpubParser, book: EpubBook): Promise<string | undefined> {
  if (!book.metadata.coverHref) return undefined

  try {
    const data = await parser.readResource(book.metadata.coverHref)
    const blob = new Blob([data])
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxW = 200
          const maxH = 280
          let w = img.width
          let h = img.height
          if (w > maxW) { h = h * maxW / w; w = maxW }
          if (h > maxH) { w = w * maxH / h; h = maxH }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.onerror = () => resolve(undefined)
        img.src = reader.result as string
      }
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

/** 将错误转为用户友好的中文提示 */
function formatEpubError(err: any): string {
  const msg = err?.message || ''

  if (msg.includes('ZIP') || msg.includes('zip') || msg.includes('Corrupted'))
    return '文件已损坏或不是有效的 EPUB 格式'
  if (msg.includes('container.xml') || msg.includes('OPF'))
    return 'EPUB 结构异常，缺少必要的元数据文件'
  if (msg.includes('not found') || msg.includes('Not found'))
    return '文件不存在或已被移动'
  if (msg.includes('readBinaryFile') || msg.includes('ENOENT'))
    return '无法读取文件，请检查文件路径是否正确'
  if (msg.includes('spine'))
    return 'EPUB 内容索引异常，该文件可能不完整'
  if (msg.includes('Cannot access'))
    return '渲染失败，请尝试重新打开'

  return msg || '打开文件失败，请确认文件格式正确'
}
