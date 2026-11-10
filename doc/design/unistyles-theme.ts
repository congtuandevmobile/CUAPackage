/**
 * Stride design tokens as a react-native-unistyles (v3) theme.
 *
 * The same numbers as `stride.css` in the design canvas. Dark is the primary theme; light is derived so that every
 * text/background pair keeps at least 4.5:1 (3:1 for text of 24 px and more).
 *
 * Usage:
 *   const styles = StyleSheet.create((theme) => ({
 *     card: { ...theme.glass.card, padding: theme.spacing(5) },
 *     title: { ...theme.type.title, color: theme.colors.text.primary },
 *   }))
 */
import { StyleSheet } from 'react-native-unistyles'

const spacing = (n: number) => n * 4

const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const

/** Fonts are loaded by the app (Space Grotesk for numbers and headings, Inter for text). */
const fonts = {
  display: 'SpaceGrotesk-Bold',
  displayMedium: 'SpaceGrotesk-SemiBold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemi: 'Inter-SemiBold',
  mono: 'JetBrainsMono-Medium',
} as const

const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' },
  /** The big numbers: time, distance. Tabular figures so digits do not jitter while counting. */
  metric: { fontFamily: fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  number: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
} as const

/** Durations in ms and spring configs for Reanimated (`withSpring`, `withTiming`). */
const motion = {
  duration: { instant: 120, fast: 200, base: 320, slow: 520 },
  /** cubic-bezier(.2,.8,.2,1) */
  easing: { standard: [0.2, 0.8, 0.2, 1], accelerate: [0.4, 0, 1, 1], decelerate: [0, 0, 0.2, 1] },
  spring: {
    snappy: { damping: 18, stiffness: 260, mass: 1 },
    gentle: { damping: 22, stiffness: 160, mass: 1 },
    /** The record button and sheets. */
    bouncy: { damping: 12, stiffness: 220, mass: 1 },
  },
} as const

const sport = {
  run: '#C8FF3D',
  cycle: '#4FD8FF',
  walk: '#3DDC97',
  swim: '#5B8CFF',
  soccer: '#FFB84D',
  other: '#9B8CFF',
} as const

const darkColors = {
  background: { base: '#07080D', raised: '#0D1018', sunken: '#151A28', overlay: '#1E2438' },
  text: { primary: '#F4F6FB', secondary: '#B4BCD0', tertiary: '#8791A8', onBrand: '#0B1300' },
  brand: { primary: '#C8FF3D', cyan: '#4FD8FF', violet: '#9B8CFF' },
  status: { danger: '#FF5D6C', warning: '#FFB84D', success: '#3DDC97', info: '#5B8CFF' },
  stroke: { glass: 'rgba(255,255,255,0.20)', hairline: 'rgba(255,255,255,0.10)' },
  scrim: 'rgba(3,4,8,0.55)',
  sport,
  /** Record button: coral radial gradient (stops) and its glow. */
  record: { stops: ['#FF9AA3', '#FF5D6C', '#D93A4B'], glow: 'rgba(255,93,108,0.55)' },
} as const

const lightColors = {
  background: { base: '#F4F6FB', raised: '#FFFFFF', sunken: '#E8ECF4', overlay: '#FFFFFF' },
  text: { primary: '#0B1020', secondary: '#4A5368', tertiary: '#667089', onBrand: '#C8FF3D' },
  // On light, the brand colour is ink with volt text; the volt itself is only a fill or a glow.
  brand: { primary: '#0B1020', cyan: '#0A79B8', violet: '#5B4BDB' },
  status: { danger: '#D62C3E', warning: '#A15C00', success: '#0B7A4B', info: '#2F5FE0' },
  stroke: { glass: 'rgba(11,16,32,0.14)', hairline: 'rgba(11,16,32,0.08)' },
  scrim: 'rgba(11,16,32,0.35)',
  sport,
  record: { stops: ['#FF9AA3', '#FF5D6C', '#D93A4B'], glow: 'rgba(255,93,108,0.4)' },
} as const

/**
 * Liquid glass recipes. `blur` is the intensity for the blur view (iOS: UIGlassEffect / UIVisualEffectView on iOS 26+,
 * a Skia backdrop blur or RenderEffect on Android); `fill` is the translucent tint drawn over it; `specular` is the
 * 1.5 px highlight on the top edge that makes it read as glass.
 */
const glass = (dark: boolean) => ({
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: dark ? darkColors.stroke.glass : lightColors.stroke.glass },
  blur: { regular: 26, strong: 34 },
  saturation: 1.9,
  fill: dark
    ? { from: 'rgba(255,255,255,0.17)', to: 'rgba(255,255,255,0.05)' }
    : { from: 'rgba(255,255,255,0.72)', to: 'rgba(255,255,255,0.40)' },
  specular: dark ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.9)',
})

const base = {
  spacing,
  radius,
  fonts,
  type,
  motion,
  /** Hit targets: nothing tappable is smaller than 44 px. */
  hit: { min: 44, button: 52, field: 56, tabBar: 72, record: 76 },
  layout: { screenPadding: 20, tabBarBottom: 26 },
} as const

export const darkTheme = { ...base, colors: darkColors, glass: glass(true), isDark: true } as const
export const lightTheme = { ...base, colors: lightColors, glass: glass(false), isDark: false } as const

export const breakpoints = { xs: 0, sm: 360, md: 430, lg: 744, xl: 1024 } as const

type AppThemes = { dark: typeof darkTheme; light: typeof lightTheme }
type AppBreakpoints = typeof breakpoints

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: { dark: darkTheme, light: lightTheme },
  breakpoints,
  settings: { adaptiveThemes: true },
})
