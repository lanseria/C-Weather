<script setup lang="ts">
import { useWeatherStore } from '~/stores/weather'

/**
 * iOS 天气风格动态背景
 * 根据当前 WMO 天气代码 + 昼夜标识渲染对应的天空渐变与特效：
 * 晴/多云 (太阳月亮星空流星)、阴、雾、雨、雪、雷暴 (闪电)
 */

type SceneType = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow'

interface Scene {
  type: SceneType
  /** 降水强度 0~1，决定雨雪粒子密度与速度 */
  intensity: number
}

interface Drop { x: number, y: number, len: number, vy: number, vx: number, kx: number, ky: number, alpha: number, width: number }
interface Flake { x: number, y: number, r: number, vy: number, phase: number, wobble: number, drift: number, alpha: number }
interface Star { x: number, y: number, r: number, phase: number, speed: number, alpha: number }
interface Meteor { x: number, y: number, vx: number, vy: number, life: number, maxLife: number }
interface CloudCfg { top: number, width: number, duration: number, delay: number, opacity: number, blur: number }

const weatherStore = useWeatherStore()
const reducedMotion = usePreferredReducedMotion()

const current = computed(() => weatherStore.weatherData?.current)

/** WMO 天气代码 -> 场景 */
function sceneFromCode(code: number | undefined): Scene {
  if (code === undefined)
    return { type: 'clear', intensity: 0 }
  if (code <= 1)
    return { type: 'clear', intensity: 0 }
  if (code === 2)
    return { type: 'partly', intensity: 0 }
  if (code === 3)
    return { type: 'cloudy', intensity: 0 }
  if (code === 45 || code === 48)
    return { type: 'fog', intensity: 0 }
  if ([51, 53, 55, 56, 57].includes(code))
    return { type: 'rain', intensity: 0.3 }
  if ([61, 80].includes(code))
    return { type: 'rain', intensity: 0.55 }
  if ([63, 66, 81].includes(code))
    return { type: 'rain', intensity: 0.75 }
  if ([65, 67, 82].includes(code))
    return { type: 'rain', intensity: 1 }
  if ([71, 77, 85].includes(code))
    return { type: 'snow', intensity: 0.5 }
  if (code === 73)
    return { type: 'snow', intensity: 0.75 }
  if ([75, 86].includes(code))
    return { type: 'snow', intensity: 1 }
  if ([95, 96, 99].includes(code))
    return { type: 'storm', intensity: 1 }
  return { type: 'clear', intensity: 0 }
}

const scene = computed<Scene>(() => sceneFromCode(current.value?.weather_code))

const isNight = computed(() => {
  // 有数据时以 API 的昼夜标识为准，无数据时按本地时间估算 (6:00-18:00 视为白天)
  if (current.value)
    return current.value.is_day === 0
  const hour = new Date().getHours()
  return hour < 6 || hour >= 18
})

// --- 天空配色 (三段垂直渐变，参考 iOS 天气) ---
const SKY: Record<SceneType, { day: [string, string, string], night: [string, string, string] }> = {
  clear: {
    day: ['#1c6dd0', '#4d9fe8', '#a3d4f7'],
    night: ['#01040f', '#0a1a38', '#1c3a66'],
  },
  partly: {
    day: ['#2e77bd', '#5f9cd4', '#a9c9e3'],
    night: ['#040a1a', '#122847', '#2a4a73'],
  },
  cloudy: {
    day: ['#4d627e', '#7789a1', '#a9b8c6'],
    night: ['#0b111b', '#1c2634', '#323f52'],
  },
  fog: {
    day: ['#6f8291', '#96a5b0', '#c2ccd3'],
    night: ['#10161d', '#232c36', '#3f4a55'],
  },
  rain: {
    day: ['#3a5474', '#5b7899', '#8ba2ba'],
    night: ['#070c15', '#141f33', '#27374f'],
  },
  storm: {
    day: ['#2b3345', '#454f68', '#6a768f'],
    night: ['#070910', '#141a28', '#232c3e'],
  },
  snow: {
    day: ['#607488', '#8fa2b4', '#c6d3de'],
    night: ['#0d1420', '#22314a', '#3c5170'],
  },
}

