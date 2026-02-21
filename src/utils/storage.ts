/** 本地存储封装 - 使用 uTools db API */

const DB_PREFIX = 'epub_reader_'

function dbKey(key: string): string {
  return DB_PREFIX + key
}

/** 检测是否在 uTools 环境中 */
function isUTools(): boolean {
  return typeof window !== 'undefined' && !!window.utools && !!window.utools.dbStorage
}

/** 确保数据可序列化（移除 Map、Set 等不可克隆对象） */
function toSerializable(data: any): any {
  return JSON.parse(JSON.stringify(data))
}

export const storage = {
  /** 保存数据 */
  set<T>(key: string, data: T): void {
    const fullKey = dbKey(key)
    try {
      const safeData = toSerializable(data)
      if (isUTools()) {
        window.utools.dbStorage.setItem(fullKey, safeData)
      } else {
        localStorage.setItem(fullKey, JSON.stringify(safeData))
      }
    } catch (e) {
      console.warn('storage.set failed:', key, e)
    }
  },

  /** 读取数据 */
  get<T>(key: string, defaultValue: T): T {
    const fullKey = dbKey(key)
    try {
      if (isUTools()) {
        const val = window.utools.dbStorage.getItem(fullKey)
        return val !== null && val !== undefined ? (val as T) : defaultValue
      } else {
        const raw = localStorage.getItem(fullKey)
        if (raw === null) return defaultValue
        return JSON.parse(raw) as T
      }
    } catch {
      return defaultValue
    }
  },

  /** 删除数据 */
  remove(key: string): void {
    const fullKey = dbKey(key)
    try {
      if (isUTools()) {
        window.utools.dbStorage.removeItem(fullKey)
      } else {
        localStorage.removeItem(fullKey)
      }
    } catch (e) {
      console.warn('storage.remove failed:', key, e)
    }
  },
}
