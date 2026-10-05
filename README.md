# SCForge 前端 · 生存战争插件、模组资源平台

> **SCForge** 是 **云术工作室（Cloudery Studio）** 旗下项目 —— 生存战争的插件、模组资源平台。
> 品牌归属与联系入口在页头、页脚与 [src/data/brand.ts](src/data/brand.ts) 中统一维护（与官网 official-site 同源）。

SCForge 是生存战争（SurvivalCraft）插件、模组资源平台，动线对齐 Modrinth / CurseForge：
浏览与搜索插件、查看详情与版本、下载插件包、发布插件与追加版本、评论与回复，以及插件 / 评论的赞踩。

界面完全按 **Material Design 3** 规范实现：自研 M3 组件库 + 官方 M3 设计令牌，不依赖 Vuetify / mdui / Tailwind。
组件库与设计令牌复用 `official-site`（云术官网）的实现，品牌配色由 `@material/material-color-utilities` 以 HCT 重新生成。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Vue 3.5 `<script setup>` + TypeScript（`vue-tsc -b` 构建期类型检查） |
| 构建 | Vite 8 |
| 路由 | vue-router 4（history 模式；`meta.requiresAuth` 由全局守卫拦截） |
| 设计系统 | 自研 M3 组件库，配色由 `@material/material-color-utilities` 以 HCT 生成 |
| 图标 | `unplugin-icons` 内联 SVG（Material Symbols），构建期按需 tree-shaking |
| 字体 | Roboto Flex 可变字体，`@fontsource-variable/roboto-flex` 自托管 |

## 命令

```bash
pnpm dev        # 开发服务器（5173，/scforge 与 /identity 代理到 http://localhost:5171）
pnpm build      # 类型检查 + 生产构建（输出 dist/）
pnpm preview    # 预览已构建产物
pnpm theme      # 重新生成配色令牌 src/styles/m3-color-tokens.css
```

后端默认地址见 `vite.config.ts` 的 `server.proxy`（ClouderyApi 默认监听 `http://localhost:5171`）。
如需指向其它后端，在 `.env.local` 里设置 `VITE_API_BASE`（留空表示同源，由代理或反向代理转发）。

## 页面与路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | HomePage | 首页：搜索、统计、精选插件、最近更新、平台能力 |
| `/plugins` | BrowsePage | 浏览：搜索、分类 / 标签 / 游戏版本筛选、排序、分页（URL 是唯一状态源） |
| `/plugins/:slug` | PluginDetailPage | 详情：描述 / 版本 / 评论三区（Markdown 渲染），下载、赞踩；作者可编辑资料 / 发布新版本 |
| `/plugins/:slug/edit` | EditPluginPage | 作者编辑资料与版本管理（改元数据、换文件、删除、重新提交），需登录 |
| `/admin` | AdminLayout + 概览 | 管理后台：待审核积压、快捷入口（需管理员） |
| `/admin/review` | AdminReviewPage | 审核队列：插件 / 版本两个分区，通过或驳回（驳回需填理由） |
| `/admin/plugins` | AdminPluginsPage | 全量插件管理：搜索、状态筛选、内容编辑与删除 |
| `/admin/admins` | AdminAdminsPage | 管理员与权限：搜索用户、指定角色、勾选权限、撤销（仅超管） |
| `/upload` | UploadPage | 发布插件；带 `?plugin=<id>` 时只发布新版本（需登录） |
| `/dashboard` | DashboardPage | 我的插件与统计（需登录） |
| `/login` | LoginPage | 使用云术统一身份（Casdoor）登录 |
| `/auth/callback` | AuthCallbackPage | 授权回调，换取 Cookie 会话 |
| 其它 | NotFoundPage | 404 |

## 认证

沿用 Cloudery 主站的 Casdoor 授权码流程与 **HttpOnly Cookie 会话**（前端不接触令牌）：