const skyStops = computed(() => isNight.value ? SKY[scene.value.type].night : SKY[scene.value.type].day)
const skyGradient = computed(() => `linear-gradient(180deg, ${skyStops.value[0]} 0%, ${skyStops.value[1]} 55%, ${skyStops.value[2]} 100%)`)
const skyKey = computed(() => `${scene.value.type}-${isNight.value}`)

// 移动端浏览器地址栏颜色跟随天空
useHead({
  meta: [
    {
      id: 'theme-color',
      name: 'theme-color',
      content: () => skyStops.value[0],
    },
  ],
})

// --- 各场景特效开关 ---
const showStars = computed(() => isNight.value && ['clear', 'partly'].includes(scene.value.type))
const showSun = computed(() => !isNight.value && ['clear', 'partly'].includes(scene.value.type))
const showMoon = computed(() => isNight.value && ['clear', 'partly'].includes(scene.value.type))
const showFog = computed(() => scene.value.type === 'fog')
const isStorm = computed(() => scene.value.type === 'storm')
const precipType = computed<'rain' | 'snow' | null>(() => {
  if (scene.value.type === 'snow')
    return 'snow'
  if (scene.value.type === 'rain' || scene.value.type === 'storm')
    return 'rain'
  return null
})

const canAnimate = computed(() => reducedMotion.value !== 'reduce')

// --- 云层 ---
const CLOUD_TINT: Record<SceneType, { day: string, night: string }> = {
  clear: { day: '255,255,255', night: '255,255,255' },
  partly: { day: '255,255,255', night: '150,165,190' },
  cloudy: { day: '222,230,238', night: '95,110,135' },
  fog: { day: '228,233,238', night: '110,120,135' },
  rain: { day: '188,203,219', night: '75,90,115' },
  storm: { day: '122,134,157', night: '55,65,90' },
  snow: { day: '238,242,248', night: '130,145,170' },
}

const cloudTint = computed(() => isNight.value ? CLOUD_TINT[scene.value.type].night : CLOUD_TINT[scene.value.type].day)
const clouds = ref<CloudCfg[]>([])

function buildClouds() {
  const counts: Record<SceneType, number> = {
    clear: 0,
    partly: 3,
    cloudy: 6,
    fog: 2,
    rain: 7,
    storm: 8,
    snow: 5,
  }
  clouds.value = Array.from({ length: counts[scene.value.type] }, () => {
    const width = 160 + Math.random() * 300
    return {
      top: 2 + Math.random() * 46,
      width,
      duration: 80 + Math.random() * 90,
      delay: -(Math.random() * 150),
      opacity: 0.45 + Math.random() * 0.4,
      blur: 10 + Math.random() * 14,
    }
  })
}

watch([scene, isNight], buildClouds, { immediate: true })

// --- 雾带颜色 ---
const fogColor = computed(() => isNight.value ? 'rgba(150,165,185,0.26)' : 'rgba(255,255,255,0.34)')

// --- 闪电 (雷暴)：递归调度随机间隔的闪光序列，token 失配即停止 ---
const flash = ref(0)
let lightningToken = 0

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function flashSequence() {
  const strikes = Math.random() < 0.4
    ? 2
    : 1
  for (let s = 0; s < strikes; s++) {
    flash.value = 0.55 + Math.random() * 0.35
    await sleep(70)
    flash.value = 0.1
    await sleep(80)
    flash.value = 0.3 + Math.random() * 0.25
    await sleep(120)
    flash.value = 0
    if (s < strikes - 1)
      await sleep(200)
  }
}

function scheduleStrike(token: number) {
  if (token !== lightningToken || !canAnimate.value)
    return
  setTimeout(() => {
    if (token !== lightningToken)
      return
    flashSequence().then(() => scheduleStrike(token))
  }, 2500 + Math.random() * 6500)
}

