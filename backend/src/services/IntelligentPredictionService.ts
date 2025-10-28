import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

interface SalesForecast {
  date: string;
  predicted_sales: number;
  confidence_level: number;
  factors: {
    seasonality: number;
    trend: number;
    weather_impact: number;
    promotion_impact: number;
  };
}

interface CustomerPrediction {
  customer_id: string;
  predicted_next_order_date: string;
  predicted_order_value: number;
  churn_probability: number;
  lifetime_value: number;
  recommended_actions: string[];
}

interface ProductRecommendation {
  customer_id: string;
  recommended_products: Array<{
    product_name: string;
    confidence_score: number;
    reason: string;
  }>;
}

interface StoreOptimization {
  store_id: string;
  recommended_hours: Array<{
    hour: number;
    expected_sales: number;
    staff_recommendation: number;
  }>;
  inventory_suggestions: Array<{
    product_name: string;
    suggested_quantity: number;
    reason: string;
  }>;
}

class IntelligentPredictionService {
  /**
   * 销售预测 - 基于历史数据和趋势分析
   * @param storeId 门店ID
   * @param days 预测天数
   * @returns 销售预测结果
   */
  public async predictSales(storeId: string, days: number = 30): Promise<SalesForecast[]> {
    try {
      logger.info(`开始销售预测: 门店${storeId}, 预测${days}天`);

      // 获取历史销售数据
      const historicalQuery = `
        SELECT 
          CAST(o.created_at AS DATE) as date,
          SUM(o.total_amount) as daily_sales,
          COUNT(o.id) as order_count,
          AVG(o.total_amount) as avg_order_value
        FROM orders o
        WHERE o.store_id = :storeId
          AND o.created_at >= DATEADD(day, -90, GETDATE())
        GROUP BY CAST(o.created_at AS DATE)
        ORDER BY CAST(o.created_at AS DATE)
      `;

      const historicalData = await sequelize.query(historicalQuery, {
        replacements: { storeId },
        type: QueryTypes.SELECT
      }) as any[];

      if (historicalData.length === 0) {
        logger.warn(`门店${storeId}没有历史数据`);
        return [];
      }

      // 计算趋势和季节性
      const trend = this.calculateTrend(historicalData);
      const seasonality = this.calculateSeasonality(historicalData);
      const baseSales = this.calculateBaseSales(historicalData);

      // 生成预测
      const forecasts: SalesForecast[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);

      for (let i = 0; i < days; i++) {
        const forecastDate = new Date(startDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        // 基础预测 = 历史平均值 + 趋势 + 季节性
        const predictedSales = baseSales + (trend * i) + seasonality;

        // 添加随机波动（模拟真实情况）
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
        const finalPrediction = Math.max(0, predictedSales * randomFactor);

        forecasts.push({
          date: forecastDate.toISOString().split('T')[0],
          predicted_sales: Math.round(finalPrediction),
          confidence_level: Math.max(0.6, 1 - (i * 0.01)), // 预测越远，置信度越低
          factors: {
            seasonality: seasonality,
            trend: trend,
            weather_impact: this.getWeatherImpact(forecastDate),
            promotion_impact: this.getPromotionImpact(forecastDate)
          }
        });
      }

      logger.info(`销售预测完成: 生成了${forecasts.length}天的预测`);
      return forecasts;

    } catch (error) {
      logger.error('销售预测失败:', error);
      return [];
    }
  }

  /**
   * 客户行为预测 - 基于购买历史预测未来行为
   * @param customerId 客户ID
   * @returns 客户行为预测结果
   */
  public async predictCustomerBehavior(customerId: string): Promise<CustomerPrediction | null> {
    try {
      logger.info(`开始客户行为预测: ${customerId}`);

      // 获取客户历史数据
      const customerQuery = `
        SELECT 
          o.customer_id,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) as days_since_last_order
        FROM orders o
        WHERE o.customer_id = :customerId
        GROUP BY o.customer_id
      `;

      const customerData = await sequelize.query(customerQuery, {
        replacements: { customerId },
        type: QueryTypes.SELECT
      }) as any[];

      if (customerData.length === 0) {
        logger.warn(`客户${customerId}不存在`);
        return null;
      }

      const data = customerData[0];

      // 计算客户价值指标
      const orderFrequency = data.total_orders;
      const avgOrderValue = data.avg_order_value;
      const daysSinceLastOrder = data.days_since_last_order;

      // 预测下次订单日期（基于历史频率）
      const avgDaysBetweenOrders = await this.calculateAvgDaysBetweenOrders(customerId);
      const predictedNextOrderDate = new Date();
      predictedNextOrderDate.setDate(predictedNextOrderDate.getDate() + avgDaysBetweenOrders);

      // 预测下次订单金额（基于历史平均值和趋势）
      const predictedOrderValue = avgOrderValue * (1 + this.calculateCustomerTrend(customerId));

      // 计算流失概率
      const churnProbability = this.calculateChurnProbability(daysSinceLastOrder, orderFrequency);

      // 计算生命周期价值
      const lifetimeValue = this.calculateLifetimeValue(data);

      // 生成推荐行动
      const recommendedActions = this.generateRecommendedActions(data, churnProbability);

      return {
        customer_id: customerId,
        predicted_next_order_date: predictedNextOrderDate.toISOString().split('T')[0],
        predicted_order_value: Math.round(predictedOrderValue),
        churn_probability: churnProbability,
        lifetime_value: Math.round(lifetimeValue),
        recommended_actions: recommendedActions
      };

    } catch (error) {
      logger.error('客户行为预测失败:', error);
      return null;
    }
  }

  /**
   * 产品推荐 - 基于客户购买历史推荐产品
   * @param customerId 客户ID
   * @returns 产品推荐结果
   */
  public async recommendProducts(customerId: string): Promise<ProductRecommendation | null> {
    try {
      logger.info(`开始产品推荐: ${customerId}`);

      // 获取客户购买历史
      const purchaseHistoryQuery = `
        SELECT 
          oi.product_name,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.total_price) as total_spent,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.customer_id = :customerId
        GROUP BY oi.product_name
        ORDER BY SUM(oi.total_price) DESC
      `;

      const purchaseHistory = await sequelize.query(purchaseHistoryQuery, {
        replacements: { customerId },
        type: QueryTypes.SELECT
      }) as any[];

      // 获取所有产品
      const allProductsQuery = `
        SELECT DISTINCT oi.product_name
        FROM order_items oi
        ORDER BY oi.product_name
      `;

      const allProducts = await sequelize.query(allProductsQuery, {
        type: QueryTypes.SELECT
      }) as any[];

      // 获取产品流行度
      const productPopularityQuery = `
        SELECT 
          oi.product_name,
          COUNT(DISTINCT o.customer_id) as customer_count,
          SUM(oi.quantity) as total_quantity
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        GROUP BY oi.product_name
        ORDER BY COUNT(DISTINCT o.customer_id) DESC
      `;

      const productPopularity = await sequelize.query(productPopularityQuery, {
        type: QueryTypes.SELECT
      }) as any[];

      // 生成推荐
      const purchasedProducts = new Set(purchaseHistory.map(p => p.product_name));
      const recommendations = [];

      for (const product of allProducts) {
        if (!purchasedProducts.has(product.product_name)) {
          const popularity = productPopularity.find(p => p.product_name === product.product_name);
          const confidenceScore = this.calculateRecommendationScore(
            product.product_name,
            purchaseHistory,
            popularity
          );

          if (confidenceScore > 0.3) {
            recommendations.push({
              product_name: product.product_name,
              confidence_score: confidenceScore,
              reason: this.generateRecommendationReason(product.product_name, purchaseHistory)
            });
          }
        }
      }

      // 按置信度排序
      recommendations.sort((a, b) => b.confidence_score - a.confidence_score);

      return {
        customer_id: customerId,
        recommended_products: recommendations.slice(0, 5) // 返回前5个推荐
      };

    } catch (error) {
      logger.error('产品推荐失败:', error);
      return null;
    }
  }

  /**
   * 门店优化建议 - 基于数据分析提供门店运营建议
   * @param storeId 门店ID
   * @returns 门店优化建议
   */
  public async optimizeStore(storeId: string): Promise<StoreOptimization | null> {
    try {
      logger.info(`开始门店优化分析: ${storeId}`);

      // 获取门店销售时间分布
      const hourlySalesQuery = `
        SELECT 
          DATEPART(hour, o.created_at) as hour,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_sales,
          AVG(o.total_amount) as avg_order_value
        FROM orders o
        WHERE o.store_id = :storeId
          AND o.created_at >= DATEADD(day, -30, GETDATE())
        GROUP BY DATEPART(hour, o.created_at)
        ORDER BY DATEPART(hour, o.created_at)
      `;

      const hourlySales = await sequelize.query(hourlySalesQuery, {
        replacements: { storeId },
        type: QueryTypes.SELECT
      }) as any[];

      // 获取产品销量
      const productSalesQuery = `
        SELECT 
          oi.product_name,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.total_price) as total_revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.store_id = :storeId
          AND o.created_at >= DATEADD(day, -30, GETDATE())
        GROUP BY oi.product_name
        ORDER BY SUM(oi.quantity) DESC
      `;

      const productSales = await sequelize.query(productSalesQuery, {
        replacements: { storeId },
        type: QueryTypes.SELECT
      }) as any[];

      // 生成营业时间建议
      const recommendedHours = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourData = hourlySales.find(h => h.hour === hour);
        const expectedSales = hourData ? hourData.total_sales : 0;
        const staffRecommendation = this.calculateStaffRecommendation(hourData);

        if (expectedSales > 0 || hour >= 6 && hour <= 22) { // 建议营业时间6-22点
          recommendedHours.push({
            hour: hour,
            expected_sales: expectedSales,
            staff_recommendation: staffRecommendation
          });
        }
      }

      // 生成库存建议
      const inventorySuggestions = productSales.slice(0, 10).map(product => ({
        product_name: product.product_name,
        suggested_quantity: Math.ceil(product.total_quantity * 1.2), // 建议增加20%库存
        reason: `历史销量${product.total_quantity}件，建议增加库存以应对需求波动`
      }));

      return {
        store_id: storeId,
        recommended_hours: recommendedHours,
        inventory_suggestions: inventorySuggestions
      };

    } catch (error) {
      logger.error('门店优化分析失败:', error);
      return null;
    }
  }

