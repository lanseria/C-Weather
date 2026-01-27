import { z } from 'zod'

export default defineMcpTool({
  name: 'get_weather',
  description: '获取指定位置的实时天气数据，包括温度、湿度、空气质量等信息',
  inputSchema: {
    lat: z.number().describe('纬度坐标'),
    lon: z.number().describe('经度坐标'),
  },
  handler: async ({ lat, lon }) => {
    try {
      const weatherData = await $fetch('/api/weather', {
        query: { lat, lon },
      })

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
