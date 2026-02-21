# EPUB 阅读器 - uTools 插件

一款功能丰富的 EPUB 电子书阅读器，作为 [uTools](https://u.tools/) 插件运行，支持多看脚注适配。

---

## 功能特性

### 📖 阅读体验
- 基于 CSS 多栏布局的分页引擎，支持单栏/双栏模式
- 滑动翻页动画，支持触摸手势（左滑下一页、右滑上一页）
- 键盘快捷键导航（方向键、空格翻页，`Ctrl+←/→` 切换章节）
- 自动保存阅读进度，阅读时长统计

### 🎨 主题与个性化
- 6 种阅读主题：白天、护眼、夜间、绿色护眼、墨韵、薄暮
- 跟随系统深色模式自动切换主题
- 可调节字号、字体、行高、页边距

### 📚 书架管理
- 网格/列表两种视图模式
- 按最近阅读、书名、添加时间排序
- 标签分类与筛选
- 书籍自动导入到数据目录，支持封面缩略图

### 🔍 内容功能
- 目录导航（支持 EPUB 2 NCX 和 EPUB 3 Nav）
- 全文搜索
- 书签管理（`Ctrl+B` 快速添加）
- 多看脚注弹窗适配

### 📄 格式支持
- EPUB 2 & EPUB 3
- 元数据提取（书名、作者、封面、ISBN 等）
- 内嵌图片、字体、CSS 资源解析
- LTR / RTL 页面方向

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 下一页 | `→` / `↓` / `空格` |
| 上一页 | `←` / `↑` / `Backspace` |
| 下一章 | `Ctrl+→` |
| 上一章 | `Ctrl+←` |
| 目录 | `Ctrl+G` |
| 书签 | `Ctrl+B` |
| 搜索 | `Ctrl+F` |
| 返回书架 | `Esc` |

## 技术栈

- Vue 3 + TypeScript + Pinia
- Vite 构建
- Less 样式预处理
- JSZip + fast-xml-parser 解析 EPUB
- Lucide 图标库

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（配合 uTools 开发者模式使用）
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build
```

开发模式下，uTools 会连接 `http://localhost:5173` 加载插件页面。

## 使用方式

1. 在 uTools 中搜索「epub阅读器」「电子书」「bookshelf」打开书架
2. 或直接拖拽 `.epub` 文件到 uTools 输入框，选择「用EPUB阅读器打开」

## 项目结构

```
src/
├── core/                  # 核心引擎
│   ├── parser/            # EPUB 解析（OPF / NCX / Nav）
│   ├── renderer/          # 内容渲染（CSS / 图片 / 字体）
│   ├── pagination/        # 分页引擎
│   └── duokan/            # 多看脚注处理
├── composables/           # Vue 组合式函数
│   ├── useReader.ts       # 阅读交互逻辑
│   ├── useEpub.ts         # EPUB 加载与渲染
│   ├── useGesture.ts      # 手势与快捷键
│   └── useSearch.ts       # 搜索功能
├── stores/                # Pinia 状态管理
├── views/                 # 页面组件（书架 / 阅读器）
├── types/                 # TypeScript 类型定义
└── utils/                 # 工具函数
public/
├── plugin.json            # uTools 插件配置
└── preload/services.js    # Node.js 文件系统桥接
```

## 许可证

[GPL-3.0](LICENSE)

---

# EPUB Reader - uTools Plugin

A feature-rich EPUB e-book reader running as a [uTools](https://u.tools/) plugin, with Duokan footnote support.

---

## Features

### 📖 Reading Experience
- CSS multi-column based pagination engine with single/dual-column modes
- Slide page-turn animation with touch gesture support (swipe left/right)
- Keyboard shortcuts (arrow keys, space to turn pages, `Ctrl+←/→` to switch chapters)
- Auto-save reading progress and reading time tracking

### 🎨 Themes & Customization
- 6 reading themes: Light, Sepia, Dark, Green, Ink, Dusk
- Auto dark mode following system preference
- Adjustable font size, font family, line height, and page margins

### 📚 Bookshelf Management
- Grid / List view modes
- Sort by last read, title, or date added
- Tag-based categorization and filtering
- Auto-import books to data directory with cover thumbnails

### 🔍 Content Features
- Table of contents navigation (EPUB 2 NCX & EPUB 3 Nav)
- Full-text search
- Bookmark management (`Ctrl+B` to quick add)
- Duokan footnote popup support

### 📄 Format Support
- EPUB 2 & EPUB 3
- Metadata extraction (title, author, cover, ISBN, etc.)
- Embedded images, fonts, and CSS resource resolution
- LTR / RTL page direction

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Next page | `→` / `↓` / `Space` |
| Previous page | `←` / `↑` / `Backspace` |
| Next chapter | `Ctrl+→` |
| Previous chapter | `Ctrl+←` |
| Table of contents | `Ctrl+G` |
| Bookmark | `Ctrl+B` |
| Search | `Ctrl+F` |
| Back to bookshelf | `Esc` |

## Tech Stack

- Vue 3 + TypeScript + Pinia
- Vite build tool
- Less CSS preprocessor
- JSZip + fast-xml-parser for EPUB parsing
- Lucide icon library

## Development

```bash
# Install dependencies
npm install

# Start dev server (use with uTools developer mode)
npm run dev

# Type check
npm run type-check

# Production build
npm run build
```

In development mode, uTools connects to `http://localhost:5173` to load the plugin.

## Usage

1. Search "epub阅读器", "电子书", or "bookshelf" in uTools to open the bookshelf
2. Or drag and drop an `.epub` file into the uTools input box and select "用EPUB阅读器打开"

## Project Structure

```
src/
├── core/                  # Core engine
│   ├── parser/            # EPUB parsing (OPF / NCX / Nav)
│   ├── renderer/          # Content rendering (CSS / images / fonts)
│   ├── pagination/        # Pagination engine
│   └── duokan/            # Duokan footnote handling
├── composables/           # Vue composables
│   ├── useReader.ts       # Reader interaction logic
│   ├── useEpub.ts         # EPUB loading & rendering
│   ├── useGesture.ts      # Gestures & keyboard shortcuts
│   └── useSearch.ts       # Search functionality
├── stores/                # Pinia state management
├── views/                 # Page components (Bookshelf / Reader)
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
public/
├── plugin.json            # uTools plugin manifest
└── preload/services.js    # Node.js file system bridge
```

## License

[GPL-3.0](LICENSE)