1. `LoginPage` 取 `GET /identity/auth/config` 与 `GET /identity/auth/state`，把回跳目标写入 `sessionStorage`；
2. 跳转 Casdoor 授权页，登录后浏览器回到 `/auth/callback`（携带 `code` 与 `state`）；
3. `AuthCallbackPage` 调 `POST /identity/auth/callback`，服务端校验 `state` 后建立会话，前端再调
   `GET /identity/auth/status` 读当前用户。

所有请求都带 `credentials: 'include'`（见 `src/api/http.ts`）；未登录的写操作由后端返回
`401 { success:false, message:"请先登录" }`，前端据此提示并引导登录。

## 目录结构

```
src/
  api/            http.ts（fetch 包装 + ApiError）、auth.ts、plugins.ts、types.ts（后端契约类型）
  components/
    m3/           自研 M3 组件库（index.ts 为统一出口，同时导出 vRipple 指令）
    markdown/     ScMarkdown（渲染 + 净化）、ScMarkdownEditor（工具栏 + 编辑/预览预览）
    layout/       AppHeader（搜索 / 主题 / 账户菜单）、AppFooter
    plugin/       PluginIcon（渐变兜底）、PluginCard、PluginGrid、VersionList
    comment/      CommentEditor、CommentItem（自递归渲染回复）、CommentThread
    ui/           SnackbarHost、EmptyState、LoadingSkeleton、VoteButtons、ScPagination、ScStat、FileDrop
  composables/    useAuth、useAdmin、useSnackbar、useScrolled、useModal、useTheme
  data/catalog.ts 分类 / 标签 / 游戏版本 / 发布渠道等展示元数据（服务端为权威校验来源）
  data/review.ts  审核状态文案与调性
  directives/     v-ripple、v-reveal、v-count-up
  pages/          8 个页面 + pages/admin/ 后台 4 个页面（AdminLayout / 概览 / 审核 / 插件 / 管理员）
  router/         createWebHistory 路由表与登录守卫
  styles/         m3-color-tokens（生成）、m3-foundations、base、motion、scforge（品牌层）
  utils/          format（数字 / 时间）、download（带凭据的 blob 下载）、markdown（安全渲染）
```

## 评论与 Markdown

评论正文在服务端保持原样存储，前端渲染走 `src/utils/markdown.ts`：**先对输入做 HTML 转义**，
再对转义后的文本套用一份很小的内联语法白名单（行内代码、加粗、斜体、删除线、http/https 自动链接）。
任何块级 HTML、图片与原始锚点都不被支持，因此返回值可以安全地用于 `v-html`。

## 两块板：插件 / 模组

平台上有两类资源，各自一块板（`/plugins` 与 `/mods`），共用同一套页面组件，靠路由 `meta.kind` 区分：

| 板块 | 包格式 | 生效范围 |
| --- | --- | --- |
| 插件 | `.dll` | 只在服务端加载 |
| 模组 | `.netmod` | **会随服务器下发到客户端**，服主与玩家两侧都会生效 |

- 列表与详情都按 `kind` 过滤：插件板不会出现模组，反之亦然；切换板块会保留当前搜索词与筛选。
- 资源类型在发布时选定，**创建后不可更改**，之后的版本必须使用同一种包格式（服务端强校验）。
- 模组在列表卡片、版本卡片、上传页与详情页都会提示「会下发到客户端」——这是服主判断是否安装的关键信息。
- 跳转一律走 `detailRoute / editRoute / boardRoute`（见 `src/data/catalog.ts`），避免手工拼路由名。

## 游戏版本由超管维护

生存战争的版本号是日期式的（`x26.07.01` 一类），由后端 `/scforge/game-versions` 下发，
超管可以在后台「游戏版本」页自行添加（可标内测）。
发布页与筛选面板都读这份列表，`src/data/catalog.ts` 的 `GAME_VERSIONS` 只是接口返回前的离线回退；
缓存由 `src/composables/useGameVersions.ts` 统一管理。

## 审核流程与权限

内容**先审后发**：新提交、作者编辑过的资料、作者改过的版本都会回到 `pending`，
只有拥有 `review` 权限的管理员通过后，公众才看得到。公开可见的判定是
「插件已发布 **且** 至少有一个版本已发布」。

