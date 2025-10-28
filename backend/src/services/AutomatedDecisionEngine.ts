import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

interface DecisionRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
  lastExecuted?: Date;
  executionCount: number;
}

interface DecisionContext {
  storeId?: string;
  customerId?: string;
  productId?: string;
  timeRange?: string;
  metrics: Record<string, any>;
  currentHour?: number;
  orderQueueLength?: number;
  inventoryLevel?: number;
  customerLifetimeValue?: number;
  productSalesVelocity?: number;
  daysSinceLastOrder?: number;
  customerValue?: number;
}

interface DecisionResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  action: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning: string;
  executedAt: Date;
}

class AutomatedDecisionEngine {
  private rules: DecisionRule[] = [];
  private isRunning = false;
  private executionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultRules();
    logger.info('自动化决策引擎初始化完成');
  }

  /**
   * 初始化默认决策规则
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'low_stock_alert',
        name: '库存不足预警',
        condition: 'inventory_level < 10',
        action: 'send_stock_alert',
        priority: 1,
        enabled: true,
        executionCount: 0
      },
      {
        id: 'high_value_customer',
        name: '高价值客户识别',
        condition: 'customer_lifetime_value > 1000',
        action: 'send_vip_offer',
        priority: 2,
        enabled: true,
        executionCount: 0
      },
      {
        id: 'slow_moving_product',
        name: '滞销产品处理',
        condition: 'product_sales_velocity < 0.1',
        action: 'suggest_discount',
        priority: 3,
        enabled: true,
        executionCount: 0
      },
      {
        id: 'peak_hour_staffing',
        name: '高峰时段人员配置',
        condition: 'current_hour in [12, 13, 18, 19] AND order_queue_length > 5',
        action: 'increase_staff',
        priority: 4,
        enabled: true,
        executionCount: 0
      },
      {
        id: 'customer_churn_prevention',
        name: '客户流失预防',
        condition: 'days_since_last_order > 30 AND customer_value > 500',
        action: 'send_retention_offer',
        priority: 5,
        enabled: true,
        executionCount: 0
      }
    ];
  }

  /**
   * 启动自动化决策引擎
   * @param intervalMs 执行间隔（毫秒）
   */
  public start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      logger.warn('自动化决策引擎已在运行');
      return;
    }

    this.isRunning = true;
    logger.info(`启动自动化决策引擎，执行间隔: ${intervalMs}ms`);

    this.executionInterval = setInterval(async () => {
      try {
        await this.executeDecisions();
      } catch (error) {
        logger.error('自动化决策执行失败:', error);
      }
    }, intervalMs);

    // 立即执行一次
    this.executeDecisions();
  }

  /**
   * 停止自动化决策引擎
   */
  public stop(): void {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
    }
    this.isRunning = false;
    logger.info('自动化决策引擎已停止');
  }

  /**
   * 执行决策规则
   */
  private async executeDecisions(): Promise<void> {
    logger.info('开始执行自动化决策');

    const results: DecisionResult[] = [];

    for (const rule of this.rules.filter(r => r.enabled)) {
      try {
        const result = await this.evaluateRule(rule);
        if (result) {
          results.push(result);
          await this.executeAction(result);
        }
      } catch (error) {
        logger.error(`执行规则 ${rule.name} 失败:`, error);
      }
    }

    logger.info(`自动化决策执行完成，触发了 ${results.length} 个规则`);
  }

  /**
   * 评估单个规则
   */
  private async evaluateRule(rule: DecisionRule): Promise<DecisionResult | null> {
    try {
      const context = await this.gatherContext();
      const triggered = await this.evaluateCondition(rule.condition, context);

      if (triggered) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: true,
          action: rule.action,
          parameters: await this.generateActionParameters(rule.action, context),
          confidence: this.calculateConfidence(rule, context),
          reasoning: this.generateReasoning(rule, context),
          executedAt: new Date()
        };
      }

      return null;
    } catch (error) {
      logger.error(`评估规则 ${rule.name} 失败:`, error);
      return null;
    }
  }

  /**
   * 收集决策上下文
   */
  private async gatherContext(): Promise<DecisionContext> {
    try {
      // 获取实时指标
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT o.customer_id) as active_customers,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_revenue,
          AVG(o.total_amount) as avg_order_value
        FROM orders o
        WHERE o.created_at >= DATEADD(hour, -1, GETDATE())
      `;

      const metrics = await sequelize.query(metricsQuery, {
        type: QueryTypes.SELECT
      }) as any[];

      const currentHour = new Date().getHours();

      return {
        metrics: metrics[0] || {},
        timeRange: 'last_hour',
        currentHour: currentHour,
        orderQueueLength: Math.floor(Math.random() * 10), // 模拟订单队列长度
        inventoryLevel: Math.floor(Math.random() * 50), // 模拟库存水平
        customerLifetimeValue: Math.floor(Math.random() * 2000), // 模拟客户生命周期价值
        productSalesVelocity: Math.random() * 2, // 模拟产品销售速度
        daysSinceLastOrder: Math.floor(Math.random() * 60), // 模拟距离最后订单天数
        customerValue: Math.floor(Math.random() * 1000) // 模拟客户价值
      };
    } catch (error) {
      logger.error('收集决策上下文失败:', error);
      return { metrics: {} };
    }
  }

  /**
   * 评估条件
   */
  private async evaluateCondition(condition: string, context: DecisionContext): Promise<boolean> {
    try {
      // 简化的条件评估
      const conditionMap: Record<string, boolean> = {
        'inventory_level < 10': context.inventoryLevel < 10,
        'customer_lifetime_value > 1000': context.customerLifetimeValue > 1000,
        'product_sales_velocity < 0.1': context.productSalesVelocity < 0.1,
        'current_hour in [12, 13, 18, 19] AND order_queue_length > 5': 
          [12, 13, 18, 19].includes(context.currentHour) && context.orderQueueLength > 5,
        'days_since_last_order > 30 AND customer_value > 500': 
          context.daysSinceLastOrder > 30 && context.customerValue > 500
      };

      return conditionMap[condition] || false;
    } catch (error) {
      logger.error('评估条件失败:', error);
      return false;
    }
  }

  /**
   * 生成动作参数
   */
  private async generateActionParameters(action: string, context: DecisionContext): Promise<Record<string, any>> {
    switch (action) {
      case 'send_stock_alert':
        return {
          alertType: 'low_stock',
          threshold: 10,
          currentLevel: context.inventoryLevel,
          urgency: 'high'
        };

      case 'send_vip_offer':
        return {
          offerType: 'vip_discount',
          discountPercentage: 15,
          validDays: 30,
          targetCustomers: 'high_value'
        };

      case 'suggest_discount':
        return {
          discountType: 'clearance',
          discountPercentage: 25,
          duration: 14,
          reason: 'slow_moving'
        };

      case 'increase_staff':
        return {
          additionalStaff: 1,
          duration: 2, // 小时
          skillLevel: 'experienced',
          cost: 50
        };

      case 'send_retention_offer':
        return {
          offerType: 'comeback_discount',
          discountPercentage: 20,
          validDays: 7,
          message: '我们想念您！'
        };

      default:
        return {};
    }
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(rule: DecisionRule, context: DecisionContext): number {
    // 基于规则优先级和历史执行成功率计算置信度
    const baseConfidence = 0.7;
    const priorityBonus = rule.priority * 0.05;
    const executionBonus = Math.min(rule.executionCount * 0.01, 0.2);
    
    return Math.min(0.95, baseConfidence + priorityBonus + executionBonus);
  }

  /**
   * 生成推理说明
   */
  private generateReasoning(rule: DecisionRule, context: DecisionContext): string {
    switch (rule.id) {
      case 'low_stock_alert':
        return `库存水平 ${context.inventoryLevel} 低于阈值 10，需要及时补货`;
      case 'high_value_customer':
        return `客户生命周期价值 ${context.customerLifetimeValue} 超过 1000，建议提供VIP服务`;
      case 'slow_moving_product':
        return `产品销售速度 ${context.productSalesVelocity} 低于 0.1，建议促销清仓`;
      case 'peak_hour_staffing':
        return `当前时段 ${context.currentHour} 为高峰时段，订单队列长度 ${context.orderQueueLength} 超过阈值`;
      case 'customer_churn_prevention':
        return `客户 ${context.daysSinceLastOrder} 天未下单，价值 ${context.customerValue} 较高，建议挽留`;
      default:
        return '基于业务规则自动触发';
    }
  }

  /**
   * 执行动作
   */
  private async executeAction(result: DecisionResult): Promise<void> {
    try {
      logger.info(`执行动作: ${result.action}`, result.parameters);

      switch (result.action) {
        case 'send_stock_alert':
          await this.sendStockAlert(result.parameters);
          break;
        case 'send_vip_offer':
          await this.sendVipOffer(result.parameters);
          break;
        case 'suggest_discount':
          await this.suggestDiscount(result.parameters);
          break;
        case 'increase_staff':
          await this.increaseStaff(result.parameters);
          break;
        case 'send_retention_offer':
          await this.sendRetentionOffer(result.parameters);
          break;
        default:
          logger.warn(`未知动作: ${result.action}`);
      }

      // 更新规则执行计数
      const rule = this.rules.find(r => r.id === result.ruleId);
      if (rule) {
        rule.executionCount++;
        rule.lastExecuted = new Date();
      }

    } catch (error) {
      logger.error(`执行动作 ${result.action} 失败:`, error);
    }
  }

  // 具体动作实现
  private async sendStockAlert(parameters: any): Promise<void> {
    logger.info('发送库存预警', parameters);
    // 实际实现：发送邮件、短信或推送到管理界面
  }

  private async sendVipOffer(parameters: any): Promise<void> {
    logger.info('发送VIP优惠', parameters);
    // 实际实现：生成优惠券、发送营销邮件
  }

  private async suggestDiscount(parameters: any): Promise<void> {
    logger.info('建议产品折扣', parameters);
    // 实际实现：更新产品价格、生成促销活动
  }

  private async increaseStaff(parameters: any): Promise<void> {
    logger.info('增加人员配置', parameters);
    // 实际实现：通知排班系统、调整人员安排
  }

  private async sendRetentionOffer(parameters: any): Promise<void> {
    logger.info('发送挽留优惠', parameters);
    // 实际实现：发送个性化营销信息
  }

  /**
   * 添加自定义规则
   */
  public addRule(rule: Omit<DecisionRule, 'executionCount'>): void {
    const newRule: DecisionRule = {
      ...rule,
      executionCount: 0
    };
    this.rules.push(newRule);
    logger.info(`添加新规则: ${rule.name}`);
  }

  /**
   * 更新规则
   */
  public updateRule(ruleId: string, updates: Partial<DecisionRule>): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    logger.info(`更新规则: ${ruleId}`);
    return true;
  }

  /**
   * 删除规则
   */
  public removeRule(ruleId: string): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    const removedRule = this.rules.splice(ruleIndex, 1)[0];
    logger.info(`删除规则: ${removedRule.name}`);
    return true;
  }

  /**
   * 获取所有规则
   */
  public getRules(): DecisionRule[] {
    return [...this.rules];
  }

  /**
   * 获取引擎状态
   */
  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      totalExecutions: this.rules.reduce((sum, r) => sum + r.executionCount, 0),
      lastExecution: this.rules.reduce((latest, r) => 
        !latest || (r.lastExecuted && r.lastExecuted > latest) ? r.lastExecuted : latest, 
        null as Date | null
      )
    };
  }

  /**
   * 手动触发规则评估
   */
  public async triggerRuleEvaluation(ruleId?: string): Promise<DecisionResult[]> {
    const rulesToEvaluate = ruleId ? 
      this.rules.filter(r => r.id === ruleId) : 
      this.rules.filter(r => r.enabled);

    const results: DecisionResult[] = [];

    for (const rule of rulesToEvaluate) {
      const result = await this.evaluateRule(rule);
      if (result) {
        results.push(result);
        await this.executeAction(result);
      }
    }

    return results;
  }
}

export default AutomatedDecisionEngine;
