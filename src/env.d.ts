/// <reference types="vite/client" />
/// <reference types="utools-api-types" />

interface Services {
  readBinaryFile(filePath: string): ArrayBuffer
  readFile(file: string): string
  fileHash(filePath: string): string
  fileSize(filePath: string): number
  fileExists(filePath: string): boolean
  copyToDataDir(srcPath: string, destName: string): string
  deleteFromDataDir(filename: string): void
  getDataDir(): string
}

declare interface Window {
  services: Services
}
