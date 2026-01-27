// server/api/weather.get.ts
export default defineEventHandler(async (event) => {
  const { lat, lon } = getQuery(event)

  if (!lat || !lon) {
    throw createError({
      statusCode: 400,
      statusText: 'Latitude and Longitude are required',
    })
  }

  // 调用 server/utils/weather.ts 中的公共方法
  return await fetchUpstreamWeather(Number(lat), Number(lon))
})
