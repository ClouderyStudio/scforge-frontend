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

/**
 * 访问方式（与后端 `ScforgeAccessMode` 一一对应）：
 * - `public`：公开，进目录，任何人可下载。
 * - `password`：口令访问，不进目录；提交口令换取解锁令牌后可访问。
 * - `whitelist`：指定人员可见，不进目录；只有名单内用户可访问。
 *
 * 隐私插件**不进公开目录**（搜索 / 精选 / 最近都看不到），但能通过 slug 直达详情页 ——
 * 作者需要这个链接才能把访问权分享出去。
 */
export type AccessMode = 'public' | 'password' | 'whitelist'

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
  /**
   * 访问方式。隐私插件（password / whitelist）不进公开目录，
   * 只能通过 slug 直达详情页。
   */
  accessMode: AccessMode
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
  /**
   * 当前调用者是否已获授权。为 false 时服务端只下发脱敏外壳：
   * description / readme / gallery / versions 全为空，界面应渲染解锁门。
   */
  hasAccess: boolean
  /** 是否已通过口令解锁（仅 accessMode === 'password' 时可能为 true）。 */
  accessUnlocked: boolean
  /** 作者留的访问说明，显示在解锁框下方。 */
  accessHint: string | null
  /**
   * 是否已设置口令。口令只存哈希、取不回来，
   * 编辑页靠它区分「首次填写」与「留空表示不修改」——
   * 没有它作者每次编辑都得重设一遍口令。
   */
  hasAccessPassword: boolean
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
  /** 所属资源的 Id（后台审核队列需要展示它属于谁）。 */
  addonId: string
  addonName: string
  addonSlug: string
  /** 所属资源的类型，审核队列据此跳到插件或模组板块。 */
  addonKind: ResourceKind
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
  addonId: string
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

/* ------------------------------------------------------------------ */
/* 隐私访问                                                            */
/* ------------------------------------------------------------------ */

/**
 * 口令解锁成功的凭据。`token` 明文只在这里出现一次 ——
 * 服务端只存口令哈希，令牌本身是自签名的，丢了就重新输口令。
 */
export interface AccessUnlock {
  success: boolean
  /** 之后详情与下载请求带在 `X-Scforge-Access` 头里。 */
  token: string
  expiresAt: string
  accessMode: AccessMode
  notice: string
}

/** 白名单模式下的一名授权用户。 */
export interface AccessGrant {
  userId: string
  username: string
  createdAt: string
}

/** 一个可选择的访问方式（后端下发目录，前端不硬编码文案）。 */
export interface AccessModeOption {
  key: AccessMode
  label: string
  description: string
}

/** 白名单编辑器里「搜人」的结果项。 */
export interface AccessCandidate {
  userId: string
  username: string
  email: string | null
  avatar: string | null
}
