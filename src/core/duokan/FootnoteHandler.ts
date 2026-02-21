/** 多看弹出式脚注处理器 */
import type { EpubParser } from '@/core/parser/EpubParser'
import { resolveHref, getFragment } from '@/utils/dom'

export interface FootnoteData {
  id: string
  /** 脚注 HTML 内容 */
  content: string
  /** 来源章节 href */
  sourceHref: string
}

export class FootnoteHandler {
  private parser: EpubParser
  /** 缓存已解析的脚注内容 */
  private cache: Map<string, FootnoteData> = new Map()

  constructor(parser: EpubParser) {
    this.parser = parser
  }

  /**
   * 拦截 iframe 中的脚注点击事件
   * 返回清理函数
   */
  attachToIframe(
    iframe: HTMLIFrameElement,
    chapterHref: string,
    onFootnote: (data: FootnoteData) => void,
  ): () => void {
    const doc = iframe.contentDocument
    if (!doc) return () => {}

    const handler = async (e: Event) => {
      const target = (e.target as Element)?.closest?.('a')
      if (!target) return

      // 检测是否为脚注链接
      if (!this.isFootnoteLink(target)) return

      e.preventDefault()
      e.stopPropagation()

      const href = target.getAttribute('href')
      if (!href) return

      try {
        const footnote = await this.resolveFootnote(href, chapterHref, doc)
        if (footnote) {
          onFootnote(footnote)
        }
      } catch (err) {
        console.warn('Failed to resolve footnote:', href, err)
      }
    }

    doc.addEventListener('click', handler, true)
    return () => doc.removeEventListener('click', handler, true)
  }

  /** 解析脚注内容 */
  async resolveFootnote(
    href: string,
    chapterHref: string,
    currentDoc?: Document,
  ): Promise<FootnoteData | null> {
    const fragment = getFragment(href)
    if (!fragment) return null

    const cacheKey = `${chapterHref}:${href}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    // 判断是同文件脚注还是跨文件脚注
    const hrefPath = href.split('#')[0]
    const isSameFile = !hrefPath || hrefPath === chapterHref.split('/').pop()

    let footnoteHtml: string | null = null

    if (isSameFile && currentDoc) {
      // 同文件：从当前 DOM 中查找
      footnoteHtml = this.findFootnoteInDoc(currentDoc, fragment)
    }

    if (!footnoteHtml) {
      // 跨文件：从 EPUB 中读取
      const targetHref = hrefPath ? resolveHref(chapterHref, hrefPath) : chapterHref
      footnoteHtml = await this.findFootnoteInEpub(targetHref, fragment)
    }

    if (!footnoteHtml) return null

    const data: FootnoteData = {
      id: fragment,
      content: footnoteHtml,
      sourceHref: chapterHref,
    }

    this.cache.set(cacheKey, data)
    return data
  }

  /** 清除缓存 */
  clearCache(): void {
    this.cache.clear()
  }

  // ---- private ----

  /** 判断链接是否为脚注引用 */
  private isFootnoteLink(anchor: Element): boolean {
    // 1. epub:type="noteref"
    const epubType = anchor.getAttribute('epub:type') ||
      anchor.getAttributeNS('http://www.idpf.org/2007/ops', 'type')
    if (epubType === 'noteref') return true

    // 2. class 包含 noteref / footnote
    const cls = anchor.className || ''
    if (/noteref|footnote|duokan-footnote/i.test(cls)) return true

    // 3. href 包含 #fn / #note / #footnote 模式
    const href = anchor.getAttribute('href') || ''
    if (/[#/](fn|note|footnote|endnote)/i.test(href)) return true

    // 4. 内容是 [数字] 或上标数字
    const text = anchor.textContent?.trim() || ''
    if (/^\[\d+\]$/.test(text) || /^\d+$/.test(text)) {
      // 检查是否在 <sup> 中
      if (anchor.querySelector('sup') || anchor.closest('sup')) return true
      // href 包含 # 也算
      if (href.includes('#')) return true
    }

    return false
  }

  /** 从 DOM 中查找脚注内容 */
  private findFootnoteInDoc(doc: Document, id: string): string | null {
    const el = doc.getElementById(id)
    if (!el) return null

    // 检查是否为脚注元素
    const tagName = el.tagName.toLowerCase()
    const epubType = el.getAttribute('epub:type') || ''
    const cls = el.className || ''

    if (
      tagName === 'aside' ||
      /footnote|endnote|note/i.test(epubType) ||
      /footnote|endnote|note/i.test(cls)
    ) {
      return el.innerHTML
    }

    // 通用：返回元素内容
    return el.innerHTML
  }

  /** 从 EPUB 文件中读取并查找脚注 */
  private async findFootnoteInEpub(href: string, id: string): Promise<string | null> {
    try {
      const html = await this.parser.readResourceText(href)
      // 使用 DOMParser 解析
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'application/xhtml+xml')
      return this.findFootnoteInDoc(doc, id)
    } catch {
      return null
    }
  }
}
