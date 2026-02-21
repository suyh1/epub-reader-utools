/** XML 解析工具 - 基于 fast-xml-parser */
import { XMLParser } from 'fast-xml-parser'

const defaultOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseAttributeValue: false,
  // 保留命名空间前缀
  removeNSPrefix: false,
}

/** 解析 XML 字符串为 JS 对象 */
export function parseXml(xml: string, options?: Partial<typeof defaultOptions>): any {
  const parser = new XMLParser({ ...defaultOptions, ...options })
  return parser.parse(xml)
}

/** 解析 XML，移除命名空间前缀（简化访问） */
export function parseXmlNoNS(xml: string): any {
  const parser = new XMLParser({ ...defaultOptions, removeNSPrefix: true })
  return parser.parse(xml)
}

/** 确保值为数组 */
export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/** 获取嵌套属性值，支持多种命名空间前缀 */
export function getTextContent(node: any): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (node && typeof node === 'object') {
    if (node['#text'] !== undefined) return String(node['#text'])
  }
  return ''
}
