<script lang="ts" setup>
import { ref, watch } from 'vue'
import { X, Search, Loader2 } from 'lucide-vue-next'
import { useSearch, type SearchResult } from '@/composables/useSearch'
import type { EpubParser } from '@/core/parser/EpubParser'
import type { EpubBook } from '@/types/epub'

const props = defineProps<{
  parser: EpubParser
  book: EpubBook
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', spineIndex: number): void
}>()

const { results, searching, query, search, clear } = useSearch()
const inputRef = ref<HTMLInputElement>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleInput(val: string): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    search(val, props.parser, props.book)
  }, 400)
}

function handleSelect(result: SearchResult): void {
  emit('select', result.spineIndex)
}

function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as Element).classList.contains('search-overlay')) {
    emit('close')
  }
}
</script>

<template>
  <div class="search-overlay" @click="handleOverlayClick">
    <div class="search-panel" role="dialog" aria-label="文内搜索">
      <header class="search-header">
        <div class="search-input-wrap">
          <Search :size="15" class="search-icon" />
          <input
            ref="inputRef"
            :value="query"
            type="text"
            class="search-input"
            placeholder="搜索书中内容..."
            autofocus
            aria-label="搜索关键词"
            @input="handleInput(($event.target as HTMLInputElement).value)"
          />
          <Loader2 v-if="searching" :size="15" class="search-spinner" />
        </div>
        <button class="close-btn" @click="emit('close')" aria-label="关闭搜索">
          <X :size="18" />
        </button>
      </header>

      <div class="search-results" role="list">
        <div v-if="results.length === 0 && query && !searching" class="search-empty">
          未找到相关内容
        </div>
        <button
          v-for="(r, i) in results"
          :key="i"
          class="result-item"
          role="listitem"
          @click="handleSelect(r)"
        >
          <span class="result-chapter">{{ r.chapterTitle }}</span>
          <span class="result-snippet">{{ r.snippet }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.search-overlay {
  position: absolute;
  inset: 0;
  z-index: 65;
  background: var(--overlay);
  display: flex;
  flex-direction: column;
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.search-panel {
  width: 100%;
  height: 100%;
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-spinner {
  position: absolute;
  right: 10px;
  color: var(--primary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-input {
  width: 100%;
  padding: 9px 36px 9px 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--bg);
  color: var(--text-primary);
  transition: all var(--duration-fast);

  &::placeholder { color: var(--text-tertiary); }
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.search-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  width: 100%;
  transition: background var(--duration-fast);
  cursor: pointer;

  &:hover {
    background: var(--bg-hover);
  }

  &:last-child {
    border-bottom: none;
  }
}

.result-chapter {
  font-size: 11px;
  color: var(--primary);
  font-weight: 500;
}

.result-snippet {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
