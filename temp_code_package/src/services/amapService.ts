import axios from 'axios';
import { logger } from '../utils/logger';

interface AmapPOI {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;
  tel: string;
  distance: string;
  business_area: string;
  cityname: string;
  adname: string;
  importance: string;
  shopinfo: string;
  poiweight: string;
  photos: any[];
}

interface AmapResponse {
  status: string;
  count: string;
  infocode: string;
  pois: AmapPOI[];
}

interface SchoolInfo {
  school_name: string;
  school_type: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string;
  description: string;
}

class AmapService {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private baseUrl: string = 'https://restapi.amap.com/v3/place/text';
  private requestDelays: Map<string, number> = new Map(); // 记录每个API Key的请求延迟
  private lastRequestTime: Map<string, number> = new Map(); // 记录每个API Key的最后请求时间
  private cache: Map<string, { data: SchoolInfo[]; timestamp: number }> = new Map(); // 缓存搜索结果
  private cacheExpiry: number = 24 * 60 * 60 * 1000; // 缓存24小时

  constructor() {
    // 从环境变量或配置中获取多个API Key
    this.apiKeys = [
      '6ca87ddc68113a085ad770fcd6a3d5d9', // hotdog2
      'bdca958664f9ce5e3e6cb7aad0fc49ac', // zhhotdog
      '703f67ca1815ae0324022fcf7bc2afe9', // newstore
      '94726e955daa3fa24f48d0b42a17d02d', // newhotdog
      '1d6753a00b98dab6d19aac1f8a080165', // hotdogxuanzhi
    ];

    // 初始化每个API Key的延迟时间（毫秒）
    this.apiKeys.forEach(key => {
      this.requestDelays.set(key, 1000); // 初始延迟1秒
      this.lastRequestTime.set(key, 0);
    });
  }

  /**
   * 根据地区信息搜索学校
   */
  async searchSchools(province: string, city: string, district: string): Promise<SchoolInfo[]> {
    try {
      // 首先检查缓存
      const cachedData = this.getFromCache(province, city, district);
      if (cachedData) {
        return cachedData;
      }

      const keywords = ['小学', '中学', '高中', '大学', '职业学校', '培训机构'];
      const allSchools: SchoolInfo[] = [];

      for (const keyword of keywords) {
        let success = false;
        let attempts = 0;
        const maxAttempts = this.apiKeys.length;

        while (!success && attempts < maxAttempts) {
          try {
            const schools = await this.searchSchoolsByKeyword(keyword, province, city, district);
            allSchools.push(...schools);
            success = true;
            logger.info(
              `使用API Key ${this.currentKeyIndex + 1} 成功搜索到${schools.length}所${keyword}`
            );
          } catch (error) {
            attempts++;
            logger.warn(`搜索${keyword}失败 (尝试 ${attempts}/${maxAttempts}):`, error);

            // 如果当前API Key失败，尝试下一个
            if (error instanceof Error && error.message.includes('USER_DAILY_QUERY_OVER_LIMIT')) {
              this.switchToNextApiKey();
              logger.info(
                `切换到下一个API Key: ${this.currentKeyIndex + 1}/${this.apiKeys.length}`
              );
              // 对于超限错误，等待更长时间
              await this.sleep(5000);
            } else {
              // 如果是其他错误，也尝试下一个API Key
              this.switchToNextApiKey();
              logger.info(
                `切换到下一个API Key: ${this.currentKeyIndex + 1}/${this.apiKeys.length}`
              );
            }
          }
        }

        if (!success) {
          logger.error(`所有API Key都无法搜索${keyword}`);
        }
      }

      // 去重处理
      const uniqueSchools = this.removeDuplicateSchools(allSchools);

      // 保存到缓存
      if (uniqueSchools.length > 0) {
        this.setCache(province, city, district, uniqueSchools);
      }

      logger.info(`在${province}${city}${district}找到${uniqueSchools.length}所学校`);
      return uniqueSchools;
    } catch (error) {
      logger.error('搜索学校失败:', error);
      throw error;
    }
  }

