/** 阅读器状态类型 */

export interface ReaderSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
  /** 页边距 px */
  padding: { top: number; right: number; bottom: number; left: number }
  theme: ThemeKey
  /** 翻页模式 */
  pageMode: 'paginated' | 'scroll'
  /** 翻页动画 */
  pageAnimation: 'slide' | 'none'
  /** 分栏数：1 = 单栏，2 = 双栏 */
  columns: 1 | 2
}

export type ThemeKey = 'light' | 'sepia' | 'dark' | 'green'

export interface ThemeColors {
  name: string
  background: string
  color: string
  selectionBg: string
}

export const THEMES: Record<ThemeKey, ThemeColors> = {
  light: {
    name: '白天',
    background: '#FFFFFF',
    color: '#333333',
    selectionBg: '#B4D5FE',
  },
  sepia: {
    name: '护眼',
    background: '#F5E6C8',
    color: '#5B4636',
    selectionBg: '#C9B99A',
  },
  dark: {
    name: '夜间',
    background: '#1A1A1A',
    color: '#CCCCCC',
    selectionBg: '#3A3A3A',
  },
  green: {
    name: '绿色护眼',
    background: '#C7EDCC',
    color: '#2D4A2D',
    selectionBg: '#A5D6A7',
  },
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: '"Songti SC", "SimSun", "Noto Serif CJK SC", serif',
  lineHeight: 1.8,
  padding: { top: 40, right: 36, bottom: 40, left: 36 },
  theme: 'sepia',
  pageMode: 'paginated',
  pageAnimation: 'slide',
  columns: 1,
}
