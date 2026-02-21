<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { TocItem } from '@/types/epub'

const props = defineProps<{
  toc: TocItem[]
  currentHref: string
}>()

const emit = defineEmits<{
  (e: 'select', href: string): void
  (e: 'close'): void
}>()

const searchQuery = ref('')

const filteredToc = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.toc
  return filterTocItems(props.toc, q)
})

function filterTocItems(items: TocItem[], query: string): TocItem[] {
  const result: TocItem[] = []
  for (const item of items) {
    const matchSelf = item.label.toLowerCase().includes(query)
    const matchedChildren = filterTocItems(item.children, query)
    if (matchSelf || matchedChildren.length > 0) {
      result.push({
        ...item,
        children: matchSelf ? item.children : matchedChildren,
      })
    }
  }
  return result
}

function isActive(href: string): boolean {
  const hrefPath = href.split('#')[0]
  return props.currentHref === hrefPath || props.currentHref.endsWith(hrefPath)
}

function handleSelect(href: string): void {
  emit('select', href)
}

function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as Element).classList.contains('toc-overlay')) {
    emit('close')
  }
}
</script>

<template>
  <div class="toc-overlay" @click="handleOverlayClick">
    <aside class="toc-sidebar">
      <header class="toc-header">
        <h2>目录</h2>
        <button class="close-btn" @click="emit('close')">✕</button>
      </header>

      <div class="toc-search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索目录..."
          class="toc-search-input"
        />
      </div>

      <nav class="toc-list">
        <template v-for="item in filteredToc" :key="item.id">
          <TocNode
            :item="item"
            :current-href="currentHref"
            @select="handleSelect"
          />
        </template>
      </nav>
    </aside>
  </div>
</template>

<script lang="ts">
import { defineComponent, h, type VNode } from 'vue'

/** 递归目录节点组件 */
const TocNode: ReturnType<typeof defineComponent> = defineComponent({
  name: 'TocNode',
  props: {
    item: { type: Object as () => TocItem, required: true },
    currentHref: { type: String, default: '' },
  },
  emits: ['select'],
  setup(props, { emit }): () => VNode {
    function isActive(href: string): boolean {
      const hrefPath = href.split('#')[0]
      return props.currentHref === hrefPath || props.currentHref.endsWith(hrefPath)
    }

    return (): VNode => {
      const children: VNode[] = []

      children.push(
        h(
          'div',
          {
            class: ['toc-item', { active: isActive(props.item.href) }],
            style: { paddingLeft: `${16 + props.item.level * 20}px` },
            onClick: () => emit('select', props.item.href),
          },
          props.item.label,
        ),
      )

      if (props.item.children.length > 0) {
        for (const child of props.item.children) {
          children.push(
            h(TocNode, {
              item: child,
              currentHref: props.currentHref,
              onSelect: (href: string) => emit('select', href),
            }),
          )
        }
      }

      return h('div', children)
    }
  },
})
</script>

<style lang="less" scoped>
.toc-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.4);
}

.toc-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  max-width: 80%;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  animation: slideInLeft 0.25s ease;
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: #333;
  }
}

.toc-search {
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
}

.toc-search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #8b7355;
  }
}

.toc-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

:deep(.toc-item) {
  padding: 8px 16px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  line-height: 1.5;
  transition: background 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: #f5f0e8;
  }

  &.active {
    color: #8b7355;
    font-weight: 600;
    background: #f5f0e8;
  }
}
</style>
