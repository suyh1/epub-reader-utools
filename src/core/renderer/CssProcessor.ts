/** CSS 处理器 — 处理 EPUB CSS 并注入多看排版增强 */
import type { EpubParser } from '@/core/parser/EpubParser'
import type { ReaderSettings, ThemeKey } from '@/types/reader'
import { THEMES } from '@/types/reader'
import { resolveHref } from '@/utils/dom'

/** 多看风格排版增强 CSS */
const DUOKAN_BASE_CSS = `
html, body {
  margin: 0;
  padding: 0;
  text-align: justify;
  -webkit-text-justify: inter-ideograph;
  line-break: strict;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
body {
  font-feature-settings: "halt" 1;
  font-kerning: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
p {
  orphans: 2;
  widows: 2;
}
h1, h2, h3, h4, h5, h6 {
  text-indent: 0 !important;
}
img {
  max-width: 100% !important;
  height: auto !important;
  object-fit: contain;
}
svg {
  max-width: 100% !important;
  max-height: 100% !important;
}
a[epub\\:type="noteref"],
a.noteref,
a.duokan-footnote {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dashed currentColor;
  cursor: pointer;
}
ruby { ruby-align: center; }
rt { font-size: 0.5em; font-weight: normal; }
aside[epub\\:type="footnote"],
aside.footnote { display: none; }
::selection { background: var(--selection-bg, #B4D5FE); }
`

/**
 * 分页布局信息
 *
 * 核心概念：
 * - colWidth: 单栏内容宽度（= 一页的宽度）
 * - colGap: 栏间距
 * - scrollStep: 翻一页时 scrollLeft 的增量 = colWidth + colGap
 * - visiblePages: 屏幕上同时可见的页数（单栏=1，双栏=2）
 */
export interface ColumnLayout {
  colWidth: number
  colGap: number
  /** 翻一页的 scroll 增量 */
  scrollStep: number
  /** 屏幕上同时可见的页数 */
  visiblePages: number
}

export class CssProcessor {
  private parser: EpubParser
  private fontBlobUrls: Map<string, string> = new Map()
  private imageBlobUrls: Map<string, string> = new Map()

  constructor(parser: EpubParser) {
    this.parser = parser
  }

  setFontBlobUrls(urls: Map<string, string>): void {
    this.fontBlobUrls = urls
  }

  setImageBlobUrls(urls: Map<string, string>): void {
    this.imageBlobUrls = urls
  }

  async processChapterCss(cssHrefs: string[], chapterHref: string): Promise<string> {
    const cssTexts: string[] = []
    for (const href of cssHrefs) {
      try {
        const cssText = await this.parser.readResourceText(href)
        const processed = this.processCssText(cssText, href)
        cssTexts.push(processed)
      } catch {
        console.warn(`Failed to load CSS: ${href}`)
      }
    }
    return cssTexts.join('\n')
  }

  generateUserCss(settings: ReaderSettings): string {
    const theme = THEMES[settings.theme]
    return `
      :root { --selection-bg: ${theme.selectionBg}; }
      html, body {
        background: transparent !important;
        color: ${theme.color} !important;
        font-size: ${settings.fontSize}px !important;
        font-family: ${settings.fontFamily} !important;
        line-height: ${settings.lineHeight} !important;
      }
      p { line-height: ${settings.lineHeight} !important; }
    `
  }

  /**
   * 生成分页 CSS
   *
   * 单栏和双栏统一用 CSS multi-column：
   * - column-width = 一页的宽度（单栏=整个 pageWidth，双栏=半宽减去间距）
   * - column-gap = 栏间距
   * - body padding: 0，由外层控制
   *
   * 翻页由 Paginator 控制 scrollLeft，每次移动一个 scrollStep
   */
  generatePaginationCss(pageWidth: number, pageHeight: number, columns: 1 | 2 = 1): string {
    const layout = CssProcessor.getColumnLayout(pageWidth, columns)

    return `
      html { height: 100% !important; overflow: hidden !important; }
      body {
        height: ${pageHeight}px !important;
        column-width: ${layout.colWidth}px !important;
        column-gap: ${layout.colGap}px !important;
        column-fill: auto !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }
    `
  }

  /**
   * 计算分栏布局信息
   *
   * 单栏：colWidth = pageWidth, gap = 0, scrollStep = pageWidth, visiblePages = 1
   * 双栏：colWidth = (pageWidth - gap) / 2, scrollStep = colWidth + gap, visiblePages = 2
   *
   * 一页 = 一栏。双栏时屏幕同时显示两页。
   * 翻一页 = scroll 一个 scrollStep = 一栏宽度 + 一个间距
   */
  static getColumnLayout(pageWidth: number, columns: 1 | 2): ColumnLayout {
    if (columns === 2) {
      const colGap = 40
      const colWidth = Math.floor((pageWidth - colGap) / 2)
      const scrollStep = colWidth + colGap
      return { colWidth, colGap, scrollStep, visiblePages: 2 }
    } else {
      return { colWidth: pageWidth, colGap: 0, scrollStep: pageWidth, visiblePages: 1 }
    }
  }

  getDuokanBaseCss(): string {
    return DUOKAN_BASE_CSS
  }

  private processCssText(css: string, cssHref: string): string {
    return css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) {
        return match
      }
      const resolvedHref = resolveHref(cssHref, url)
      const fontBlob = this.fontBlobUrls.get(resolvedHref)
      if (fontBlob) return `url("${fontBlob}")`
      const imageBlob = this.imageBlobUrls.get(resolvedHref)
      if (imageBlob) return `url("${imageBlob}")`
      return match
    })
  }
}
