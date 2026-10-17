<script setup lang="ts">
/**
 * 加固工作台（独立页，/fortify）。
 *
 * 与资源编辑页里的「加固」标签页用的是**同一张**打包卡（PackWorkbench）——
 * 这里多了「选资源」一步，打包完成后密钥自动登记到选中的资源。
 * 密钥管理（列表 / 作废）仍在各资源编辑页的「加固」标签页里。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IconAdd, IconShield } from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import PackWorkbench from '@/components/fortify/PackWorkbench.vue'
import { mineApi } from '@/api/plugins'
import type { PluginSummary } from '@/api/types'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user } = useAuth()

const mine = ref<PluginSummary[]>([])
const loading = ref(true)
const denied = ref(false)
const selected = ref('')

const selectedLabel = computed(
  () => mine.value.find((item) => item.id === selected.value)?.name ?? '',
)

onMounted(async () => {
  try {
    mine.value = (await mineApi.list()).items
  } catch (error) {
    // 401 = 未登录（路由守卫通常会先拦住）；403 = 无权限，交给页面态处理。
    denied.value = true
    void error
  } finally {
    loading.value = false
  }
})

function goUpload(): void {
  void router.push({ name: 'upload' })
}
</script>

<template>
  <div class="sc-fortify-page">
    <header class="sc-fortify-page__head">
      <h1 class="md-typescale-headline-small">
        <M3Icon :icon="IconShield" :size="24" />
        加固工作台
      </h1>
      <p class="md-typescale-body-medium sc-muted">
        给模组包上锁：加密 + 作者签名，玩家改过一个字节都加载不了。
        加密与签名在你的浏览器里完成 —— 私钥与明文 mod 都不会离开这台电脑。
      </p>
    </header>

    <LoadingSkeleton v-if="loading" />

    <EmptyState
      v-else-if="denied"
      title="需要登录"
      description="登录后才能使用加固工作台。"
    >
      <M3Button variant="filled" @click="router.push({ name: 'login' })">去登录</M3Button>
    </EmptyState>

    <template v-else-if="mine.length === 0">
      <EmptyState
        title="还没有可加固的资源"
        :description="`先发布一个插件或模组（当前身份：${user?.username ?? '未知'}），再回到这里打包。`"
      >
        <M3Button variant="filled" :icon="IconAdd" @click="goUpload">去发布</M3Button>
      </EmptyState>
    </template>

    <template v-else>
      <section class="sc-fcard">
        <h2 class="sc-fcard__title md-typescale-title-medium">① 选择资源</h2>
        <label class="sc-fortify-page__field">
          <span class="md-typescale-label-large sc-muted">登记到哪个资源</span>
          <select v-model="selected" class="sc-fortify-page__select md-typescale-body-medium">
            <option value="" disabled>选择你自己的插件 / 模组…</option>
            <option v-for="item in mine" :key="item.id" :value="item.id">
              {{ item.name }}（{{ item.kind === 'mod' ? '模组' : '插件' }}）
            </option>
          </select>
          <span class="md-typescale-body-small sc-muted">
            密钥挂在资源上：打包成功即登记到它名下；列表与作废在该资源编辑页的「加固」标签页。
          </span>
        </label>
      </section>

      <PackWorkbench :plugin-id="selected || null" />

      <p v-if="selectedLabel" class="md-typescale-body-small sc-muted">
        当前目标：<b>{{ selectedLabel }}</b>
      </p>
    </template>
  </div>
</template>

<style scoped>
.sc-fortify-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: 32px 72px;
}

.sc-fortify-page__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-block-end: 8px;
}

.sc-fortify-page__head h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: var(--md-typescale-headline-small-weight);
}

/* 与 PackWorkbench 内的卡片同一套视觉 */
.sc-fcard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-fcard__title {
  font-weight: var(--md-typescale-title-medium-weight);
}

.sc-fortify-page__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-fortify-page__select {
  width: 100%;
  max-width: 480px;
  padding: 10px 14px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}
</style>
