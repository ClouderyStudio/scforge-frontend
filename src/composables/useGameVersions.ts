/**
 * 受支持的游戏版本：模块级缓存，全站只拉一次。
 *
 * 权威来源是服务端（超管可在后台添加），`src/data/catalog.ts` 的 GAME_VERSIONS
 * 只是接口返回前的离线回退。
 */
import { computed, ref } from 'vue'
import { pluginsApi } from '@/api/plugins'
import type { GameVersionOption } from '@/api/types'
import { GAME_VERSIONS } from '@/data/catalog'

const items = ref<GameVersionOption[]>([])
const loading = ref(false)
let loaded = false
let inflight: Promise<GameVersionOption[]> | null = null

async function load(force = false): Promise<GameVersionOption[]> {
  if (loaded && !force) return items.value
  if (inflight) return inflight

  loading.value = true
  inflight = pluginsApi
    .gameVersions()
    .then((result) => {
      items.value = result.items
      loaded = true
      return result.items
    })
    .catch(() => {
      // 拉不到就继续用离线回退值，不该拦住发布流程。
      loaded = true
      return items.value
    })
    .finally(() => {
      loading.value = false
      inflight = null
    })

  return inflight
}

function reset(): void {
  items.value = []
  loaded = false
  inflight = null
}

export function useGameVersions() {
  return {
    items: computed(() => items.value),
    /** 版本号，新的在前：下拉与筛选直接用。服务端列表为空时退回离线值。 */
    versions: computed(() => (items.value.length ? items.value.map((item) => item.version) : GAME_VERSIONS)),
    /** 仍在内测的版本号，界面会标出「内测」。 */
    betaVersions: computed(() => new Set(items.value.filter((item) => item.beta).map((item) => item.version))),
    loading: computed(() => loading.value),
    load,
    reset,
  }
}
