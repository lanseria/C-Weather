// server/api/weather.get.ts
export default defineEventHandler(async (event) => {
  const { lat, lon } = getQuery(event)

  if (!lat || !lon) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Latitude and Longitude are required',
    })
  }

  // 构建 Open-Meteo 请求 URL
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max&timezone=auto`
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&hourly=us_aqi`

  try {
    // 并行请求上游数据
    // 并行请求上游数据
    const [weatherRes, aqiRes] = await Promise.all([
      $fetch<OpenMeteoWeatherResponse>(weatherUrl),
      $fetch<OpenMeteoAqiResponse>(aqiUrl),
    ])

    // 在服务端处理数据聚合，返回前端需要的结构 (匹配 WeatherData 类型)
    return {
      current: {
        ...weatherRes.current,
        us_aqi: aqiRes.current?.us_aqi,
      },
      hourly: {
        ...weatherRes.hourly,
        us_aqi: aqiRes.hourly?.us_aqi,
      },
      daily: {
        ...weatherRes.daily,
        // 计算每日 AQI 参考值 (取每日中午 12 点的数据)
        us_aqi_mean: aqiRes.hourly?.us_aqi
          ? aqiRes.hourly.us_aqi.filter((_: any, i: number) => i % 24 === 12).slice(0, 7)
          : [],
      },
    }
  }
  catch (error) {
    console.error('Weather API Error:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch weather data from upstream',
    })
  }
})
