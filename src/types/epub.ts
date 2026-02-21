/** EPUB 数据结构类型定义 */

export interface EpubBook {
  id: string
  filePath: string
  metadata: EpubMetadata
  spine: SpineItem[]
  toc: TocItem[]
  resources: Map<string, Resource>
  /** OPF 文件所在目录，用于解析相对路径 */
  basePath: string
  /** 页面方向: ltr | rtl (竖排时为 rtl) */
  pageDirection: 'ltr' | 'rtl'
}

export interface EpubMetadata {
  title: string
  creator: string
  language: string
  publisher?: string
  date?: string
  description?: string
  /** 封面图片在 resources 中的 href */
  coverHref?: string
  isbn?: string
  subjects?: string[]
}

export interface SpineItem {
  id: string
  href: string
  mediaType: string
  linear: boolean
  /** spine 中的顺序索引 */
  index: number
}

export interface TocItem {
  id: string
  label: string
  href: string
  children: TocItem[]
  level: number
}

export interface Resource {
  id: string
  href: string
  mediaType: string
  /** 在 ZIP 中的完整路径 */
  fullPath: string
}

/** 解析后的章节内容 */
export interface ChapterContent {
  spineIndex: number
  href: string
  /** 原始 XHTML 字符串 */
  rawHtml: string
  /** 关联的 CSS 文件路径列表 */
  cssHrefs: string[]
}
