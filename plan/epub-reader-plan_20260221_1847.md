# 多看适配 EPUB 阅读器 — 完整实现计划

> 日期: 2026-02-21 18:47
> 项目: epub-reader-utools
> 技术栈: Vue 3 + TypeScript + Vite + Element Plus + Pinia (uTools 插件)

---

## 一、项目背景与目标

### 1.1 背景
当前项目是一个 uTools 插件模板，具备基础的文件读写功能。需要将其改造为一个功能完整的 EPUB 阅读器，重点适配多看（Duokan）制作规范的 EPUB 电子书，在 uTools 桌面环境中还原多看 App 的阅读体验。

### 1.2 多看 EPUB 格式特点
多看 EPUB 本质上是标准 EPUB 2/3 文件，其"精排"特色体现在：
- 优秀的 CJK 排版：标点挤压、行间距控制、两端对齐
- 嵌入字体支持（OTF/TTF via `@font-face`）
- 弹出式脚注（`<aside epub:type="footnote">` + `epub:type="noteref"`）
- 竖排文字支持（`writing-mode: vertical-rl`）
- Ruby 注音标注（`<ruby>/<rt>/<rp>`）
- SVG 包裹的全页图片（封面等）
- 标准目录结构：`OEBPS/Text/`, `OEBPS/Styles/`, `OEBPS/Fonts/`, `OEBPS/Images/`

### 1.3 核心目标
1. 完整解析 EPUB 2/3 格式（含多看精排扩展）
2. 高保真渲染多看 CSS 排版效果
3. 弹出式脚注交互
4. 嵌入字体加载与渲染
5. 流畅的翻页与章节导航
6. 书架管理与阅读进度记忆
7. 自定义阅读设置（字体、字号、主题、行距等）

---

## 二、整体架构设计

### 2.1 架构分层

```
┌─────────────────────────────────────────────┐
│                  UI 层 (Vue 3)               │
│  书架页 / 阅读页 / 设置面板 / 目录侧栏       │
├─────────────────────────────────────────────┤
│              状态管理层 (Pinia)               │
│  BookStore / ReaderStore / SettingsStore     │
├─────────────────────────────────────────────┤
│              EPUB 引擎层 (Core)              │
│  解析器 / 渲染器 / 脚注处理 / 字体加载器      │
├─────────────────────────────────────────────┤
│           Node.js Preload 层                 │
│  文件I/O / ZIP解压 / 字体提取 / 数据持久化    │
└─────────────────────────────────────────────┘
```

### 2.2 目录结构规划

```
src/
├── main.ts                    # 入口
├── App.vue                    # 根组件（路由）
├── env.d.ts                   # 类型声明
├── main.less                  # 全局样式
│
├── types/                     # TypeScript 类型定义
│   ├── epub.ts                # EPUB 数据结构类型
│   ├── book.ts                # 书籍元数据类型
│   └── reader.ts              # 阅读器状态类型
│
├── core/                      # EPUB 核心引擎
│   ├── parser/
│   │   ├── EpubParser.ts      # EPUB 解压与解析主入口
│   │   ├── OpfParser.ts       # content.opf 解析
│   │   ├── NcxParser.ts       # toc.ncx 解析 (EPUB 2)
│   │   ├── NavParser.ts       # nav.xhtml 解析 (EPUB 3)
│   │   └── MetadataParser.ts  # 元数据提取
│   ├── renderer/
│   │   ├── ContentRenderer.ts # XHTML 内容渲染
│   │   ├── CssProcessor.ts    # CSS 处理与注入
│   │   ├── FontLoader.ts      # 嵌入字体加载
│   │   ├── ImageResolver.ts   # 图片资源解析
│   │   └── SvgHandler.ts      # SVG 包裹图片处理
│   ├── duokan/
│   │   ├── FootnoteHandler.ts # 多看弹出式脚注
│   │   ├── TypographyEngine.ts# CJK 排版引擎
│   │   └── RubyHandler.ts     # Ruby 注音处理
│   └── pagination/
│       ├── Paginator.ts       # 分页引擎
│       └── ScrollMode.ts      # 滚动模式
│
├── stores/                    # Pinia 状态管理
│   ├── bookshelf.ts           # 书架状态
│   ├── reader.ts              # 阅读器状态
│   └── settings.ts            # 用户设置
│
├── views/                     # 页面视图
│   ├── Bookshelf/
│   │   ├── index.vue          # 书架主页
│   │   └── BookCard.vue       # 书籍卡片
│   ├── Reader/
│   │   ├── index.vue          # 阅读器主页
│   │   ├── ReaderContent.vue  # 内容渲染区
│   │   ├── ReaderToolbar.vue  # 顶部工具栏
│   │   ├── ReaderFootbar.vue  # 底部控制栏
│   │   ├── TocSidebar.vue     # 目录侧栏
│   │   ├── FootnotePopup.vue  # 脚注弹窗
│   │   └── SettingsPanel.vue  # 设置面板
│   └── components/
│       ├── FileDropZone.vue   # 文件拖拽区
│       └── ProgressBar.vue    # 阅读进度条
│
├── composables/               # Vue 组合式函数
│   ├── useEpub.ts             # EPUB 加载与管理
│   ├── useReader.ts           # 阅读器交互逻辑
│   ├── useGesture.ts          # 手势/键盘翻页
│   └── useTheme.ts            # 主题切换
│
└── utils/                     # 工具函数
    ├── zip.ts                 # ZIP 解压封装
    ├── xml.ts                 # XML 解析工具
    ├── storage.ts             # 本地存储封装
    └── dom.ts                 # DOM 操作工具
```