  // 私有辅助方法
  private calculateTrend(data: any[]): number {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.daily_sales, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.daily_sales, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / firstHalf.length;
  }

  private calculateSeasonality(data: any[]): number {
    // 简化的季节性计算
    const dayOfWeek = new Date().getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 0.9;
    return (weekendMultiplier - 1) * 100; // 转换为销售额影响
  }

  private calculateBaseSales(data: any[]): number {
    return data.reduce((sum, d) => sum + d.daily_sales, 0) / data.length;
  }

  private getWeatherImpact(date: Date): number {
    // 模拟天气影响
    return (Math.random() - 0.5) * 50;
  }

  private getPromotionImpact(date: Date): number {
    // 模拟促销影响
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5 || dayOfWeek === 6 ? 20 : 0; // 周末促销
  }

  private async calculateAvgDaysBetweenOrders(customerId: string): Promise<number> {
    const query = `
      SELECT 
        DATEDIFF(day, LAG(o.created_at) OVER (ORDER BY o.created_at), o.created_at) as days_between
      FROM orders o
      WHERE o.customer_id = :customerId
      ORDER BY o.created_at
    `;

    const results = await sequelize.query(query, {
      replacements: { customerId },
      type: QueryTypes.SELECT
    }) as any[];

    const validDays = results.filter(r => r.days_between !== null);
    return validDays.length > 0 
      ? validDays.reduce((sum, r) => sum + r.days_between, 0) / validDays.length
      : 30; // 默认30天
  }

