/** 键盘快捷键 composable */
import { onMounted, onUnmounted } from 'vue'

interface GestureOptions {
  onNextPage: () => void
  onPrevPage: () => void
  onNextChapter: () => void
  onPrevChapter: () => void
  onToggleToolbar: () => void
  onToggleToc: () => void
  onBack: () => void
}

export function useGesture(options: GestureOptions) {
  function handleKeydown(e: KeyboardEvent): void {
    // 忽略输入框中的按键
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
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
