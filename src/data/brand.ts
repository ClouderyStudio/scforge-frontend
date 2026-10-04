/**
 * 云术工作室（Cloudery Studio）品牌常量。
 *
 * SCForge 是云术工作室旗下项目；这里的取值与官网 official-site 的 src/data/site.ts 保持一致，
 * 换域名或改文案时只动这一处，页头、页脚与 meta 信息会一起变。
 */
export const studio = {
  /** 中文名与英文名分别用于中文正文与版权行。 */
  name: '云术工作室',
  nameEn: 'Cloudery Studio',
  tagline: '创意与技术的完美结合',
  /** 工作室官网。 */
  site: 'https://cldery.com',
  docs: 'https://docs.cldery.com',
  github: 'https://github.com/ClouderyStudio',
  email: 'admin@cldery.com',
  /** 工作室的生存战争游戏服务器（资源平台的「使用方」）。 */
  gameServer: 'https://sc.cldery.com',
  /** 与官网共用同一枚标识。 */
  logo: '/images/logo.webp',
  since: 2023,
} as const

/** 版权年份区间：起始年固定，结束年取当前年（永不倒退）。 */
export function copyrightYears(now: Date = new Date()): string {
  const year = Math.max(studio.since, now.getFullYear())
  return year === studio.since ? `${studio.since}` : `${studio.since}-${year}`
}

/** 统一的版权文案，与官网页脚一致。 */
export function copyrightNotice(now: Date = new Date()): string {
  return `Copyright ${copyrightYears(now)} ${studio.nameEn}, All rights reserved.`
}
