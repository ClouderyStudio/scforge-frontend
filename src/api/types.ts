/**
 * SCForge API 契约类型。
 *
 * 与 ClouderyApi 的 Scforge 模块（Modules/Scforge/Api/Contracts）逐字对应，
 * 字段名 camelCase，时间 UTC（带 Z）。
 */

/* ------------------------------------------------------------------ */
/* 共享                                                                */
/* ------------------------------------------------------------------ */

export interface ApiErrorBody {
  success?: boolean
  message?: string
}

export type SortKey = 'downloads' | 'recent' | 'relevance' | 'name'

export type ReleaseChannel = 'release' | 'beta' | 'alpha'

/**
 * 资源类型：插件（插件只在服务端加载）与模组（会随服务器下发到客户端）。
 * SCForge 因此有两块独立的板：/plugins 与 /mods。
 */
export type ResourceKind = 'plugin' | 'mod'

/** 先审后发：插件与版本各自持有这个状态。 */
export type ContentStatus = 'pending' | 'published' | 'rejected'

/* ------------------------------------------------------------------ */
/* 插件                                                                */
/* ------------------------------------------------------------------ */

export interface PluginAuthor {
  id: string
  username: string
  avatar: string | null
}

export interface PluginSummary {
  id: string
  slug: string
  name: string
  /** plugin 或 mod。 */
  kind: ResourceKind
  summary: string
  iconUrl: string | null
  category: string
  tags: string[]
  gameVersion: string
  author: PluginAuthor
  downloads: number
  upvotes: number
  downvotes: number
  score: number
  commentCount: number
  /** 当前调用者可见的版本数（匿名只看得到已通过审核的版本）。 */
  versionCount: number
  publishedVersionCount: number
  latestVersion: string | null
  latestReleaseAt: string | null
  publishedAt: string
  updatedAt: string
  featured: boolean
  /** Set only for an authenticated caller. */
  myVote: 1 | -1 | 0
  status: ContentStatus
  reviewNote: string | null
  reviewedAt: string | null
  reviewedBy: string | null
}

export interface PluginDetail extends PluginSummary {
  description: string
  readme: string
  sourceUrl: string | null
  issuesUrl: string | null
  license: string | null
  licenseUrl: string | null
  donationUrl: string | null
  discordUrl: string | null
  gallery: string[]
  /** 当前用户是否为作者本人：可编辑资料、发布/编辑版本、删除。 */
  canManage: boolean
  /** 当前用户是否有审核权限。 */
  canReview: boolean
  /** 当前用户是否有内容管理权限。 */
  canManageContent: boolean
  versions: PluginVersion[]
}

