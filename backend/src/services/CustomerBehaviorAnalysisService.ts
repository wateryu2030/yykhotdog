import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

interface CustomerBehaviorPath {
  customer_id: string;
  path_steps: BehaviorStep[];
  total_duration: number;
  conversion_rate: number;
  path_type: 'direct' | 'exploratory' | 'comparison' | 'impulse';
}

interface BehaviorStep {
  step_order: number;
  action_type: 'view' | 'add_to_cart' | 'remove_from_cart' | 'checkout' | 'purchase' | 'abandon';
  product_id?: string;
  product_name?: string;
  timestamp: Date;
  duration: number;
  value?: number;
}

interface CustomerJourney {
  customer_id: string;
  journey_stages: JourneyStage[];
  total_value: number;
  journey_duration: number;
  satisfaction_score?: number;
}

interface JourneyStage {
  stage_name: 'awareness' | 'interest' | 'consideration' | 'purchase' | 'retention' | 'advocacy';
  start_time: Date;
  end_time: Date;
  touchpoints: Touchpoint[];
  stage_value: number;
}

interface Touchpoint {
  touchpoint_type: 'website' | 'mobile_app' | 'store' | 'social_media' | 'email' | 'advertisement';
  touchpoint_id: string;
  timestamp: Date;
  interaction_data: any;
}

class CustomerBehaviorAnalysisService {
  /**
   * 分析客户购买路径
   * @param customerId 客户ID
   * @param timeRange 时间范围（天数）
   * @returns 客户行为路径分析结果
   */
  public async analyzeCustomerPath(customerId: string, timeRange: number = 30): Promise<CustomerBehaviorPath | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // 查询客户订单和订单项数据
      const query = `
        SELECT 
          o.id as order_id,
          o.created_at as order_time,
          o.total_amount as order_value,
          oi.product_id,
          oi.product_name,
          oi.quantity,
          oi.total_price as item_value,
          oi.created_at as item_time
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_id = :customerId
          AND o.created_at >= CAST(:startDate AS DATE)
        ORDER BY o.created_at ASC, oi.created_at ASC
      `;

      const results = await sequelize.query(query, {
        replacements: { customerId, startDate },
        type: QueryTypes.SELECT
      }) as any[];

      if (results.length === 0) {
        return null;
      }

      // 构建行为路径
      const pathSteps: BehaviorStep[] = [];
      let stepOrder = 1;
      let totalDuration = 0;

      // 按订单时间排序，构建路径步骤
      const orderGroups = this.groupByOrder(results);
      
      for (const order of orderGroups) {
        // 添加查看步骤（假设）
        pathSteps.push({
          step_order: stepOrder++,
          action_type: 'view',
          product_id: order.items[0]?.product_id,
          product_name: order.items[0]?.product_name,
          timestamp: new Date(order.order_time),
          duration: 0,
          value: 0
        });

        // 添加购买步骤
        pathSteps.push({
          step_order: stepOrder++,
          action_type: 'purchase',
          product_id: order.items[0]?.product_id,
          product_name: order.items[0]?.product_name,
          timestamp: new Date(order.order_time),
          duration: 0,
          value: order.order_value
        });

        totalDuration += 0; // 简化处理
      }

      // 计算转化率（购买步骤 / 总步骤）
      const purchaseSteps = pathSteps.filter(step => step.action_type === 'purchase').length;
      const conversionRate = pathSteps.length > 0 ? purchaseSteps / pathSteps.length : 0;

      // 判断路径类型
      const pathType = this.determinePathType(pathSteps);

