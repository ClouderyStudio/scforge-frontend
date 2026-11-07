<script setup lang="ts">
import { M3Pagination } from '@clderystd/m3-ui'

/**
 * 分页。
 *
 * 实现已上移到组件库（`M3Pagination`）。
 * 这里保留薄壳只为不动既有调用点；**新代码请直接用 `M3Pagination`**。
 */
defineOptions({ inheritAttrs: false })

defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ (e: 'update:page', value: number): void }>()
</script>

<template>
  <M3Pagination
    v-bind="$attrs"
    :page="page"
    :total-pages="totalPages"
    @update:page="emit('update:page', $event)"
  />
</template>
