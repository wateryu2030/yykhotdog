import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// 机器学习特征接口
export interface MLFeatures {
  poiDensity: number;
  populationDensity: number;
  trafficScore: number;
  competitionLevel: number;
  schoolDensity: number;
  rentalCost: number;
  footTraffic: number;
  businessHours: number;
  metroDistance: number;
  shoppingCenterDistance: number;
  universityDistance: number;
  hospitalDistance: number;
  parkDistance: number;
  residentialDensity: number;
  officeDensity: number;
  touristAttractionDistance: number;
  nightlifeScore: number;
  weekendActivityScore: number;
  seasonalVariation: number;
  economicIndex: number;
}

// 机器学习预测结果接口
interface MLPredictionResult {
  predictedRevenue: number;
  predictedOrders: number;
  predictedCustomers: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  successProbability: number;
  breakEvenTime: number; // 月
  roiPrediction: number; // 投资回报率
  marketPotential: 'low' | 'medium' | 'high';
  recommendedStrategy: string[];
  seasonalTrends: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
}

// 历史数据接口
interface HistoricalData {
  location: string;
  features: MLFeatures;
  actualRevenue: number;
  actualOrders: number;
  actualCustomers: number;
  success: boolean;
  period: string;
}

/**
 * 机器学习选址预测服务
 * 基于历史数据和特征工程进行智能预测
 */
export class MLSiteSelectionService {
  
  /**
   * 获取历史训练数据
   */
  static async getHistoricalData(): Promise<HistoricalData[]> {
    try {
      logger.info('开始获取历史训练数据...');
      
      // 从现有门店数据中提取历史特征和结果
      const query = `
        SELECT 
          s.store_name as location,
          s.city,
          s.district,
          s.longitude,
          s.latitude,
          AVG(d.revenue) as avg_revenue,
          AVG(d.order_count) as avg_orders,
          AVG(d.customer_count) as avg_customers,
          COUNT(DISTINCT d.date) as data_points,
          CASE 
            WHEN AVG(d.revenue) > 80000 THEN 1 
            ELSE 0 
          END as success
        FROM stores s
        LEFT JOIN vw_sales_store_daily d ON d.store_id = s.id
        WHERE d.date >= DATEADD(month, -12, GETDATE())
        GROUP BY s.id, s.store_name, s.city, s.district, s.longitude, s.latitude
        HAVING COUNT(DISTINCT d.date) >= 30
        ORDER BY avg_revenue DESC
      `;
      
      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });
      
      logger.info(`获取到 ${results.length} 条历史数据`);
      
      // 转换为历史数据格式
      const historicalData: HistoricalData[] = [];
      
      for (const row of results as any[]) {
        try {
          const features = await this.extractFeaturesFromLocation(
            row.location,
            row.longitude,
            row.latitude
          );
          
          historicalData.push({
            location: row.location,
            features,
            actualRevenue: row.avg_revenue || 0,
            actualOrders: row.avg_orders || 0,
            actualCustomers: row.avg_customers || 0,
            success: row.success === 1,
            period: '2024'
          });
        } catch (error) {
          logger.warn(`处理历史数据失败: ${row.location}`, error);
        }
      }
      
