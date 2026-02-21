/** DOM 操作工具函数 */

/** 将 ArrayBuffer 转为 Blob URL */
export function toBlobUrl(data: ArrayBuffer, mimeType: string): string {
  const blob = new Blob([data], { type: mimeType })
  return URL.createObjectURL(blob)
}

/** 释放 Blob URL */
export function revokeBlobUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/** 批量释放 Blob URL */
export function revokeBlobUrls(urls: string[]): void {
  urls.forEach(revokeBlobUrl)
}

/** 解析相对路径，基于基础路径 */
export function resolveHref(basePath: string, href: string): string {
  if (href.startsWith('/') || href.startsWith('http')) return href

  // 移除 fragment
  const cleanHref = href.split('#')[0]

  const baseParts = basePath.split('/')
  baseParts.pop() // 移除文件名
  const hrefParts = cleanHref.split('/')

  for (const part of hrefParts) {
    if (part === '..') {
      baseParts.pop()
    } else if (part !== '.') {
      baseParts.push(part)
    }
  }

  return baseParts.join('/')
}

/** 从 href 中提取 fragment (#xxx) */
export function getFragment(href: string): string | null {
  const idx = href.indexOf('#')
  return idx >= 0 ? href.substring(idx + 1) : null
}

/** 获取 MIME 类型 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    'html': 'text/html',
    'xhtml': 'application/xhtml+xml',
    'xml': 'application/xml',
    'css': 'text/css',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'otf': 'font/otf',
    'ttf': 'font/ttf',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ncx': 'application/x-dtbncx+xml',
    'opf': 'application/oebps-package+xml',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

/** 简单 hash 函数（用于生成书籍 ID） */
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
