<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useReader } from '@/composables/useReader'
import { useGesture } from '@/composables/useGesture'
import { THEMES } from '@/types/reader'
import TocSidebar from './TocSidebar.vue'
import FootnotePopup from './FootnotePopup.vue'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps<{
  filePath: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const readerStore = useReaderStore()
const reader = useReader()

const containerRef = ref<HTMLDivElement>()
const iframeRef = ref<HTMLIFrameElement>()

// 绑定 refs
watch([containerRef, iframeRef], () => {
  reader.containerRef.value = containerRef.value || null
  reader.iframeRef.value = iframeRef.value || null
})

// 键盘和手势
useGesture({
  onNextPage: () => reader.nextPage(),
  onPrevPage: () => reader.prevPage(),
  onNextChapter: () => reader.nextChapter(),
  onPrevChapter: () => reader.prevChapter(),
  onToggleToolbar: () => readerStore.toggleToolbar(),
  onToggleToc: () => { readerStore.showToc = !readerStore.showToc },
  onBack: handleBack,
})

// 窗口大小变化
let resizeTimer: ReturnType<typeof setTimeout> | null = null
function onResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => reader.handleResize(), 300)
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await nextTick()
  try {
    await reader.openBook(props.filePath)
  } catch (err: any) {
    console.error('Failed to open book:', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})

// 设置变化时重新渲染
watch(
  () => readerStore.settings,
  () => {
    if (readerStore.currentChapter) {
      reader.handleResize()
    }
  },
  { deep: true },
)

function handleBack(): void {
  reader.backToShelf()
  emit('back')
}

function handleContentClick(e: MouseEvent): void {
  // 如果工具栏已显示，先关闭
  if (readerStore.showToolbar) {
    readerStore.showToolbar = false
    readerStore.showToc = false
    readerStore.showSettings = false
    return
  }
  reader.handleContentClick(e)
}

function handleWheel(e: WheelEvent): void {
  if (e.deltaY > 0 || e.deltaX > 0) {
    reader.nextPage()
  } else if (e.deltaY < 0 || e.deltaX < 0) {
    reader.prevPage()
  }
}

const currentTheme = () => THEMES[readerStore.settings.theme]
</script>

<template>
  <div
    class="reader"
    :style="{
      background: currentTheme().background,
      color: currentTheme().color,
    }"
  >
    <!-- 加载状态 -->
    <div v-if="readerStore.loading" class="loading-overlay">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-if="readerStore.error" class="error-overlay">
      <p>{{ readerStore.error }}</p>
      <button @click="handleBack">返回书架</button>
    </div>

    <!-- 顶部工具栏 -->
    <transition name="slide-down">
      <header v-show="readerStore.showToolbar" class="reader-toolbar">
        <button class="toolbar-btn" @click="handleBack">← 返回</button>
        <span class="toolbar-title">{{ readerStore.currentBook?.metadata.title }}</span>
        <button class="toolbar-btn" @click="readerStore.showToc = !readerStore.showToc">目录</button>
      </header>
    </transition>

    <!-- 内容区域 -->
    <div
      ref="containerRef"
      class="reader-content"
      :style="{
        padding: `${readerStore.settings.padding.top}px ${readerStore.settings.padding.right}px ${readerStore.settings.padding.bottom}px ${readerStore.settings.padding.left}px`,
      }"
    >
      <iframe
        ref="iframeRef"
        class="reader-iframe"
        sandbox="allow-same-origin"
        frameborder="0"
      />
      <!-- 透明覆盖层：捕获点击/滚轮事件，防止 iframe 吞事件 -->
      <div
        class="reader-overlay"
        @click="handleContentClick"
        @wheel.prevent="handleWheel"
      />
    </div>

    <!-- 底部控制栏 -->
    <transition name="slide-up">
      <footer v-show="readerStore.showToolbar" class="reader-footbar">
        <div class="footbar-progress">
          <span class="chapter-name">{{ readerStore.getCurrentChapterTitle() }}</span>
          <span class="page-info">
            {{ readerStore.pagination.currentPage + 1 }} / {{ readerStore.pagination.totalPages }}
          </span>
        </div>
        <div class="footbar-bar">
          <input
            type="range"
            class="progress-slider"
            :min="0"
            :max="readerStore.currentBook?.spine.length ? readerStore.currentBook.spine.length - 1 : 0"
            :value="readerStore.pagination.spineIndex"
            @change="(e: Event) => reader.goToChapter(Number((e.target as HTMLInputElement).value))"
          />
          <span class="progress-pct">{{ readerStore.getOverallProgress() }}%</span>
        </div>
        <div class="footbar-actions">
          <button class="action-btn" @click="readerStore.showToc = true">📑 目录</button>
          <button class="action-btn" @click="readerStore.showSettings = true">Aa 设置</button>
        </div>
      </footer>
    </transition>

    <!-- 目录侧栏 -->
    <TocSidebar
      v-if="readerStore.showToc && readerStore.currentBook"
      :toc="readerStore.currentBook.toc"
      :current-href="readerStore.currentChapter?.href || ''"
      @select="reader.goToTocItem($event)"
      @close="readerStore.showToc = false"
    />

    <!-- 设置面板 -->
    <SettingsPanel
      v-if="readerStore.showSettings"
      @close="readerStore.showSettings = false"
    />

    <!-- 脚注弹窗 -->
    <FootnotePopup
      v-if="reader.showFootnote.value"
      :data="reader.footnoteData.value!"
      @close="reader.closeFootnote()"
    />
  </div>
</template>

<style lang="less" scoped>
.reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  user-select: none;
}

.reader-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.reader-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.reader-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  cursor: default;
}

/* 顶部工具栏 */
.reader-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  backdrop-filter: blur(10px);
}

.toolbar-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: center;
  padding: 0 12px;
}

.toolbar-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1.5;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* 底部控制栏 */
.reader-footbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  backdrop-filter: blur(10px);
}

.footbar-progress {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.footbar-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.progress-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
  }
}

.progress-pct {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
}

.footbar-actions {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.action-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  line-height: 1.5;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* 加载和错误 */
.loading-overlay,
.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0d8cc;
  border-top-color: #8b7355;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 过渡动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
