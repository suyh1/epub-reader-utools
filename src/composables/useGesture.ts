/** 键盘快捷键 + 触摸手势 composable */
import { onMounted, onUnmounted, type Ref } from 'vue'

interface GestureOptions {
  onNextPage: () => void
  onPrevPage: () => void
  onNextChapter: () => void
  onPrevChapter: () => void
  onToggleToolbar: () => void
  onToggleToc: () => void
  onToggleBookmark: () => void
  onToggleSearch: () => void
  onBack: () => void
  /** 触摸手势绑定的元素 */
  touchTarget?: Ref<HTMLElement | undefined>
}

export function useGesture(options: GestureOptions) {
  // ---- 键盘 ----
  function handleKeydown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          options.onNextChapter()
        } else {
          options.onNextPage()
        }
        break

      case 'ArrowLeft':
      case 'Backspace':
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          options.onPrevChapter()
        } else {
          options.onPrevPage()
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        options.onNextPage()
        break

      case 'ArrowUp':
        e.preventDefault()
        options.onPrevPage()
        break

      case 'Escape':
        e.preventDefault()
        options.onBack()
        break

      case 'g':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          options.onToggleToc()
        }
        break

      case 'b':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          options.onToggleBookmark()
        }
        break

      case 'f':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          options.onToggleSearch()
        }
        break
    }
  }

  // ---- 触摸手势 ----
  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0
  let isSwiping = false

  const SWIPE_THRESHOLD = 50 // 最小滑动距离
  const SWIPE_MAX_TIME = 500 // 最大滑动时间 ms
  const SWIPE_ANGLE_LIMIT = 30 // 水平滑动角度限制（度）

  function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchStartTime = Date.now()
    isSwiping = false
  }

  function handleTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return
    const dx = Math.abs(e.touches[0].clientX - touchStartX)
    const dy = Math.abs(e.touches[0].clientY - touchStartY)
    // 水平滑动时阻止默认行为（防止页面滚动）
    if (dx > dy && dx > 10) {
      isSwiping = true
      e.preventDefault()
    }
  }

  function handleTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length !== 1) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    const elapsed = Date.now() - touchStartTime

    if (elapsed > SWIPE_MAX_TIME) return

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // 检查是否为水平滑动
    if (absDx < SWIPE_THRESHOLD) return
    const angle = Math.atan2(absDy, absDx) * (180 / Math.PI)
    if (angle > SWIPE_ANGLE_LIMIT) return

    if (dx < 0) {
      // 左滑 → 下一页
      options.onNextPage()
    } else {
      // 右滑 → 上一页
      options.onPrevPage()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)

    // 绑定触摸事件到目标元素
    const el = options.touchTarget?.value
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: false })
      el.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)

    const el = options.touchTarget?.value
    if (el) {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  })

  /** 手动绑定触摸事件（用于 ref 延迟可用的情况） */
  function bindTouch(el: HTMLElement): () => void {
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }

  return { bindTouch }
}
