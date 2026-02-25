import { defineStore } from 'pinia'

export const useWeatherStore = defineStore('weather', () => {
  const loading = ref(false)
  const weatherData = ref<WeatherData | null>(null)

  // 获取路由实例以读取参数
  const route = useRoute()

  // 默认坐标配置 (舟山 Zhoushan)
  const DEFAULT_LOCATION = {
    lat: 29.9958,
    lon: 122.2061,
    name: 'Zhoushan',
  }

  // 解析 URL 参数
  const queryLat = Number(route.query.lat)
  const queryLon = Number(route.query.lon)
  const queryName = route.query.name?.toString()

  // 验证参数有效性：必须是数字且不为 NaN
  const hasValidQuery = !Number.isNaN(queryLat) && !Number.isNaN(queryLon)

  // 初始化位置信息
  const location = ref({
    lat: hasValidQuery ? queryLat : DEFAULT_LOCATION.lat,
    lon: hasValidQuery ? queryLon : DEFAULT_LOCATION.lon,
    // 如果有 URL 坐标但没名字，显示 "自定义位置"，否则使用默认名字
    name: hasValidQuery ? (queryName || 'Custom Location') : DEFAULT_LOCATION.name,
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
