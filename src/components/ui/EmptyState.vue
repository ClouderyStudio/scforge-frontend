<script setup lang="ts">
import { M3EmptyState } from '@clderystd/m3-ui'
import type { IconComponent } from '@/icons'

/**
 * 空状态。
 *
 * 实现已上移到组件库（`M3EmptyState`）：图标 + 标题 + 说明 + 恢复操作的组合
 * 每个站点都一样，各写一份迟早在内边距和圆角上分叉。
 *
 * 这里保留薄壳只为不动 15 个页面 / 40 处调用；**新代码请直接用 `M3EmptyState`**。
 */
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: IconComponent
    title: string
    description?: string
    actionLabel?: string
  }>(),
  { icon: undefined, description: undefined, actionLabel: undefined },
)

const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <M3EmptyState
    v-bind="$attrs"
    :icon="icon"
    :title="title"
    :description="description"
    :action-label="actionLabel"
    @action="emit('action')"
  />
</template>
