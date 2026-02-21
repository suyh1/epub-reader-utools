<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronLeft, List, Settings, BookOpen } from 'lucide-vue-next'
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

watch([containerRef, iframeRef], () => {
  reader.containerRef.value = containerRef.value || null
  reader.iframeRef.value = iframeRef.value || null
})

useGesture({
  onNextPage: () => reader.nextPage(),
  onPrevPage: () => reader.prevPage(),
  onNextChapter: () => reader.nextChapter(),
  onPrevChapter: () => reader.prevChapter(),
  onToggleToolbar: () => readerStore.toggleToolbar(),
  onToggleToc: () => { readerStore.showToc = !readerStore.showToc },
  onBack: handleBack,
})

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
    <transition name="fade">
      <div v-if="readerStore.loading" class="loading-overlay">
        <div class="loading-ring">
          <div class="ring-spinner" />
        </div>
        <span class="loading-text">正在加载...</span>
      </div>
    </transition>

    <!-- 错误状态 -->
    <transition name="fade">
      <div v-if="readerStore.error" class="error-overlay">
        <div class="error-card">
          <BookOpen :size="36" stroke-width="1.2" />
          <p class="error-msg">{{ readerStore.error }}</p>
          <button class="error-btn" @click="handleBack">返回书架</button>
        </div>
      </div>
    </transition>

    <!-- 顶部工具栏 -->
    <transition name="toolbar-top">
      <header v-show="readerStore.showToolbar" class="reader-toolbar">
        <button class="toolbar-btn" @click="handleBack">
          <ChevronLeft :size="20" />
          <span>书架</span>
        </button>
        <span class="toolbar-title">{{ readerStore.currentBook?.metadata.title }}</span>
        <button class="toolbar-btn" @click="readerStore.showToc = !readerStore.showToc">
          <List :size="18" />
        </button>
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
      <div
        class="reader-overlay"
        @click="handleContentClick"
        @wheel.prevent="handleWheel"
      />
    </div>

    <!-- 底部控制栏 -->
    <transition name="toolbar-bottom">
      <footer v-show="readerStore.showToolbar" class="reader-footbar">
        <!-- 章节信息 -->
        <div class="foot-info">
          <span class="chapter-name">{{ readerStore.getCurrentChapterTitle() }}</span>
          <span class="page-info">
            {{ readerStore.pagination.currentPage + 1 }} / {{ readerStore.pagination.totalPages }}
          </span>
        </div>

        <!-- 进度条 -->
        <div class="foot-progress">
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

        <!-- 操作按钮 -->
        <div class="foot-actions">
          <button class="action-btn" @click="readerStore.showToc = true">
            <List :size="17" />
            <span>目录</span>
          </button>
          <button class="action-btn" @click="readerStore.showSettings = true">
            <Settings :size="17" />
            <span>设置</span>
          </button>
        </div>
      </footer>
    </transition>

    <!-- 目录侧栏 -->
    <TocSidebar
      v-if="readerStore.showToc && readerStore.currentBook"
      :toc="readerStore.currentBook.toc"
      :spine="readerStore.currentBook.spine"
      :current-spine-index="readerStore.pagination.spineIndex"
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
  padding: 0 8px;
  height: 48px;
  background: rgba(20, 20, 20, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: #fff;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: center;
  padding: 0 8px;
  opacity: 0.9;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast);
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

/* 底部控制栏 */
.reader-footbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 14px 20px 16px;
  background: rgba(20, 20, 20, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: #fff;
}

.foot-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.65;
  margin-bottom: 10px;
}

.foot-progress {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.progress-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: background var(--duration-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
}

.progress-pct {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.foot-actions {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 16px;
  background: inherit;
}

.loading-ring {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-spinner {
  width: 32px;
  height: 32px;
  border: 2.5px solid rgba(0, 0, 0, 0.08);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

.loading-text {
  font-size: 13px;
  opacity: 0.5;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误状态 */
.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background: inherit;
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: var(--text-secondary);
}

.error-msg {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 280px;
}

.error-btn {
  margin-top: 4px;
  padding: 8px 20px;
  background: var(--primary);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--primary-hover);
  }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toolbar-top-enter-active,
.toolbar-top-leave-active {
  transition: transform var(--duration-normal) var(--ease-out),
              opacity var(--duration-normal) var(--ease-out);
}
.toolbar-top-enter-from,
.toolbar-top-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.toolbar-bottom-enter-active,
.toolbar-bottom-leave-active {
  transition: transform var(--duration-normal) var(--ease-out),
              opacity var(--duration-normal) var(--ease-out);
}
.toolbar-bottom-enter-from,
.toolbar-bottom-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
