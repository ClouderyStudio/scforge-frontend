<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IconComment, IconLogin, IconSort } from '@/icons'
import { M3Button, M3Icon, M3Menu, M3MenuItem } from '@/components/m3'
import CommentEditor from './CommentEditor.vue'
import CommentItem from './CommentItem.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { commentsApi } from '@/api/plugins'
import type { Comment } from '@/api/types'
import { useAuth } from '@/composables/useAuth'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps<{ pluginId: string; comments: Comment[]; total: number; loading: boolean }>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

const router = useRouter()
const { isAuthenticated, user } = useAuth()
const snackbar = useSnackbar()

const body = ref('')
const busy = ref(false)
const sort = ref<'recent' | 'top'>('recent')

/** Newest first, or highest score first. */
const ordered = computed(() => {
  const list = [...props.comments]
  if (sort.value === 'top') {
    list.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
  } else {
    list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }
  return list
})

const sortLabel = computed(() => (sort.value === 'top' ? '最高评价' : '最新' ))

async function submit(): Promise<void> {
  const text = body.value.trim()
  if (!text) return
  busy.value = true
  try {
    await commentsApi.create(props.pluginId, text)
    body.value = ''
    snackbar.success('评论已发表')
    emit('refresh')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '发表失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="sc-thread" aria-labelledby="sc-thread-title">
    <header class="sc-thread__head">
      <h2 id="sc-thread-title" class="md-typescale-headline-small">
        <M3Icon :icon="IconComment" :size="20" />
        评论
        <span class="sc-thread__count md-typescale-title-small">{{ total }}</span>
      </h2>

      <M3Menu placement="bottom-end" :min-width="180">
        <template #trigger="{ open }">
          <M3Button variant="outlined" size="sm" :icon="IconSort" :aria-expanded="open">{{ sortLabel }}</M3Button>
        </template>
        <M3MenuItem label="最新" :selected="sort === 'recent'" @click="sort = 'recent'" />
        <M3MenuItem label="最高评价" :selected="sort === 'top'" @click="sort = 'top'" />
      </M3Menu>
    </header>

    <div v-if="isAuthenticated" class="sc-thread__compose">
      <CommentEditor v-model="body" :busy="busy" @submit="submit" />
      <p class="sc-thread__hint md-typescale-body-small sc-muted">
        以 <strong>{{ user?.username }}</strong> 的身份发表 · Ctrl/⌘ + Enter 快速提交
      </p>
    </div>

    <div v-else class="sc-thread__login">
      <p class="md-typescale-body-medium">登录后即可参与讨论，为插件留下评价。</p>
      <M3Button
        variant="tonal"
        size="sm"
        :icon="IconLogin"
        @click="router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })"
      >
        登录后评论
      </M3Button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="2" />

    <div v-else-if="ordered.length" class="sc-thread__list">
      <CommentItem
        v-for="comment in ordered"
        :key="comment.id"
        :comment="comment"
        @refresh="emit('refresh')"
      />
    </div>

    <EmptyState
      v-else
      title="还没有评论"
      description="成为第一个分享使用体验的人。"
      :icon="IconComment"
    />
  </section>
</template>

<style scoped>
.sc-thread {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-thread__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sc-thread__head h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-thread__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 22px;
  padding-inline: 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-thread__hint {
  margin-block-start: 8px;
}

.sc-thread__login {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
}

.sc-thread__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
