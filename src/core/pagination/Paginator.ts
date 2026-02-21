/**
 * 分页引擎 — 基于 CSS Multi-Column 的分页实现
 *
 * 核心概念：
 * - 一页 = 一栏（column）
 * - 单栏模式：屏幕显示 1 页，翻页跳 1 栏
 * - 双栏模式：屏幕显示 2 页（左右各一页），翻页跳 2 栏
 * - 页码始终以「栏」为单位计数
 * - 双栏时 currentPage 始终对齐到偶数（0, 2, 4...），表示左侧栏的页码
 */
import { CssProcessor, type ColumnLayout } from '@/core/renderer/CssProcessor'

export interface PaginationState {
  /** 当前页码（从 0 开始，一页 = 一栏） */
  currentPage: number
  /** 当前章节总页数（= 总栏数） */
  totalPages: number
  /** 当前 spine 索引 */
  spineIndex: number
}

export class Paginator {
  private iframe: HTMLIFrameElement | null = null
  private layout: ColumnLayout = { colWidth: 0, colGap: 0, scrollStep: 0, visiblePages: 1 }
  private state: PaginationState = {
    currentPage: 0,
    totalPages: 1,
    spineIndex: 0,
  }

  /** 绑定 iframe 并计算分页布局 */
  attach(iframe: HTMLIFrameElement, pageWidth: number, columns: 1 | 2 = 1): void {
    this.iframe = iframe
    this.layout = CssProcessor.getColumnLayout(pageWidth, columns)
  }

  /** 设置总页数（由 ContentRenderer 计算后传入） */
  setTotalPages(total: number, spineIndex: number): void {
    this.state.totalPages = total
    this.state.spineIndex = spineIndex
    this.state.currentPage = 0
  }

  /** 跳转到指定页（会自动对齐到 visiblePages 的倍数） */
  goToPage(page: number): boolean {
    if (page < 0 || page >= this.state.totalPages) return false
    this.state.currentPage = this.alignPage(page)
    this.applyScroll()
    return true
  }

  /** 下一屏，返回 false 表示需要切换到下一章 */
  nextPage(): boolean {
    const next = this.state.currentPage + this.layout.visiblePages
    if (next < this.state.totalPages) {
      this.state.currentPage = next
      this.applyScroll()
      return true
    }
    return false
  }

  /** 上一屏，返回 false 表示需要切换到上一章 */
  prevPage(): boolean {
    const prev = this.state.currentPage - this.layout.visiblePages
    if (prev >= 0) {
      this.state.currentPage = prev
      this.applyScroll()
      return true
    }
    return false
  }

  /** 跳转到最后一屏 */
  goToLastPage(): void {
    const v = this.layout.visiblePages
    // 对齐到最后一屏的起始页
    this.state.currentPage = Math.max(0, Math.floor((this.state.totalPages - 1) / v) * v)
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

  /** 获取布局信息 */
  getLayout(): ColumnLayout {
    return { ...this.layout }
  }

  /**
   * 获取当前章节内进度比例（0~1）
   * 基于 scrollLeft / scrollWidth，不受窗口大小影响
   */
  getProgressRatio(): number {
    if (!this.iframe?.contentDocument?.body) return 0
    const body = this.iframe.contentDocument.body
    const scrollWidth = body.scrollWidth
    if (scrollWidth <= 0) return 0
    const offset = this.state.currentPage * this.layout.scrollStep
    return Math.min(1, offset / scrollWidth)
  }

  /**
   * 根据章节内进度比例跳转到对应页
   * 用于恢复阅读进度（不依赖页码，窗口大小变化后仍能定位到正确位置）
   */
  goToProgressRatio(ratio: number): void {
    if (!this.iframe?.contentDocument?.body) return
    if (ratio <= 0) {
      this.goToFirstPage()
      return
    }
    if (ratio >= 1) {
      this.goToLastPage()
      return
    }

    const body = this.iframe.contentDocument.body
    const scrollWidth = body.scrollWidth
    const targetOffset = ratio * scrollWidth

    // 反算页码：targetOffset / scrollStep，然后对齐
    const rawPage = Math.round(targetOffset / this.layout.scrollStep)
    const page = Math.min(Math.max(0, rawPage), this.state.totalPages - 1)
    this.state.currentPage = this.alignPage(page)
    this.applyScroll()
  }

  /** 重新计算页数（窗口大小变化时） */
  recalculate(): number {
    if (!this.iframe?.contentDocument?.body) return 1

    const body = this.iframe.contentDocument.body
    const scrollWidth = body.scrollWidth

    // 总栏数 = scrollWidth / scrollStep
    this.state.totalPages = Math.max(1, Math.ceil(scrollWidth / this.layout.scrollStep))

    // 确保 currentPage 不越界且对齐
    this.state.currentPage = Math.min(
      this.alignPage(this.state.currentPage),
      Math.max(0, Math.floor((this.state.totalPages - 1) / this.layout.visiblePages) * this.layout.visiblePages),
    )

    this.applyScroll()
    return this.state.totalPages
  }

  /** 将页码对齐到 visiblePages 的倍数 */
  private alignPage(page: number): number {
    const v = this.layout.visiblePages
    return Math.floor(page / v) * v
  }

  private applyScroll(): void {
    if (!this.iframe?.contentDocument?.body) return
    // 每栏滚动一个 scrollStep（= colWidth + colGap）
    const offset = this.state.currentPage * this.layout.scrollStep
    this.iframe.contentDocument.body.scrollLeft = offset
  }
}
