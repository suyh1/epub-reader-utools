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
}

export interface ReadingProgress {
  spineIndex: number
  /** 章节内页码（分页模式） */
  pageInChapter: number
  /** 全书进度百分比 0-100 */
  percentage: number
  /** 最后阅读时间戳 */
  timestamp: number
}

export interface BookshelfState {
  books: BookRecord[]
  sortBy: 'lastRead' | 'title' | 'addedTime'
  viewMode: 'grid' | 'list'
}
