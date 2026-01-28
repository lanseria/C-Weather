import { defineStore } from 'pinia'

export const useWeatherStore = defineStore('weather', () => {
  const loading = ref(false)
  const weatherData = ref<WeatherData | null>(null)

  // 默认坐标 (舟山 Zhoushan)
  const location = ref({
    lat: 29.9958,
    lon: 122.2061,
    name: 'Zhoushan',
  })

  const fetchWeather = async (lat?: number, lon?: number) => {
    if (lat)
      location.value.lat = lat
    if (lon)
      location.value.lon = lon

    loading.value = true
    try {
      // 调用后端 API 代理
      const data = await $fetch('/api/weather', {
        query: {
          lat: location.value.lat,
          lon: location.value.lon,
        },
      })

      // 数据结构已在后端处理好，直接赋值
      weatherData.value = data as WeatherData
    }
    catch (e) {
      console.error('Failed to fetch weather data', e)
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    weatherData,
    location,
    fetchWeather,
  }
})