---

## 三、分阶段实施计划

### 阶段一：基础设施搭建（预计 2-3 天）

#### 1.1 依赖安装与配置
新增依赖：
```json
{
  "dependencies": {
    "jszip": "^3.10.1",         // ZIP 解压（EPUB 本质是 ZIP）
    "fast-xml-parser": "^4.3.0" // XML/XHTML 解析
  }
}
```

> 不使用 epub.js 等现成库，原因：
> - 现有 EPUB 库对多看特有的排版特性支持不足
> - 自研引擎可以精确控制 CJK 排版和脚注弹窗行为
> - uTools 环境有 Node.js 能力，可以更高效地处理文件

#### 1.2 Preload 层改造
扩展 `public/preload/services.js`：
```javascript
// 新增能力
- readBinaryFile(path)        // 读取二进制文件（EPUB是ZIP）
- extractEpub(path)           // 解压EPUB到临时目录
- readEpubEntry(path, entry)  // 读取EPUB内指定文件
- saveBookData(id, data)      // 持久化书籍数据
- loadBookData(id)            // 加载书籍数据
- getAllBooks()                // 获取所有书籍列表
- deleteBook(id)              // 删除书籍
- saveSetting(key, value)     // 保存设置
- loadSetting(key)            // 加载设置
```

#### 1.3 类型系统定义
```typescript
// types/epub.ts
interface EpubBook {
  id: string;                  // 唯一标识（基于文件hash）
  filePath: string;            // 文件路径
  metadata: EpubMetadata;      // 元数据
  spine: SpineItem[];          // 阅读顺序
  toc: TocItem[];              // 目录结构
  resources: Map<string, Resource>; // 所有资源
}

interface EpubMetadata {
  title: string;
  creator: string;
  language: string;
  publisher?: string;
  date?: string;
  description?: string;
  cover?: string;              // 封面图片路径
  isbn?: string;
}

interface SpineItem {
  id: string;
  href: string;
  mediaType: string;
  linear: boolean;
}

interface TocItem {
  id: string;
  label: string;
  href: string;
  children: TocItem[];        // 支持多级目录
  level: number;
}

interface Resource {
  href: string;
  mediaType: string;
  data?: ArrayBuffer | string;
}
```

#### 1.4 plugin.json 改造
```json
{
  "pluginName": "EPUB阅读器",
  "description": "多看适配的EPUB电子书阅读器",
  "main": "index.html",
  "logo": "logo.png",
  "features": [
    {
      "code": "bookshelf",
      "explain": "打开书架",
      "cmds": ["epub阅读器", "电子书", "阅读器", "bookshelf"]
    },
    {
      "code": "open-epub",
      "explain": "打开EPUB文件",
      "cmds": [
        {
          "type": "files",
          "label": "用EPUB阅读器打开",
          "fileType": "file",
          "match": "/\\.epub$/i",
          "minNum": 1,
          "maxNum": 1
        }
      ]
    }
  ],
  "preload": "preload/services.js"
}
```

---

### 阶段二：EPUB 解析引擎（预计 3-4 天）

