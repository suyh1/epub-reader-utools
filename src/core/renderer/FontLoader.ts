/** 字体加载器 — 从 EPUB 中提取嵌入字体并生成 Blob URL */
import type { EpubParser } from '@/core/parser/EpubParser'
import type { Resource } from '@/types/epub'
import { toBlobUrl, revokeBlobUrl } from '@/utils/dom'

export class FontLoader {
  private parser: EpubParser
  /** href -> blobUrl */
  private blobUrls: Map<string, string> = new Map()
  /** 字体名称 -> href 映射（从 CSS @font-face 中提取） */
  private fontFaceMap: Map<string, string> = new Map()

  constructor(parser: EpubParser) {
    this.parser = parser
  }

  /** 加载所有嵌入字体，返回 href -> blobUrl 映射 */
  async loadAll(): Promise<Map<string, string>> {
    const fontResources = this.parser.getFontResources()

    for (const res of fontResources) {
      try {
        await this.loadFont(res)
      } catch (e) {
        console.warn(`Failed to load font: ${res.href}`, e)
      }
    }

    return this.blobUrls
  }

  /** 加载单个字体 */
  async loadFont(resource: Resource): Promise<string> {
    // 已加载则直接返回
    const existing = this.blobUrls.get(resource.href)
    if (existing) return existing

    const data = await this.parser.readResource(resource.href)
    const mimeType = this.getFontMimeType(resource)
    const blobUrl = toBlobUrl(data, mimeType)

    this.blobUrls.set(resource.href, blobUrl)
    return blobUrl
  }

  /** 从 CSS 文本中提取 @font-face 并替换 src url 为 blob URL */
  async processFontFaces(cssText: string, cssHref: string): Promise<string> {
    const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi
    const matches = cssText.match(fontFaceRegex)
    if (!matches) return cssText

    let result = cssText

    for (const fontFace of matches) {
      let newFontFace = fontFace

      // 替换 url() 中的字体路径
      const urlRegex = /url\(\s*["']?([^"')]+)["']?\s*\)/gi
      let urlMatch: RegExpExecArray | null

      while ((urlMatch = urlRegex.exec(fontFace)) !== null) {
        const originalUrl = urlMatch[1]
        if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) continue

        // 解析相对路径
        const resolvedHref = this.resolveFromCss(cssHref, originalUrl)
        const blobUrl = this.blobUrls.get(resolvedHref)

        if (blobUrl) {
          newFontFace = newFontFace.replace(urlMatch[0], `url("${blobUrl}")`)
        }
      }

      result = result.replace(fontFace, newFontFace)
    }

    return result
  }

  /** 获取所有 Blob URL 映射 */
  getBlobUrls(): Map<string, string> {
    return this.blobUrls
  }

  /** 释放所有 Blob URL */
  destroy(): void {
    this.blobUrls.forEach((url) => revokeBlobUrl(url))
    this.blobUrls.clear()
    this.fontFaceMap.clear()
  }

  private getFontMimeType(resource: Resource): string {
    const ext = resource.href.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'otf': return 'font/otf'
      case 'ttf': return 'font/ttf'
      case 'woff': return 'font/woff'
      case 'woff2': return 'font/woff2'
      default: return resource.mediaType || 'font/otf'
    }
  }

  private resolveFromCss(cssHref: string, fontUrl: string): string {
    const baseParts = cssHref.split('/')
    baseParts.pop()
    const urlParts = fontUrl.split('/')

    for (const part of urlParts) {
      if (part === '..') {
        baseParts.pop()
      } else if (part !== '.') {
        baseParts.push(part)
      }
    }

    return baseParts.join('/')
  }
}
