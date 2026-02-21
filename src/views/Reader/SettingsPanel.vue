<script lang="ts" setup>
import { Minus, Plus, X, Type, Columns2, Columns3, BookOpen, Monitor } from 'lucide-vue-next'
import { useReaderStore } from '@/stores/reader'
import { THEMES, type ThemeKey } from '@/types/reader'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const readerStore = useReaderStore()
const settings = readerStore.settings

const fontOptions = [
  { label: '宋体', value: '"Songti SC", "SimSun", "Noto Serif CJK SC", serif' },
  { label: '黑体', value: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif' },
  { label: '楷体', value: '"Kaiti SC", "KaiTi", "STKaiti", serif' },
  { label: '仿宋', value: '"FangSong SC", "FangSong", "STFangsong", serif' },
  { label: '书籍字体', value: 'inherit' },
]

const themeKeys = Object.keys(THEMES) as ThemeKey[]

function updateFontSize(delta: number): void {
  const newSize = Math.max(12, Math.min(36, settings.fontSize + delta))
  readerStore.updateSettings({ fontSize: newSize })
}

function updateLineHeight(delta: number): void {
  const newLH = Math.max(1.2, Math.min(3.0, Math.round((settings.lineHeight + delta) * 10) / 10))
  readerStore.updateSettings({ lineHeight: newLH })
}

function setTheme(theme: ThemeKey): void {
  readerStore.updateSettings({ theme })
}

function setFont(fontFamily: string): void {
  readerStore.updateSettings({ fontFamily })
}

function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as Element).classList.contains('settings-overlay')) {
    emit('close')
  }
}
</script>

<template>
  <div class="settings-overlay" @click="handleOverlayClick">
    <div class="settings-panel">
      <div class="panel-handle" />

      <!-- 字号 -->
      <div class="setting-row">
        <span class="setting-label">字号</span>
        <div class="setting-control stepper">
          <button class="stepper-btn" @click="updateFontSize(-2)" :disabled="settings.fontSize <= 12">
            <Minus :size="14" />
          </button>
          <span class="stepper-value">{{ settings.fontSize }}</span>
          <button class="stepper-btn" @click="updateFontSize(2)" :disabled="settings.fontSize >= 36">
            <Plus :size="14" />
          </button>
        </div>
      </div>

      <!-- 行距 -->
      <div class="setting-row">
        <span class="setting-label">行距</span>
        <div class="setting-control stepper">
          <button class="stepper-btn" @click="updateLineHeight(-0.1)" :disabled="settings.lineHeight <= 1.2">
            <Minus :size="14" />
          </button>
          <span class="stepper-value">{{ settings.lineHeight.toFixed(1) }}</span>
          <button class="stepper-btn" @click="updateLineHeight(0.1)" :disabled="settings.lineHeight >= 3.0">
            <Plus :size="14" />
          </button>
        </div>
      </div>

      <!-- 字体 -->
      <div class="setting-row vertical">
        <span class="setting-label">字体</span>
        <div class="chip-group">
          <button
            v-for="opt in fontOptions"
            :key="opt.label"
            class="chip"
            :class="{ active: settings.fontFamily === opt.value }"
            @click="setFont(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- 主题 -->
      <div class="setting-row vertical">
        <span class="setting-label">主题</span>
        <div class="theme-group">
          <button
            v-for="key in themeKeys"
            :key="key"
            class="theme-swatch"
            :class="{ active: settings.theme === key }"
            :style="{ background: THEMES[key].background, color: THEMES[key].color }"
            @click="setTheme(key)"
          >
            <span class="swatch-label">{{ THEMES[key].name }}</span>
            <div v-if="settings.theme === key" class="swatch-check">✓</div>
          </button>
        </div>
      </div>

      <!-- 翻页 & 分栏 -->
      <div class="setting-row">
        <span class="setting-label">翻页</span>
        <div class="setting-control">
          <div class="toggle-group">
            <button
              class="toggle-btn"
              :class="{ active: settings.pageMode === 'paginated' }"
              @click="readerStore.updateSettings({ pageMode: 'paginated' })"
            >
              分页
            </button>
            <button
              class="toggle-btn"
              :class="{ active: settings.pageMode === 'scroll' }"
              @click="readerStore.updateSettings({ pageMode: 'scroll' })"
            >
              滚动
            </button>
          </div>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">分栏</span>
        <div class="setting-control">
          <div class="toggle-group">
            <button
              class="toggle-btn"
              :class="{ active: settings.columns === 1 }"
              @click="readerStore.updateSettings({ columns: 1 })"
            >
              单栏
            </button>
            <button
              class="toggle-btn"
              :class="{ active: settings.columns === 2 }"
              @click="readerStore.updateSettings({ columns: 2 })"
            >
              双栏
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.settings-overlay {
  position: absolute;
  inset: 0;
  z-index: 65;
  background: var(--overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-panel {
  width: 100%;
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 8px 24px 24px;
  animation: panelSlideUp var(--duration-slow) var(--ease-out);
  box-shadow: var(--shadow-xl);
}

@keyframes panelSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.panel-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  margin: 4px auto 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: none;
  }

  &.vertical {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

.setting-label {
  width: 48px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-weight: 500;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

/* 步进器 */
.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  overflow: hidden;
}

.stepper-btn {
  width: 36px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all var(--duration-fast);

  &:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.stepper-value {
  font-size: 14px;
  font-weight: 600;
  min-width: 44px;
  text-align: center;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  height: 34px;
  line-height: 34px;
}

/* 芯片组 */
.chip-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: var(--bg);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--duration-fast);

  &:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  &.active {
    background: var(--primary);
    color: var(--text-inverse);
    border-color: var(--primary);
  }
}

/* 主题色块 */
.theme-group {
  display: flex;
  gap: 10px;
  width: 100%;
}

.theme-swatch {
  flex: 1;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
  transition: all var(--duration-fast);
  box-shadow: var(--shadow-sm);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  &.active {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-light), var(--shadow-md);
  }
}

.swatch-label {
  font-weight: 500;
}

.swatch-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

/* 切换组 */
.toggle-group {
  display: flex;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  overflow: hidden;
}

.toggle-btn {
  padding: 6px 18px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--duration-fast);
  position: relative;

  &:not(:last-child) {
    border-right: 1px solid var(--border);
  }

  &:hover:not(.active) {
    background: var(--bg-hover);
  }

  &.active {
    background: var(--primary);
    color: var(--text-inverse);
    font-weight: 500;
  }
}
</style>