watch(isStorm, (v) => {
  lightningToken++
  flash.value = 0
  if (v)
    scheduleStrike(lightningToken)
})

// --- Canvas 粒子 (雨/雪/星空/流星) ---
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let W = 0
let H = 0

const drops: Drop[] = []
const flakes: Flake[] = []
const stars: Star[] = []
let meteor: Meteor | null = null
let meteorTimer: ReturnType<typeof setTimeout> | undefined

function seedParticles() {
  drops.length = 0
  flakes.length = 0
  stars.length = 0

  if (showStars.value && W > 0) {
    const count = Math.min(140, Math.round((W * H) / 12000))
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.7,
        r: 0.4 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0005 + Math.random() * 0.0015,
        alpha: 0.25 + Math.random() * 0.6,
      })
    }
  }

  if (precipType.value === 'rain' && W > 0) {
    const count = Math.min(240, Math.round((W * H) / 9000 * scene.value.intensity * 1.4) + 30)
    const wind = current.value?.wind_speed_10m ?? 8
    const slant = Math.min(wind / 45, 1) * 0.45
    for (let i = 0; i < count; i++) {
      const vy = 7 + Math.random() * (6 + scene.value.intensity * 8)
      const vx = vy * slant
      const norm = Math.hypot(vx, vy) || 1
      const len = 10 + Math.random() * 16 * (0.6 + scene.value.intensity)
      drops.push({
        x: Math.random() * (W * 1.2) - W * 0.1,
        y: Math.random() * H,
        len,
        vy,
        vx,
        kx: (vx / norm) * len,
        ky: (vy / norm) * len,
        alpha: 0.25 + Math.random() * 0.35,
        width: Math.random() < 0.2
          ? 1.6
          : 1,
      })
    }
  }

  if (precipType.value === 'snow' && W > 0) {
    const count = Math.min(180, Math.round((W * H) / 11000 * (0.5 + scene.value.intensity)) + 30)
    for (let i = 0; i < count; i++) {
      const r = 1 + Math.random() * 2.6
      flakes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r,
        vy: 0.5 + r * 0.35 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        wobble: 0.008 + Math.random() * 0.02,
        drift: (Math.random() - 0.5) * 0.3,
        alpha: 0.4 + Math.random() * 0.5,
      })
    }
  }

  ensureFrame()
}

// --- 流星 (晴朗夜空彩蛋) ---
function scheduleMeteor() {
  if (meteorTimer) {
    clearTimeout(meteorTimer)
    meteorTimer = undefined
  }
  if (!showStars.value || !canAnimate.value)
    return
  meteorTimer = setTimeout(() => {
    meteorTimer = undefined
    if (!showStars.value || !canAnimate.value)
      return
    const dir = Math.random() < 0.5
      ? -1
      : 1
    const speed = 6 + Math.random() * 3
    meteor = {
      x: W * (0.2 + Math.random() * 0.6),
      y: H * (0.05 + Math.random() * 0.22),
      vx: dir * speed,
      vy: 3 + Math.random() * 2,
      life: 0,
      maxLife: 50 + Math.random() * 25,
    }
    ensureFrame()
  }, 5000 + Math.random() * 11000)
}

function ensureFrame() {
  if (!rafId && canAnimate.value && (drops.length || flakes.length || stars.length || meteor))
    rafId = requestAnimationFrame(frame)
}

