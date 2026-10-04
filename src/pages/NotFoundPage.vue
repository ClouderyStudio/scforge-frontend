<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IconHome, IconSearch } from '@/icons'
import { M3Button } from '@/components/m3'

const router = useRouter()
</script>

<template>
  <div class="sc-notfound">
    <p class="sc-notfound__code md-typescale-display-large">404</p>
    <h1 class="md-typescale-headline-medium">页面不存在</h1>
    <p class="md-typescale-body-large sc-muted">链接可能已失效，或者插件已被作者删除。</p>
    <div class="sc-notfound__actions">
      <M3Button variant="filled" :icon="IconHome" @click="router.push({ name: 'home' })">回到首页</M3Button>
      <M3Button variant="outlined" :icon="IconSearch" @click="router.push({ name: 'plugins' })">浏览插件</M3Button>
    </div>
  </div>
</template>

<style scoped>
.sc-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 96px 16px;
  text-align: center;
}

.sc-notfound__code {
  font-family: var(--md-ref-typeface-brand);
  color: var(--md-sys-color-primary);
}

.sc-notfound__actions {
  display: flex;
  gap: 8px;
  margin-block-start: 16px;
}
</style>
