/** ZIP 解压封装 - 基于 JSZip */
import JSZip from 'jszip'

export class ZipReader {
  private zip: JSZip | null = null
  /** 小写路径 -> 实际路径 的索引（加载时一次性构建） */
  private caseIndex: Map<string, string> = new Map()

  async load(data: ArrayBuffer): Promise<void> {
    this.zip = await JSZip.loadAsync(data)
    // 构建大小写不敏感索引
    this.caseIndex.clear()
    this.zip.forEach((relativePath, file) => {
      if (!file.dir) {
        this.caseIndex.set(relativePath.toLowerCase(), relativePath)
      }
    })
  }

  /** 读取文本文件 */
  async readText(path: string): Promise<string> {
    const file = this.getFile(path)
    return file.async('text')
  }

  /** 读取二进制文件 */
  async readBinary(path: string): Promise<ArrayBuffer> {
    const file = this.getFile(path)
    return file.async('arraybuffer')
  }

  /** 读取为 base64 */
  async readBase64(path: string): Promise<string> {
    const file = this.getFile(path)
    return file.async('base64')
  }

  /** 获取所有文件路径 */
  listFiles(): string[] {
    return Array.from(this.caseIndex.values())
  }

  /** 检查文件是否存在 */
  hasFile(path: string): boolean {
    if (!this.zip) return false
    if (this.zip.file(path) !== null) return true
    return this.caseIndex.has(path.toLowerCase())
  }

  private getFile(path: string): JSZip.JSZipObject {
    if (!this.zip) throw new Error('ZIP not loaded')
    // 精确匹配
    let file = this.zip.file(path)
    if (!file) {
      // O(1) 大小写不敏感查找
      const realPath = this.caseIndex.get(path.toLowerCase())
      if (realPath) file = this.zip.file(realPath)
    }
    if (!file) throw new Error(`File not found in EPUB: ${path}`)
    return file
  }

  destroy(): void {
    this.zip = null
    this.caseIndex.clear()
  }
}
