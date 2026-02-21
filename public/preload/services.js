const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

window.services = {
  /** 读取二进制文件，返回 ArrayBuffer */
  readBinaryFile(filePath) {
    const buffer = fs.readFileSync(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  },

  /** 读取文本文件 */
  readFile(file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },

  /** 计算文件 MD5 hash */
  fileHash(filePath) {
    const buffer = fs.readFileSync(filePath)
    return crypto.createHash('md5').update(buffer).digest('hex').substring(0, 12)
  },

  /** 获取文件大小 (bytes) */
  fileSize(filePath) {
    const stat = fs.statSync(filePath)
    return stat.size
  },

  /** 检查文件是否存在 */
  fileExists(filePath) {
    return fs.existsSync(filePath)
  },

  /** 复制文件到 uTools 数据目录 */
  copyToDataDir(srcPath, destName) {
    const dataDir = path.join(window.utools.getPath('userData'), 'epub-reader-books')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    const destPath = path.join(dataDir, destName)
    fs.copyFileSync(srcPath, destPath)
    return destPath
  },

  /** 从数据目录删除文件 */
  deleteFromDataDir(filename) {
    const dataDir = path.join(window.utools.getPath('userData'), 'epub-reader-books')
    const filePath = path.join(dataDir, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  },

  /** 获取数据目录路径 */
  getDataDir() {
    const dataDir = path.join(window.utools.getPath('userData'), 'epub-reader-books')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    return dataDir
  },
}
