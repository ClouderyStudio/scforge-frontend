<script setup lang="ts">
import { M3Skeleton } from '@clderystd/m3-ui'

/**
 * 加载骨架屏。
 *
 * 实现已上移到组件库（`M3Skeleton`）。
 * 这里保留薄壳只为不动 14 个页面 / 30 处调用；**新代码请直接用 `M3Skeleton`**。
 */
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ label?: string; rows?: number }>(), { label: '正在加载…', rows: 3 })
</script>

<template>
  <M3Skeleton v-bind="$attrs" :label="label" :rows="rows" />
</template>
