import axios from 'axios';
import { logger } from '../utils/logger';

interface AmapResponse {
  status: string;
  info: string;
  regeocode?: {
    formatted_address: string;
    addressComponent: {
      province: string;
      city: string;
      district: string;
      street: string;
      location: string;
    };
  };
  geocodes?: Array<{
    location: string;
    formatted_address: string;
    province: string;
    city: string;
    district: string;
  }>;
  lives?: Array<any>;
  forecasts?: Array<any>;
  pois?: Array<any>;
  count?: number;
  route?: any;
  districts?: Array<any>;
}

// 地图服务配置
const MAP_CONFIG = {
  AMAP: {
    WEB_API_KEY: process.env['AMAP_WEB_API_KEY'] || '6ca87ddc68113a085ad770fcd6a3d5d9',
    JS_API_KEY: process.env['AMAP_JS_API_KEY'] || '3a51e6e2bf985bab2a047fa4aaa23fe2',
    BASE_URL: 'https://restapi.amap.com/v3',
  },
};

// 高德地图API服务
export class AmapService {
  // 逆地理编码
  static async reverseGeocode(longitude: number, latitude: number): Promise<any> {
    try {
      const response = await axios.get(
        `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${longitude},${latitude}&key=${MAP_CONFIG.AMAP.WEB_API_KEY}`
      );
      const data: any = response.data;
      if (data.status === '1') {
        return {
          success: true,
          address: data.regeocode.formatted_address,
          province: data.regeocode.addressComponent.province,
          city: data.regeocode.addressComponent.city,
          district: data.regeocode.addressComponent.district,
          street: data.regeocode.addressComponent.street,
          location: data.regeocode.addressComponent.location,
        };
      } else {
        throw new Error(`高德地图API返回错误: ${data.info}`);
      }
    } catch (error) {
      logger.error('高德地图逆地理编码失败:', error);
      throw new Error('高德地图逆地理编码请求失败');
    }
  }

  // 地理编码
  static async geocode(address: string): Promise<any> {
    try {
      const response = await axios.get(
        `${MAP_CONFIG.AMAP.BASE_URL}/geocode/geo?key=${MAP_CONFIG.AMAP.WEB_API_KEY}&address=${encodeURIComponent(address)}&output=json`
      );
      const data: any = response.data;
      
      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const location = data.geocodes[0].location.split(',');
        return {
          success: true,
          longitude: parseFloat(location[0]),
          latitude: parseFloat(location[1]),
          formatted_address: data.geocodes[0].formatted_address,
          province: data.geocodes[0].province,
          city: data.geocodes[0].city,
          district: data.geocodes[0].district,
        };
      } else {
        throw new Error(`高德地图API返回错误: ${data.info}`);
      }
    } catch (error) {
      logger.error('高德地图地理编码失败:', error);
      throw error;
    }
  }

  // 天气查询
  static async getWeather(city: string): Promise<any> {
    try {
      const response = await axios.get(
        `${MAP_CONFIG.AMAP.BASE_URL}/weather/weatherInfo?key=${MAP_CONFIG.AMAP.WEB_API_KEY}&city=${encodeURIComponent(city)}&extensions=all&output=json`
      );
      const data: any = response.data;
      
      if (data.status === '1') {
        return {
          success: true,
          current: data.lives?.[0] || null,
          forecast: data.forecasts?.[0] || null,
        };
      } else {
        throw new Error(`高德地图API返回错误: ${data.info}`);
      }
    } catch (error) {
      logger.error('高德地图天气查询失败:', error);
      throw error;
    }
  }

  // 周边搜索
  static async searchNearby(longitude: number, latitude: number, keywords: string, radius: number = 3000): Promise<any> {
    try {
      const response = await axios.get(
        `${MAP_CONFIG.AMAP.BASE_URL}/place/around?key=${MAP_CONFIG.AMAP.WEB_API_KEY}&location=${longitude},${latitude}&keywords=${encodeURIComponent(keywords)}&radius=${radius}&output=json`
      );
      const data: any = response.data;
      
      if (data.status === '1') {
        return {
          success: true,
          pois: data.pois || [],
          count: data.count || 0,
        };
      } else {
        throw new Error(`高德地图API返回错误: ${data.info}`);
      }
    } catch (error) {
      logger.error('高德地图周边搜索失败:', error);
      throw error;
    }
  }

  // 路径规划
  static async routePlanning(origin: string, destination: string, strategy: string = '0'): Promise<any> {
    try {
      const response = await axios.get(
        `${MAP_CONFIG.AMAP.BASE_URL}/direction/walking?key=${MAP_CONFIG.AMAP.WEB_API_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&strategy=${strategy}&output=json`
      );
      const data: any = response.data;
      
      if (data.status === '1') {
        return {
          success: true,
          route: data.route || null,
        };
      } else {
        throw new Error(`高德地图API返回错误: ${data.info}`);
      }
    } catch (error) {
      logger.error('高德地图路径规划失败:', error);
      throw error;
    }
  }

  // 获取城市信息
  static async getCityInfo(cityName: string): Promise<any> {
    try {
      const response = await axios.get(
        `${MAP_CONFIG.AMAP.BASE_URL}/config/district?key=${MAP_CONFIG.AMAP.WEB_API_KEY}&keywords=${encodeURIComponent(cityName)}&subdistrict=0&output=json`
      );
      const data: any = response.data;
      
      if (data.status === '1' && data.districts && data.districts.length > 0) {
        return {
          success: true,
          city: data.districts[0],
        };
      } else {
        throw new Error(`高德地图API返回错误: ${data.info}`);
      }
    } catch (error) {
      logger.error('高德地图城市信息查询失败:', error);
      throw error;
    }
  }
}

