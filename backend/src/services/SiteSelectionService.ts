import axios from 'axios';
import { logger } from '../utils/logger';
import { AmapService } from './MapService';
import { SiteSelection, SiteSelectionStatus } from '../models/SiteSelection';
import { sequelize } from '../config/database';
import { MLSiteSelectionService, MLFeatures } from './MLSiteSelectionService';

// 选址分析结果接口
interface SiteAnalysisResult {
  location: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
  scores: {
    poiDensity: number;
    populationDensity: number;
    trafficAccessibility: number;
    competitionLevel: number;
    rentalCost: number;
    footTraffic: number;
    overallScore: number;
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  predictions: {
    expectedRevenue: number;
    confidence: number;
    breakEvenTime: number; // 月
  };
  data: {
    nearbyPOIs: any[];
    schools: any[];
    competitors: any[];
    trafficStations: any[];
  };
}

// 位置数据接口
interface LocationData {
  poiData: any;
  populationData: any;
  trafficData: any;
  competitionData: any;
  schoolData: any;
}

// 机器学习预测结果接口
interface MLPrediction {
  predictedRevenue: number;
  confidence: number;
  riskFactors: string[];
  successProbability: number;
}

/**
 * 增强版选址服务
 * 提供多维度选址分析和机器学习预测
 */
export class EnhancedSiteSelectionService {
  
