/** 分页引擎 — 基于 CSS Multi-Column 的分页实现 */
import { CssProcessor } from '@/core/renderer/CssProcessor'

export interface PaginationState {
  /** 当前页码（从 0 开始） */
  currentPage: number
  /** 当前章节总页数 */
  totalPages: number
  /** 当前 spine 索引 */
  spineIndex: number
}

export class Paginator {
  private iframe: HTMLIFrameElement | null = null
  private pageStep = 0
  private columns: 1 | 2 = 1
  private state: PaginationState = {
    currentPage: 0,
    totalPages: 1,
    spineIndex: 0,
  }

  /** 绑定 iframe 并计算分页 */
  attach(
    iframe: HTMLIFrameElement,
    pageWidth: number,
    columns: 1 | 2 = 1,
  ): void {
    this.iframe = iframe
    this.columns = columns
    // 通过 CssProcessor.getColumnInfo 获取正确的翻页步长
    const info = CssProcessor.getColumnInfo(pageWidth, columns)
    this.pageStep = info.pageStep
  }

  /** 设置总页数（由 ContentRenderer 计算后传入） */
  setTotalPages(total: number, spineIndex: number): void {
    this.state.totalPages = total
    this.state.spineIndex = spineIndex
    this.state.currentPage = 0
  }

  /** 跳转到指定页 */
  goToPage(page: number): boolean {
    if (page < 0 || page >= this.state.totalPages) return false
    this.state.currentPage = page
    this.applyScroll()
    return true
  }

  /** 下一页，返回 false 表示需要切换到下一章 */
  nextPage(): boolean {
    if (this.state.currentPage < this.state.totalPages - 1) {
      this.state.currentPage++
      this.applyScroll()
      return true
    }
    return false
  }

  /** 上一页，返回 false 表示需要切换到上一章 */
  prevPage(): boolean {
    if (this.state.currentPage > 0) {
      this.state.currentPage--
      this.applyScroll()
      return true
    }
    return false
  }

  /** 跳转到最后一页 */
  goToLastPage(): void {
    this.state.currentPage = this.state.totalPages - 1
    this.applyScroll()
  }

  /** 跳转到第一页 */
  goToFirstPage(): void {
    this.state.currentPage = 0
    this.applyScroll()
  }

  /** 获取当前状态 */
  getState(): PaginationState {
    return { ...this.state }
  }

  /** 重新计算页数（窗口大小变化时） */
  recalculate(): number {
    if (!this.iframe?.contentDocument?.body) return 1

    const body = this.iframe.contentDocument.body
    const scrollWidth = body.scrollWidth

    this.state.totalPages = Math.max(1, Math.ceil(scrollWidth / this.pageStep))

    if (this.state.currentPage >= this.state.totalPages) {
      this.state.currentPage = this.state.totalPages - 1
    }

    this.applyScroll()
    return this.state.totalPages
  }

  private applyScroll(): void {
    if (!this.iframe?.contentDocument?.body) return
    const offset = this.state.currentPage * this.pageStep
    this.iframe.contentDocument.body.scrollLeft = offset
  }
}