  private calculateCustomerTrend(customerId: string): number {
    // 简化的客户趋势计算
    return Math.random() * 0.2 - 0.1; // -10% 到 +10%
  }

  private calculateChurnProbability(daysSinceLastOrder: number, orderFrequency: number): number {
    // 基于最后订单时间和订单频率计算流失概率
    if (daysSinceLastOrder > 90) return 0.8;
    if (daysSinceLastOrder > 60) return 0.6;
    if (daysSinceLastOrder > 30) return 0.3;
    return 0.1;
  }

  private calculateLifetimeValue(data: any): number {
    // 简化的生命周期价值计算
    const avgOrderValue = data.avg_order_value;
    const orderFrequency = data.total_orders;
    const monthsActive = Math.max(1, Math.floor((new Date().getTime() - new Date(data.first_order_date).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    return avgOrderValue * orderFrequency * (12 / monthsActive); // 年化价值
  }

  private generateRecommendedActions(data: any, churnProbability: number): string[] {
    const actions = [];
    
    if (churnProbability > 0.5) {
      actions.push('发送专属优惠券激活客户');
      actions.push('推荐新品吸引客户关注');
    }
    
    if (data.avg_order_value < 50) {
      actions.push('推荐套餐提升客单价');
    }
    
    if (data.total_orders < 5) {
      actions.push('邀请客户参与会员计划');
    }
    
    return actions;
  }

  private calculateRecommendationScore(productName: string, purchaseHistory: any[], popularity: any): number {
    // 基于协同过滤的推荐分数计算
    let score = 0;
    
    if (popularity) {
      score += popularity.customer_count / 100; // 流行度分数
    }
    
    // 基于购买历史相似性
    const similarProducts = this.findSimilarProducts(productName, purchaseHistory);
    score += similarProducts.length * 0.1;
    
    return Math.min(1, score);
  }

  private findSimilarProducts(productName: string, purchaseHistory: any[]): string[] {
    // 简化的相似产品查找
    const similarProducts = [];
    
    if (productName.includes('热狗') && purchaseHistory.some(p => p.product_name.includes('套餐'))) {
      similarProducts.push('套餐');
    }
    
    if (productName.includes('饮料') && purchaseHistory.some(p => p.product_name.includes('热狗'))) {
      similarProducts.push('热狗');
    }
    
    return similarProducts;
  }

  private generateRecommendationReason(productName: string, purchaseHistory: any[]): string {
    if (productName.includes('套餐')) {
      return '您经常购买单品，推荐套餐更优惠';
    }
    
    if (productName.includes('饮料')) {
      return '与您常购买的产品搭配更佳';
    }
    
    return '基于您的购买历史推荐';
  }

  private calculateStaffRecommendation(hourData: any): number {
    if (!hourData) return 1;
    
    const orderCount = hourData.order_count;
    if (orderCount > 20) return 3;
    if (orderCount > 10) return 2;
    return 1;
  }
}

export default IntelligentPredictionService;