      logger.info(`成功处理 ${historicalData.length} 条历史数据`);
      return historicalData;
      
    } catch (error) {
      logger.error('获取历史数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 从位置信息提取特征
   */
  static async extractFeaturesFromLocation(
    location: string, 
    longitude: number, 
    latitude: number
  ): Promise<MLFeatures> {
    try {
      // 这里应该调用实际的地理数据API
      // 暂时使用基于坐标的估算方法
      
      const features: MLFeatures = {
        poiDensity: this.estimatePOIDensity(longitude, latitude),
        populationDensity: this.estimatePopulationDensity(longitude, latitude),
        trafficScore: this.estimateTrafficScore(longitude, latitude),
        competitionLevel: this.estimateCompetitionLevel(longitude, latitude),
        schoolDensity: this.estimateSchoolDensity(longitude, latitude),
        rentalCost: this.estimateRentalCost(longitude, latitude),
        footTraffic: this.estimateFootTraffic(longitude, latitude),
        businessHours: this.estimateBusinessHours(longitude, latitude),
        metroDistance: this.estimateMetroDistance(longitude, latitude),
        shoppingCenterDistance: this.estimateShoppingCenterDistance(longitude, latitude),
        universityDistance: this.estimateUniversityDistance(longitude, latitude),
        hospitalDistance: this.estimateHospitalDistance(longitude, latitude),
        parkDistance: this.estimateParkDistance(longitude, latitude),
        residentialDensity: this.estimateResidentialDensity(longitude, latitude),
        officeDensity: this.estimateOfficeDensity(longitude, latitude),
        touristAttractionDistance: this.estimateTouristAttractionDistance(longitude, latitude),
        nightlifeScore: this.estimateNightlifeScore(longitude, latitude),
        weekendActivityScore: this.estimateWeekendActivityScore(longitude, latitude),
        seasonalVariation: this.estimateSeasonalVariation(longitude, latitude),
        economicIndex: this.estimateEconomicIndex(longitude, latitude)
      };
      
      return features;
      
    } catch (error) {
      logger.error('提取特征失败:', error);
      throw error;
    }
  }
  
  /**
   * 训练机器学习模型
   */
  static async trainModel(): Promise<any> {
    try {
      logger.info('开始训练机器学习模型...');
      
      const historicalData = await this.getHistoricalData();
      
      if (historicalData.length < 10) {
        throw new Error('历史数据不足，无法训练模型');
      }
      
      // 准备训练数据
      const features = historicalData.map(d => Object.values(d.features));
      const targets = historicalData.map(d => d.actualRevenue);
      
      // 使用简化的线性回归模型
      // 实际项目中应该使用更复杂的ML库如TensorFlow.js或scikit-learn
      const model = this.trainLinearRegressionModel(features, targets);
      
      logger.info('机器学习模型训练完成');
      return model;
      
    } catch (error) {
      logger.error('训练模型失败:', error);
      throw error;
    }
  }
  
  /**
   * 使用机器学习模型进行预测
   */
  static async predictWithML(
    features: MLFeatures, 
    model?: any
  ): Promise<MLPredictionResult> {
    try {
      logger.info('开始机器学习预测...');
      
      // 如果没有提供模型，使用默认的基于规则的预测
      if (!model) {
        return this.predictWithRules(features);
      }
      
      // 使用训练好的模型进行预测
      const featureVector = Object.values(features);
      const predictedRevenue = this.predictWithModel(featureVector, model);
      
      // 基于预测结果计算其他指标
      const predictedOrders = this.predictOrders(predictedRevenue, features);
      const predictedCustomers = this.predictCustomers(predictedOrders, features);
      const confidence = this.calculateConfidence(features);
      const riskLevel = this.assessRiskLevel(features);
      const riskFactors = this.identifyRiskFactors(features);
      const successProbability = this.calculateSuccessProbability(features);
      const breakEvenTime = this.calculateBreakEvenTime(predictedRevenue);
      const roiPrediction = this.calculateROI(predictedRevenue);
      const marketPotential = this.assessMarketPotential(features);
      const recommendedStrategy = this.generateStrategy(features);
      const seasonalTrends = this.predictSeasonalTrends(features);
      
      const result: MLPredictionResult = {
        predictedRevenue: Math.round(predictedRevenue),
        predictedOrders: Math.round(predictedOrders),
        predictedCustomers: Math.round(predictedCustomers),
        confidence: Math.round(confidence * 100) / 100,
        riskLevel,
        riskFactors,
        successProbability: Math.round(successProbability * 100),
        breakEvenTime,
        roiPrediction: Math.round(roiPrediction * 100) / 100,
        marketPotential,
        recommendedStrategy,
        seasonalTrends
      };
      
      logger.info('机器学习预测完成');
      return result;
      
    } catch (error) {
      logger.error('机器学习预测失败:', error);
      throw error;
    }
  }
  
  /**
   * 基于规则的预测（备用方法）
   */
  private static predictWithRules(features: MLFeatures): MLPredictionResult {
    // 基于特征权重计算预测收入
    const weights = {
      poiDensity: 0.15,
      populationDensity: 0.12,
      trafficScore: 0.12,
      competitionLevel: -0.10, // 负权重，竞争越多收入越低
      schoolDensity: 0.10,
      footTraffic: 0.10,
      businessHours: 0.08,
      residentialDensity: 0.08,
      officeDensity: 0.08,
      nightlifeScore: 0.05,
      weekendActivityScore: 0.05,
      economicIndex: 0.07
    };
    
    let score = 0;
    Object.keys(weights).forEach(key => {
      score += (features[key as keyof MLFeatures] || 0) * weights[key as keyof typeof weights];
    });
    
    const baseRevenue = 50000; // 基础月收入
    const predictedRevenue = baseRevenue * (0.5 + score / 100);
    
    return {
      predictedRevenue: Math.round(predictedRevenue),
      predictedOrders: Math.round(predictedRevenue / 25), // 假设平均订单25元
      predictedCustomers: Math.round(predictedRevenue / 25 * 0.8), // 假设80%复购率
      confidence: Math.min(0.7 + score / 200, 0.95),
      riskLevel: this.assessRiskLevel(features),
      riskFactors: this.identifyRiskFactors(features),
      successProbability: Math.min(0.6 + score / 150, 0.9),
      breakEvenTime: this.calculateBreakEvenTime(predictedRevenue),
      roiPrediction: this.calculateROI(predictedRevenue),
      marketPotential: this.assessMarketPotential(features),
      recommendedStrategy: this.generateStrategy(features),
      seasonalTrends: this.predictSeasonalTrends(features)
    };
  }
  
  /**
   * 训练线性回归模型
   */
  private static trainLinearRegressionModel(features: number[][], targets: number[]): any {
    // 简化的线性回归实现
    // 实际项目中应该使用专业的ML库
    
    const n = features.length;
    const m = features[0].length;
    
    // 计算特征均值
    const featureMeans = new Array(m).fill(0);
    features.forEach(feature => {
      feature.forEach((val, i) => {
        featureMeans[i] += val;
      });
    });
    featureMeans.forEach((val, i) => {
      featureMeans[i] /= n;
    });
    
    // 计算目标均值
    const targetMean = targets.reduce((sum, val) => sum + val, 0) / n;
    
    // 计算权重（简化版本）
    const weights = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      let numerator = 0;
      let denominator = 0;
      
      for (let j = 0; j < n; j++) {
        const x = features[j][i] - featureMeans[i];
        const y = targets[j] - targetMean;
        numerator += x * y;
        denominator += x * x;
      }
      
      weights[i] = denominator !== 0 ? numerator / denominator : 0;
    }
    
    return {
      weights,
      featureMeans,
      targetMean,
      type: 'linear_regression'
    };
  }
  
  /**
   * 使用模型进行预测
   */
  private static predictWithModel(features: number[], model: any): number {
    if (model.type === 'linear_regression') {
      let prediction = model.targetMean;
      features.forEach((feature, i) => {
        prediction += (feature - model.featureMeans[i]) * model.weights[i];
      });
      return Math.max(0, prediction);
    }
    
    return 50000; // 默认预测
  }
  
  // ==================== 特征估算方法 ====================
  
  private static estimatePOIDensity(longitude: number, latitude: number): number {
    // 基于坐标估算POI密度
    const baseDensity = 50;
    const variation = Math.sin(longitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 30;
    return Math.max(10, baseDensity + variation);
  }
  
  private static estimatePopulationDensity(longitude: number, latitude: number): number {
    // 基于坐标估算人口密度
    const baseDensity = 5000;
    const variation = Math.sin(longitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 2000;
    return Math.max(1000, baseDensity + variation);
  }
  
  private static estimateTrafficScore(longitude: number, latitude: number): number {
    // 基于坐标估算交通便利性
    const baseScore = 60;
    const variation = Math.sin(longitude * Math.PI / 180) * 20;
    return Math.max(20, Math.min(100, baseScore + variation));
  }
  
  private static estimateCompetitionLevel(longitude: number, latitude: number): number {
    // 基于坐标估算竞争水平
    const baseLevel = 15;
    const variation = Math.cos(latitude * Math.PI / 180) * 10;
    return Math.max(5, Math.min(30, baseLevel + variation));
  }
  
  private static estimateSchoolDensity(longitude: number, latitude: number): number {
    // 基于坐标估算学校密度
    const baseDensity = 5;
    const variation = Math.sin(longitude * Math.PI / 180) * 3;
    return Math.max(1, baseDensity + variation);
  }
  
  private static estimateRentalCost(longitude: number, latitude: number): number {
    // 基于坐标估算租金成本
    const baseCost = 50;
    const variation = Math.sin(longitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 20;
    return Math.max(20, baseCost + variation);
  }
  
  private static estimateFootTraffic(longitude: number, latitude: number): number {
    // 基于坐标估算人流量
    const baseTraffic = 70;
    const variation = Math.sin(longitude * Math.PI / 180) * 15;
    return Math.max(30, Math.min(100, baseTraffic + variation));
  }
  
  private static estimateBusinessHours(longitude: number, latitude: number): number {
    // 基于坐标估算营业时间
    const baseHours = 12;
    const variation = Math.cos(latitude * Math.PI / 180) * 2;
    return Math.max(8, Math.min(16, baseHours + variation));
  }
  
  private static estimateMetroDistance(longitude: number, latitude: number): number {
    // 基于坐标估算地铁距离
    const baseDistance = 500;
    const variation = Math.sin(longitude * Math.PI / 180) * 200;
    return Math.max(100, baseDistance + variation);
  }
  
  private static estimateShoppingCenterDistance(longitude: number, latitude: number): number {
    // 基于坐标估算购物中心距离
    const baseDistance = 800;
    const variation = Math.cos(latitude * Math.PI / 180) * 300;
    return Math.max(200, baseDistance + variation);
  }
  
  private static estimateUniversityDistance(longitude: number, latitude: number): number {
    // 基于坐标估算大学距离
    const baseDistance = 2000;
    const variation = Math.sin(longitude * Math.PI / 180) * 500;
    return Math.max(500, baseDistance + variation);
  }
  
  private static estimateHospitalDistance(longitude: number, latitude: number): number {
    // 基于坐标估算医院距离
    const baseDistance = 1500;
    const variation = Math.cos(latitude * Math.PI / 180) * 400;
    return Math.max(300, baseDistance + variation);
  }
  
  private static estimateParkDistance(longitude: number, latitude: number): number {
    // 基于坐标估算公园距离
    const baseDistance = 1000;
    const variation = Math.sin(longitude * Math.PI / 180) * 300;
    return Math.max(200, baseDistance + variation);
  }
  
  private static estimateResidentialDensity(longitude: number, latitude: number): number {
    // 基于坐标估算住宅密度
    const baseDensity = 60;
    const variation = Math.cos(latitude * Math.PI / 180) * 20;
    return Math.max(20, baseDensity + variation);
  }
  
  private static estimateOfficeDensity(longitude: number, latitude: number): number {
    // 基于坐标估算办公密度
    const baseDensity = 40;
    const variation = Math.sin(longitude * Math.PI / 180) * 15;
    return Math.max(10, baseDensity + variation);
  }
  
  private static estimateTouristAttractionDistance(longitude: number, latitude: number): number {
    // 基于坐标估算景点距离
    const baseDistance = 3000;
    const variation = Math.cos(latitude * Math.PI / 180) * 1000;
    return Math.max(500, baseDistance + variation);
  }
  
  private static estimateNightlifeScore(longitude: number, latitude: number): number {
    // 基于坐标估算夜生活评分
    const baseScore = 50;
    const variation = Math.sin(longitude * Math.PI / 180) * 20;
    return Math.max(20, Math.min(100, baseScore + variation));
  }
  
  private static estimateWeekendActivityScore(longitude: number, latitude: number): number {
    // 基于坐标估算周末活动评分
    const baseScore = 60;
    const variation = Math.cos(latitude * Math.PI / 180) * 15;
    return Math.max(30, Math.min(100, baseScore + variation));
  }
  
  private static estimateSeasonalVariation(longitude: number, latitude: number): number {
    // 基于坐标估算季节性变化
    const baseVariation = 20;
    const variation = Math.sin(latitude * Math.PI / 180) * 10;
    return Math.max(5, Math.min(50, baseVariation + variation));
  }
  
  private static estimateEconomicIndex(longitude: number, latitude: number): number {
    // 基于坐标估算经济指数
    const baseIndex = 70;
    const variation = Math.sin(longitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 15;
    return Math.max(40, Math.min(100, baseIndex + variation));
  }
  
  // ==================== 预测辅助方法 ====================
  
  private static predictOrders(revenue: number, features: MLFeatures): number {
    // 基于收入预测订单数
    const avgOrderValue = 25 + (features.economicIndex - 50) / 10; // 经济指数影响客单价
    return revenue / avgOrderValue;
  }
  
  private static predictCustomers(orders: number, features: MLFeatures): number {
    // 基于订单数预测客户数
    const repeatRate = 0.7 + (features.schoolDensity * 0.01); // 学校密度影响复购率
    return orders * repeatRate;
  }
  
  private static calculateConfidence(features: MLFeatures): number {
    // 基于特征完整性计算置信度
    let confidence = 0.5;
    
    if (features.poiDensity > 0) confidence += 0.1;
    if (features.populationDensity > 0) confidence += 0.1;
    if (features.trafficScore > 0) confidence += 0.1;
    if (features.schoolDensity > 0) confidence += 0.1;
    if (features.footTraffic > 0) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }
  
  private static assessRiskLevel(features: MLFeatures): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    if (features.competitionLevel > 20) riskScore += 2;
    if (features.trafficScore < 40) riskScore += 2;
    if (features.populationDensity < 3000) riskScore += 2;
    if (features.poiDensity < 20) riskScore += 1;
    if (features.footTraffic < 50) riskScore += 1;
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }
  
  private static identifyRiskFactors(features: MLFeatures): string[] {
    const risks = [];
    
    if (features.competitionLevel > 20) risks.push('竞争激烈');
    if (features.trafficScore < 40) risks.push('交通不便');
    if (features.populationDensity < 3000) risks.push('人口密度低');
    if (features.poiDensity < 20) risks.push('商业氛围不足');
    if (features.footTraffic < 50) risks.push('人流量不足');
    if (features.rentalCost > 80) risks.push('租金成本高');
    if (features.economicIndex < 50) risks.push('经济环境一般');
    
    return risks;
  }
  
  private static calculateSuccessProbability(features: MLFeatures): number {
    let probability = 0.5;
    
    // 正面因素
    if (features.poiDensity > 50) probability += 0.1;
    if (features.populationDensity > 5000) probability += 0.1;
    if (features.trafficScore > 60) probability += 0.1;
    if (features.schoolDensity > 5) probability += 0.1;
    if (features.footTraffic > 70) probability += 0.1;
    
    // 负面因素
    if (features.competitionLevel > 20) probability -= 0.15;
    if (features.rentalCost > 80) probability -= 0.1;
    if (features.economicIndex < 50) probability -= 0.1;
    
    return Math.max(0.1, Math.min(0.9, probability));
  }
  
  private static calculateBreakEvenTime(revenue: number): number {
    const monthlyCost = 30000; // 月成本
    const annualCost = monthlyCost * 12;
    const annualRevenue = revenue * 12;
    
    if (annualRevenue <= annualCost) return 999; // 无法回本
    
    return Math.ceil(annualCost / annualRevenue * 12);
  }
  
  private static calculateROI(revenue: number): number {
    const monthlyCost = 30000;
    const monthlyProfit = revenue - monthlyCost;
    const annualProfit = monthlyProfit * 12;
    const initialInvestment = 200000; // 初始投资
    
    return annualProfit / initialInvestment;
  }
  
  private static assessMarketPotential(features: MLFeatures): 'low' | 'medium' | 'high' {
    let potential = 0;
    
    if (features.populationDensity > 5000) potential += 2;
    if (features.schoolDensity > 5) potential += 2;
    if (features.footTraffic > 70) potential += 2;
    if (features.economicIndex > 70) potential += 2;
    if (features.competitionLevel < 15) potential += 1;
    
    if (potential >= 6) return 'high';
    if (potential >= 3) return 'medium';
    return 'low';
  }
  
  private static generateStrategy(features: MLFeatures): string[] {
    const strategies = [];
    
    if (features.schoolDensity > 5) {
      strategies.push('重点开发学生市场，推出学生套餐');
    }
    
    if (features.competitionLevel > 20) {
      strategies.push('差异化定位，突出产品特色');
    }
    
    if (features.trafficScore < 50) {
      strategies.push('加强外卖配送服务');
    }
    
    if (features.nightlifeScore > 70) {
      strategies.push('延长营业时间，开发夜宵市场');
    }
    
    if (features.officeDensity > 50) {
      strategies.push('推出商务套餐，提供快速服务');
    }
    
    if (features.residentialDensity > 60) {
      strategies.push('开发家庭套餐，提供配送服务');
    }
    
    if (features.weekendActivityScore > 70) {
      strategies.push('周末推出特色活动，吸引客流');
    }
    
    return strategies.length > 0 ? strategies : ['保持现有经营策略'];
  }
  
  private static predictSeasonalTrends(features: MLFeatures): any {
    const baseTrend = 100;
    const variation = features.seasonalVariation;
    
    return {
      spring: baseTrend + variation * 0.5,
      summer: baseTrend + variation,
      autumn: baseTrend + variation * 0.3,
      winter: baseTrend - variation * 0.2
    };
  }
}