// 地图服务管理器
export class MapServiceManager {
  // 获取位置详细信息
  static async getLocationDetails(longitude: number, latitude: number) {
    try {
      const [geocodeResult, weatherResult] = await Promise.allSettled([
        AmapService.reverseGeocode(longitude, latitude),
        AmapService.getWeather('北京') // 默认查询北京天气
      ]);

      const result: any = {
        location: null,
        weather: null,
      };

      if (geocodeResult.status === 'fulfilled') {
        result.location = geocodeResult.value;
        // 如果获取到城市信息，查询该城市的天气
        if (result.location.city) {
          try {
            const cityWeather = await AmapService.getWeather(result.location.city);
            result.weather = cityWeather;
          } catch (error) {
            logger.warn('获取城市天气失败:', error);
          }
        }
      }

      if (weatherResult.status === 'fulfilled' && !result.weather) {
        result.weather = weatherResult.value;
      }

      return result;
    } catch (error) {
      logger.error('获取位置详细信息失败:', error);
      throw error;
    }
  }

  // 分析选址数据
  static async analyzeLocation(location: string) {
    try {
      // 地理编码获取坐标
      const geocodeResult = await AmapService.geocode(location);
      
      if (!geocodeResult.success) {
        throw new Error('无法获取位置坐标');
      }

      // 搜索周边设施
      const nearbyResults = await Promise.allSettled([
        AmapService.searchNearby(geocodeResult.longitude, geocodeResult.latitude, '餐饮'),
        AmapService.searchNearby(geocodeResult.longitude, geocodeResult.latitude, '商场'),
        AmapService.searchNearby(geocodeResult.longitude, geocodeResult.latitude, '学校'),
        AmapService.searchNearby(geocodeResult.longitude, geocodeResult.latitude, '地铁站'),
      ]);

      const analysis = {
        location: geocodeResult,
        nearby: {
          restaurants: nearbyResults[0].status === 'fulfilled' ? nearbyResults[0].value : null,
          malls: nearbyResults[1].status === 'fulfilled' ? nearbyResults[1].value : null,
          schools: nearbyResults[2].status === 'fulfilled' ? nearbyResults[2].value : null,
          subways: nearbyResults[3].status === 'fulfilled' ? nearbyResults[3].value : null,
        },
        score: 0,
        recommendations: [],
      };

      // 计算选址评分
      let score = 0;
      const recommendations = [];

      // 餐饮竞争分析
      if (analysis.nearby.restaurants?.pois) {
        const restaurantCount = analysis.nearby.restaurants.pois.length;
        if (restaurantCount < 10) {
          score += 20;
          recommendations.push('周边餐饮竞争较少，适合开设热狗店');
        } else if (restaurantCount < 30) {
          score += 10;
          recommendations.push('周边餐饮竞争适中，需要差异化经营');
        } else {
          score -= 10;
          recommendations.push('周边餐饮竞争激烈，需要独特定位');
        }
      }

      // 人流量分析
      if (analysis.nearby.malls?.pois || analysis.nearby.schools?.pois || analysis.nearby.subways?.pois) {
        const totalPOIs = (analysis.nearby.malls?.pois?.length || 0) + 
                         (analysis.nearby.schools?.pois?.length || 0) + 
                         (analysis.nearby.subways?.pois?.length || 0);
        
        if (totalPOIs > 5) {
          score += 30;
          recommendations.push('周边人流量充足，适合开设热狗店');
        } else if (totalPOIs > 2) {
          score += 15;
          recommendations.push('周边人流量一般，需要加强营销');
        } else {
          score -= 15;
          recommendations.push('周边人流量较少，需要谨慎考虑');
        }
      }

      analysis.score = Math.max(0, Math.min(100, score));
      analysis.recommendations = recommendations;

      return analysis;
    } catch (error) {
      logger.error('分析选址数据失败:', error);
      throw error;
    }
  }
} 