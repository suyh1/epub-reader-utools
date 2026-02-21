/** 图片资源解析器 — 将 EPUB 内图片转为 Blob URL */
import type { EpubParser } from '@/core/parser/EpubParser'
import { toBlobUrl, revokeBlobUrl, resolveHref, getMimeType } from '@/utils/dom'

export class ImageResolver {
  private parser: EpubParser
  /** href -> blobUrl */
  private blobUrls: Map<string, string> = new Map()

  constructor(parser: EpubParser) {
    this.parser = parser
  }

  /** 预加载章节中所有图片 */
  async preloadChapterImages(html: string, chapterHref: string): Promise<void> {
    const hrefs = this.extractImageHrefs(html, chapterHref)

    for (const href of hrefs) {
      if (this.blobUrls.has(href)) continue
      try {
        await this.loadImage(href)
      } catch (e) {
        console.warn(`Failed to load image: ${href}`, e)
      }
    }
  }

  /** 加载单张图片 */
  async loadImage(href: string): Promise<string> {
    const existing = this.blobUrls.get(href)
    if (existing) return existing

    const data = await this.parser.readResource(href)
    const mimeType = getMimeType(href)
    const blobUrl = toBlobUrl(data, mimeType)

    this.blobUrls.set(href, blobUrl)
    return blobUrl
  }

  /** 替换 HTML 中的图片路径为 Blob URL */
  replaceImageSrcs(html: string, chapterHref: string): string {
    let result = html

    // 替换 <img src="...">
    result = result.replace(
      /(<img[^>]+(?:src|xlink:href)\s*=\s*["'])([^"']+)(["'])/gi,
      (match, prefix, src, suffix) => {
        const blobUrl = this.resolveToBlobUrl(src, chapterHref)
        return blobUrl ? `${prefix}${blobUrl}${suffix}` : match
      },
    )

    // 替换 <image href="..."> 和 <image xlink:href="..."> (SVG)
    result = result.replace(
      /(<image[^>]+(?:href|xlink:href)\s*=\s*["'])([^"']+)(["'])/gi,
      (match, prefix, src, suffix) => {
        const blobUrl = this.resolveToBlobUrl(src, chapterHref)
        return blobUrl ? `${prefix}${blobUrl}${suffix}` : match
      },
    )

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
  }

  /** 释放指定章节的图片（保留其他章节共用的） */
  releaseChapterImages(html: string, chapterHref: string): void {
    const hrefs = this.extractImageHrefs(html, chapterHref)
    for (const href of hrefs) {
      const blobUrl = this.blobUrls.get(href)
      if (blobUrl) {
        revokeBlobUrl(blobUrl)
        this.blobUrls.delete(href)
      }
    }
  }

  private extractImageHrefs(html: string, chapterHref: string): string[] {
    const hrefs: Set<string> = new Set()

    // <img src="...">
    const imgRegex = /(?:src|xlink:href)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|gif|svg|webp))["']/gi
    let match: RegExpExecArray | null
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1]
      if (!src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('http')) {
        hrefs.add(resolveHref(chapterHref, src))
      }
    }

    // <image href="..."> (SVG)
    const imageRegex = /<image[^>]+(?:href|xlink:href)\s*=\s*["']([^"']+)["']/gi
    while ((match = imageRegex.exec(html)) !== null) {
      const src = match[1]
      if (!src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('http')) {
        hrefs.add(resolveHref(chapterHref, src))
      }
    }

    return Array.from(hrefs)
  }

  private resolveToBlobUrl(src: string, chapterHref: string): string | null {
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) {
      return null
    }
    const resolved = resolveHref(chapterHref, src)
    return this.blobUrls.get(resolved) || null
  }
}