  /**
   * 切换到下一个API Key
   */
  private switchToNextApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
  }

  /**
   * 获取当前API Key
   */
  private getCurrentApiKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * 等待指定时间
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查并等待API Key冷却时间
   */
  private async waitForApiKeyCooldown(apiKey: string): Promise<void> {
    const lastRequest = this.lastRequestTime.get(apiKey) || 0;
    const delay = this.requestDelays.get(apiKey) || 1000;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      logger.info(`API Key ${apiKey} 冷却中，等待 ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime.set(apiKey, Date.now());
  }

  /**
   * 调整API Key的请求延迟
   */
  private adjustApiKeyDelay(apiKey: string, success: boolean): void {
    const currentDelay = this.requestDelays.get(apiKey) || 1000;

    if (success) {
      // 成功时减少延迟，但不少于500ms
      const newDelay = Math.max(500, currentDelay * 0.9);
      this.requestDelays.set(apiKey, newDelay);
      logger.info(`API Key ${apiKey} 延迟调整为 ${newDelay}ms`);
    } else {
      // 失败时增加延迟，但不超过30秒
      const newDelay = Math.min(30000, currentDelay * 1.5);
      this.requestDelays.set(apiKey, newDelay);
      logger.info(`API Key ${apiKey} 延迟调整为 ${newDelay}ms`);
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(province: string, city: string, district: string): string {
    return `${province}-${city}-${district}`;
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(province: string, city: string, district: string): SchoolInfo[] | null {
    const key = this.getCacheKey(province, city, district);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      logger.info(`从缓存获取 ${province}${city}${district} 的学校数据`);
      return cached.data;
    }

    return null;
  }

  /**
   * 保存数据到缓存
   */
  private setCache(province: string, city: string, district: string, data: SchoolInfo[]): void {
    const key = this.getCacheKey(province, city, district);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    logger.info(`缓存 ${province}${city}${district} 的学校数据，共 ${data.length} 条`);
  }

  /**
   * 根据关键词搜索学校
   */
  private async searchSchoolsByKeyword(
    keyword: string,
    province: string,
    city: string,
    district: string
  ): Promise<SchoolInfo[]> {
    const apiKey = this.getCurrentApiKey();

    try {
      // 等待API Key冷却时间
      await this.waitForApiKeyCooldown(apiKey);

      const query = `${keyword} ${district}`;

      const response = await axios.get<AmapResponse>(this.baseUrl, {
        params: {
          key: apiKey,
          keywords: query,
          city: city,
          output: 'json',
          page: 1,
          offset: 25, // 每页最多25条
          extensions: 'all',
        },
      });

      if (response.data.status !== '1') {
        logger.warn(`高德地图API返回错误: ${response.data.infocode}`);
        throw new Error(`高德地图API错误: ${response.data.infocode}`);
      }

      // 成功时调整延迟
      this.adjustApiKeyDelay(apiKey, true);

      return this.convertToSchoolInfo(response.data.pois, province, city, district, keyword);
    } catch (error) {
      // 失败时调整延迟
      this.adjustApiKeyDelay(apiKey, false);
      logger.error(`搜索${keyword}失败:`, error);
      throw error;
    }
  }

  /**
   * 将高德地图POI数据转换为学校信息
   */
  private convertToSchoolInfo(
    pois: AmapPOI[],
    province: string,
    city: string,
    district: string,
    schoolType: string
  ): SchoolInfo[] {
    return pois.map(poi => {
      const [longitude, latitude] = poi.location.split(',').map(coord => parseFloat(coord));

      return {
        school_name: poi.name,
        school_type: this.mapSchoolType(poi.type, schoolType),
        province,
        city,
        district,
        address: poi.address || poi.name,
        latitude,
        longitude,
        contact_phone: poi.tel || '',
        description: `${poi.type} - ${poi.business_area || ''}`,
      };
    });
  }

  /**
   * 映射学校类型
   */
  private mapSchoolType(poiType: string, keyword: string): string {
    if (keyword.includes('小学')) return '小学';
    if (keyword.includes('中学') || keyword.includes('初中')) return '初中';
    if (keyword.includes('高中')) return '高中';
    if (keyword.includes('大学')) return '大学';
    if (keyword.includes('职业')) return '职业学校';
    if (keyword.includes('培训')) return '培训机构';

    // 根据POI类型判断
    if (poiType.includes('小学')) return '小学';
    if (poiType.includes('中学') || poiType.includes('初中')) return '初中';
    if (poiType.includes('高中')) return '高中';
    if (poiType.includes('大学')) return '大学';
    if (poiType.includes('职业')) return '职业学校';
    if (poiType.includes('培训')) return '培训机构';

    return '其他';
  }

  /**
   * 去重学校数据
   */
  private removeDuplicateSchools(schools: SchoolInfo[]): SchoolInfo[] {
    const seen = new Set<string>();
    return schools.filter(school => {
      const key = `${school.school_name}-${school.address}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 获取学校详细信息（包括学生人数等）
   */
  async getSchoolDetails(
    schoolName: string,
    address: string
  ): Promise<{
    student_count: number;
    teacher_count: number;
    established_year: number;
    school_level: string;
  }> {
    // 这里可以集成AI服务来获取更详细的学校信息
    // 目前返回模拟数据
    return {
      student_count: Math.floor(Math.random() * 2000) + 100, // 100-2100人
      teacher_count: Math.floor(Math.random() * 100) + 20, // 20-120人
      established_year: Math.floor(Math.random() * 50) + 1970, // 1970-2020年
      school_level: Math.random() > 0.7 ? '重点' : '普通',
    };
  }
}

export default new AmapService();
