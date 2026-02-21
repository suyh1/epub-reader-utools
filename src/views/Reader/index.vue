<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronLeft, List, Settings, BookOpen, Bookmark, BookmarkCheck, Clock, Navigation, ChevronDown, Search } from 'lucide-vue-next'
import { useReaderStore } from '@/stores/reader'
import { useReader } from '@/composables/useReader'
import { useGesture } from '@/composables/useGesture'
import { THEMES } from '@/types/reader'
import TocSidebar from './TocSidebar.vue'
import FootnotePopup from './FootnotePopup.vue'
import SettingsPanel from './SettingsPanel.vue'
import BookmarkPanel from './BookmarkPanel.vue'
import SearchPanel from './SearchPanel.vue'
import type { Bookmark as BookmarkType } from '@/types/book'

const props = defineProps<{
  filePath: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const readerStore = useReaderStore()
const reader = useReader()
const { chapterBackground } = reader

const containerRef = ref<HTMLDivElement>()
const iframeRef = ref<HTMLIFrameElement>()
const overlayRef = ref<HTMLDivElement>()

/** 书签添加提示 */
const bookmarkToast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** 跳转弹窗 */
const showJumpDialog = ref(false)
const jumpValue = ref('')

/** 阅读计时显示 */
const sessionDisplay = ref('0:00')
let sessionTimer: ReturnType<typeof setInterval> | null = null

watch([containerRef, iframeRef], () => {
  reader.containerRef.value = containerRef.value || null
  reader.iframeRef.value = iframeRef.value || null
})

const { bindTouch } = useGesture({
  onNextPage: () => reader.nextPage(),
  onPrevPage: () => reader.prevPage(),
  onNextChapter: () => reader.nextChapter(),
  onPrevChapter: () => reader.prevChapter(),
  onToggleToolbar: () => readerStore.toggleToolbar(),
  onToggleToc: () => { readerStore.showToc = !readerStore.showToc },
  onToggleBookmark: () => handleToggleBookmark(),
  onToggleSearch: () => { readerStore.showSearch = !readerStore.showSearch },
  onBack: handleBack,
})

let touchCleanup: (() => void) | null = null

let resizeTimer: ReturnType<typeof setTimeout> | null = null
function onResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => reader.handleResize(), 300)
}

