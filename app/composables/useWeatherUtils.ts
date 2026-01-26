export function useWeatherUtils() {
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

  return {
    getWeatherIcon,
    getAQIDescription,
  }
}
