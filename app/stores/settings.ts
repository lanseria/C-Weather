import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export type WindSpeedUnit = 'km/h' | 'm/s' | 'mph' | 'knots' | 'bft'
export type TempUnit = 'celsius' | 'fahrenheit' | 'kelvin'

export const useSettingsStore = defineStore('settings', () => {
  const windSpeedUnit = useLocalStorage<WindSpeedUnit>('weather-settings-wind-unit', 'km/h')
  const tempUnit = useLocalStorage<TempUnit>('weather-settings-temp-unit', 'celsius')

  const windSpeedUnitOptions = {
    'km/h': '千米/小时 (km/h)',
    'm/s': '米/秒 (m/s)',
    'mph': '英里/小时 (mph)',
    'knots': '节 (knots)',
    'bft': '蒲福风级 (Bft)',
  }

  const tempUnitOptions = {
    celsius: '摄氏度 (°C)',
    fahrenheit: '华氏度 (°F)',
    kelvin: '开尔文 (K)',
  }

  function setWindSpeedUnit(unit: WindSpeedUnit) {
    windSpeedUnit.value = unit
  }

  function setTempUnit(unit: TempUnit) {
    tempUnit.value = unit
  }

  return {
    windSpeedUnit,
    windSpeedUnitOptions,
    tempUnit,
    tempUnitOptions,
    setWindSpeedUnit,
    setTempUnit,
  }
})
