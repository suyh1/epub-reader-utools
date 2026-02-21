<script lang="ts" setup>
import { Minus, Plus, X, Type, Columns2, Columns3, BookOpen, Monitor, Moon } from 'lucide-vue-next'
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
  readerStore.updateSettings({ theme, autoTheme: false })
}

function setFont(fontFamily: string): void {
  readerStore.updateSettings({ fontFamily })
}

function toggleAutoTheme(): void {
  readerStore.updateSettings({ autoTheme: !settings.autoTheme })
}

const paddingPresets = [
  { label: '紧凑', value: { top: 20, right: 20, bottom: 20, left: 20 } },
  { label: '适中', value: { top: 40, right: 36, bottom: 40, left: 36 } },
  { label: '宽松', value: { top: 56, right: 52, bottom: 56, left: 52 } },
  { label: '超宽', value: { top: 72, right: 72, bottom: 72, left: 72 } },
]

function getCurrentPaddingLabel(): string {
  const p = settings.padding
  const match = paddingPresets.find(
    preset => preset.value.top === p.top && preset.value.right === p.right
      && preset.value.bottom === p.bottom && preset.value.left === p.left
  )
  return match?.label || '自定义'
}

function updatePadding(key: 'top' | 'right' | 'bottom' | 'left', delta: number): void {
  const newVal = Math.max(0, Math.min(120, settings.padding[key] + delta))
  readerStore.updateSettings({
    padding: { ...settings.padding, [key]: newVal },
  })
}

function setPaddingPreset(preset: typeof paddingPresets[0]): void {
  readerStore.updateSettings({ padding: { ...preset.value } })
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
      <div class="panel-header">
        <div class="panel-handle" />
        <button class="panel-close" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <div class="settings-body">
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
        <div class="setting-label-row">
          <span class="setting-label">主题</span>
          <button
            class="auto-theme-btn"
            :class="{ active: settings.autoTheme }"
            @click="toggleAutoTheme"
            title="跟随系统深色模式"
          >
            <Moon :size="13" />
            <span>自动</span>
          </button>
        </div>
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

      <!-- 页边距 -->
      <div class="setting-row vertical">
        <span class="setting-label">页边距</span>
        <div class="chip-group">
          <button
            v-for="preset in paddingPresets"
            :key="preset.label"
            class="chip"
            :class="{ active: getCurrentPaddingLabel() === preset.label }"
            @click="setPaddingPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>
        <div class="padding-fine-tune">
          <div class="padding-item">
            <span class="padding-label">上下</span>
            <div class="stepper mini">
              <button class="stepper-btn" @click="updatePadding('top', -4); updatePadding('bottom', -4)" :disabled="settings.padding.top <= 0">
                <Minus :size="12" />
              </button>
              <span class="stepper-value">{{ settings.padding.top }}</span>
              <button class="stepper-btn" @click="updatePadding('top', 4); updatePadding('bottom', 4)" :disabled="settings.padding.top >= 120">
                <Plus :size="12" />
              </button>
            </div>
          </div>
          <div class="padding-item">
            <span class="padding-label">左右</span>
            <div class="stepper mini">
              <button class="stepper-btn" @click="updatePadding('left', -4); updatePadding('right', -4)" :disabled="settings.padding.left <= 0">
                <Minus :size="12" />
              </button>
              <span class="stepper-value">{{ settings.padding.left }}</span>
              <button class="stepper-btn" @click="updatePadding('left', 4); updatePadding('right', 4)" :disabled="settings.padding.left >= 120">
                <Plus :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </div><!-- settings-body -->
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
  max-height: 85vh;
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 8px 24px 24px;
  animation: panelSlideUp var(--duration-slow) var(--ease-out);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@keyframes panelSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 4px 0 12px;
  flex-shrink: 0;
}

.panel-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
}

.panel-close {
  position: absolute;
  right: -4px;
  top: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

.setting-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.auto-theme-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  color: var(--text-tertiary);
  border: 1px solid var(--border);
  transition: all var(--duration-fast);

  &:hover {
    border-color: var(--border-hover);
    color: var(--text-secondary);
  }

  &.active {
    background: var(--primary);
    color: var(--text-inverse);
    border-color: var(--primary);
  }
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
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
}

.theme-swatch {
  flex: 1;
  min-width: calc(33.33% - 8px);
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
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

/* 页边距微调 */
.padding-fine-tune {
  display: flex;
  gap: 16px;
  width: 100%;
}

.padding-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.padding-label {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  min-width: 28px;
}

.stepper.mini {
  .stepper-btn {
    width: 28px;
    height: 28px;
  }

  .stepper-value {
    font-size: 12px;
    min-width: 36px;
    height: 28px;
    line-height: 28px;
  }
}
</style>
