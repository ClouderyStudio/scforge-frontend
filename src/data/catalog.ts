import type { ResourceKind } from '@/api/types'
/**
 * Preset metadata for the publish form.
 *
 * The platform validates submissions against the same lists server-side
 * (Modules/Scforge/Domain/ScforgeCatalog.cs); these are the display labels.
 */
import {
  IconBalance,
  IconBolt,
  IconBuild,
  IconDeployedCode,
  IconExtension,
  IconHandyman,
  IconInsights,
  IconInventory2,
  IconPsychology,
  IconPublic,
  IconScience,
  IconShield,
  IconStorage,
  IconTerminal,
  IconToken,
  IconWorkspacePremium,
  type IconComponent,
} from '@/icons'

export interface CatalogOption {
  key: string
  label: string
  description?: string
  icon?: IconComponent
}

export const CATEGORIES: CatalogOption[] = [
  { key: 'gameplay', label: '玩法扩展', description: '新机制、新规则与新玩法', icon: IconScience },
  { key: 'utilities', label: '实用工具', description: '命令、传送与世界管理', icon: IconHandyman },
  { key: 'world', label: '世界生成', description: '地形、结构与生物群系', icon: IconPublic },
  { key: 'mobs', label: '实体与生物', description: '新增或调整生物行为', icon: IconPsychology },
  { key: 'storage', label: '存储与物品', description: '容器、物品与合成', icon: IconStorage },
  { key: 'economy', label: '经济与商店', description: '货币、交易与市场', icon: IconBalance },
  { key: 'protection', label: '防护与安全', description: '领地、权限与反作弊', icon: IconShield },
  { key: 'performance', label: '性能优化', description: '降低开销、提升并发', icon: IconBolt },
  { key: 'api', label: '开发库 / API', description: '供其它插件调用的前置库', icon: IconDeployedCode },
  { key: 'integration', label: '集成桥接', description: '与外部服务互通', icon: IconInsights },
  { key: 'misc', label: '其它', description: '未归类的插件', icon: IconExtension },
]

export const TAGS: CatalogOption[] = [
  { key: 'survival', label: '生存' },
  { key: 'creative', label: '创造' },
  { key: 'pvp', label: 'PvP' },
  { key: 'pve', label: 'PvE' },
  { key: 'multiplayer', label: '多人' },
  { key: 'singleplayer', label: '单人' },
  { key: 'adventure', label: '冒险' },
  { key: 'technical', label: '技术' },
  { key: 'decoration', label: '装饰' },
  { key: 'magic', label: '魔法' },
  { key: 'technology', label: '科技' },
  { key: 'food', label: '食物' },
  { key: 'transport', label: '交通' },
  { key: 'mining', label: '采矿' },
  { key: 'farming', label: '农业' },
  { key: 'server', label: '服务器' },
  { key: 'client', label: '客户端' },
  { key: 'library', label: '前置库' },
  { key: 'chinese', label: '中文支持' },
  { key: 'open-source', label: '开源' },
]

/**
 * 游戏版本的**离线回退**值：权威列表在服务端（`GET /scforge/game-versions`），
 * 超管可以在后台自行添加；这里只用于接口返回前的首帧，避免下拉是空的。
 * 生存战争用日期式编号，新的在前。
 */
export const GAME_VERSIONS: string[] = ['x26.07.01', 'x26.06.19', 'x26.05.23']

export const RELEASE_CHANNELS: CatalogOption[] = [
  { key: 'release', label: '正式版', description: '稳定可用，推荐所有服务器使用', icon: IconWorkspacePremium },
  { key: 'beta', label: '测试版', description: '功能完成但仍在验证', icon: IconBuild },
  { key: 'alpha', label: '预览版', description: '早期尝鲜，可能不稳定', icon: IconToken },
]

export const SORT_OPTIONS: CatalogOption[] = [
  { key: 'relevance', label: '综合', icon: IconInsights },
  { key: 'downloads', label: '下载量', icon: IconStorage },
  { key: 'recent', label: '最近更新', icon: IconTerminal },
  { key: 'name', label: '名称', icon: IconInventory2 },
]

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((option) => [option.key, option.label]),
)

export const TAG_LABELS: Record<string, string> = Object.fromEntries(TAGS.map((option) => [option.key, option.label]))

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  RELEASE_CHANNELS.map((option) => [option.key, option.label]),
)

export const MAX_TAGS = 6
export const MAX_GALLERY = 6
export const MAX_PLUGIN_BYTES = 64 * 1024 * 1024
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/**
 * 插件包格式 —— 生存战争只有这两种，没有 zip 形式的插件或模组：
 *   • 插件 `.dll`：编译出来的程序集，只在服务端加载；
 *   • 模组 `.netmod`：**会随服务器下发到客户端**，同样可以用来写插件逻辑。
 */
export const PLUGIN_ACCEPT = '.dll,.netmod'
export const MOD_EXTENSION = '.netmod'

/** 按文件名判断是不是模组包（服务端同样只看扩展名，判据一致）。 */
export function isModPackage(fileName: string | null | undefined): boolean {
  return (fileName ?? '').toLowerCase().endsWith(MOD_EXTENSION)
}

/* ------------------------------------------------------------------ */
/* 资源类型：插件 / 模组两块板                                          */
/* ------------------------------------------------------------------ */

export interface KindOption {
  key: ResourceKind
  label: string
  /** 该类型要求的包扩展名（服务端会强制校验）。 */
  extension: string
  /** 一句话说明，用于板块标题与上传页。 */
  description: string
  /** 是否会被下发到客户端。 */
  clientSide: boolean
}

/** 顺序即板块顺序：插件在前。 */
export const KINDS: readonly KindOption[] = [
  {
    key: 'plugin',
    label: '插件',
    extension: '.dll',
    description: '编译好的 .dll 程序集，只在服务端加载，玩家不需要安装。',
    clientSide: false,
  },
  {
    key: 'mod',
    label: '模组',
    extension: '.netmod',
    description: '会随服务器下发到客户端，服主与玩家两侧都会生效（也可以用来写插件逻辑）。',
    clientSide: true,
  },
]

export const KIND_LABELS: Record<ResourceKind, string> = { plugin: '插件', mod: '模组' }

/** 归一化资源类型：未知值按插件处理（与服务端的宽松过滤一致）。 */
export function kindOption(kind: string | null | undefined): KindOption {
  return KINDS.find((item) => item.key === kind) ?? KINDS[0]!
}

export function isModKind(kind: string | null | undefined): boolean {
  return kind === 'mod'
}

/** 该类型的包扩展名，用于 file input 的 accept。 */
export function acceptForKind(kind: string | null | undefined): string {
  return kindOption(kind).extension
}

/* ---------------- 路由助手：板块 / 详情 / 编辑 ---------------- */

export function boardRoute(kind: string | null | undefined): { name: string } {
  return { name: isModKind(kind) ? 'mods' : 'plugins' }
}

export function detailRoute(kind: string | null | undefined, slug: string): { name: string; params: { slug: string } } {
  return { name: isModKind(kind) ? 'mod-detail' : 'plugin-detail', params: { slug } }
}

export function editRoute(kind: string | null | undefined, slug: string): { name: string; params: { slug: string } } {
  return { name: isModKind(kind) ? 'mod-edit' : 'plugin-edit', params: { slug } }
}