#### 2.1 EPUB 解压与容器解析
```
EpubParser.ts 职责：
1. 使用 JSZip 解压 EPUB 文件
2. 读取 META-INF/container.xml 定位 rootfile
3. 委托 OpfParser 解析 content.opf
4. 委托 NcxParser/NavParser 解析目录
5. 构建完整的 EpubBook 对象
```

#### 2.2 OPF 解析器
```
OpfParser.ts 职责：
1. 解析 <metadata> 提取书籍信息（Dublin Core）
2. 解析 <manifest> 构建资源清单
3. 解析 <spine> 确定阅读顺序
4. 识别封面图片（meta name="cover" 或 properties="cover-image"）
5. 检测 page-progression-direction（竖排支持）
```

#### 2.3 目录解析器
```
NcxParser.ts (EPUB 2):
- 解析 toc.ncx 中的 <navMap>/<navPoint> 层级结构
- 支持多级嵌套目录

NavParser.ts (EPUB 3):
- 解析 nav.xhtml 中的 <nav epub:type="toc">
- 解析 <ol>/<li>/<a> 层级结构
- 优先使用 EPUB 3 导航，回退到 NCX
```

#### 2.4 元数据提取
```
MetadataParser.ts 职责：
- 提取 dc:title, dc:creator, dc:language 等
- 提取封面图片并生成缩略图
- 计算文件 hash 作为唯一 ID
- 提取多看特有的元数据（如有）
```

---

### 阶段三：内容渲染引擎（预计 4-5 天）— 核心难点

#### 3.1 内容渲染策略
采用 iframe sandbox 方案渲染 EPUB 内容：

```
渲染流程：
1. 从 EPUB 中提取当前章节的 XHTML
2. CssProcessor 处理并注入原始 CSS
3. ImageResolver 将图片引用转为 blob URL
4. FontLoader 加载嵌入字体为 blob URL
5. SvgHandler 处理 SVG 包裹的图片
6. 注入多看排版增强 CSS
7. 将处理后的完整 HTML 注入 iframe
```

为什么用 iframe：
- 隔离 EPUB 的 CSS 不影响宿主页面
- 更接近真实浏览器渲染行为
- 可以精确控制内容区域尺寸（用于分页）
- 安全沙箱隔离

#### 3.2 CSS 处理器 (CssProcessor.ts)
```
职责：
1. 解析 EPUB 内嵌和外链 CSS
2. 修正资源路径（字体、背景图等）
3. 注入多看排版增强样式：
   - CJK 标点挤压
   - 行间距优化
   - 段落缩进
   - 文字两端对齐
4. 注入用户自定义样式（字体、字号、主题色等）
5. 处理 @font-face 声明，替换为 blob URL
```

多看排版增强 CSS 注入：
```css
/* 多看风格基础排版 */
body {
  text-align: justify;
  -webkit-text-justify: inter-ideograph;
  word-break: break-all;
  line-break: strict;          /* 严格换行规则 */
  overflow-wrap: break-word;
}

/* CJK 标点挤压 */
body {
  font-feature-settings: "halt" 1;
  font-kerning: normal;
  hanging-punctuation: allow-end;
}

/* 段落样式 */
p {
  text-indent: 2em;
  margin: 0;
  padding: 0;
  line-height: 1.8;
  orphans: 2;
  widows: 2;
}

/* 标题不缩进 */
h1, h2, h3, h4, h5, h6 {
  text-indent: 0;
}

/* 图片自适应 */
img {
  max-width: 100%;
  height: auto;
}

/* SVG 容器 */
svg {
  max-width: 100%;
  max-height: 100%;
}
```

#### 3.3 字体加载器 (FontLoader.ts)
```
职责：
1. 从 EPUB 中提取 Fonts/ 目录下的字体文件
2. 将字体文件转为 Blob URL
3. 生成对应的 @font-face CSS 声明
4. 注入到 iframe 中
5. 处理字体加载失败的回退方案
6. 字体缓存管理（避免重复加载）
```

#### 3.4 图片资源解析 (ImageResolver.ts)
```
职责：
1. 扫描 XHTML 中的 <img> 和 <image> 标签
2. 从 EPUB 中提取对应图片资源
3. 转为 Blob URL 替换原始路径
4. 处理 SVG 内嵌的 <image> 标签
5. 处理 CSS 中的 background-image 引用
6. 图片懒加载优化
```

