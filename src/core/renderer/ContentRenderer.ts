/** 内容渲染器 — 将 EPUB 章节渲染到 iframe 中 */
import type { EpubParser } from '@/core/parser/EpubParser'
import type { ChapterContent } from '@/types/epub'
import type { ReaderSettings } from '@/types/reader'
import { CssProcessor } from './CssProcessor'
import { FontLoader } from './FontLoader'
import { ImageResolver } from './ImageResolver'

/** 章节背景信息（从 EPUB CSS 中提取） */
export interface ChapterBackground {
  image: string | null
  size: string
  position: string
  repeat: string
}

export class ContentRenderer {
  private parser: EpubParser
  private cssProcessor: CssProcessor
  private fontLoader: FontLoader
  private imageResolver: ImageResolver
  private fontsLoaded = false
  /** 上一次渲染的章节信息，用于释放旧图片 */
  private lastChapter: { rawHtml: string; href: string } | null = null

  constructor(parser: EpubParser) {
    this.parser = parser
    this.cssProcessor = new CssProcessor(parser)
    this.fontLoader = new FontLoader(parser)
    this.imageResolver = new ImageResolver(parser)
  }

  /** 初始化：预加载字体 */
  async init(): Promise<void> {
    if (!this.fontsLoaded) {
      const fontUrls = await this.fontLoader.loadAll()
      this.cssProcessor.setFontBlobUrls(fontUrls)
      this.fontsLoaded = true
    }
  }

  /**
   * 渲染章节到 iframe
   * 返回 { totalPages, background }
   * background 包含从 EPUB 中提取的背景图信息，由外层 Reader 组件渲染
   */
  async renderChapter(
    iframe: HTMLIFrameElement,
    chapter: ChapterContent,
    settings: ReaderSettings,
    pageWidth: number,
    pageHeight: number,
  ): Promise<{ totalPages: number; background: ChapterBackground }> {
    // 0. 释放上一章节的图片 blob URL（防止内存泄漏）
    if (this.lastChapter && this.lastChapter.href !== chapter.href) {
      this.imageResolver.releaseChapterImages(this.lastChapter.rawHtml, this.lastChapter.href)
    }
    this.lastChapter = { rawHtml: chapter.rawHtml, href: chapter.href }

    // 1. 预加载图片（HTML 中的）
    await this.imageResolver.preloadChapterImages(chapter.rawHtml, chapter.href)

    // 2. 预加载 CSS 中引用的背景图片
    const cssTexts: string[] = []
    for (const href of chapter.cssHrefs) {
      try {
        const text = await this.parser.readResourceText(href)
        cssTexts.push(text)
      } catch {
        cssTexts.push('')
      }
    }
    await this.imageResolver.preloadCssImages(cssTexts, chapter.cssHrefs)
    this.cssProcessor.setImageBlobUrls(this.imageResolver.getBlobUrls())

    // 3. 处理 CSS
    const epubCss = await this.cssProcessor.processChapterCss(chapter.cssHrefs, chapter.href)
    const duokanCss = this.cssProcessor.getDuokanBaseCss()
    const userCss = this.cssProcessor.generateUserCss(settings)
    const paginationCss = settings.pageMode === 'paginated'
      ? this.cssProcessor.generatePaginationCss(pageWidth, pageHeight, settings.columns)
      : ''

    // 4. 处理 HTML 中的图片路径
    const processedHtml = this.imageResolver.replaceImageSrcs(chapter.rawHtml, chapter.href)

    // 5. 构建完整 HTML
    const fullHtml = this.buildFullHtml(processedHtml, epubCss, duokanCss, userCss, paginationCss)

    // 6. 写入 iframe
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Cannot access iframe document')

    doc.open()
    doc.write(fullHtml)
    doc.close()

    // 7. 等待内容加载完成
    await this.waitForLoad(doc)

    // 8. 提取背景图信息（从 body 和第一个子元素上检测）
    const background = this.extractBackground(doc)

    // 9. 计算总页数
    let totalPages = 1
    if (settings.pageMode === 'paginated') {
      const scrollWidth = doc.body?.scrollWidth || pageWidth
      const { scrollStep } = CssProcessor.getColumnLayout(pageWidth, settings.columns)
      totalPages = Math.max(1, Math.ceil(scrollWidth / scrollStep))
    }

    return { totalPages, background }
  }

  /** 释放资源 */
  destroy(): void {
    this.fontLoader.destroy()
    this.imageResolver.destroy()
    this.lastChapter = null
  }

