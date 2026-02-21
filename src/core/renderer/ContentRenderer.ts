/** 内容渲染器 — 将 EPUB 章节渲染到 iframe 中 */
import type { EpubParser } from '@/core/parser/EpubParser'
import type { ChapterContent } from '@/types/epub'
import type { ReaderSettings } from '@/types/reader'
import { CssProcessor } from './CssProcessor'
import { FontLoader } from './FontLoader'
import { ImageResolver } from './ImageResolver'

export class ContentRenderer {
  private parser: EpubParser
  private cssProcessor: CssProcessor
  private fontLoader: FontLoader
  private imageResolver: ImageResolver
  private fontsLoaded = false

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

  /** 渲染章节到 iframe */
  async renderChapter(
    iframe: HTMLIFrameElement,
    chapter: ChapterContent,
    settings: ReaderSettings,
    pageWidth: number,
    pageHeight: number,
  ): Promise<number> {
    // 1. 预加载图片
    await this.imageResolver.preloadChapterImages(chapter.rawHtml, chapter.href)
    this.cssProcessor.setImageBlobUrls(this.imageResolver.getBlobUrls())

    // 2. 处理 CSS
    const epubCss = await this.cssProcessor.processChapterCss(chapter.cssHrefs, chapter.href)
    const duokanCss = this.cssProcessor.getDuokanBaseCss()
    const userCss = this.cssProcessor.generateUserCss(settings)

    // iframe 的实际尺寸已经被外层 padding 缩小了
    // 所以这里 pageWidth/pageHeight 就是 iframe 的可用尺寸 = 内容区尺寸
    const paginationCss = settings.pageMode === 'paginated'
      ? this.cssProcessor.generatePaginationCss(pageWidth, pageHeight, settings.columns)
      : ''

    // 3. 处理 HTML 中的图片路径
    const processedHtml = this.imageResolver.replaceImageSrcs(chapter.rawHtml, chapter.href)

    // 4. 构建完整 HTML（body 无 padding，padding 由 iframe 外层控制）
    const fullHtml = this.buildFullHtml(processedHtml, epubCss, duokanCss, userCss, paginationCss)

    // 5. 写入 iframe
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Cannot access iframe document')

    doc.open()
    doc.write(fullHtml)
    doc.close()

    // 6. 等待内容加载完成
    await this.waitForLoad(doc)

    // 7. 计算总页数：scrollWidth / pageStep
    if (settings.pageMode === 'paginated') {
      const scrollWidth = doc.body?.scrollWidth || pageWidth
      const { pageStep } = CssProcessor.getColumnInfo(pageWidth, settings.columns)
      return Math.max(1, Math.ceil(scrollWidth / pageStep))
    }

    return 1
  }

  /** 释放资源 */
  destroy(): void {
    this.fontLoader.destroy()
    this.imageResolver.destroy()
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
  <style id="epub-css">${epubCss}</style>
  <style id="duokan-css">${duokanCss}</style>
  <style id="user-css">${userCss}</style>
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