onMounted(async () => {
  window.addEventListener('resize', onResize)

  // 绑定触摸手势到 overlay
  if (overlayRef.value) {
    touchCleanup = bindTouch(overlayRef.value)
  }

  await nextTick()
  try {
    await reader.openBook(props.filePath)
  } catch (err: any) {
    console.error('Failed to open book:', err)
  }

  // 阅读计时器
  sessionTimer = setInterval(() => {
    const secs = readerStore.getSessionSeconds()
    const m = Math.floor(secs / 60)
    const s = secs % 60
    sessionDisplay.value = `${m}:${s.toString().padStart(2, '0')}`
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (resizeTimer) clearTimeout(resizeTimer)
  if (sessionTimer) clearInterval(sessionTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (touchCleanup) touchCleanup()
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
    readerStore.showBookmarks = false
    readerStore.showSearch = false
    showJumpDialog.value = false
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

function handleToggleBookmark(): void {
  const added = readerStore.toggleBookmark()
  bookmarkToast.value = added ? '已添加书签' : '已移除书签'
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { bookmarkToast.value = '' }, 1500)
}

function handleBookmarkSelect(bm: BookmarkType): void {
  reader.goToChapter(bm.spineIndex).then(() => {
    reader.epub.paginator.goToPage(bm.pageInChapter)
    readerStore.updatePagination({ currentPage: bm.pageInChapter })
  })
  readerStore.showBookmarks = false
}

function handleSearchSelect(spineIndex: number): void {
  reader.goToChapter(spineIndex)
  readerStore.showSearch = false
}

function handleJump(): void {
  const val = jumpValue.value.trim()
  if (!val || !readerStore.currentBook) return

  const book = readerStore.currentBook
  const spineLen = book.spine.length

  // 支持百分比跳转（如 "50%"）或章节号跳转（如 "12"）
  if (val.endsWith('%')) {
    const pct = parseInt(val)
    if (pct >= 0 && pct <= 100) {
      const targetSpine = Math.floor((pct / 100) * spineLen)
      reader.goToChapter(Math.min(targetSpine, spineLen - 1))
    }
  } else {
    const num = parseInt(val)
    if (num >= 1 && num <= spineLen) {
      reader.goToChapter(num - 1)
    }
  }

  showJumpDialog.value = false
  jumpValue.value = ''
}

const currentTheme = () => THEMES[readerStore.settings.theme]
const isBookmarked = computed(() => readerStore.isCurrentPageBookmarked())

/** 页码显示：双栏时显示 "1-2 / 20"，单栏时显示 "1 / 10" */
const pageDisplay = computed(() => {
  const { currentPage, totalPages } = readerStore.pagination
  const cols = readerStore.settings.columns
  if (cols === 2) {
    const left = currentPage + 1
    const right = Math.min(currentPage + 2, totalPages)
    return left === right ? `${left} / ${totalPages}` : `${left}-${right} / ${totalPages}`
  }
  return `${currentPage + 1} / ${totalPages}`
})
</script>

<template>
  <div
    class="reader"
    role="main"
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
        <button class="toolbar-btn" @click="handleBack" aria-label="返回书架">
          <ChevronLeft :size="20" />
          <span>书架</span>
        </button>
        <span class="toolbar-title">{{ readerStore.currentBook?.metadata.title }}</span>
        <div class="toolbar-right">
          <button
            class="toolbar-btn"
            :class="{ 'is-bookmarked': isBookmarked }"
            @click="handleToggleBookmark"
            :aria-label="isBookmarked ? '移除书签' : '添加书签'"
          >
            <BookmarkCheck v-if="isBookmarked" :size="18" />
            <Bookmark v-else :size="18" />
          </button>
          <button class="toolbar-btn" @click="readerStore.showToc = !readerStore.showToc" aria-label="目录">
            <List :size="18" />
          </button>
        </div>
      </header>
    </transition>

    <!-- 内容区域 -->
    <div
      ref="containerRef"
      class="reader-content"
    >
      <!-- 背景图层：铺满整个内容区，在 iframe 下面 -->
      <div
        v-if="chapterBackground.image"
        class="reader-bg-layer"
        :style="{
          backgroundImage: chapterBackground.image,
          backgroundSize: chapterBackground.size,
          backgroundPosition: chapterBackground.position,
          backgroundRepeat: chapterBackground.repeat,
        }"
      />

      <!-- iframe 通过外层 padding 缩进，背景透明 -->
      <div
        class="reader-iframe-wrapper"
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
      </div>

      <div
        ref="overlayRef"
        class="reader-overlay"
        @click="handleContentClick"
        @wheel.prevent="handleWheel"
      />
    </div>

    <!-- 常驻进度指示器 -->
    <div
      v-if="!readerStore.showToolbar && !readerStore.loading && readerStore.currentBook"
      class="progress-indicator"
      :style="{ color: currentTheme().color }"
    >
      <span class="pi-chapter">{{ readerStore.getCurrentChapterTitle() }}</span>
      <span class="pi-sep">·</span>
      <span class="pi-page">{{ pageDisplay }}</span>
      <span class="pi-sep">·</span>
      <span class="pi-pct">{{ readerStore.getOverallProgress() }}%</span>
    </div>

    <!-- 书签添加提示 -->
    <transition name="toast">
      <div v-if="bookmarkToast" class="bookmark-toast">
        {{ bookmarkToast }}
      </div>
    </transition>

    <!-- 底部控制栏 -->
    <transition name="toolbar-bottom">
      <footer v-show="readerStore.showToolbar" class="reader-footbar">
        <!-- 收起按钮 -->
        <button class="footbar-collapse" @click="readerStore.toggleToolbar()">
          <ChevronDown :size="16" />
        </button>
        <!-- 章节信息 -->
        <div class="foot-info">
          <span class="chapter-name">{{ readerStore.getCurrentChapterTitle() }}</span>
          <div class="foot-info-right">
            <span class="session-time">
              <Clock :size="11" />
              {{ sessionDisplay }}
            </span>
            <span class="page-info">{{ pageDisplay }}</span>
          </div>
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
        <div class="foot-actions" role="toolbar" aria-label="阅读器操作">
          <button class="action-btn" @click="readerStore.showToc = true" aria-label="目录">
            <List :size="17" />
            <span>目录</span>
          </button>
          <button class="action-btn" @click="readerStore.showSearch = true" aria-label="搜索">
            <Search :size="17" />
            <span>搜索</span>
          </button>
          <button class="action-btn" @click="readerStore.showBookmarks = true" aria-label="书签">
            <Bookmark :size="17" />
            <span>书签</span>
          </button>
          <button class="action-btn" @click="showJumpDialog = true" aria-label="跳转">
            <Navigation :size="17" />
            <span>跳转</span>
          </button>
          <button class="action-btn" @click="readerStore.showSettings = true" aria-label="设置">
            <Settings :size="17" />
            <span>设置</span>
          </button>
        </div>
      </footer>
    </transition>

    <!-- 跳转弹窗 -->
    <transition name="fade">
      <div v-if="showJumpDialog" class="jump-overlay" @click.self="showJumpDialog = false">
        <div class="jump-dialog">
          <div class="jump-title">快捷跳转</div>
          <div class="jump-hint">输入百分比（如 50%）或章节序号（1-{{ readerStore.currentBook?.spine.length || 0 }}）</div>
          <div class="jump-input-row">
            <input
              v-model="jumpValue"
              class="jump-input"
              placeholder="50% 或 12"
              autofocus
              @keydown.enter="handleJump"
            />
            <button class="jump-btn" @click="handleJump">跳转</button>
          </div>
        </div>
      </div>
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

    <!-- 书签面板 -->
    <BookmarkPanel
      v-if="readerStore.showBookmarks"
      @select="handleBookmarkSelect"
      @close="readerStore.showBookmarks = false"
    />

    <!-- 设置面板 -->
    <SettingsPanel
      v-if="readerStore.showSettings"
      @close="readerStore.showSettings = false"
    />

    <!-- 搜索面板 -->
    <SearchPanel
      v-if="readerStore.showSearch && readerStore.currentBook && reader.epub.getParser()"
      :parser="reader.epub.getParser()!"
      :book="readerStore.currentBook"
      @select="handleSearchSelect"
      @close="readerStore.showSearch = false"
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
}

/* 全局焦点指示器 */
:deep(*:focus-visible) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.reader-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.reader-bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.reader-iframe-wrapper {
  position: absolute;
  inset: 0;
  z-index: 1;
  box-sizing: border-box;
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
  z-index: 2;
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

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
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

  &.is-bookmarked {
    color: #F5A623;
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

.footbar-collapse {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 24px;
  border-radius: 8px 8px 0 0;
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast);

  &:hover {
    color: #fff;
    background: rgba(20, 20, 20, 0.85);
  }
}

.foot-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  opacity: 0.65;
  margin-bottom: 10px;
}

.foot-info-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.session-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
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
  gap: 24px;
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

/* 常驻进度指示器 */
.progress-indicator {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  opacity: 0.28;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
  z-index: 2;
  transition: opacity var(--duration-normal);
}

.pi-chapter {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pi-sep {
  opacity: 0.5;
}

/* 书签提示 Toast */
.bookmark-toast {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  padding: 8px 20px;
  background: rgba(20, 20, 20, 0.78);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 13px;
  border-radius: 100px;
  box-shadow: var(--shadow-lg);
  pointer-events: none;
}

/* 跳转弹窗 */
.jump-overlay {
  position: absolute;
  inset: 0;
  z-index: 70;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.jump-dialog {
  width: 320px;
  max-width: 85%;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-xl);
  animation: dialogPop var(--duration-normal) var(--ease-out);
}

@keyframes dialogPop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.jump-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.jump-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.jump-input-row {
  display: flex;
  gap: 8px;
}

.jump-input {
  flex: 1;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--bg);
  color: var(--text-primary);
  transition: all var(--duration-fast);

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
}

.jump-btn {
  padding: 9px 20px;
  background: var(--primary);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--duration-fast);
  white-space: nowrap;

  &:hover {
    background: var(--primary-hover);
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

.toast-enter-active {
  transition: all var(--duration-normal) var(--ease-out);
}
.toast-leave-active {
  transition: all var(--duration-fast) var(--ease-in-out);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}
</style>
