import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export type WindSpeedUnit = 'km/h' | 'm/s' | 'mph' | 'knots' | 'bft'

export const useSettingsStore = defineStore('settings', () => {
  // 使用 useLocalStorage 将用户设置持久化到 localStorage
  const windSpeedUnit = useLocalStorage<WindSpeedUnit>('weather-settings-wind-unit', 'km/h')

  // 定义所有可用单位及其显示标签
  const windSpeedUnitOptions = {
    'km/h': '千米/小时 (km/h)',
    'm/s': '米/秒 (m/s)',
    'mph': '英里/小时 (mph)',
    'knots': '节 (knots)',
    'bft': '蒲福风级 (Bft)',
  }

  function setWindSpeedUnit(unit: WindSpeedUnit) {
    windSpeedUnit.value = unit
  }

  return {
    windSpeedUnit,
    windSpeedUnitOptions,
    setWindSpeedUnit,
  }
})
