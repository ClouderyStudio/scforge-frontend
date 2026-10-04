<script setup lang="ts">
import { IconGithub, IconMail, IconMenuBook, IconPublic, IconSportsEsports } from '@/icons'
import { M3Icon, M3IconButton } from '@/components/m3'
import { copyrightNotice, studio } from '@/data/brand'

const copyright = copyrightNotice()

/** 工作室层面的入口：与官网页脚同一批链接。 */
const studioLinks = [
  { label: '工作室官网', icon: IconPublic, href: studio.site },
  { label: '文档', icon: IconMenuBook, href: studio.docs },
  { label: `GitHub（${studio.nameEn}）`, icon: IconGithub, href: studio.github },
  { label: '生存战争服务器', icon: IconSportsEsports, href: studio.gameServer },
  { label: `邮件联系 ${studio.email}`, icon: IconMail, href: `mailto:${studio.email}` },
]

const groups = [
  {
    title: '浏览',
    links: [
      { label: '全部插件', to: { name: 'plugins' } },
      { label: '全部模组', to: { name: 'mods' } },
      { label: '最近更新', to: { name: 'plugins', query: { sort: 'recent' } } },
      { label: '下载榜', to: { name: 'plugins', query: { sort: 'downloads' } } },
    ],
  },
  {
    title: '创作',
    links: [
      { label: '发布插件', to: { name: 'upload' } },
      { label: '我的插件', to: { name: 'dashboard' } },
      { label: '登录', to: { name: 'login' } },
    ],
  },
]
</script>

<template>
  <footer class="sc-footer">
    <div class="sc-shell sc-footer__inner">
      <div class="sc-footer__brand">
        <p class="sc-footer__logo md-typescale-title-medium">SCForge</p>
        <p class="sc-footer__tagline md-typescale-body-medium">
          生存战争插件、模组资源平台 —— 浏览、下载、发布与讨论。
        </p>
        <div class="sc-footer__studio">
          <img class="sc-footer__studio-logo" :src="studio.logo" alt="云术工作室" />
          <p class="md-typescale-body-small">
            <strong>{{ studio.name }}</strong> · {{ studio.nameEn }}
            <span class="sc-footer__studio-role">旗下项目</span>
          </p>
        </div>

        <div class="sc-footer__social">
          <M3IconButton
            v-for="link in studioLinks"
            :key="link.label"
            :icon="link.icon"
            :label="link.label"
            size="sm"
            variant="standard"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
          />
        </div>
      </div>

      <nav v-for="group in groups" :key="group.title" class="sc-footer__group" :aria-label="group.title">
        <p class="sc-footer__group-title md-typescale-label-large">{{ group.title }}</p>
        <ul class="sc-footer__links">
          <li v-for="link in group.links" :key="link.label">
            <RouterLink class="sc-footer__link md-typescale-body-medium" :to="link.to">{{ link.label }}</RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="sc-shell sc-footer__bottom">
      <p class="md-typescale-body-small sc-muted">
        © {{ copyright }} · SCForge 生存战争插件、模组资源平台由
        <a class="sc-footer__link" :href="studio.site" target="_blank" rel="noopener noreferrer">{{ studio.name }}</a>
        开发与运营
      </p>
      <p class="md-typescale-body-small sc-muted sc-footer__note">
        <M3Icon :icon="IconPublic" :size="14" />
        插件由社区作者提供，使用前请自行评估兼容性。
      </p>
    </div>
  </footer>
</template>

<style scoped>
.sc-footer {
  margin-block-start: 48px;
  padding-block: 40px 24px;
  background-color: var(--md-sys-color-surface-container-low);
  border-block-start: 1px solid var(--md-sys-color-outline-variant);
}

.sc-footer__inner {
  display: grid;
  grid-template-columns: 1.4fr repeat(2, minmax(120px, 1fr));
  gap: 32px;
}

.sc-footer__logo {
  font-weight: var(--md-typescale-title-medium-weight);
  color: var(--md-sys-color-primary);
}

.sc-footer__tagline {
  margin-block-start: 8px;
  max-width: 34ch;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-footer__studio {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-block-start: 14px;
}

.sc-footer__studio p {
  color: var(--md-sys-color-on-surface-variant);
}

.sc-footer__studio-role {
  margin-inline-start: 4px;
  padding: 1px 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-footer__studio-logo {
  width: 96px;
  height: auto;
}

.sc-footer__social {
  display: flex;
  gap: 4px;
  margin-block-start: 12px;
  margin-inline-start: -8px;
}

.sc-footer__group-title {
  font-weight: var(--md-typescale-label-large-weight);
  color: var(--md-sys-color-on-surface);
}

.sc-footer__links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-block-start: 12px;
}

.sc-footer__link {
  color: var(--md-sys-color-on-surface-variant);
  transition: color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-footer__link:hover {
  color: var(--md-sys-color-primary);
}

.sc-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-block-start: 32px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--md-sys-color-outline-variant);
}

.sc-footer__note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 839px) {
  .sc-footer__inner {
    grid-template-columns: 1fr 1fr;
  }

  .sc-footer__brand {
    grid-column: 1 / -1;
  }
}
</style>
