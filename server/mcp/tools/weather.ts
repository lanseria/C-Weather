import { z } from 'zod'

export default defineMcpTool({
  name: 'get_weather',
  description: '获取指定经纬度的综合气象数据。返回数据包含：1. 实时天气(含温度、湿度、风速风向、AQI)；2. 未来24小时逐小时预报；3. 未来7天逐日预报(含温差、AQI均值)。',
  inputSchema: {
    lat: z.number().describe('纬度坐标'),
    lon: z.number().describe('经度坐标'),
  },
  handler: async ({ lat, lon }) => {
    try {
      // 直接调用公共的 server utility，复用代理配置和数据处理逻辑
      const weatherData = await fetchUpstreamWeather(lat, lon)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(weatherData, null, 2),
          },
        ],
      }
    }
    catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `获取天气数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
          },
        ],
      }
    }
  },
})
