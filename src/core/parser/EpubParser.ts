/** EPUB 解析主入口 */
import type { EpubBook, TocItem, ChapterContent, Resource } from '@/types/epub'
import { ZipReader } from '@/utils/zip'
import { parseXmlNoNS } from '@/utils/xml'
import { resolveHref } from '@/utils/dom'
import { parseOpf, type OpfResult } from './OpfParser'
import { parseNcx } from './NcxParser'
import { parseNav } from './NavParser'

export class EpubParser {
  private zip: ZipReader
  private opfResult: OpfResult | null = null
  private basePath = ''

  constructor() {
    this.zip = new ZipReader()
  }

  /** 从 ArrayBuffer 加载并解析 EPUB */
  async parse(data: ArrayBuffer): Promise<EpubBook> {
    await this.zip.load(data)

    // 1. 读取 container.xml 定位 OPF
    const opfPath = await this.findOpfPath()
    this.basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : ''

    // 2. 解析 OPF
    const opfXml = await this.zip.readText(opfPath)
    this.opfResult = parseOpf(opfXml, this.basePath)

    // 3. 解析目录
    const toc = await this.parseToc()

    // 4. 处理封面
    await this.resolveCover()

    // 5. 构建 EpubBook
    const book: EpubBook = {
      id: '',
      filePath: '',
      metadata: this.opfResult.metadata,
      spine: this.opfResult.spine,
      toc,
      resources: this.opfResult.manifest,
      basePath: this.basePath,
      pageDirection: this.opfResult.pageDirection,
    }

    return book
  }

  /** 读取章节内容 */
  async readChapter(spineIndex: number): Promise<ChapterContent> {
    if (!this.opfResult) throw new Error('EPUB not parsed yet')

    const spineItem = this.opfResult.spine[spineIndex]
    if (!spineItem) throw new Error(`Invalid spine index: ${spineIndex}`)

    const fullPath = this.basePath ? `${this.basePath}/${spineItem.href}` : spineItem.href
    const rawHtml = await this.zip.readText(fullPath)

    // 提取 CSS 引用
    const cssHrefs = this.extractCssHrefs(rawHtml, spineItem.href)

    return {
      spineIndex,
      href: spineItem.href,
      rawHtml,
      cssHrefs,
    }
  }

  /** 读取资源文件（图片、字体、CSS 等） */
  async readResource(href: string): Promise<ArrayBuffer> {
    const fullPath = this.basePath ? `${this.basePath}/${href}` : href
    // 尝试直接路径
    if (this.zip.hasFile(fullPath)) {
      return this.zip.readBinary(fullPath)
    }
    // 尝试不带 basePath
    if (this.zip.hasFile(href)) {
      return this.zip.readBinary(href)
    }
    throw new Error(`Resource not found: ${href}`)
  }

  /** 读取资源为文本 */
  async readResourceText(href: string): Promise<string> {
    const fullPath = this.basePath ? `${this.basePath}/${href}` : href
    if (this.zip.hasFile(fullPath)) {
      return this.zip.readText(fullPath)
    }
    if (this.zip.hasFile(href)) {
      return this.zip.readText(href)
    }
    throw new Error(`Resource not found: ${href}`)
  }

  /** 检查资源是否存在 */
  hasResource(href: string): boolean {
    const fullPath = this.basePath ? `${this.basePath}/${href}` : href
    return this.zip.hasFile(fullPath) || this.zip.hasFile(href)
  }

  /** 获取所有字体资源 */
  getFontResources(): Resource[] {
    if (!this.opfResult) return []
    const fonts: Resource[] = []
    this.opfResult.manifest.forEach((res) => {
      if (
        res.mediaType.startsWith('font/') ||
        res.mediaType === 'application/x-font-ttf' ||
        res.mediaType === 'application/x-font-otf' ||
        res.mediaType === 'application/font-woff' ||
        res.mediaType === 'application/font-woff2' ||
        res.href.match(/\.(otf|ttf|woff|woff2)$/i)
      ) {
        fonts.push(res)
      }
    })
    return fonts
  }

  /** 获取所有图片资源 */
  getImageResources(): Resource[] {
    if (!this.opfResult) return []
    const images: Resource[] = []
    this.opfResult.manifest.forEach((res) => {
      if (res.mediaType.startsWith('image/')) {
        images.push(res)
      }
    })
    return images
  }

  /** 获取所有 CSS 资源 */
  getCssResources(): Resource[] {
    if (!this.opfResult) return []
    const css: Resource[] = []
    this.opfResult.manifest.forEach((res) => {
      if (res.mediaType === 'text/css') {
        css.push(res)
      }
    })
    return css
  }

  /** 获取 spine 长度 */
  getSpineLength(): number {
    return this.opfResult?.spine.length || 0
  }

  destroy(): void {
    this.zip.destroy()
    this.opfResult = null
  }

  // ---- private ----

  private async findOpfPath(): Promise<string> {
    const containerXml = await this.zip.readText('META-INF/container.xml')
    const parsed = parseXmlNoNS(containerXml)

    const container = parsed.container || parsed.Container || {}
    const rootfiles = container.rootfiles || container.Rootfiles || {}
    const rootfile = Array.isArray(rootfiles.rootfile)
      ? rootfiles.rootfile[0]
      : rootfiles.rootfile || rootfiles.Rootfile

    const fullPath = rootfile?.['@_full-path']
    if (!fullPath) throw new Error('Cannot find OPF path in container.xml')

    return fullPath
  }

  private async parseToc(): Promise<TocItem[]> {
    if (!this.opfResult) return []

    // 优先使用 EPUB 3 nav
    if (this.opfResult.navHref) {
      try {
        const navFullPath = this.basePath
          ? `${this.basePath}/${this.opfResult.navHref}`
          : this.opfResult.navHref
        const navHtml = await this.zip.readText(navFullPath)
        const toc = parseNav(navHtml)
        if (toc.length > 0) return toc
      } catch {
        // 回退到 NCX
      }
    }

    // 回退到 EPUB 2 NCX
    if (this.opfResult.ncxHref) {
      try {
        const ncxFullPath = this.basePath
          ? `${this.basePath}/${this.opfResult.ncxHref}`
          : this.opfResult.ncxHref
        const ncxXml = await this.zip.readText(ncxFullPath)
        return parseNcx(ncxXml)
      } catch {
        // 无目录
      }
    }

    return []
  }

  private async resolveCover(): Promise<void> {
    // 封面解析已在 OpfParser.resolveCoverHref 中完成
  }

  /** 从 XHTML 中提取 CSS 引用 */
  private extractCssHrefs(html: string, chapterHref: string): string[] {
    const hrefs: string[] = []
    const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      if (match[0].includes('stylesheet') || href.endsWith('.css')) {
        // 解析相对路径
        const resolved = resolveHref(chapterHref, href)
        hrefs.push(resolved)
      }
    }

    return hrefs
  }
}
