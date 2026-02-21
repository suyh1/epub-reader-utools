/** OPF (content.opf) 解析器 */
import type { EpubMetadata, SpineItem, Resource } from '@/types/epub'
import { parseXmlNoNS, ensureArray, getTextContent } from '@/utils/xml'

export interface OpfResult {
  metadata: EpubMetadata
  manifest: Map<string, Resource>
  spine: SpineItem[]
  pageDirection: 'ltr' | 'rtl'
  /** NCX 文件的 href */
  ncxHref?: string
  /** EPUB 3 nav 文件的 href */
  navHref?: string
}

export function parseOpf(opfXml: string, basePath: string): OpfResult {
  const parsed = parseXmlNoNS(opfXml)
  const pkg = parsed.package || parsed.Package

  // 解析 metadata
  const metadata = parseMetadata(pkg.metadata || pkg.Metadata || {})

  // 解析 manifest
  const { manifest, ncxHref, navHref, coverHref } = parseManifest(
    pkg.manifest || pkg.Manifest || {},
    basePath,
  )

  // 设置封面：多策略查找
  metadata.coverHref = resolveCoverHref(metadata.coverHref, coverHref, manifest)

  // 解析 spine
  const spine = parseSpine(pkg.spine || pkg.Spine || {}, manifest)

  // 页面方向
  const spineNode = pkg.spine || pkg.Spine || {}
  const pageDirection = (spineNode['@_page-progression-direction'] || 'ltr') as 'ltr' | 'rtl'

  return { metadata, manifest, spine, pageDirection, ncxHref, navHref }
}

function parseMetadata(meta: any): EpubMetadata {
  const result: EpubMetadata = {
    title: '',
    creator: '',
    language: 'zh',
  }

  // dc:title / title
  const title = meta.title || meta['dc:title']
  result.title = extractDcValue(title) || '未知书名'

  // dc:creator / creator
  const creator = meta.creator || meta['dc:creator']
  result.creator = extractDcValue(creator) || '未知作者'

  // dc:language / language
  const lang = meta.language || meta['dc:language']
  result.language = extractDcValue(lang) || 'zh'

  // dc:publisher
  const publisher = meta.publisher || meta['dc:publisher']
  if (publisher) result.publisher = extractDcValue(publisher)

  // dc:date
  const date = meta.date || meta['dc:date']
  if (date) result.date = extractDcValue(date)

  // dc:description
  const desc = meta.description || meta['dc:description']
  if (desc) result.description = extractDcValue(desc)

  // dc:subject
  const subjects = meta.subject || meta['dc:subject']
  if (subjects) {
    result.subjects = ensureArray(subjects).map(extractDcValue).filter(Boolean) as string[]
  }

  // 从 meta 标签中查找封面
  const metas = ensureArray(meta.meta)
  for (const m of metas) {
    if (m?.['@_name'] === 'cover') {
      result.coverHref = m['@_content']
      break
    }
  }

  return result
}

function extractDcValue(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return extractDcValue(node[0])
  return getTextContent(node)
}

function parseManifest(
  manifestNode: any,
  basePath: string,
): {
  manifest: Map<string, Resource>
  ncxHref?: string
  navHref?: string
  coverHref?: string
} {
  const manifest = new Map<string, Resource>()
  let ncxHref: string | undefined
  let navHref: string | undefined
  let coverHref: string | undefined

  const items = ensureArray(manifestNode.item)

  for (const item of items) {
    if (!item?.['@_id']) continue

    const id = item['@_id']
    const href = item['@_href'] || ''
    const mediaType = item['@_media-type'] || ''
    const properties = item['@_properties'] || ''
    const fullPath = basePath ? `${basePath}/${href}` : href

    manifest.set(id, { id, href, mediaType, fullPath })

    // 识别 NCX
    if (mediaType === 'application/x-dtbncx+xml') {
      ncxHref = href
    }

    // 识别 EPUB 3 nav
    if (properties.includes('nav')) {
      navHref = href
    }

    // 识别封面图片
    if (properties.includes('cover-image')) {
      coverHref = href
    }
  }

  return { manifest, ncxHref, navHref, coverHref }
}

function parseSpine(spineNode: any, manifest: Map<string, Resource>): SpineItem[] {
  const items = ensureArray(spineNode.itemref)
  const spine: SpineItem[] = []

  items.forEach((item, index) => {
    if (!item?.['@_idref']) return

    const idref = item['@_idref']
    const resource = manifest.get(idref)
    if (!resource) return

    spine.push({
      id: idref,
      href: resource.href,
      mediaType: resource.mediaType,
      linear: item['@_linear'] !== 'no',
      index,
    })
  })

  return spine
}

/**
 * 多策略解析封面图片 href
 * 1. EPUB 3: manifest 中 properties="cover-image" 的项
 * 2. EPUB 2: <meta name="cover" content="id"> 指向的 manifest 图片资源
 * 3. 回退: manifest 中 id/href 包含 "cover" 的图片资源
 */
function resolveCoverHref(
  metaCoverId: string | undefined,
  manifestCoverHref: string | undefined,
  manifest: Map<string, Resource>,
): string | undefined {
  // 策略 1: EPUB 3 properties="cover-image"（已在 parseManifest 中识别）
  if (manifestCoverHref) {
    return manifestCoverHref
  }

  // 策略 2: <meta name="cover"> 指向的 manifest id
  if (metaCoverId) {
    // metaCoverId 可能是 manifest id
    const resource = manifest.get(metaCoverId)
    if (resource && resource.mediaType.startsWith('image/')) {
      return resource.href
    }
    // 也可能直接就是 href（少数情况）
    for (const res of manifest.values()) {
      if (res.href === metaCoverId && res.mediaType.startsWith('image/')) {
        return res.href
      }
    }
  }

  // 策略 3: 按 id/href 名称猜测
  for (const res of manifest.values()) {
    if (!res.mediaType.startsWith('image/')) continue
    const idLower = res.id.toLowerCase()
    const hrefLower = res.href.toLowerCase()
    if (
      idLower === 'cover' ||
      idLower === 'cover-image' ||
      idLower === 'coverimage' ||
      idLower.startsWith('cover.') ||
      hrefLower.includes('cover.')
    ) {
      return res.href
    }
  }

  return undefined
}
