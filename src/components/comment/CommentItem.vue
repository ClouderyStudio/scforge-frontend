<script setup lang="ts">
/**
 * A single comment, rendered recursively for replies.
 *
 * The item performs its own mutations (vote / edit / delete / reply) and then
 * emits `refresh`; the page owns the authoritative list, so the tree stays
 * consistent without duplicating state.
 */
import { computed, ref } from 'vue'
import { IconDelete, IconEdit, IconReply, IconReport } from '@/icons'
import { M3Avatar, M3Button, M3Dialog, M3IconButton, M3Tooltip } from '@/components/m3'
import ScMarkdown from '@/components/markdown/ScMarkdown.vue'
import ScMarkdownEditor from '@/components/markdown/ScMarkdownEditor.vue'
import VoteButtons from '@/components/ui/VoteButtons.vue'
import type { Comment } from '@/api/types'
import { commentsApi } from '@/api/plugins'
import { useAuth } from '@/composables/useAuth'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatRelative } from '@/utils/format'

const props = withDefaults(defineProps<{ comment: Comment; depth?: number }>(), { depth: 0 })

const emit = defineEmits<{ (e: 'refresh'): void }>()

const { user, isAuthenticated } = useAuth()
const snackbar = useSnackbar()

const busy = ref(false)
const editing = ref(false)
const editBody = ref('')
const replyOpen = ref(false)
const replyBody = ref('')
const confirmOpen = ref(false)

/** Nest at most three levels; deeper replies stay flattened for readability. */
const MAX_DEPTH = 2
const children = computed(() => props.comment.replies ?? [])
const nested = computed(() => props.depth < MAX_DEPTH)

async function vote(direction: 1 | -1 | 0): Promise<void> {
  const current = props.comment.myVote
  if (direction === current) return

  try {
    if (direction === 0) await commentsApi.voteClear(props.comment.id)
    else if (direction === 1) await commentsApi.voteUp(props.comment.id)
    else await commentsApi.voteDown(props.comment.id)
    emit('refresh')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '投票失败')
  }
}

function startEdit(): void {
  editBody.value = props.comment.body
  editing.value = true
}

async function submitEdit(): Promise<void> {
  const body = editBody.value.trim()
  if (!body) return
  busy.value = true
  try {
    await commentsApi.update(props.comment.id, body)
    editing.value = false
    snackbar.success('评论已更新')
    emit('refresh')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '更新失败')
  } finally {
    busy.value = false
  }
}

async function remove(): Promise<void> {
  busy.value = true
  try {
    await commentsApi.remove(props.comment.id)
    confirmOpen.value = false
    snackbar.success('评论已删除')
    emit('refresh')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    busy.value = false
  }
}

function openReply(): void {
  if (!isAuthenticated.value) {
    snackbar.show('请先登录后再回复')
    return
  }
  replyOpen.value = true
}

async function submitReply(): Promise<void> {
  const body = replyBody.value.trim()
  if (!body) return
  busy.value = true
  try {
    await commentsApi.create(props.comment.pluginId, body, props.comment.id)
    replyBody.value = ''
    replyOpen.value = false
    snackbar.success('已回复')
    emit('refresh')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '回复失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <article class="sc-comment" :class="{ 'sc-comment--nested': depth > 0 }">
    <div class="sc-comment__head">
      <M3Avatar :src="comment.author.avatar ?? undefined" :name="comment.author.username" :size="36" />
      <div class="sc-comment__meta">
        <p class="md-typescale-title-small">
          {{ comment.author.username }}
          <span v-if="user && user.id === comment.author.id" class="sc-comment__you md-typescale-label-small">我</span>
        </p>
        <p class="md-typescale-body-small sc-muted">
          {{ formatRelative(comment.createdAt) }}
          <template v-if="comment.edited"> · 已编辑</template>
        </p>
      </div>

      <div class="sc-comment__tools">
        <M3Tooltip v-if="comment.canEdit" text="编辑">
          <M3IconButton :icon="IconEdit" label="编辑评论" size="sm" variant="standard" @click="startEdit" />
        </M3Tooltip>
        <M3Tooltip v-if="comment.canDelete" text="删除">
          <M3IconButton
            :icon="IconDelete"
            label="删除评论"
            size="sm"
            variant="standard"
            @click="confirmOpen = true"
          />
        </M3Tooltip>
        <M3Tooltip text="举报">
          <M3IconButton :icon="IconReport" label="举报评论" size="sm" variant="standard" disabled />
        </M3Tooltip>
      </div>
    </div>

    <div v-if="editing" class="sc-comment__editor">
      <div class="sc-comment__editor-stack">
        <ScMarkdownEditor v-model="editBody" :rows="4" :max-length="4000" hint="支持 Markdown；Ctrl/⌘ + Enter 提交" />
        <div class="sc-comment__editor-actions">
          <M3Button variant="text" size="sm" @click="editing = false">取消</M3Button>
          <M3Button variant="filled" size="sm" :disabled="busy" @click="submitEdit">
            {{ busy ? '提交中…' : '保存修改' }}
          </M3Button>
        </div>
      </div>
    </div>
    <ScMarkdown v-else class="sc-comment__body" compact :source="comment.body" />

    <div class="sc-comment__actions">
      <VoteButtons
        size="sm"
        :upvotes="comment.upvotes"
        :downvotes="comment.downvotes"
        :vote="comment.myVote"
        @update:vote="vote"
      />
      <M3Button variant="text" size="sm" :icon="IconReply" @click="openReply">回复</M3Button>
    </div>

    <div v-if="replyOpen" class="sc-comment__editor">
      <div class="sc-comment__editor-stack">
        <ScMarkdownEditor
          v-model="replyBody"
          :rows="4"
          :max-length="4000"
          :placeholder="`回复 @${comment.author.username}…`"
          hint="支持 Markdown；Ctrl/⌘ + Enter 提交"
        />
        <div class="sc-comment__editor-actions">
          <M3Button variant="text" size="sm" @click="replyOpen = false">取消</M3Button>
          <M3Button variant="filled" size="sm" :disabled="busy" @click="submitReply">
            {{ busy ? '提交中…' : '回复' }}
          </M3Button>
        </div>
      </div>
    </div>

    <div v-if="children.length" class="sc-comment__children">
      <CommentItem
        v-for="child in children"
        :key="child.id"
        :comment="child"
        :depth="nested ? depth + 1 : depth"
        @refresh="emit('refresh')"
      />
    </div>

    <M3Dialog v-model="confirmOpen" title="删除这条评论？" :icon="IconDelete">
      删除后无法恢复，其下的回复也会一并移除。
      <template #actions>
        <M3Button variant="text" @click="confirmOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="busy" @click="remove">删除</M3Button>
      </template>
    </M3Dialog>
  </article>
</template>

<style scoped>
.sc-comment {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
}

.sc-comment--nested {
  background-color: var(--md-sys-color-surface-container);
}

.sc-comment__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sc-comment__meta {
  flex: 1;
  min-width: 0;
}

.sc-comment__you {
  margin-inline-start: 6px;
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-comment__tools {
  display: flex;
  gap: 2px;
}

.sc-comment__body {
  color: var(--md-sys-color-on-surface);
}

.sc-comment__editor-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-comment__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.sc-comment__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-comment__editor {
  margin-block-start: 2px;
}

.sc-comment__children {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-block-start: 6px;
  margin-inline-start: 12px;
  padding-inline-start: 12px;
  border-inline-start: 2px solid var(--md-sys-color-outline-variant);
}
</style>
