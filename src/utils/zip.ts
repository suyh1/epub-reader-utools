/** ZIP 解压封装 - 基于 JSZip */
import JSZip from 'jszip'

export class ZipReader {
  private zip: JSZip | null = null

  async load(data: ArrayBuffer): Promise<void> {
    this.zip = await JSZip.loadAsync(data)
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
    if (!this.zip) throw new Error('ZIP not loaded')
    const files: string[] = []
    this.zip.forEach((relativePath, file) => {
      if (!file.dir) files.push(relativePath)
    })
    return files
  }

  /** 检查文件是否存在 */
  hasFile(path: string): boolean {
    if (!this.zip) return false
    return this.zip.file(path) !== null
  }

  private getFile(path: string): JSZip.JSZipObject {
    if (!this.zip) throw new Error('ZIP not loaded')
    // 尝试精确匹配
    let file = this.zip.file(path)
    if (!file) {
      // 尝试不区分大小写匹配
      const normalizedPath = path.toLowerCase()
      this.zip.forEach((relativePath, f) => {
        if (relativePath.toLowerCase() === normalizedPath && !f.dir) {
          file = f
        }
      })
    }
    if (!file) throw new Error(`File not found in EPUB: ${path}`)
    return file
  }

  destroy(): void {
    this.zip = null
  }
}