export interface PluginVersion {
  id: string
  version: string
  channel: ReleaseChannel
  changelog: string
  fileName: string
  fileSize: number
  downloads: number
  gameVersion: string
  gameVersions: string[]
  dependencies: string[]
  publishedAt: string
  downloadUrl: string
  status: ContentStatus
  reviewNote: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  pluginId: string
  pluginName: string
  pluginSlug: string
  /** 所属资源的类型，审核队列据此跳到插件或模组板块。 */
  pluginKind: ResourceKind
  author: PluginAuthor
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CategoryOption {
  key: string
  label: string
  count: number
}

export interface SearchFacets {
  /** 插件 / 模组两块板的计数。 */
  kinds: CategoryOption[]
  categories: CategoryOption[]
  tags: CategoryOption[]
  gameVersions: string[]
}

export interface PluginSearchResult extends PageResult<PluginSummary> {
  facets: SearchFacets
}

export interface PluginSearchQuery {
  q?: string
  kind?: ResourceKind
  category?: string
  tag?: string
  gameVersion?: string
  sort?: SortKey
  page?: number
  pageSize?: number
}

/* ------------------------------------------------------------------ */
/* API Key（机器凭据）                                                */
/* ------------------------------------------------------------------ */

/**
 * 作用域码，与后端 `ScforgeApiKeyScopes` 一一对应。
 * `manage`（删除自己的插件、重提审核）不在自助可申请范围内，只能由超管在后台签发。
 * 编辑插件资料与替换版本文件归 `publish` —— 它们同样要过审。
 */
export type ApiKeyScope = 'read' | 'publish' | 'manage'

/** 后端直接下发中文状态串：有效 / 已吊销 / 已过期。 */
export type ApiKeyStatus = '有效' | '已吊销' | '已过期'

/** 一个可授予的作用域（后端下发目录，前端不硬编码）。 */
export interface ApiKeyScopeOption {
  key: ApiKeyScope
  label: string
  description: string
}

/** `GET /scforge/api-keys/scopes` 的响应。 */
export interface ApiKeyScopeCatalog {
  all: ApiKeyScope[]
  /** 自助可申请的部分（不含 manage）。 */
  selfService: ApiKeyScope[]
  items: ApiKeyScopeOption[]
}

/**
 * 一把 Key 的对外投影。
 * **注意**：这里没有令牌明文 —— 库里只存哈希，界面只能显示 `prefix` 与 `maskedToken`。
 */
export interface ApiKeyRecord {
  id: string
  name: string
  /** 令牌前缀，形如 `scf_a1b2`。 */
  prefix: string
  /** 掩码令牌，形如 `scf_a1b2…****`。 */
  maskedToken: string
  scopes: ApiKeyScope[]
  scopeLabels: string[]
  userId: string
  userName: string
  /** 一律为北京时间（UTC+8），与 SCForge 其余 DTO 一致。 */
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  revokedReason: string | null
  lastUsedAt: string | null
  lastUsedIp: string | null
  status: ApiKeyStatus
  usable: boolean
}

/** 创建 / 轮换的响应：`token` 明文只在这里出现一次。 */
export interface ApiKeyIssued {
  success: boolean
  token: string
  key: ApiKeyRecord
  notice: string
}

/* ------------------------------------------------------------------ */
/* 投票                                                                */
/* ------------------------------------------------------------------ */

export interface VoteState {
  upvotes: number
  downvotes: number
  score: number
  myVote: 1 | -1 | 0
}

/* ------------------------------------------------------------------ */
/* 评论                                                                */
/* ------------------------------------------------------------------ */

export interface Comment {
  id: string
  pluginId: string
  parentId: string | null
  body: string
  author: PluginAuthor
  createdAt: string
  updatedAt: string | null
  edited: boolean
  upvotes: number
  downvotes: number
  score: number
  myVote: 1 | -1 | 0
  canEdit: boolean
  canDelete: boolean
  replies: Comment[]
}

export interface CommentList {
  items: Comment[]
  total: number
}

/* ------------------------------------------------------------------ */
/* 账户与作者视图                                                       */
/* ------------------------------------------------------------------ */

export interface AccountUser {
  id: string
  username: string
  email: string | null
  avatar: string | null
}

export interface CasdoorConfig {
  casdoor: {
    endpoint: string
    organizationName: string
    applicationName: string
    clientId: string
    scope: string
  }
  callbackUri: string
}

export interface UploadSummary {
  plugins: number
  downloads: number
  upvotes: number
  comments: number
  pending: number
  published: number
  rejected: number
}

/* ------------------------------------------------------------------ */
/* 后台                                                                */
/* ------------------------------------------------------------------ */

/** 一个可授予的权限（后端下发目录，前端不硬编码）。 */
export interface PermissionOption {
  key: string
  label: string
  description: string
}

/** 一个受支持的游戏版本（服务端维护，新的在前）。 */
export interface GameVersionOption {
  id: string
  version: string
  sortOrder: number
  /** 是否仍在内测。 */
  beta: boolean
  createdAt: string
  createdBy: string
  /** 声明兼容该版本的资源数（后台列表用于判断能否删除）。 */
  usageCount: number
}

export interface AdminMe {
  isAdmin: boolean
  isSuperAdmin: boolean
  username: string
  permissions: string[]
  catalog: PermissionOption[]
}

export interface AdminSummary {
  pendingPlugins: number
  pendingVersions: number
  publishedPlugins: number
  rejectedPlugins: number
  totalPlugins: number
  totalDownloads: number
  admins: number
}

export interface AdminPluginPage extends PageResult<PluginSummary> {}

export interface AdminVersionPage extends PageResult<PluginVersion> {}

export type AdminRole = 'super' | 'admin'

export interface AdminRecord {
  id: string
  userId: string
  username: string
  avatar: string | null
  role: AdminRole
  isSuperAdmin: boolean
  permissions: string[]
  grantedBy: string | null
  fromConfig: boolean
  createdAt: string | null
}

export interface UserCandidate {
  userId: string
  username: string
  email: string | null
  avatar: string | null
  currentRole: AdminRole | null
}