#### 3.5 SVG 处理器 (SvgHandler.ts)
```
职责：
1. 识别 SVG 包裹的全页图片（多看封面常用）
2. 正确处理 viewBox 和宽高比
3. 确保 SVG 内 <image> 的 href/xlink:href 正确解析
4. 自适应容器尺寸
```

---

### 阶段四：多看特色功能适配（预计 3-4 天）— 关键差异化

#### 4.1 弹出式脚注 (FootnoteHandler.ts)

这是多看阅读体验中最具辨识度的功能。

```
实现方案：
1. 扫描内容中的 <a epub:type="noteref"> 链接
2. 拦截点击事件，阻止默认跳转
3. 根据 href 定位对应的 <aside epub:type="footnote"> 内容
4. 从 EPUB 中提取脚注内容
5. 以浮层弹窗形式展示（FootnotePopup.vue）
6. 支持脚注内的链接和格式
7. 点击弹窗外部或关闭按钮关闭

弹窗样式参考多看：
- 从底部滑入的半透明面板
- 圆角卡片样式
- 脚注编号 + 内容
- 支持滚动（长脚注）
```

兼容性处理：
```
需要识别的脚注标记模式：
1. <a epub:type="noteref"> → <aside epub:type="footnote">（标准 EPUB 3）
2. <a class="noteref"> → <div class="footnote">（部分多看书籍）
3. <a href="#fn_xxx"> → <div id="fn_xxx">（传统锚点方式）
4. <a href="footnotes.xhtml#fn1">（跨文件脚注引用）
```

#### 4.2 CJK 排版引擎 (TypographyEngine.ts)

```
核心功能：
1. 标点挤压（Punctuation Compression）
   - 连续标点符号间距压缩
   - 行首/行尾标点处理
   - 使用 CSS font-feature-settings 和 JS 后处理结合

2. 行间距智能调整
   - 根据字体和字号动态计算最佳行高
   - 中文正文默认 1.8 倍行高
   - 标题和引用块独立行高

3. 段落排版
   - 首行缩进 2em（中文惯例）
   - 段间距控制
   - 引用块缩进样式

4. 竖排文字支持
   - 检测 OPF 中的 page-progression-direction
   - 应用 writing-mode: vertical-rl
   - 调整翻页方向为从右到左
   - 竖排标点旋转处理
```

#### 4.3 Ruby 注音处理 (RubyHandler.ts)
```
职责：
1. 确保 <ruby>/<rt>/<rp> 正确渲染
2. 注入 Ruby 样式（rt 字号为正文的 50%）
3. 处理竖排模式下的 Ruby 位置
4. 兼容不同的 Ruby 标记方式
```

---

### 阶段五：分页与导航系统（预计 3-4 天）

#### 5.1 分页引擎 (Paginator.ts)

```
分页策略：CSS Multi-Column

原理：
1. 将 iframe 内容区设置为 CSS 多列布局
2. column-width = 阅读区域宽度
3. column-gap = 页间距
4. 通过 scrollLeft 控制当前页
5. 计算总列数 = 总页数

核心代码思路：
iframe.contentDocument.body.style.cssText = `
  column-width: ${pageWidth}px;
  column-gap: ${gap}px;
  height: ${pageHeight}px;
  overflow: hidden;
`;

翻页 = 调整 scrollLeft 偏移量

优势：
- 浏览器原生排版，精确度高
- 自动处理文字断行、图片跨页
- 性能好，不需要手动计算文字位置
```

#### 5.2 翻页交互
```
支持的翻页方式：
1. 点击翻页：左侧区域上一页，右侧区域下一页
2. 键盘翻页：← → 方向键，Space/Backspace
3. 滚轮翻页：鼠标滚轮上下翻页
4. 触控翻页：左右滑动手势（如果在触屏设备）

翻页动画：
- 水平滑动过渡（默认）
- 无动画（可选）
- 动画时长可配置
```

#### 5.3 章节导航
```
功能：
1. 目录侧栏（TocSidebar.vue）
   - 树形目录结构
   - 当前章节高亮
   - 点击跳转
   - 支持搜索过滤

2. 进度条导航（ProgressBar.vue）
   - 显示全书阅读进度百分比
   - 拖拽跳转到指定位置
   - 显示当前章节名称

3. 章节间导航
   - 当前章节读完自动进入下一章
   - 支持跨章节翻页
```

#### 5.4 滚动模式 (ScrollMode.ts)
```
作为分页模式的替代方案：
1. 单章节连续滚动
2. 全书连续滚动（懒加载章节）
3. 滚动位置记忆
4. 平滑滚动动画
```

