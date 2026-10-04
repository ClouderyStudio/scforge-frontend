/**
 * Generates Material Design 3 system color tokens for SCForge.
 *
 * Same algorithm as the Cloudery official site generator (see the original for the
 * full rationale): the palettes are composed from three sources so the result is a
 * deliberate brand palette instead of the automatic hue rotation of a single seed.
 *
 *   1. SEED        - forge orange: primary family, error roles, surfaceTint.
 *   2. ACCENT_SEED - steel teal: tertiary family (accent tints and decorative
 *                    gradients). Taken from the accent scheme's PRIMARY palette,
 *                    because that is the palette that actually carries the seed hue.
 *   3. NEUTRAL_HUE - a single warm hue for the neutral + secondary families.
 *                    HCT hue is numerically unstable below ~chroma 4, so a
 *                    scheme-generated surface grey keeps whatever cast the round
 *                    trip produced; pinning the hue and capping the chroma keeps
 *                    every surface crisp while preserving the tone of each role.
 *
 * Run:  pnpm theme
 */
import { pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

// Resolve the MD3 utilities package. It is a build-time-only tool: when it is not
// installed locally (a plain `pnpm install` of this project), fall back to the
// sibling official-site checkout so "pnpm theme" still works on a developer machine.
const FALLBACK = pathToFileURL(
  resolvePath('E:/', '.Cloudery/Website/official-site/node_modules/@material/material-color-utilities/index.js'),
).href

let mcu = null
for (const candidate of ['@material/material-color-utilities', FALLBACK]) {
  try {
    mcu = await import(candidate)
    break
  } catch {
    /* try the next candidate */
  }
}
if (!mcu) throw new Error('无法加载 @material/material-color-utilities，请先安装该依赖后再运行 pnpm theme')
const { Hct, MaterialDynamicColors, SchemeVibrant, argbFromHex, hexFromArgb } = mcu
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Brand seed color (SCForge forge orange). Change this and re-run "pnpm theme". */
const SEED = '#E85D04'
/** Accent seed color (steel teal) - drives the tertiary family. */
const ACCENT_SEED = '#00796B'
/** Warm hue shared by the neutral and secondary families (0-360). */
const NEUTRAL_HUE = 40
/** Max chroma of the plain surface roles - 0 keeps them pure grey. */
const SURFACE_CHROMA = 0
/** Max chroma of the neutral-variant roles (surfaceVariant / outline). */
const VARIANT_CHROMA = 8
/** Max chroma of the secondary family - subtle, warm, close to grey. */
const SECONDARY_CHROMA = 10

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/styles/m3-color-tokens.css')

/** Every MD3 system color role, in canonical (spec order) grouping. */
const ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'primaryFixed', 'primaryFixedDim', 'onPrimaryFixed', 'onPrimaryFixedVariant',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer', 'secondaryFixed', 'secondaryFixedDim', 'onSecondaryFixed', 'onSecondaryFixedVariant',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer', 'tertiaryFixed', 'tertiaryFixedDim', 'onTertiaryFixed', 'onTertiaryFixedVariant',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'outline', 'outlineVariant',
  'shadow', 'scrim', 'surfaceTint',
]

/** camelCase -> kebab-case for the CSS custom property name. */
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

/** Roles taken from the accent (teal) scheme's primary palette. */
const TERTIARY_ROLES = {
  tertiary: 'primary', onTertiary: 'onPrimary',
  tertiaryContainer: 'primaryContainer', onTertiaryContainer: 'onPrimaryContainer',
  tertiaryFixed: 'primaryFixed', tertiaryFixedDim: 'primaryFixedDim',
  onTertiaryFixed: 'onPrimaryFixed', onTertiaryFixedVariant: 'onPrimaryFixedVariant',
}

const SECONDARY_ROLES = new Set(['secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer', 'secondaryFixed', 'secondaryFixedDim', 'onSecondaryFixed', 'onSecondaryFixedVariant'])
const VARIANT_ROLES = new Set(['surfaceVariant', 'onSurfaceVariant', 'outline', 'outlineVariant'])
const NEUTRAL_ROLES = new Set(['background', 'onBackground', 'surface', 'onSurface', 'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'inverseSurface', 'inverseOnSurface'])

/**
 * Re-pitch a color onto NEUTRAL_HUE while keeping its MD3 tone (lightness).
 * Chroma is only lowered, never raised, so an already-subtle role stays subtle.
 */
function repitch(argb, maxChroma) {
  const hct = Hct.fromInt(argb)
  const chroma = Math.min(hct.chroma, maxChroma)
  return chroma === hct.chroma ? argb : Hct.from(NEUTRAL_HUE, chroma, hct.tone).toInt()
}

const source = Hct.fromInt(argbFromHex(SEED))
const accent = Hct.fromInt(argbFromHex(ACCENT_SEED))
const light = new SchemeVibrant(source, false, 0)
const dark = new SchemeVibrant(source, true, 0)
const lightAccent = new SchemeVibrant(accent, false, 0)
const darkAccent = new SchemeVibrant(accent, true, 0)

/** Resolve one role for a scheme (same light/dark structure as the scheme). */
function token(role, scheme, accentScheme) {
  if (TERTIARY_ROLES[role]) return hexFromArgb(MaterialDynamicColors[TERTIARY_ROLES[role]].getArgb(accentScheme))
  const argb = MaterialDynamicColors[role].getArgb(scheme)
  if (SECONDARY_ROLES.has(role)) return hexFromArgb(repitch(argb, SECONDARY_CHROMA))
  if (VARIANT_ROLES.has(role)) return hexFromArgb(repitch(argb, VARIANT_CHROMA))
  if (NEUTRAL_ROLES.has(role)) return hexFromArgb(repitch(argb, SURFACE_CHROMA))
  return hexFromArgb(argb)
}

function block(scheme, accentScheme, indent = '  ') {
  return ROLES.map((role) => `${indent}--md-sys-color-${kebab(role)}: ${token(role, scheme, accentScheme)};`).join('\n')
}

const css = `/*
 * Material Design 3 - system color tokens.
 *
 * AUTO-GENERATED by scripts/generate-m3-theme.mjs. Do not edit by hand.
 * Brand seed: ${SEED}   Accent seed: ${ACCENT_SEED}   Scheme: vibrant   Contrast: 0
 * Neutral/secondary hue: ${NEUTRAL_HUE} (chroma ${SURFACE_CHROMA}/${VARIANT_CHROMA}/${SECONDARY_CHROMA})
 * Regenerate with: pnpm theme
 */

:root {
  color-scheme: light;
${block(light, lightAccent)}
}

.dark {
  color-scheme: dark;
${block(dark, darkAccent)}
}
`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, css, 'utf8')
console.log('Wrote ' + OUT + ' (' + ROLES.length + ' roles x light/dark)')
