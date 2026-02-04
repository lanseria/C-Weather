import type { WindSpeedUnit } from '~/stores/settings'
import { useSettingsStore } from '~/stores/settings'

export function useWeatherUtils() {
  const settingsStore = useSettingsStore()
  /**
   * 将 WMO Weather Code 转换为 Weather Icons (wi) 类名
   * https://erikflowers.github.io/weather-icons/
   */
  const getWeatherIcon = (code: number, isDay: number = 1) => {
    // 0: Clear sky
    if (code === 0)
      return isDay ? 'i-wi-day-sunny' : 'i-wi-night-clear'

    // 1, 2: Mainly clear, partly cloudy
    if ([1, 2].includes(code))
      return isDay ? 'i-wi-day-cloudy' : 'i-wi-night-alt-cloudy'

    // 3: Overcast
    if (code === 3)
      return 'i-wi-cloudy'

    // 45, 48: Fog
    if ([45, 48].includes(code))
      return 'i-wi-fog'

    // 51, 53, 55: Drizzle
    if ([51, 53, 55].includes(code))
      return 'i-wi-sprinkle'

    // 61, 63, 65: Rain
    if ([61, 63, 65].includes(code))
      return 'i-wi-rain'

    // 66, 67: Freezing Rain
    if ([66, 67].includes(code))
      return 'i-wi-rain-mix'

    // 71, 73, 75: Snow fall
    if ([71, 73, 75].includes(code))
      return 'i-wi-snow'

    // 77: Snow grains
    if (code === 77)
      return 'i-wi-snow'

    // 80, 81, 82: Rain showers
    if ([80, 81, 82].includes(code))
      return 'i-wi-showers'

    // 85, 86: Snow showers
    if ([85, 86].includes(code))
      return 'i-wi-snow'

    // 95, 96, 99: Thunderstorm
    if ([95, 96, 99].includes(code))
      return 'i-wi-thunderstorm'

    return 'i-wi-na'
  }

  /**
   * 获取空气质量描述
   */
  const getAQIDescription = (aqi?: number | null) => {
    // 处理空值或无效值
    if (aqi === null || aqi === undefined)
      return { text: '无数据', color: 'text-gray-400' }

    const levels = [
      { max: 50, text: '优', color: 'text-green-500' },
      { max: 100, text: '良', color: 'text-yellow-500' },
      { max: 150, text: '轻度', color: 'text-orange-500' },
      { max: 200, text: '中度', color: 'text-red-500' },
      { max: 300, text: '重度', color: 'text-purple-500' },
      { max: Infinity, text: '严重', color: 'text-red-900' },
    ]

    return levels.find(level => aqi <= level.max) || levels[levels.length - 1]!
  }
  /**
   * WMO 天气代码到中文名称的映射表
   * 移出函数体避免重复创建，提高性能
   */
  const WEATHER_CODE_MAP: Record<number, string> = {
    0: '晴朗',
    1: '晴间多云',
    2: '多云',
    3: '阴天',
    45: '雾',
    48: '沉积性雾凇',
    51: '轻微毛毛雨',
    53: '中等毛毛雨',
    55: '密集毛毛雨',
    56: '轻微冻毛毛雨',
    57: '密集冻毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '轻微冻雨',
    67: '强冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '轻微阵雨',
    81: '中等阵雨',
    82: '强阵雨',
    85: '轻微阵雪',
    86: '强阵雪',
    95: '雷暴',
    96: '雷暴伴有小冰雹',
    99: '雷暴伴有大冰雹',
  }

  /**
   * 获取天气中文名称
   * @param code Open-Meteo (WMO) 天气代码
   */
  const getWeatherName = (code: number): string => {
  // 使用 in 操作符检查 key 是否存在，比 map[code] || '未知' 更严谨（防止 code 为 0 时逻辑判断失误）
    return code in WEATHER_CODE_MAP ? WEATHER_CODE_MAP[code]! : '未知'
  }

  /**
   * km/h 转换为风力等级
   */
  const getWindLevel = (speed: number) => {
    if (speed < 1)
      return 0
    if (speed < 6)
      return 1
    if (speed < 12)
      return 2
    if (speed < 20)
      return 3
    if (speed < 29)
      return 4
    if (speed < 39)
      return 5
    if (speed < 50)
      return 6
    if (speed < 62)
      return 7
    if (speed < 75)
      return 8
    if (speed < 89)
      return 9
    if (speed < 103)
      return 10
    return 11
  }

  /**
   * 格式化风速，根据全局设置返回带单位的字符串
   * @param speedInKmh 速度 (km/h)
   * @param unit 目标单位 (可选, 默认为 Pinia store 中的值)
   */
  const formatWindSpeed = (speedInKmh: number, unit?: WindSpeedUnit) => {
    const targetUnit = unit || settingsStore.windSpeedUnit
    const speed = Math.round(speedInKmh)

    switch (targetUnit) {
      case 'bft':
        return `${getWindLevel(speed)} 级`
      case 'm/s':
        return `${(speed / 3.6).toFixed(1)} m/s`
      case 'mph':
        return `${(speed / 1.609).toFixed(1)} mph`
      case 'knots':
        return `${(speed / 1.852).toFixed(1)} knots`
      case 'km/h':
      default:
        return `${speed} km/h`
    }
  }

  /**
   * 格式化温度
   * @param celsius 摄氏度数值
   * @param showUnit 是否显示单位符号
   */
  const formatTemperature = (celsius: number, showUnit = true) => {
    const unit = settingsStore.tempUnit
    let value: number
    let suffix: string

    switch (unit) {
      case 'fahrenheit':
        value = (celsius * 9) / 5 + 32
        suffix = '°F'
        break
      case 'kelvin':
        value = celsius + 273.15
        suffix = ' K'
        break
      case 'celsius':
      default:
        value = celsius
        suffix = '°'
    }

    return `${Math.round(value)}${showUnit ? suffix : ''}`
  }

  return {
    getWeatherIcon,
    getAQIDescription,
    getWeatherName,
    getWindLevel,
    formatWindSpeed,
    formatTemperature,
  }
}