---

### 阶段六：书架与数据管理（预计 2-3 天）

#### 6.1 书架页面 (Bookshelf/index.vue)
```
功能：
1. 网格/列表视图切换
2. 封面缩略图展示
3. 书籍信息（书名、作者、阅读进度）
4. 导入书籍（文件选择 / 拖拽导入）
5. 删除书籍
6. 排序（最近阅读 / 书名 / 作者 / 导入时间）
7. 搜索过滤
```

#### 6.2 数据持久化 (stores/ + storage.ts)
```
使用 uTools 的 db API 进行数据持久化：

存储结构：
1. books_index          - 书籍索引列表
2. book_{id}_meta       - 单本书元数据
3. book_{id}_progress   - 阅读进度
4. book_{id}_data       - EPUB 解析后的数据缓存
5. settings             - 用户设置

阅读进度数据：
{
  bookId: string,
  spineIndex: number,       // 当前章节在 spine 中的索引
  pageInChapter: number,    // 章节内页码
  totalPagesInChapter: number,
  percentage: number,       // 全书进度百分比
  lastReadTime: number,     // 最后阅读时间戳
  cfi?: string              // EPUB CFI 定位（可选，精确定位）
}
```

#### 6.3 书籍导入流程
```
1. 用户选择/拖拽 .epub 文件
2. 计算文件 hash（去重检查）
3. 将 EPUB 文件复制到 uTools 数据目录
4. 解析元数据和封面
5. 生成封面缩略图
6. 写入书籍索引
7. 跳转到阅读页（可选）
```

---

### 阶段七：阅读设置与主题（预计 2 天）

#### 7.1 设置面板 (SettingsPanel.vue)
```
可配置项：
1. 字体选择
   - 系统字体列表（宋体、黑体、楷体、仿宋等）
   - EPUB 嵌入字体
   - 自定义字体导入

2. 字号调节
   - 范围：12px - 36px
   - 步进：2px
   - 实时预览

3. 行间距
   - 范围：1.2 - 3.0
   - 步进：0.1

4. 页边距
   - 上下左右独立调节
   - 预设方案（紧凑/标准/宽松）

5. 阅读主题
   - 白天模式（白底黑字）
   - 护眼模式（米黄底深棕字 — 多看经典配色）
   - 夜间模式（深色底浅色字）
   - 自定义背景色和文字色

6. 翻页模式
   - 分页模式（默认）
   - 滚动模式

7. 翻页动画
   - 滑动 / 无动画
```

#### 7.2 主题系统 (useTheme.ts)
```typescript
// 预设主题
const themes = {
  light: {
    name: '白天',
    background: '#FFFFFF',
    color: '#333333',
    selectionBg: '#B4D5FE',
  },
  sepia: {
    name: '护眼',          // 多看经典护眼色
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
};
```

---

### 阶段八：UI 交互细节打磨（预计 2-3 天）

#### 8.1 阅读器 UI 布局
```
┌──────────────────────────────────────┐
│  ← 书名                    ⋮ 更多   │  ← ReaderToolbar（点击中央区域显示/隐藏）
├──────────────────────────────────────┤
│                                      │
│                                      │
│          EPUB 内容渲染区              │  ← ReaderContent (iframe)
│          (点击左/右翻页)              │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  第3章 ──●─────── 45%    🌙 Aa 目录  │  ← ReaderFootbar（点击中央区域显示/隐藏）
└──────────────────────────────────────┘
```

#### 8.2 手势与快捷键 (useGesture.ts)
```
键盘快捷键：
- ← / → : 上一页 / 下一页
- ↑ / ↓ : 上一页 / 下一页（滚动模式下滚动）
- Space : 下一页
- Backspace : 上一页
- Home : 跳到章节开头
- End : 跳到章节末尾
- Ctrl+← : 上一章
- Ctrl+→ : 下一章
- Ctrl+G : 打开目录
- Escape : 关闭弹窗/侧栏/返回书架
- F11 : 全屏切换

鼠标操作：
- 点击左 1/3 区域：上一页
- 点击右 1/3 区域：下一页
- 点击中间 1/3 区域：显示/隐藏工具栏
- 滚轮：翻页（分页模式）或滚动（滚动模式）
```