function frame(t: number) {
  const c = ctx
  if (!c)
    return
  c.clearRect(0, 0, W, H)

  // 星星闪烁
  if (stars.length) {
    c.fillStyle = '#ffffff'
    for (const s of stars) {
      c.globalAlpha = s.alpha * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase))
      c.beginPath()
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      c.fill()
    }
    c.globalAlpha = 1
  }

  // 流星
  if (meteor) {
    meteor.x += meteor.vx
    meteor.y += meteor.vy
    meteor.life++
    const a = Math.sin(Math.PI * (meteor.life / meteor.maxLife))
    const tailX = meteor.x - meteor.vx * 12
    const tailY = meteor.y - meteor.vy * 12
    const grad = c.createLinearGradient(meteor.x, meteor.y, tailX, tailY)
    grad.addColorStop(0, `rgba(255,255,255,${0.9 * a})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    c.strokeStyle = grad
    c.lineWidth = 1.6
    c.beginPath()
    c.moveTo(meteor.x, meteor.y)
    c.lineTo(tailX, tailY)
    c.stroke()
    if (meteor.life >= meteor.maxLife) {
      meteor = null
      scheduleMeteor()
    }
  }

  // 雨
  if (drops.length) {
    c.lineCap = 'round'
    for (const d of drops) {
      d.x += d.vx
      d.y += d.vy
      if (d.y > H + 20) {
        d.y = -20 - Math.random() * 40
        d.x = Math.random() * (W * 1.2) - W * 0.1
      }
      if (d.x > W + 30)
        d.x -= W * 1.2
      c.strokeStyle = `rgba(210,228,255,${d.alpha})`
      c.lineWidth = d.width
      c.beginPath()
      c.moveTo(d.x, d.y)
      c.lineTo(d.x - d.kx, d.y - d.ky)
      c.stroke()
    }
  }

  // 雪
  for (const f of flakes) {
    f.phase += f.wobble
    f.y += f.vy
    f.x += Math.sin(f.phase) * 0.4 + f.drift
    if (f.y > H + 4) {
      f.y = -4
      f.x = Math.random() * W
    }
    if (f.x > W + 4)
      f.x = -4
    else if (f.x < -4)
      f.x = W + 4
    c.fillStyle = `rgba(255,255,255,${f.alpha})`
    c.beginPath()
    c.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    c.fill()
  }

  rafId = 0
  ensureFrame()
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !ctx)
    return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seedParticles()
}

watch([precipType, showStars, scene], seedParticles)
watch(showStars, (v) => {
  meteor = null
  if (v)
    scheduleMeteor()
  else if (meteorTimer)
    clearTimeout(meteorTimer)
})
watch(canAnimate, (v) => {
  if (v) {
    ensureFrame()
    if (showStars.value)
      scheduleMeteor()
    if (isStorm.value)
      scheduleStrike(lightningToken)
  }
  else {
    if (rafId)
      cancelAnimationFrame(rafId)
    rafId = 0
    meteor = null
    if (meteorTimer)
      clearTimeout(meteorTimer)
    lightningToken++
    flash.value = 0
  }
})

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null
  resize()
  window.addEventListener('resize', resize)
  if (canAnimate.value && showStars.value)
    scheduleMeteor()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  if (rafId)
    cancelAnimationFrame(rafId)
  if (meteorTimer)
    clearTimeout(meteorTimer)
  lightningToken++
})
</script>

<template>
  <div class="pointer-events-none inset-0 fixed z-0 overflow-hidden" aria-hidden="true" :class="{ 'wb-static': !canAnimate }">
    <!-- 天空渐变（场景切换时交叉淡入） -->
    <Transition name="wb-sky">
      <div :key="skyKey" class="inset-0 absolute" :style="{ background: skyGradient }" />
    </Transition>

    <!-- 太阳 / 月亮 -->
    <div v-if="showSun" class="wb-sun" :class="{ 'wb-sun--dim': scene.type === 'partly' }" />
    <div v-if="showMoon" class="wb-moon" />

    <!-- 云层 -->
    <div
      v-for="(c, i) in clouds"
      :key="`${skyKey}-${i}`"
      class="wb-cloud"
      :style="{
        top: `${c.top}%`,
        width: `${c.width}px`,
        height: `${Math.round(c.width * 0.32)}px`,
        background: `rgb(${cloudTint})`,
        opacity: c.opacity,
        filter: `blur(${c.blur}px)`,
        animationDuration: `${c.duration}s`,
        animationDelay: `${c.delay}s`,
      }"
    />

    <!-- 雾带 -->
    <template v-if="showFog">
      <div class="wb-fog wb-fog-1" :style="{ background: `radial-gradient(ellipse at center, ${fogColor} 0%, transparent 70%)` }" />
      <div class="wb-fog wb-fog-2" :style="{ background: `radial-gradient(ellipse at center, ${fogColor} 0%, transparent 70%)` }" />
      <div class="wb-fog wb-fog-3" :style="{ background: `radial-gradient(ellipse at center, ${fogColor} 0%, transparent 70%)` }" />
    </template>

    <!-- 雨雪/星空粒子画布 -->
    <canvas ref="canvasRef" class="h-full w-full inset-0 absolute" />

    <!-- 雷暴闪电 -->
    <div class="wb-flash" :style="{ opacity: flash }" />
  </div>
</template>

<style scoped>
/* --- 天空交叉淡入 --- */
.wb-sky-enter-active,
.wb-sky-leave-active {
  transition: opacity 1.6s ease;
}

.wb-sky-enter-from,
.wb-sky-leave-to {
  opacity: 0;
}

/* --- 太阳 --- */
.wb-sun {
  position: absolute;
  top: 6%;
  right: 10%;
  width: 24vmin;
  height: 24vmin;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 252, 230, 0.95) 0%,
    rgba(255, 236, 170, 0.5) 30%,
    rgba(255, 226, 140, 0) 70%
  );
  animation: wb-breathe 9s ease-in-out infinite alternate;
}

.wb-sun--dim {
  opacity: 0.55;
  width: 16vmin;
  height: 16vmin;
}

@keyframes wb-breathe {
  from {
    transform: scale(1);
  }

  to {
    transform: scale(1.08);
  }
}

/* --- 月亮 --- */
.wb-moon {
  position: absolute;
  top: 8%;
  right: 13%;
  width: 7vmin;
  height: 7vmin;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 36%, #fbfcf4, #dde3ee 62%, #b9c2d4);
  box-shadow:
    0 0 18px 4px rgba(226, 234, 255, 0.35),
    0 0 60px 18px rgba(198, 214, 255, 0.18);
}

/* --- 云层 --- */
.wb-cloud {
  position: absolute;
  left: 0;
  border-radius: 999px;
  animation: wb-drift linear infinite;
  will-change: transform;
}

.wb-cloud::before,
.wb-cloud::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: inherit;
}

.wb-cloud::before {
  width: 46%;
  height: 210%;
  left: 16%;
  bottom: 22%;
}

.wb-cloud::after {
  width: 34%;
  height: 150%;
  right: 16%;
  bottom: 28%;
}

@keyframes wb-drift {
  from {
    transform: translateX(-45vw);
  }

  to {
    transform: translateX(115vw);
  }
}

/* --- 雾带 --- */
.wb-fog {
  position: absolute;
  left: -20%;
  width: 140%;
  height: 26vh;
  filter: blur(18px);
  animation: wb-fog-drift 28s ease-in-out infinite alternate;
}

.wb-fog-1 {
  top: 30%;
}

.wb-fog-2 {
  top: 52%;
  height: 20vh;
  animation-duration: 22s;
  animation-delay: -8s;
  opacity: 0.8;
}

.wb-fog-3 {
  top: 70%;
  height: 30vh;
  animation-duration: 34s;
  animation-delay: -15s;
  opacity: 0.9;
}

@keyframes wb-fog-drift {
  from {
    transform: translateX(-6%);
  }

  to {
    transform: translateX(8%);
  }
}

/* --- 闪电闪光层 --- */
.wb-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 18%,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(230, 238, 255, 0.28) 40%,
    rgba(230, 238, 255, 0.06) 100%
  );
  opacity: 0;
  transition: opacity 90ms linear;
}

/* --- 减弱动态效果 (prefers-reduced-motion) --- */
.wb-static .wb-sun,
.wb-static .wb-cloud,
.wb-static .wb-fog {
  animation: none;
}
</style>
