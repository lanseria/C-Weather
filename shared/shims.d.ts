interface WeatherData {
  current: {
    time: string
    interval: number
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    is_day: number
    weather_code: number
    wind_speed_10m: number
    wind_direction_10m: number
    us_aqi?: number // 来自空气质量 API
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    us_aqi?: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    wind_speed_10m_max: number[]
    wind_gusts_10m_max: number[]
    us_aqi_mean?: number[] // 模拟或计算平均值
  }
}

// 定义上游天气 API 的响应结构
interface OpenMeteoWeatherResponse {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    is_day: number
    weather_code: number
    wind_speed_10m: number
    wind_direction_10m: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    wind_speed_10m_max: number[]
    wind_gusts_10m_max: number[]
  }
}

// 定义上游空气质量 API 的响应结构
interface OpenMeteoAqiResponse {
  current: {
    us_aqi: number
  }
  hourly: {
    us_aqi: number[]
  }
}
