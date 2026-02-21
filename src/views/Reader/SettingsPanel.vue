<script lang="ts" setup>
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
      <!-- 字号 -->
      <div class="setting-row">
        <span class="setting-label">字号</span>
        <div class="setting-control">
          <button class="adj-btn" @click="updateFontSize(-2)">A-</button>
          <span class="setting-value">{{ settings.fontSize }}px</span>
          <button class="adj-btn" @click="updateFontSize(2)">A+</button>
        </div>
      </div>

      <!-- 行距 -->
      <div class="setting-row">
        <span class="setting-label">行距</span>
        <div class="setting-control">
          <button class="adj-btn" @click="updateLineHeight(-0.1)">-</button>
          <span class="setting-value">{{ settings.lineHeight.toFixed(1) }}</span>
          <button class="adj-btn" @click="updateLineHeight(0.1)">+</button>
        </div>
      </div>

      <!-- 字体 -->
      <div class="setting-row">
        <span class="setting-label">字体</span>
        <div class="font-options">
          <button
            v-for="opt in fontOptions"
            :key="opt.label"
            class="font-btn"
            :class="{ active: settings.fontFamily === opt.value }"
            @click="setFont(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- 主题 -->
      <div class="setting-row">
        <span class="setting-label">主题</span>
        <div class="theme-options">
          <button
            v-for="key in themeKeys"
            :key="key"
            class="theme-btn"
            :class="{ active: settings.theme === key }"
            :style="{
              background: THEMES[key].background,
              color: THEMES[key].color,
              border: `2px solid ${settings.theme === key ? '#8b7355' : '#ddd'}`,
            }"
            @click="setTheme(key)"
          >
            {{ THEMES[key].name }}
          </button>
        </div>
      </div>

      <!-- 翻页模式 -->
      <div class="setting-row">
        <span class="setting-label">翻页</span>
        <div class="setting-control">
          <button
            class="mode-btn"
            :class="{ active: settings.pageMode === 'paginated' }"
            @click="readerStore.updateSettings({ pageMode: 'paginated' })"
          >
            分页
          </button>
          <button
            class="mode-btn"
            :class="{ active: settings.pageMode === 'scroll' }"
            @click="readerStore.updateSettings({ pageMode: 'scroll' })"
          >
            滚动
          </button>
        </div>
      </div>

      <!-- 分栏 -->
      <div class="setting-row">
        <span class="setting-label">分栏</span>
        <div class="setting-control">
          <button
            class="mode-btn"
            :class="{ active: settings.columns === 1 }"
            @click="readerStore.updateSettings({ columns: 1 })"
          >
            单栏
          </button>
          <button
            class="mode-btn"
            :class="{ active: settings.columns === 2 }"
            @click="readerStore.updateSettings({ columns: 2 })"
          >
            双栏
          </button>
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
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.settings-panel {
  width: 100%;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 20px;
  animation: slideUp 0.25s ease;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.setting-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.setting-label {
  width: 48px;
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-value {
  font-size: 14px;
  min-width: 48px;
  text-align: center;
  color: #333;
}

.adj-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background: #f0ebe3;
    border-color: #8b7355;
  }
}

.font-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.font-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  line-height: 1.5;

  &:hover {
    border-color: #8b7355;
  }

  &.active {
    background: #8b7355;
    color: #fff;
    border-color: #8b7355;
  }
}

.theme-options {
  display: flex;
  gap: 10px;
}

.theme-btn {
  width: 48px;
  height: 32px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.05);
  }

  &.active {
    box-shadow: 0 0 0 2px #8b7355;
  }
}

.mode-btn {
  padding: 4px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  line-height: 1.5;

  &.active {
    background: #8b7355;
    color: #fff;
    border-color: #8b7355;
  }
}
</style>
