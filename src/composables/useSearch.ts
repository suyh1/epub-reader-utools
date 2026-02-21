/** 文内搜索 composable */
import { ref } from 'vue'
import type { EpubParser } from '@/core/parser/EpubParser'
import type { EpubBook } from '@/types/epub'

export interface SearchResult {
  spineIndex: number
  chapterTitle: string
  /** 匹配文本的上下文片段 */
  snippet: string
  /** 关键词在 snippet 中的起始位置 */
  matchStart: number
}

export function useSearch() {
  const results = ref<SearchResult[]>([])
  const searching = ref(false)
  const query = ref('')

  /**
   * 在全书中搜索关键词
   * 逐章读取纯文本进行匹配，避免一次性加载全部内容
   */
  async function search(
    keyword: string,
    parser: EpubParser,
    book: EpubBook,
  ): Promise<void> {
    const q = keyword.trim()
    if (!q) {
      results.value = []
      return
    }

    query.value = q
    searching.value = true
    results.value = []

    const lowerQ = q.toLowerCase()
    const contextLen = 40 // 上下文字符数

    try {
      for (let i = 0; i < book.spine.length; i++) {
        const chapter = await parser.readChapter(i)
        // 提取纯文本
        const text = stripHtml(chapter.rawHtml)
        const lowerText = text.toLowerCase()

        let pos = 0
        while ((pos = lowerText.indexOf(lowerQ, pos)) !== -1) {
          const start = Math.max(0, pos - contextLen)
          const end = Math.min(text.length, pos + q.length + contextLen)
          const snippet = (start > 0 ? '…' : '') +
            text.slice(start, end) +
            (end < text.length ? '…' : '')

          results.value.push({
            spineIndex: i,
            chapterTitle: findChapterTitle(book, i),
            snippet,
            matchStart: pos - start + (start > 0 ? 1 : 0),
          })

          pos += q.length

          // 每章最多 10 条结果
          if (results.value.filter(r => r.spineIndex === i).length >= 10) break
        }
      }
    } finally {
      searching.value = false
    }
  }

  function clear(): void {
    results.value = []
    query.value = ''
  }

  return { results, searching, query, search, clear }
}

function stripHtml(html: string): string {
  // 提取 body 内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const content = bodyMatch ? bodyMatch[1] : html
  // 移除标签，保留文本
  return content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function findChapterTitle(book: EpubBook, spineIndex: number): string {
  const spineItem = book.spine[spineIndex]
  if (!spineItem) return `第 ${spineIndex + 1} 章`

  function walk(items: typeof book.toc): string | null {
    for (const item of items) {
      const tocHref = item.href.split('#')[0]
      const fileName = tocHref.split('/').pop() || ''
      const spineFileName = spineItem.href.split('/').pop() || ''
      if (fileName === spineFileName) return item.label
      if (item.children.length > 0) {
        const found = walk(item.children)
        if (found) return found
      }
    }
    return null
  }

  return walk(book.toc) || `第 ${spineIndex + 1} 章`
}
