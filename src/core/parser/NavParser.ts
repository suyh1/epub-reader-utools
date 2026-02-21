/** Nav (nav.xhtml) 解析器 — EPUB 3 目录 */
import type { TocItem } from '@/types/epub'

/**
 * 从 nav.xhtml 的 HTML 字符串中解析目录
 * 使用 DOMParser 解析 XHTML，提取 <nav epub:type="toc"> 中的列表结构
 */
export function parseNav(navHtml: string): TocItem[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(navHtml, 'application/xhtml+xml')

  // 查找 <nav epub:type="toc">
  let navEl: Element | null = null
  const navElements = doc.querySelectorAll('nav')
  for (const nav of navElements) {
    const epubType = nav.getAttribute('epub:type') || nav.getAttributeNS('http://www.idpf.org/2007/ops', 'type')
    if (epubType === 'toc') {
      navEl = nav
      break
    }
  }

  // 回退：取第一个 nav
  if (!navEl && navElements.length > 0) {
    navEl = navElements[0]
  }

  if (!navEl) return []

  // 解析 <ol> 列表
  const ol = navEl.querySelector('ol')
  if (!ol) return []

  return parseOlItems(ol, 0)
}

function parseOlItems(ol: Element, level: number): TocItem[] {
  const items: TocItem[] = []
  const lis = ol.children

  for (let i = 0; i < lis.length; i++) {
    const li = lis[i]
    if (li.tagName.toLowerCase() !== 'li') continue

    const a = li.querySelector(':scope > a, :scope > span > a')
    if (!a) continue

    const label = (a.textContent || '').trim()
    const href = a.getAttribute('href') || ''
    const id = `nav-${level}-${i}`

    // 递归子列表
    const childOl = li.querySelector(':scope > ol')
    const children = childOl ? parseOlItems(childOl, level + 1) : []

    items.push({ id, label, href, children, level })
  }

  return items
}
