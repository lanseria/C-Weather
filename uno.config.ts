// 导入 wi 图标集数据
import wi from '@iconify-json/wi/icons.json'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

// 动态生成所有 wi 图标的 class 名称 (例如: i-wi-day-sunny)
const wiSafelist = Object.keys(wi.icons).map(icon => `i-wi-${icon}`)

export default defineConfig({
  theme: {
    colors: {
      // 定义项目主色调 (使用 Tailwind Blue)
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
        DEFAULT: '#2563eb', // 对应 blue-600
      },
    },
  },
  shortcuts: [
    // 按钮样式更新为使用 primary 色
    ['btn', 'px-4 py-2.5 rounded-lg inline-flex items-center justify-center gap-2 bg-primary text-white cursor-pointer transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 shadow-sm font-medium'],
    ['icon-btn', 'inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-primary'],
    // 统一的输入框样式
    ['input-base', 'w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors text-sm'],
  ],
  presets: [
    presetWind4({
      preflights: {
        reset: true,
      },
    }),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'DM Sans',
        serif: 'DM Serif Display',
        mono: 'DM Mono',
      },
      processors: createLocalFontProcessor(),
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  // 添加白名单，确保动态生成的图标类名不会被 UnoCSS 忽略
  safelist: [
    ...wiSafelist,
    'i-tabler-leaf',
    // AQI 状态颜色白名单 (用于动态生成的 bg- 类名)
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-red-900',
  ],
})