  /**
   * 获取完整的位置分析数据
   */
  static async getLocationData(location: string): Promise<LocationData> {
    try {
      logger.info(`开始获取位置数据: ${location}`);
      
      // 1. 获取坐标信息
      const geocodeResult = await AmapService.geocode(location);
      if (!geocodeResult.success) {
        throw new Error('无法获取位置坐标');
      }
      
      const { longitude, latitude } = geocodeResult;
      
      // 2. 并行获取多维度数据
      const [poiData, populationData, trafficData, competitionData, schoolData] = await Promise.allSettled([
        this.getPOIData(longitude, latitude),
        this.getPopulationDensity(longitude, latitude),
        this.getTrafficAccessibility(longitude, latitude),
        this.getCompetitionAnalysis(longitude, latitude),
        this.getSchoolData(longitude, latitude)
      ]);
      
      return {
        poiData: poiData.status === 'fulfilled' ? poiData.value : null,
        populationData: populationData.status === 'fulfilled' ? populationData.value : null,
        trafficData: trafficData.status === 'fulfilled' ? trafficData.value : null,
        competitionData: competitionData.status === 'fulfilled' ? competitionData.value : null,
        schoolData: schoolData.status === 'fulfilled' ? schoolData.value : null
      };
      
    } catch (error) {
      logger.error('获取位置数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取POI数据
   */
  private static async getPOIData(longitude: number, latitude: number): Promise<any> {
    try {
      const radius = 1000; // 1公里半径
      const poiTypes = ['餐饮服务', '购物服务', '生活服务', '体育休闲服务', '医疗保健服务'];
      
      const poiResults = await Promise.allSettled(
        poiTypes.map(type => 
          AmapService.searchNearby(longitude, latitude, type, radius)
        )
      );
      
      const pois = poiResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .flat();
      
      return {
        totalCount: pois.length,
        categories: this.categorizePOIs(pois),
        density: pois.length / (Math.PI * Math.pow(radius/1000, 2)) // 每平方公里POI数量
      };
    } catch (error) {
      logger.error('获取POI数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取人口密度数据
   */
  private static async getPopulationDensity(longitude: number, latitude: number): Promise<any> {
    try {
      // 这里应该调用人口普查数据API或使用历史数据
      // 暂时使用模拟数据，实际应该集成真实的人口数据源
      const populationDensity = this.estimatePopulationDensity(longitude, latitude);
      
      return {
        density: populationDensity,
        level: this.getPopulationLevel(populationDensity),
        source: 'estimated'
      };
    } catch (error) {
      logger.error('获取人口密度数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取交通便利性数据
   */
  private static async getTrafficAccessibility(longitude: number, latitude: number): Promise<any> {
    try {
      const radius = 2000; // 2公里半径
      const [metroStations, busStations, parkingLots] = await Promise.allSettled([
        AmapService.searchNearby(longitude, latitude, '地铁站', radius),
        AmapService.searchNearby(longitude, latitude, '公交站', radius),
        AmapService.searchNearby(longitude, latitude, '停车场', radius)
      ]);
      
      const metroCount = metroStations.status === 'fulfilled' ? metroStations.value.pois?.length || 0 : 0;
      const busCount = busStations.status === 'fulfilled' ? busStations.value.pois?.length || 0 : 0;
      const parkingCount = parkingLots.status === 'fulfilled' ? parkingLots.value.pois?.length || 0 : 0;
      
      return {
        metroStations: metroCount,
        busStations: busCount,
        parkingLots: parkingCount,
        accessibilityScore: this.calculateTrafficScore(metroCount, busCount, parkingCount)
      };
    } catch (error) {
      logger.error('获取交通便利性数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取竞争分析数据
   */
  private static async getCompetitionAnalysis(longitude: number, latitude: number): Promise<any> {
    try {
      const radius = 500; // 500米半径
      const competitors = await AmapService.searchNearby(longitude, latitude, '餐饮服务', radius);
      
      const competitorCount = competitors.pois?.length || 0;
      const competitorTypes = this.analyzeCompetitorTypes(competitors.pois || []);
      
      return {
        totalCompetitors: competitorCount,
        competitorTypes,
        competitionLevel: this.getCompetitionLevel(competitorCount),
        marketSaturation: this.calculateMarketSaturation(competitorCount)
      };
    } catch (error) {
      logger.error('获取竞争分析数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取学校数据
   */
  private static async getSchoolData(longitude: number, latitude: number): Promise<any> {
    try {
      const radius = 1000; // 1公里半径
      const schools = await AmapService.searchNearby(longitude, latitude, '学校', radius);
      
      const schoolCount = schools.pois?.length || 0;
      const schoolTypes = this.analyzeSchoolTypes(schools.pois || []);
      
      return {
        totalSchools: schoolCount,
        schoolTypes,
        studentPopulation: this.estimateStudentPopulation(schoolTypes),
        schoolDensity: schoolCount / (Math.PI * Math.pow(radius/1000, 2))
      };
    } catch (error) {
      logger.error('获取学校数据失败:', error);
      return null;
    }
  }
  
  /**
   * 计算智能评分
   */
  static async calculateLocationScore(locationData: LocationData): Promise<any> {
    try {
      const weights = {
        poiDensity: 0.20,      // POI密度权重
        populationDensity: 0.20, // 人口密度权重
        trafficAccessibility: 0.20, // 交通便利性权重
        competitionLevel: 0.15, // 竞争环境权重
        schoolDensity: 0.15,    // 学校密度权重
        rentalCost: 0.10        // 租金成本权重
      };
      
      const scores = {
        poiDensity: this.calculatePOIScore(locationData.poiData),
        populationDensity: this.calculatePopulationScore(locationData.populationData),
        trafficAccessibility: this.calculateTrafficScore(
          locationData.trafficData?.metroStations || 0,
          locationData.trafficData?.busStations || 0,
          locationData.trafficData?.parkingLots || 0
        ),
        competitionLevel: this.calculateCompetitionScore(locationData.competitionData),
        schoolDensity: this.calculateSchoolScore(locationData.schoolData),
        rentalCost: this.estimateRentalScore(locationData.poiData) // 基于POI密度估算租金
      };
      
      // 计算加权总分
      const overallScore = Object.keys(weights).reduce((total, key) => {
        return total + (scores[key as keyof typeof scores] * weights[key as keyof typeof weights]);
      }, 0);
      
      return {
        scores,
        weights,
        overallScore: Math.round(overallScore * 100) / 100,
        grade: this.getScoreGrade(overallScore)
      };
    } catch (error) {
      logger.error('计算位置评分失败:', error);
      throw error;
    }
  }
  
  /**
   * 机器学习预测
   */
  static async predictStorePerformance(location: string, locationData: LocationData): Promise<MLPrediction> {
    try {
      // 提取机器学习特征
      const mlFeatures = await this.extractMLFeatures(locationData);
      
      // 使用机器学习服务进行预测
      const mlResult = await MLSiteSelectionService.predictWithML(mlFeatures);
      
      return {
        predictedRevenue: mlResult.predictedRevenue,
        confidence: mlResult.confidence,
        riskFactors: mlResult.riskFactors,
        successProbability: mlResult.successProbability
      };
    } catch (error) {
      logger.error('机器学习预测失败:', error);
      // 回退到基于规则的预测
      return this.fallbackPrediction(locationData);
    }
  }
  
  /**
   * 执行完整的选址分析
   */
  static async performSiteAnalysis(location: string): Promise<SiteAnalysisResult> {
    try {
      logger.info(`开始执行选址分析: ${location}`);
      
      // 1. 获取位置数据
      const locationData = await this.getLocationData(location);
      
      // 2. 计算评分
      const scoreResult = await this.calculateLocationScore(locationData);
      
      // 3. 机器学习预测
      const mlPrediction = await this.predictStorePerformance(location, locationData);
      
      // 4. 生成分析报告
      const analysis = this.generateAnalysisReport(scoreResult, mlPrediction, locationData);
      
      // 5. 获取坐标信息
      const geocodeResult = await AmapService.geocode(location);
      
      const result: SiteAnalysisResult = {
        location,
        coordinates: {
          longitude: geocodeResult.longitude,
          latitude: geocodeResult.latitude
        },
        scores: {
          poiDensity: scoreResult.scores.poiDensity,
          populationDensity: scoreResult.scores.populationDensity,
          trafficAccessibility: scoreResult.scores.trafficAccessibility,
          competitionLevel: scoreResult.scores.competitionLevel,
          rentalCost: scoreResult.scores.rentalCost,
          footTraffic: this.estimateFootTraffic(locationData),
          overallScore: scoreResult.overallScore
        },
        analysis: analysis,
        predictions: {
          expectedRevenue: mlPrediction.predictedRevenue,
          confidence: mlPrediction.confidence,
          breakEvenTime: this.calculateBreakEvenTime(mlPrediction.predictedRevenue)
        },
        data: {
          nearbyPOIs: locationData.poiData?.categories || [],
          schools: locationData.schoolData?.schoolTypes || [],
          competitors: locationData.competitionData?.competitorTypes || [],
          trafficStations: this.getTrafficStations(locationData.trafficData)
        }
      };
      
      // 6. 保存到数据库
      await this.saveAnalysisResult(result);
      
      logger.info(`选址分析完成: ${location}, 总分: ${scoreResult.overallScore}`);
      return result;
      
    } catch (error) {
      logger.error('选址分析失败:', error);
      throw error;
    }
  }
  
  // ==================== 辅助方法 ====================
  
  private static categorizePOIs(pois: any[]): any {
    const categories = {};
    pois.forEach(poi => {
      const type = poi.type || '其他';
      categories[type] = (categories[type] || 0) + 1;
    });
    return categories;
  }
  
  private static estimatePopulationDensity(longitude: number, latitude: number): number {
    // 基于坐标估算人口密度，实际应该使用真实数据
    // 这里使用简化的估算方法
    const baseDensity = 5000; // 基础密度
    const variation = Math.sin(longitude) * Math.cos(latitude) * 2000;
    return Math.max(1000, baseDensity + variation);
  }
  
  private static getPopulationLevel(density: number): string {
    if (density > 10000) return '高';
    if (density > 5000) return '中';
    return '低';
  }
  
  private static calculateTrafficScore(metroCount: number, busCount: number, parkingCount: number): number {
    const metroScore = Math.min(metroCount * 15, 40); // 地铁站最多40分
    const busScore = Math.min(busCount * 2, 30); // 公交站最多30分
    const parkingScore = Math.min(parkingCount * 5, 30); // 停车场最多30分
    
    return Math.min(metroScore + busScore + parkingScore, 100);
  }
  
  private static analyzeCompetitorTypes(competitors: any[]): any {
    const types = {};
    competitors.forEach(competitor => {
      const type = competitor.type || '其他';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }
  
  private static getCompetitionLevel(count: number): string {
    if (count > 20) return '高';
    if (count > 10) return '中';
    return '低';
  }
  
  private static calculateMarketSaturation(count: number): number {
    // 基于竞争数量计算市场饱和度
    return Math.min(count * 5, 100);
  }
  
  private static analyzeSchoolTypes(schools: any[]): any {
    const types = {};
    schools.forEach(school => {
      const type = school.type || '其他';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }
  
  private static estimateStudentPopulation(schoolTypes: any): number {
    // 基于学校类型估算学生数量
    const estimates = {
      '小学': 1000,
      '初中': 800,
      '高中': 600,
      '大学': 5000,
      '幼儿园': 200
    };
    
    return Object.keys(schoolTypes).reduce((total, type) => {
      return total + (estimates[type] || 500) * schoolTypes[type];
    }, 0);
  }
  
  private static calculatePOIScore(poiData: any): number {
    if (!poiData) return 0;
    const density = poiData.density || 0;
    return Math.min(density * 2, 100);
  }
  
  private static calculatePopulationScore(populationData: any): number {
    if (!populationData) return 0;
    const density = populationData.density || 0;
    return Math.min(density / 100, 100);
  }
  
  private static calculateCompetitionScore(competitionData: any): number {
    if (!competitionData) return 50; // 默认中等竞争
    const count = competitionData.totalCompetitors || 0;
    // 竞争越少分数越高
    return Math.max(0, 100 - count * 3);
  }
  
  private static calculateSchoolScore(schoolData: any): number {
    if (!schoolData) return 0;
    const density = schoolData.schoolDensity || 0;
    return Math.min(density * 20, 100);
  }
  
  private static estimateRentalScore(poiData: any): number {
    if (!poiData) return 50;
    // POI密度越高，租金可能越高，但商业价值也越高
    const density = poiData.density || 0;
    return Math.min(50 + density * 5, 100);
  }
  
  private static getScoreGrade(score: number): string {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '较差';
  }
  
  /**
   * 提取机器学习特征
   */
  private static async extractMLFeatures(locationData: LocationData): Promise<MLFeatures> {
    // 获取坐标信息（需要从locationData中获取）
    const longitude = 116.3974; // 默认北京坐标，实际应该从地理编码获取
    const latitude = 39.9093;
    
    return await MLSiteSelectionService.extractFeaturesFromLocation(
      'location', longitude, latitude
    );
  }
  
  /**
   * 回退预测方法
   */
  private static fallbackPrediction(locationData: LocationData): MLPrediction {
    const baseRevenue = 50000;
    const multiplier = (
      (locationData.poiData?.density || 0) * 0.3 +
      (locationData.populationData?.density || 0) * 0.2 +
      (locationData.trafficData?.accessibilityScore || 0) * 0.2 +
      (100 - (locationData.competitionData?.totalCompetitors || 0)) * 0.2 +
      (locationData.schoolData?.schoolDensity || 0) * 0.1
    ) / 100;
    
    const predictedRevenue = baseRevenue * (0.5 + multiplier);
    const confidence = Math.min(0.7 + multiplier * 0.3, 0.95);
    
    return {
      predictedRevenue: Math.round(predictedRevenue),
      confidence: Math.round(confidence * 100) / 100,
      riskFactors: this.identifyRiskFactors({
        competitionLevel: locationData.competitionData?.totalCompetitors || 0,
        trafficScore: locationData.trafficData?.accessibilityScore || 0,
        populationDensity: locationData.populationData?.density || 0,
        poiDensity: locationData.poiData?.density || 0
      }),
      successProbability: Math.round(confidence * 100)
    };
  }
  
  private static extractFeatures(locationData: LocationData): any {
    return {
      poiDensity: locationData.poiData?.density || 0,
      populationDensity: locationData.populationData?.density || 0,
      trafficScore: locationData.trafficData?.accessibilityScore || 0,
      competitionLevel: locationData.competitionData?.totalCompetitors || 0,
      schoolDensity: locationData.schoolData?.schoolDensity || 0
    };
  }
  
  
  private static identifyRiskFactors(features: any): string[] {
    const risks = [];
    if (features.competitionLevel > 15) risks.push('竞争激烈');
    if (features.trafficScore < 30) risks.push('交通不便');
    if (features.populationDensity < 3000) risks.push('人口密度低');
    if (features.poiDensity < 10) risks.push('商业氛围不足');
    return risks;
  }
  
  private static generateAnalysisReport(scoreResult: any, mlPrediction: MLPrediction, locationData: LocationData): any {
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    
    // 分析优势
    if (scoreResult.scores.poiDensity > 70) strengths.push('商业氛围浓厚');
    if (scoreResult.scores.trafficAccessibility > 70) strengths.push('交通便利');
    if (scoreResult.scores.schoolDensity > 70) strengths.push('学校资源丰富');
    if (scoreResult.scores.competitionLevel > 70) strengths.push('竞争环境良好');
    
    // 分析劣势
    if (scoreResult.scores.poiDensity < 40) weaknesses.push('商业氛围不足');
    if (scoreResult.scores.trafficAccessibility < 40) weaknesses.push('交通不便');
    if (scoreResult.scores.competitionLevel < 40) weaknesses.push('竞争激烈');
    if (scoreResult.scores.populationDensity < 40) weaknesses.push('人口密度低');
    
    // 生成建议
    if (scoreResult.scores.competitionLevel < 50) {
      recommendations.push('需要差异化定位，突出产品特色');
    }
    if (scoreResult.scores.trafficAccessibility < 50) {
      recommendations.push('考虑增加外卖配送服务');
    }
    if (scoreResult.scores.schoolDensity > 60) {
      recommendations.push('可重点开发学生市场');
    }
    
    const riskLevel = mlPrediction.riskFactors.length > 2 ? 'high' : 
                     mlPrediction.riskFactors.length > 0 ? 'medium' : 'low';
    
    return {
      strengths,
      weaknesses,
      recommendations,
      riskLevel
    };
  }
  
  private static estimateFootTraffic(locationData: LocationData): number {
    // 基于POI密度和人口密度估算人流量
    const poiScore = locationData.poiData?.density || 0;
    const populationScore = locationData.populationData?.density || 0;
    return Math.min((poiScore + populationScore) / 2, 100);
  }
  
  private static calculateBreakEvenTime(expectedRevenue: number): number {
    // 基于预期收入计算回本时间（月）
    const monthlyCost = 30000; // 假设月成本
    return Math.ceil(monthlyCost * 12 / expectedRevenue);
  }
  
  private static getTrafficStations(trafficData: any): any[] {
    if (!trafficData) return [];
    return [
      { type: '地铁站', count: trafficData.metroStations || 0 },
      { type: '公交站', count: trafficData.busStations || 0 },
      { type: '停车场', count: trafficData.parkingLots || 0 }
    ];
  }
  
  private static async saveAnalysisResult(result: SiteAnalysisResult): Promise<void> {
    try {
      await SiteSelection.create({
        location_name: result.location,
        province: '未知', // 需要从地理编码结果获取
        city: '未知',
        district: '未知',
        address: result.location,
        longitude: result.coordinates.longitude,
        latitude: result.coordinates.latitude,
        score: result.scores.overallScore,
        poi_density_score: result.scores.poiDensity,
        traffic_score: result.scores.trafficAccessibility,
        population_score: result.scores.populationDensity,
        competition_score: result.scores.competitionLevel,
        status: SiteSelectionStatus.INVESTIGATED
      });
      
      logger.info(`选址分析结果已保存: ${result.location}`);
    } catch (error) {
      logger.error('保存选址分析结果失败:', error);
    }
  }
}

// 保持向后兼容性
export class SiteSelectionService {
  static async getSiteAnalysis(region: string) {
    try {
      const result = await EnhancedSiteSelectionService.performSiteAnalysis(region);
      return {
        region,
        analysis: result.analysis.recommendations.join('; '),
        score: result.scores.overallScore,
        detailedResult: result
      };
    } catch (error) {
      logger.error('选址分析失败:', error);
    return {
      region,
        analysis: '选址分析失败',
        score: 0,
        error: error.message
    };
    }
  }
}
