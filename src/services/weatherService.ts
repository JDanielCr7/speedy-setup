// weatherService — Punto de extensión futuro.
//
// En esta versión demo la información climática se ingresa manualmente en el
// formulario de registro. Posteriormente este servicio obtendrá automáticamente
// temperatura, precipitación, humedad, condición climática y velocidad del
// viento desde una API meteorológica, sin cambiar el modelo WashingRecord.

export interface WeatherSnapshot {
  condition: string;
  temperature: number;
  precipitation: number;
  humidity: number;
  windSpeed?: number;
}

export const weatherService = {
  /**
   * No implementado en la demo. Devolverá las condiciones actuales para una
   * zona cuando se conecte la API meteorológica.
   */
  async getCurrentWeather(_zone: string): Promise<WeatherSnapshot | null> {
    return null;
  },
};
