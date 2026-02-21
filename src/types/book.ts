/** 书籍管理相关类型 */

export interface BookRecord {
  id: string
  title: string
  creator: string
  /** 封面图片 base64 缩略图 */
  coverBase64?: string
  filePath: string
  fileSize: number
  addedTime: number
  lastReadTime: number
  progress: ReadingProgress
  /** 累计阅读时长（秒） */
  readingTime: number
  /** 用户标签 */
  tags?: string[]
}

export interface ReadingProgress {
  spineIndex: number
  /** 章节内页码（分页模式） — 仅作参考，恢复时以 chapterProgress 为准 */
  pageInChapter: number
  /** 章节内进度比例 0~1（基于 scrollLeft / scrollWidth，不受窗口大小影响） */
  chapterProgress: number
  /** 全书进度百分比 0-100 */
  percentage: number
  /** 最后阅读时间戳 */
  timestamp: number
}

/** 书签 */
export interface Bookmark {
  id: string
  /** spine 索引 */
  spineIndex: number
  /** 章节内页码 */
  pageInChapter: number
  /** 章节标题 */
  chapterTitle: string
  /** 创建时间 */
  createdAt: number
  /** 全书进度百分比 */
  percentage: number
}

export interface BookshelfState {
  books: BookRecord[]
  sortBy: 'lastRead' | 'title' | 'addedTime'
  viewMode: 'grid' | 'list'
}
