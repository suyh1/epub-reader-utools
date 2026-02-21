<script lang="ts" setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { X, Search } from 'lucide-vue-next'
import type { TocItem, SpineItem } from '@/types/epub'

const props = defineProps<{
  toc: TocItem[]
  spine: SpineItem[]
  currentSpineIndex: number
}>()

const emit = defineEmits<{
  (e: 'select', href: string): void
  (e: 'close'): void
}>()

const searchQuery = ref('')
const tocListRef = ref<HTMLElement>()
const collapsedSet = ref<Set<string>>(new Set())

/**
 * 将 href 标准化为文件名（去掉 fragment 和路径前缀）
 */
function normalizeHref(href: string): string {
  const withoutFragment = href.split('#')[0]
  const parts = withoutFragment.split('/')
  return parts[parts.length - 1] || ''
}

/**
 * 构建 spine 文件名 -> spineIndex 的映射表
 */
function buildSpineMap(): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of props.spine) {
    const fileName = normalizeHref(item.href)
    if (!map.has(fileName)) {
      map.set(fileName, item.index)
    }
  }
  return map
}

const spineMap = buildSpineMap()

/** 获取 toc href 对应的 spine index，找不到返回 -1 */
function tocHrefToSpineIndex(tocHref: string): number {
  const fileName = normalizeHref(tocHref)
  return spineMap.get(fileName) ?? -1
}

/** 判断 toc item 是否是当前活跃项 */
function isActive(tocHref: string): boolean {
  return tocHrefToSpineIndex(tocHref) === props.currentSpineIndex
}

/**
 * 在 toc 树中找到当前章节对应的活跃 toc item id
 * 策略：找 spineIndex <= currentSpineIndex 的最大匹配项
 * 这样即使当前 spine 没有直接对应的 toc 项，也能高亮最近的上级章节
 */
function findActiveTocId(items: TocItem[]): string | null {
  let bestId: string | null = null
  let bestSpineIndex = -1

  function walk(list: TocItem[]): void {
    for (const item of list) {
      const si = tocHrefToSpineIndex(item.href)
      if (si >= 0 && si <= props.currentSpineIndex && si > bestSpineIndex) {
        bestSpineIndex = si
        bestId = item.id
      }
      if (item.children.length > 0) {
        walk(item.children)
      }
    }
  }

  walk(items)
  return bestId
}

const activeTocId = findActiveTocId(props.toc)

/**
 * 检查子树中是否包含 activeTocId
 */
function subtreeContainsActive(item: TocItem): boolean {
  if (item.id === activeTocId) return true
  return item.children.some(child => subtreeContainsActive(child))
}

/** 初始化折叠状态 */
function initCollapseState(items: TocItem[]): void {
  for (const item of items) {
    if (item.children.length > 0) {
      if (subtreeContainsActive(item)) {
        collapsedSet.value.delete(item.id)
      } else {
        collapsedSet.value.add(item.id)
      }
      initCollapseState(item.children)
    }
  }
}

initCollapseState(props.toc)

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

function handleSelect(href: string): void {
  emit('select', href)
}

function handleToggle(id: string): void {
  if (collapsedSet.value.has(id)) {
    collapsedSet.value.delete(id)
  } else {
    collapsedSet.value.add(id)
  }
}

function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as Element).classList.contains('toc-overlay')) {
    emit('close')
  }
}

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    const activeEl = tocListRef.value?.querySelector('.toc-item.active') as HTMLElement | null
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, 150)
})
</script>

<template>
  <transition name="toc-fade">
    <div class="toc-overlay" @click="handleOverlayClick">
      <transition name="toc-slide" appear>
        <aside class="toc-sidebar">
          <header class="toc-header">
            <h2>目录</h2>
            <button class="close-btn" @click="emit('close')">
              <X :size="18" />
            </button>
          </header>

          <div class="toc-search">
            <Search :size="14" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索章节..."
              class="toc-search-input"
            />
          </div>

          <nav ref="tocListRef" class="toc-list">
            <template v-for="item in filteredToc" :key="item.id">
              <TocNode
                :item="item"
                :active-toc-id="activeTocId"
                :collapsed-set="collapsedSet"
                :is-searching="searchQuery.trim().length > 0"
                @select="handleSelect"
                @toggle="handleToggle"
              />
            </template>
          </nav>
        </aside>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, h, type VNode, type PropType } from 'vue'

