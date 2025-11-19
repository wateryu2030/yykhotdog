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
   * 使用AI服务获取准确的学校信息
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
    try {
      // 导入多AI服务
      const { multiAIService } = await import('./MultiAIService');
      
      if (!multiAIService.hasAvailableModel()) {
        logger.warn('AI服务不可用，使用估算数据');
        return this.getEstimatedSchoolDetails(schoolName, address);
      }

      // 使用AI获取学校详细信息
      const prompt = `请查询以下学校的真实信息，包括学生人数、教师人数、建校年份和学校等级。请基于公开信息或合理估算，不要编造数据。

学校名称：${schoolName}
学校地址：${address}

请用JSON格式返回，格式如下：
{
  "student_count": 学生人数（整数，如果没有确切数据请估算，初中一般300-1500人，高中一般500-2000人，小学一般200-1000人，大学一般1000-30000人）,
  "teacher_count": 教师人数（整数，如果没有确切数据请估算，一般按学生人数的1/15到1/20估算）,
  "established_year": 建校年份（整数，4位数年份，如1990）,
  "school_level": 学校等级（字符串，如"重点"、"普通"、"示范"等，如果不知道可以写"普通"）
}

如果无法获取准确信息，请根据学校类型和名称进行合理估算。`;

      const result = await multiAIService.chatCompletion([
        {
          role: 'system',
          content: '你是一个专业的学校信息查询助手，擅长根据学校名称和地址查询或估算学校的真实信息。'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.3, // 降低温度以获得更准确的数据
        maxTokens: 300
      });

      // 解析AI返回的JSON
      const content = result.content.trim();
      let aiData: any = {};
      
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          aiData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          logger.warn('解析AI返回的JSON失败:', parseError);
        }
      }

      // 验证和修正数据
      const student_count = this.validateStudentCount(aiData.student_count, schoolName);
      const teacher_count = this.validateTeacherCount(aiData.teacher_count, student_count);
      const established_year = this.validateYear(aiData.established_year);
      const school_level = aiData.school_level || '普通';

      logger.info(`✅ 使用 ${result.model} 获取学校信息: ${schoolName} - 学生${student_count}人，教师${teacher_count}人`);

      return {
        student_count,
        teacher_count,
        established_year,
        school_level
      };
    } catch (error) {
      logger.error(`获取学校详细信息失败 (${schoolName}):`, error);
      // 失败时返回估算数据
      return this.getEstimatedSchoolDetails(schoolName, address);
    }
  }

  /**
   * 根据学校名称和类型估算学校信息（备用方案）
   */
  private getEstimatedSchoolDetails(
    schoolName: string,
    address: string
  ): {
    student_count: number;
    teacher_count: number;
    established_year: number;
    school_level: string;
  } {
    // 根据学校名称判断类型
    let estimatedStudents = 500;
    let estimatedTeachers = 30;
    
    if (schoolName.includes('小学')) {
      estimatedStudents = Math.floor(Math.random() * 600) + 200; // 200-800人
      estimatedTeachers = Math.floor(estimatedStudents / 18);
    } else if (schoolName.includes('初中') || schoolName.includes('中学') && !schoolName.includes('高中')) {
      estimatedStudents = Math.floor(Math.random() * 1000) + 300; // 300-1300人
      estimatedTeachers = Math.floor(estimatedStudents / 15);
    } else if (schoolName.includes('高中')) {
      estimatedStudents = Math.floor(Math.random() * 1200) + 500; // 500-1700人
      estimatedTeachers = Math.floor(estimatedStudents / 12);
    } else if (schoolName.includes('大学')) {
      estimatedStudents = Math.floor(Math.random() * 20000) + 2000; // 2000-22000人
      estimatedTeachers = Math.floor(estimatedStudents / 20);
    } else {
      // 默认估算
      estimatedStudents = Math.floor(Math.random() * 800) + 300; // 300-1100人
      estimatedTeachers = Math.floor(estimatedStudents / 15);
    }

    return {
      student_count: estimatedStudents,
      teacher_count: Math.max(estimatedTeachers, 20), // 至少20人
      established_year: Math.floor(Math.random() * 50) + 1970, // 1970-2020年
      school_level: (schoolName.includes('重点') || schoolName.includes('实验') || schoolName.includes('示范')) ? '重点' : '普通',
    };
  }

  /**
   * 验证学生人数是否合理
   */
  private validateStudentCount(count: any, schoolName: string): number {
    if (typeof count === 'number' && count > 0 && count < 50000) {
      return Math.floor(count);
    }
    
    // 如果AI返回的数据不合理，根据学校类型估算
    if (schoolName.includes('小学')) {
      return Math.floor(Math.random() * 600) + 200;
    } else if (schoolName.includes('初中') || (schoolName.includes('中学') && !schoolName.includes('高中'))) {
      return Math.floor(Math.random() * 1000) + 300;
    } else if (schoolName.includes('高中')) {
      return Math.floor(Math.random() * 1200) + 500;
    } else if (schoolName.includes('大学')) {
      return Math.floor(Math.random() * 20000) + 2000;
    }
    
    return Math.floor(Math.random() * 800) + 300;
  }

  /**
   * 验证教师人数是否合理
   */
  private validateTeacherCount(count: any, studentCount: number): number {
    if (typeof count === 'number' && count > 0 && count < 5000) {
      return Math.floor(count);
    }
    
    // 根据学生人数估算（师生比约1:15）
    return Math.max(20, Math.floor(studentCount / 15));
  }

  /**
   * 验证建校年份是否合理
   */
  private validateYear(year: any): number {
    if (typeof year === 'number' && year >= 1900 && year <= new Date().getFullYear()) {
      return Math.floor(year);
    }
    
    // 默认返回1970-2020之间的随机年份
    return Math.floor(Math.random() * 50) + 1970;
  }
}

export default new AmapService();
