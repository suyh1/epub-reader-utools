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
        background-color: ${theme.background} !important;
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
   * 方案：使用 CSS columns 在 body 上做多列布局
   * - body 没有 padding（padding 在 iframe 外层）
   * - column-width 精确等于单列宽度
   * - 单栏: column-width = pageWidth（视口内只放 1 列）
   * - 双栏: 用 CSS columns 在一个固定宽度的 wrapper 内放 2 列，
   *         然后 body 的 column-width = pageWidth 做翻页
   *
   * 但 CSS multi-column 不支持嵌套...
   *
   * 最终方案（最可靠）：
   * - 始终用 column-width = pageWidth 做翻页（单列模式）
   * - 双栏通过在 body 内注入 CSS columns 在每一"页"内再分 2 列
   *   → 不行，multi-column 内容不能再嵌套 multi-column
   *
   * 真正可靠的方案：
   * - 单栏和双栏都用同一个 column-width
   * - 双栏时 column-width = 单列宽度（pageWidth 的一半减去间距）
   * - 翻页步长 = 2 * column-width + 2 * gap（跳 2 列）
   * - 单栏时 column-width = pageWidth，翻页步长 = pageWidth + gap
   */
  generatePaginationCss(pageWidth: number, pageHeight: number, columns: 1 | 2 = 1): string {
    if (columns === 2) {
      // 双栏：column-width = 单列宽度
      // 浏览器会在 scrollWidth 中排列很多列
      // 翻页时跳 2 列（由 Paginator 控制步长）
      const gap = 40
      const colWidth = Math.floor((pageWidth - gap) / 2)
      return `
        html { height: 100% !important; overflow: hidden !important; }
        body {
          height: ${pageHeight}px !important;
          column-width: ${colWidth}px !important;
          column-gap: ${gap}px !important;
          column-fill: auto !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
      `
    } else {
      // 单栏：column-width = pageWidth
      // 每列恰好占满视口，gap 是页间距
      const gap = 0
      return `
        html { height: 100% !important; overflow: hidden !important; }
        body {
          height: ${pageHeight}px !important;
          column-width: ${pageWidth}px !important;
          column-gap: ${gap}px !important;
          column-fill: auto !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
      `
    }
  }

  /** 获取列信息，供 Paginator 使用 */
  static getColumnInfo(pageWidth: number, columns: 1 | 2): { colWidth: number; colGap: number; pageStep: number } {
    if (columns === 2) {
      const colGap = 40
      const colWidth = Math.floor((pageWidth - colGap) / 2)
      // 翻页步长 = 2列 + 1个gap = pageWidth
      // 但实际 scrollWidth 中每列之间都有 gap
      // 所以步长 = colWidth + colGap + colWidth + colGap = 2*(colWidth+colGap)
      // 不对... scrollWidth = N * colWidth + (N-1) * colGap
      // 每页显示 2 列，步长 = 2 * colWidth + 2 * colGap
      // 但最后一个 gap 是下一页的开始...
      // 实际上：步长 = 2 * (colWidth + colGap) = 2*colWidth + 2*colGap
      const pageStep = colWidth * 2 + colGap * 2
      return { colWidth, colGap, pageStep }
    } else {
      // 单栏时 gap=0，步长就是 pageWidth
      return { colWidth: pageWidth, colGap: 0, pageStep: pageWidth }
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