const TocNode: ReturnType<typeof defineComponent> = defineComponent({
  name: 'TocNode',
  props: {
    item: { type: Object as PropType<TocItem>, required: true },
    activeTocId: { type: String as PropType<string | null>, default: null },
    collapsedSet: { type: Object as PropType<Set<string>>, required: true },
    isSearching: { type: Boolean, default: false },
  },
  emits: ['select', 'toggle'],
  setup(props, { emit }): () => VNode {
    return (): VNode => {
      const children: VNode[] = []
      const hasChildren = props.item.children.length > 0
      const isCollapsed = props.collapsedSet.has(props.item.id)
      const showChildren = hasChildren && (props.isSearching || !isCollapsed)
      const active = props.item.id === props.activeTocId

      const rowChildren: VNode[] = []

      if (hasChildren) {
        rowChildren.push(
          h(
            'span',
            {
              class: ['toc-arrow', { collapsed: isCollapsed && !props.isSearching }],
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                emit('toggle', props.item.id)
              },
            },
            '›',
          ),
        )
      } else {
        rowChildren.push(h('span', { class: 'toc-dot' }))
      }

      rowChildren.push(h('span', { class: 'toc-label' }, props.item.label))

      if (hasChildren && isCollapsed && !props.isSearching) {
        rowChildren.push(
          h('span', { class: 'toc-count' }, `${props.item.children.length}`),
        )
      }

      children.push(
        h(
          'div',
          {
            class: ['toc-item', { active, parent: hasChildren }],
            style: { paddingLeft: `${14 + props.item.level * 18}px` },
            onClick: () => emit('select', props.item.href),
          },
          rowChildren,
        ),
      )

      if (showChildren) {
        children.push(
          h(
            'div',
            { class: 'toc-children' },
            props.item.children.map((child) =>
              h(TocNode, {
                item: child,
                activeTocId: props.activeTocId,
                collapsedSet: props.collapsedSet,
                isSearching: props.isSearching,
                onSelect: (href: string) => emit('select', href),
                onToggle: (id: string) => emit('toggle', id),
              }),
            ),
          ),
        )
      }

      return h('div', { class: 'toc-node' }, children)
    }
  },
})
</script>

<style lang="less" scoped>
.toc-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: var(--overlay);
}

.toc-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  max-width: 80%;
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast);

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

.toc-search {
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 28px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.toc-search-input {
  width: 100%;
  padding: 8px 12px 8px 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--bg);
  color: var(--text-primary);
  transition: all var(--duration-fast);

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
    background: var(--bg-elevated);
  }
}

.toc-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

:deep(.toc-node) {
  .toc-children {
    overflow: hidden;
  }
}

:deep(.toc-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1.5;
  transition: all var(--duration-fast);
  position: relative;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &.active {
    color: var(--primary);
    font-weight: 600;
    background: var(--primary-light);

    .toc-dot {
      background: var(--primary);
      transform: scale(1.3);
    }

    .toc-arrow {
      color: var(--primary);
    }
  }

  &.parent {
    font-weight: 500;
  }
}

:deep(.toc-arrow) {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-out);
  transform: rotate(90deg);
  border-radius: 3px;
  cursor: pointer;

  &:hover {
    background: var(--bg-active);
    color: var(--text-primary);
  }

  &.collapsed {
    transform: rotate(0deg);
  }
}

:deep(.toc-dot) {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
  margin: 0 6px;
  transition: all var(--duration-fast);
}

:deep(.toc-label) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

:deep(.toc-count) {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-hover);
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
  font-weight: 400;
}

.toc-slide-enter-active {
  transition: transform var(--duration-slow) var(--ease-out);
}
.toc-slide-leave-active {
  transition: transform var(--duration-normal) var(--ease-in-out);
}
.toc-slide-enter-from,
.toc-slide-leave-to {
  transform: translateX(-100%);
}

.toc-fade-enter-active,
.toc-fade-leave-active {
  transition: opacity var(--duration-normal);
}
.toc-fade-enter-from,
.toc-fade-leave-to {
  opacity: 0;
}
</style>
