// 城市画像服务 - 简化版本
export class CityProfileService {
  static async getCityProfile(cityId: string) {
    // 返回模拟数据
    return {
      cityId,
      cityName: '示例城市',
      population: 1000000,
      gdp: 50000000000,
      averageIncome: 50000
    };
  }
}
