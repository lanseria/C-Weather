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
  const getAQIDescription = (aqi: number) => {
    if (aqi <= 50)
      return { text: '优', color: 'text-green-500' }
    if (aqi <= 100)
      return { text: '良', color: 'text-yellow-500' }
    if (aqi <= 150)
      return { text: '轻度污染', color: 'text-orange-500' }
    if (aqi <= 200)
      return { text: '中度污染', color: 'text-red-500' }
    if (aqi <= 300)
      return { text: '重度污染', color: 'text-purple-500' }
    return { text: '严重污染', color: 'text-red-900' }
  }
  /**
   * 获取天气中文名称
   */
  const getWeatherName = (code: number) => {
    const map: Record<number, string> = {
      0: '晴',
      1: '多云',
      2: '多云',
      3: '阴',
      45: '雾',
      48: '雾',
      51: '毛毛雨',
      53: '毛毛雨',
      55: '毛毛雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      66: '冻雨',
      67: '冻雨',
      71: '小雪',
      73: '中雪',
      75: '大雪',
      77: '雪粒',
      80: '阵雨',
      81: '阵雨',
      82: '阵雨',
      85: '阵雪',
      86: '阵雪',
      95: '雷雨',
      96: '雷雨伴冰雹',
      99: '雷雨伴冰雹',
    }
    return map[code] || '未知'
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

  return {
    getWeatherIcon,
    getAQIDescription,
    getWeatherName,
    getWindLevel,
    formatWindSpeed,
  }
}