#### 8.3 过渡动画
```
- 翻页滑动动画（CSS transform + transition）
- 工具栏显示/隐藏（淡入淡出 + 滑动）
- 目录侧栏（从左侧滑入）
- 设置面板（从底部滑入）
- 脚注弹窗（从底部滑入 + 背景遮罩淡入）
- 页面切换（书架 ↔ 阅读器）
```

---

### 阶段九：性能优化（预计 1-2 天）

#### 9.1 优化策略
```
1. 章节预加载
   - 预解析当前章节的前后各 1 章
   - 预加载图片和字体资源
   - 使用 Web Worker 进行后台解析

2. 资源缓存
   - 已解析的章节 HTML 缓存
   - 字体 Blob URL 缓存（全书共享）
   - 图片 Blob URL 缓存
   - 分页结果缓存（窗口尺寸不变时复用）

3. 内存管理
   - 及时释放非当前章节的 Blob URL
   - 限制同时缓存的章节数量
   - 大型 EPUB（>100MB）的流式处理

4. 渲染优化
   - 虚拟化长目录列表
   - 图片懒加载
   - 防抖处理窗口 resize 事件
   - requestAnimationFrame 翻页动画
```

---

## 四、技术要点与风险

### 4.1 关键技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| EPUB 解析 | 自研（JSZip + fast-xml-parser） | 可精确控制多看特性 |
| 内容渲染 | iframe sandbox | CSS 隔离，接近真实渲染 |
| 分页方案 | CSS Multi-Column | 浏览器原生排版，精确可靠 |
| 状态管理 | Pinia | 项目已集成，Vue 3 官方推荐 |
| 数据持久化 | uTools db API | 平台原生能力，无需额外依赖 |
| UI 组件 | Element Plus + 自定义 | 项目已集成，按需补充 |

### 4.2 风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| EPUB 格式多样性 | 部分书籍解析失败 | 渐进式兼容，错误降级处理 |
| iframe 跨域限制 | 资源加载受阻 | 所有资源转 Blob URL |
| CJK 排版精度 | 与多看效果有差异 | 持续对比调优，CSS 精细控制 |
| 大文件性能 | 加载缓慢 | 流式解析 + 懒加载 + 缓存 |
| 字体加载慢 | 初始渲染闪烁 | 字体预加载 + FOUT 处理 |
| uTools 窗口尺寸限制 | 阅读区域小 | 自适应布局 + 全屏模式 |

---

## 五、实施优先级与里程碑

```
里程碑 1（第 1 周）：能打开并显示 EPUB
  ✓ 基础设施搭建
  ✓ EPUB 解析引擎
  ✓ 基础内容渲染（无分页，滚动查看）

里程碑 2（第 2 周）：基本可用的阅读器
  ✓ 分页引擎
  ✓ 章节导航与目录
  ✓ 嵌入字体加载
  ✓ 图片正确显示

里程碑 3（第 3 周）：多看体验还原
  ✓ 弹出式脚注
  ✓ CJK 排版优化
  ✓ 阅读主题与设置
  ✓ 竖排文字支持

里程碑 4（第 4 周）：完整产品
  ✓ 书架管理
  ✓ 阅读进度记忆
  ✓ 性能优化
  ✓ UI 细节打磨
  ✓ 测试与修复
```

---

## 六、测试策略

```
1. 单元测试
   - EPUB 解析器各模块
   - CSS 处理器
   - 脚注识别逻辑

2. 集成测试
   - 完整 EPUB 加载流程
   - 分页计算准确性
   - 章节切换

3. 兼容性测试（使用多看精排书籍）
   - 纯文字小说
   - 带大量脚注的学术书籍
   - 图文混排书籍
   - 竖排古籍
   - 带 Ruby 注音的书籍
   - 多种 CSS 样式的书籍

4. 性能测试
   - 大型 EPUB（>50MB）加载时间
   - 翻页流畅度（目标 <16ms/帧）
   - 内存占用监控
```

---

## 七、总结

本计划将现有 uTools 插件模板改造为一个完整的多看适配 EPUB 阅读器，核心工作量集中在 EPUB 解析引擎和内容渲染引擎两个模块。通过自研解析和渲染层（而非使用现成 EPUB 库），可以精确控制多看特有的排版特性，包括弹出式脚注、CJK 标点挤压、嵌入字体等。

预计总工期：3-4 周（一人全职开发），建议按里程碑顺序推进，每个里程碑结束后进行阶段性测试和调优。