  /**
   * 轻量级重分页 — 只更新 CSS 和重算页数，不重写 iframe 内容
   * 用于窗口大小变化、设置变更等场景
   */
  repaginate(
    iframe: HTMLIFrameElement,
    settings: ReaderSettings,
    pageWidth: number,
    pageHeight: number,
  ): { totalPages: number; background: ChapterBackground } {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Cannot access iframe document')

    // 更新 user-css
    const userStyle = doc.getElementById('user-css')
    if (userStyle) userStyle.textContent = this.cssProcessor.generateUserCss(settings)

    // 更新 pagination-css
    const pagStyle = doc.getElementById('pagination-css')
    if (pagStyle) {
      pagStyle.textContent = settings.pageMode === 'paginated'
        ? this.cssProcessor.generatePaginationCss(pageWidth, pageHeight, settings.columns)
        : ''
    }

    // 提取背景
    const background = this.extractBackground(doc)

    // 计算总页数
    let totalPages = 1
    if (settings.pageMode === 'paginated') {
      const scrollWidth = doc.body?.scrollWidth || pageWidth
      const { scrollStep } = CssProcessor.getColumnLayout(pageWidth, settings.columns)
      totalPages = Math.max(1, Math.ceil(scrollWidth / scrollStep))
    }

    return { totalPages, background }
  }

  // ---- private ----

  private buildFullHtml(
    bodyHtml: string,
    epubCss: string,
    duokanCss: string,
    userCss: string,
    paginationCss: string,
  ): string {
    const bodyContent = this.extractBodyContent(bodyHtml)
    const headContent = this.extractHeadContent(bodyHtml)

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${headContent}
  <style id="duokan-css">${duokanCss}</style>
  <style id="user-css">${userCss}</style>
  <style id="epub-css">${epubCss}</style>
  <style id="pagination-css">${paginationCss}</style>
</head>
<body>${bodyContent}</body>
</html>`
  }

  private extractBodyContent(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    return bodyMatch ? bodyMatch[1] : html
  }

  private extractHeadContent(html: string): string {
    const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i)
    if (!headMatch) return ''

    return headMatch[1]
      .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  }

  /**
   * 从渲染后的文档中提取背景图信息
   * 检查 body 和 body 的第一个子元素
   */
  private extractBackground(doc: Document): ChapterBackground {
    const noBackground: ChapterBackground = { image: null, size: 'cover', position: 'center', repeat: 'no-repeat' }
    const win = doc.defaultView
    if (!win || !doc.body) return noBackground

    // 检查 body
    const bodyStyle = win.getComputedStyle(doc.body)
    if (bodyStyle.backgroundImage && bodyStyle.backgroundImage !== 'none') {
      // 清除 body 上的背景（避免和外层重叠）
      doc.body.style.setProperty('background-image', 'none', 'important')
      doc.body.style.setProperty('background-color', 'transparent', 'important')
      return {
        image: bodyStyle.backgroundImage,
        size: bodyStyle.backgroundSize || 'cover',
        position: bodyStyle.backgroundPosition || 'center',
        repeat: bodyStyle.backgroundRepeat || 'no-repeat',
      }
    }

    // 检查第一个子元素
    const firstChild = doc.body.firstElementChild as HTMLElement | null
    if (firstChild) {
      const childStyle = win.getComputedStyle(firstChild)
      if (childStyle.backgroundImage && childStyle.backgroundImage !== 'none') {
        firstChild.style.setProperty('background-image', 'none', 'important')
        firstChild.style.setProperty('background-color', 'transparent', 'important')
        return {
          image: childStyle.backgroundImage,
          size: childStyle.backgroundSize || 'cover',
          position: childStyle.backgroundPosition || 'center',
          repeat: childStyle.backgroundRepeat || 'no-repeat',
        }
      }
    }

    return noBackground
  }

  private async waitForLoad(doc: Document): Promise<void> {
    return new Promise((resolve) => {
      const images = doc.querySelectorAll('img')
      if (images.length === 0) {
        requestAnimationFrame(() => resolve())
        return
      }

      let loaded = 0
      const total = images.length
      const checkDone = () => {
        loaded++
        if (loaded >= total) resolve()
      }

      images.forEach((img) => {
        if (img.complete) {
          checkDone()
        } else {
          img.addEventListener('load', checkDone, { once: true })
          img.addEventListener('error', checkDone, { once: true })
        }
      })

      setTimeout(resolve, 3000)
    })
  }
}