| 角色 | 能力 |
| --- | --- |
| 超级管理员 | 全部权限，并且是唯一能指定 / 调整 / 撤销管理员的人 |
| 管理员 | 由超管指定，只拥有被勾选的权限：`review`（审核）、`content`（内容管理） |

前端只做展示层的收口（`useAdmin` + 路由守卫 `meta.requiresAdmin`），真正的判定全在服务端：
越权请求会拿到 `403` 与中文提示。**发布权只属于作者本人** —— 管理员不会因为「是管理员」就能替别人发版本。

## Markdown

插件描述、README、版本更新日志与评论都支持 GFM：渲染走 `src/utils/markdown.ts`
（`marked` 解析 + `DOMPurify` 净化，链接统一 `target=_blank rel=noopener`，图片只允许 http(s) 与站内相对路径），
编辑走 `ScMarkdownEditor`（工具栏 + 撤销 / 重做 + 编辑 ↔ 预览切换）。
排版由 `styles/scforge.css` 的 `.sc-markdown` 提供，全部基于 MD3 令牌。

## 与后端的数据契约

`src/api/types.ts` 与 `src/api/plugins.ts` 逐字对应 ClouderyApi 的 `Modules/Scforge` 对外 DTO 与路由。
后端改动返回结构时必须同步这两个文件；对应的契约测试在
`ClouderyApi/ClouderyApi.Tests/ScforgeContractTests.cs`。

## 已知边界

- 上传的图片会由服务端统一转为 WebP（最长边 512），因此前端不做压缩；
  图标与截图只接受 JPG / PNG / WebP / GIF，**SVG 会被服务端拒绝**。
- 插件包规范：`.zip` / `.scpkg` / `.dll`；zip 内根目录（或唯一一层子目录）可放 `manifest.json`
  （至少 `name` 与 `version`），用于补全表单里留空的名称与版本号。
- 作者编辑资料用的是 `PUT /scforge/addons/{id}`（multipart，可同时替换图标 / 截图）；
  传空字符串即清空对应链接，`clearIcon` / `clearGallery` 用于删除现有图片。
- **权限**：改资料 / 发新版本 / 删除**只有作者本人**可以；管理员的能力由 `review` / `content` 权限码决定，
  超管额外能管理管理员。详情接口用 `canManage`、`canReview`、`canManageContent` 三个字段区分。
- 下载使用服务端记录的**原始上传文件名**（`version.fileName`）：单文件 `.dll` 不会被改成 `.zip`。
- 编辑任何内容都会让插件 / 版本回到待审核；页面上已明确提示，避免作者以为改动立即生效。
- 新增依赖：`marked` 与 `dompurify`（都无运行时依赖），构建产物因此增大约 130 KB。
- **包格式**：生存战争只有 `.dll`（插件，仅服务端加载）与 `.netmod`（模组，**会下发到客户端**），没有 zip 形式的插件；
  前端按文件名把版本标成「插件 / 模组」，模组会在上传页、版本卡片与详情页提示「会下发到客户端」。判据见 `src/data/catalog.ts` 的
  `PLUGIN_ACCEPT` / `isModPackage`。
- 插件包下载**始终**经 `/scforge/versions/{id}/download` 转发（后端可能把文件放在本地磁盘或 OSS），
  前端不需要知道存储位置；只有图标 / 截图可能是 OSS 外链（绝对 URL），`<img>` 直接加载即可。

## 说明

- 站点是客户端渲染的 SPA；`localStorage["scforge-theme"]` 保存主题偏好，
  `index.html` 内联脚本在首屏绘制前打好 `.dark` 类，避免闪烁。
- 无障碍：保留跳转到主内容的 skip link、MD3 焦点指示器与 `prefers-reduced-motion` 削减（不清零）。

## 许可证

本项目采用 **GNU Affero General Public License v3.0（AGPL-3.0）** 授权。

AGPL-3.0 是强 copyleft 协议：可以自由使用、修改和分发本项目，但若将修改后的版本作为网络服务对外提供，
必须以相同协议开放其源代码。