      return {
        customer_id: customerId,
        path_steps: pathSteps,
        total_duration: totalDuration,
        conversion_rate: conversionRate,
        path_type: pathType
      };

    } catch (error) {
      logger.error('分析客户购买路径失败:', error);
      return null;
    }
  }

  /**
   * 分析客户旅程
   * @param customerId 客户ID
   * @param timeRange 时间范围（天数）
   * @returns 客户旅程分析结果
   */
  public async analyzeCustomerJourney(customerId: string, timeRange: number = 90): Promise<CustomerJourney | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // 查询客户完整数据
      const query = `
        SELECT 
          o.id as order_id,
          o.created_at as order_time,
          o.total_amount as order_value,
          oi.product_id,
          oi.product_name,
          oi.quantity,
          oi.total_price as item_value,
          c.first_order_date,
          c.last_order_date,
          c.total_orders,
          c.total_spent
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        WHERE o.customer_id = :customerId
          AND o.created_at >= CAST(:startDate AS DATE)
        ORDER BY o.created_at ASC
      `;

      const results = await sequelize.query(query, {
        replacements: { customerId, startDate },
        type: QueryTypes.SELECT
      }) as any[];

      if (results.length === 0) {
        return null;
      }

      const customerData = results[0];
      const journeyStages = this.buildJourneyStages(results);
      const totalValue = customerData.total_spent || 0;
      const journeyDuration = this.calculateJourneyDuration(customerData.first_order_date, customerData.last_order_date);
      const satisfactionScore = this.calculateSatisfactionScore(customerData);

      return {
        customer_id: customerId,
        journey_stages: journeyStages,
        total_value: totalValue,
        journey_duration: journeyDuration,
        satisfaction_score: satisfactionScore
      };

    } catch (error) {
      logger.error('分析客户旅程失败:', error);
      return null;
    }
  }

  /**
   * 分析客户行为模式
   * @param customerId 客户ID
   * @returns 行为模式分析结果
   */
  public async analyzeBehaviorPatterns(customerId: string): Promise<any> {
    try {
      // 查询客户历史行为数据
      const query = `
        SELECT 
          DATEPART(hour, o.created_at) as hour_of_day,
          DATEPART(weekday, o.created_at) as day_of_week,
          DATEPART(month, o.created_at) as month_of_year,
          o.total_amount,
          oi.product_name,
          oi.quantity
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_id = :customerId
        ORDER BY o.created_at ASC
      `;

      const results = await sequelize.query(query, {
        replacements: { customerId },
        type: QueryTypes.SELECT
      }) as any[];

      if (results.length === 0) {
        return null;
      }

      // 分析时间模式
      const timePatterns = this.analyzeTimePatterns(results);
      
      // 分析产品偏好模式
      const productPatterns = this.analyzeProductPatterns(results);
      
      // 分析消费模式
      const spendingPatterns = this.analyzeSpendingPatterns(results);

      return {
        customer_id: customerId,
        time_patterns: timePatterns,
        product_patterns: productPatterns,
        spending_patterns: spendingPatterns,
        behavior_insights: this.generateBehaviorInsights(timePatterns, productPatterns, spendingPatterns)
      };

    } catch (error) {
      logger.error('分析客户行为模式失败:', error);
      return null;
    }
  }

  /**
   * 获取客户行为洞察
   * @param customerId 客户ID
   * @returns 行为洞察结果
   */
  public async getCustomerBehaviorInsights(customerId: string): Promise<any> {
    try {
      const [pathAnalysis, journeyAnalysis, patternAnalysis] = await Promise.all([
        this.analyzeCustomerPath(customerId),
        this.analyzeCustomerJourney(customerId),
        this.analyzeBehaviorPatterns(customerId)
      ]);

      return {
        customer_id: customerId,
        path_analysis: pathAnalysis,
        journey_analysis: journeyAnalysis,
        pattern_analysis: patternAnalysis,
        insights: this.generateComprehensiveInsights(pathAnalysis, journeyAnalysis, patternAnalysis)
      };

    } catch (error) {
      logger.error('获取客户行为洞察失败:', error);
      return null;
    }
  }

  // 私有辅助方法
  private groupByOrder(results: any[]): any[] {
    const orderMap = new Map();
    
    results.forEach(row => {
      if (!orderMap.has(row.order_id)) {
        orderMap.set(row.order_id, {
          order_id: row.order_id,
          order_time: row.order_time,
          order_value: row.order_value,
          items: []
        });
      }
      
      if (row.product_id) {
        orderMap.get(row.order_id).items.push({
          product_id: row.product_id,
          product_name: row.product_name,
          quantity: row.quantity,
          item_value: row.item_value
        });
      }
    });

    return Array.from(orderMap.values());
  }

  private determinePathType(pathSteps: BehaviorStep[]): 'direct' | 'exploratory' | 'comparison' | 'impulse' {
    const viewSteps = pathSteps.filter(step => step.action_type === 'view').length;
    const purchaseSteps = pathSteps.filter(step => step.action_type === 'purchase').length;
    
    if (viewSteps === 0 && purchaseSteps > 0) return 'impulse';
    if (viewSteps > purchaseSteps * 3) return 'exploratory';
    if (viewSteps > purchaseSteps * 2) return 'comparison';
    return 'direct';
  }

  private buildJourneyStages(results: any[]): JourneyStage[] {
    // 简化实现，实际应该根据业务逻辑构建更复杂的旅程阶段
    const stages: JourneyStage[] = [];
    
    if (results.length > 0) {
      const firstOrder = results[0];
      const lastOrder = results[results.length - 1];
      
      stages.push({
        stage_name: 'awareness',
        start_time: new Date(firstOrder.order_time),
        end_time: new Date(firstOrder.order_time),
        touchpoints: [],
        stage_value: 0
      });
      
      stages.push({
        stage_name: 'purchase',
        start_time: new Date(firstOrder.order_time),
        end_time: new Date(lastOrder.order_time),
        touchpoints: [],
        stage_value: firstOrder.order_value
      });
    }
    
    return stages;
  }

  private calculateJourneyDuration(firstOrderDate: string, lastOrderDate: string): number {
    const first = new Date(firstOrderDate);
    const last = new Date(lastOrderDate);
    return Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateSatisfactionScore(customerData: any): number {
    // 基于订单频率和金额计算满意度分数
    const orderFrequency = customerData.total_orders || 0;
    const avgOrderValue = customerData.total_spent / orderFrequency || 0;
    
    // 简化的满意度计算
    let score = 50; // 基础分数
    if (orderFrequency > 5) score += 20;
    if (avgOrderValue > 50) score += 20;
    if (orderFrequency > 10) score += 10;
    
    return Math.min(100, score);
  }

  private analyzeTimePatterns(results: any[]): any {
    const hourCounts = new Map();
    const dayCounts = new Map();
    
    results.forEach(row => {
      hourCounts.set(row.hour_of_day, (hourCounts.get(row.hour_of_day) || 0) + 1);
      dayCounts.set(row.day_of_week, (dayCounts.get(row.day_of_week) || 0) + 1);
    });
    
    return {
      peak_hours: Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      peak_days: Array.from(dayCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      total_orders: results.length
    };
  }

  private analyzeProductPatterns(results: any[]): any {
    const productCounts = new Map();
    
    results.forEach(row => {
      if (row.product_name) {
        productCounts.set(row.product_name, (productCounts.get(row.product_name) || 0) + row.quantity);
      }
    });
    
    return {
      favorite_products: Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      total_products: productCounts.size
    };
  }

  private analyzeSpendingPatterns(results: any[]): any {
    const amounts = results.map(row => row.total_amount).filter(amount => amount > 0);
    const totalSpent = amounts.reduce((sum, amount) => sum + amount, 0);
    const avgOrderValue = amounts.length > 0 ? totalSpent / amounts.length : 0;
    
    return {
      total_spent: totalSpent,
      avg_order_value: avgOrderValue,
      max_order_value: Math.max(...amounts),
      min_order_value: Math.min(...amounts),
      order_frequency: amounts.length
    };
  }

  private generateBehaviorInsights(timePatterns: any, productPatterns: any, spendingPatterns: any): string[] {
    const insights: string[] = [];
    
    if (timePatterns.peak_hours.length > 0) {
      const peakHour = timePatterns.peak_hours[0][0];
      insights.push(`客户最活跃的购买时间是${peakHour}点`);
    }
    
    if (productPatterns.favorite_products.length > 0) {
      const favoriteProduct = productPatterns.favorite_products[0][0];
      insights.push(`客户最喜爱的产品是${favoriteProduct}`);
    }
    
    if (spendingPatterns.avg_order_value > 100) {
      insights.push('客户属于高价值客户，平均订单金额较高');
    }
    
    return insights;
  }

  private generateComprehensiveInsights(pathAnalysis: any, journeyAnalysis: any, patternAnalysis: any): string[] {
    const insights: string[] = [];
    
    if (pathAnalysis) {
      insights.push(`客户购买路径类型：${pathAnalysis.path_type}`);
      insights.push(`转化率：${(pathAnalysis.conversion_rate * 100).toFixed(1)}%`);
    }
    
    if (journeyAnalysis) {
      insights.push(`客户旅程总价值：¥${journeyAnalysis.total_value.toFixed(2)}`);
      if (journeyAnalysis.satisfaction_score) {
        insights.push(`满意度评分：${journeyAnalysis.satisfaction_score}/100`);
      }
    }
    
    if (patternAnalysis && patternAnalysis.behavior_insights) {
      insights.push(...patternAnalysis.behavior_insights);
    }
    
    return insights;
  }
}

export default CustomerBehaviorAnalysisService;
