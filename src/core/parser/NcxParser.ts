/** NCX (toc.ncx) 解析器 — EPUB 2 目录 */
import type { TocItem } from '@/types/epub'
import { parseXmlNoNS, ensureArray, getTextContent } from '@/utils/xml'

export function parseNcx(ncxXml: string): TocItem[] {
  const parsed = parseXmlNoNS(ncxXml)
  const ncx = parsed.ncx || parsed.NCX || {}
  const navMap = ncx.navMap || ncx.NavMap || {}
  const navPoints = ensureArray(navMap.navPoint || navMap.NavPoint)

  return parseNavPoints(navPoints, 0)
}

function parseNavPoints(navPoints: any[], level: number): TocItem[] {
  const items: TocItem[] = []

  for (const np of navPoints) {
    if (!np) continue

    const label = getNavLabel(np)
    const href = getContentSrc(np)
    const id = np['@_id'] || `toc-${items.length}`

    // 递归解析子节点
    const childPoints = ensureArray(np.navPoint || np.NavPoint)
    const children = childPoints.length > 0 ? parseNavPoints(childPoints, level + 1) : []

    items.push({ id, label, href, children, level })
  }

  return items
}

function getNavLabel(navPoint: any): string {
  const navLabel = navPoint.navLabel || navPoint.NavLabel
  if (!navLabel) return ''
  const text = navLabel.text || navLabel.Text
  return getTextContent(text) || ''
}

function getContentSrc(navPoint: any): string {
  const content = navPoint.content || navPoint.Content
  if (!content) return ''
  return content['@_src'] || ''
}
