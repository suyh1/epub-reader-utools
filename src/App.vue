<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useBookshelfStore } from '@/stores/bookshelf'
import type { BookRecord } from '@/types/book'
import Bookshelf from '@/views/Bookshelf/index.vue'
import Reader from '@/views/Reader/index.vue'

type Route = 'bookshelf' | 'reader'

const route = ref<Route>('bookshelf')
const currentFilePath = ref('')
const bookshelfStore = useBookshelfStore()

onMounted(() => {
  bookshelfStore.loadBooks()

  // uTools 插件入口
  if (window.utools) {
    window.utools.onPluginEnter((action) => {
      if (action.code === 'open-epub' && action.type === 'files') {
        // 从文件打开
        const files = action.payload as { path: string }[]
        if (files.length > 0) {
          currentFilePath.value = files[0].path
          route.value = 'reader'
        }
      } else {
        // 打开书架
        route.value = 'bookshelf'
      }
    })

    window.utools.onPluginOut(() => {
      // 插件退出时不重置路由，保持状态
    })
  }
})

function handleOpenFile(filePath: string): void {
  currentFilePath.value = filePath
  route.value = 'reader'
}

function handleOpenBook(record: BookRecord): void {
  // 优先从数据目录读取
  const dataDir = window.services?.getDataDir?.() || ''
  const dataPath = `${dataDir}/${record.id}.epub`
  const filePath = window.services?.fileExists?.(dataPath) ? dataPath : record.filePath
  currentFilePath.value = filePath
  route.value = 'reader'
}

function handleBackToShelf(): void {
  route.value = 'bookshelf'
  bookshelfStore.loadBooks() // 刷新书架
}
</script>

<template>
  <div id="epub-app">
    <Bookshelf
      v-if="route === 'bookshelf'"
      @open-file="handleOpenFile"
      @open-book="handleOpenBook"
    />
    <Reader
      v-else-if="route === 'reader'"
      :file-path="currentFilePath"
      @back="handleBackToShelf"
    />
  </div>
</template>

<style>
#epub-app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
