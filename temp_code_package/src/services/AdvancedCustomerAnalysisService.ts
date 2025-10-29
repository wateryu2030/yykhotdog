import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface CustomerInsightData {
  segments: Array<{
    segment_name: string;
    customer_count: number;
    avg_spend: number;
    avg_orders: number;
    total_revenue: number;
    lifetime_value_3y: number;
  }>;
  behavior: {
    timeDistribution: Array<{
      hour: string;
      customer_count: number;
      order_count: number;
    }>;
    productPreferences: any[];
  };
  timeDistribution: Array<{
    hour: string;
    customer_count: number;
    order_count: number;
  }>;
}

export interface AIInsight {
  customerValueAssessment: string;
  churnRiskPrediction: string;
  personalizedMarketingSuggestions: string[];
  productRecommendationStrategy: string;
  healthScore: number;
  priorityActions: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;
}

export class AdvancedCustomerAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy',
    });
  }

  /**
   * 生成深度客户洞察
   */
  async generateCustomerInsights(customerData: CustomerInsightData): Promise<AIInsight> {
    try {
      const prompt = this.buildAnalysisPrompt(customerData);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "你是一个专业的客户分析专家，擅长基于数据生成深度洞察和营销建议。请用中文回答，提供具体、可操作的建议。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const analysisText = response.choices[0]?.message?.content || '';
      return this.parseAnalysisResponse(analysisText, customerData);
    } catch (error) {
      logger.error('AI分析生成失败:', error);
      return this.generateFallbackInsights(customerData);
    }
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(data: CustomerInsightData): string {
    const totalCustomers = data.segments.reduce((sum, seg) => sum + seg.customer_count, 0);
    const coreCustomers = data.segments.find(s => s.segment_name === '核心客户')?.customer_count || 0;
    const activeCustomers = data.segments.find(s => s.segment_name === '活跃客户')?.customer_count || 0;
    const opportunityCustomers = data.segments.find(s => s.segment_name === '机会客户')?.customer_count || 0;
    const dormantCustomers = data.segments.find(s => s.segment_name === '沉睡/新客户')?.customer_count || 0;

    return `
基于以下热狗连锁店的客户数据，请生成深度分析报告：

## 客户分层数据：
- 核心客户：${coreCustomers}人 (${((coreCustomers/totalCustomers)*100).toFixed(1)}%)
- 活跃客户：${activeCustomers}人 (${((activeCustomers/totalCustomers)*100).toFixed(1)}%)
- 机会客户：${opportunityCustomers}人 (${((opportunityCustomers/totalCustomers)*100).toFixed(1)}%)
- 沉睡/新客户：${dormantCustomers}人 (${((dormantCustomers/totalCustomers)*100).toFixed(1)}%)

## 客户行为数据：
- 时间分布：${data.timeDistribution.map(h => `${h.hour}时(${h.customer_count}人)`).join(', ')}
- 总客户数：${totalCustomers}人

请提供以下分析：

1. **客户价值评估**：评估当前客户群体的整体价值水平
2. **流失风险预测**：识别哪些客户群体存在流失风险
3. **个性化营销建议**：提供3-5个具体的营销策略建议
4. **产品推荐策略**：基于客户行为的产品推荐方案
5. **健康度评分**：给出0-100分的客户健康度评分
6. **优先行动**：列出3个最重要的改进行动

请用JSON格式返回结果，包含上述所有分析内容。
    `;
  }

  /**
   * 解析AI分析响应
   */
  private parseAnalysisResponse(response: string, data: CustomerInsightData): AIInsight {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          customerValueAssessment: parsed.customerValueAssessment || '客户价值分析',
          churnRiskPrediction: parsed.churnRiskPrediction || '流失风险预测',
          personalizedMarketingSuggestions: parsed.personalizedMarketingSuggestions || [],
          productRecommendationStrategy: parsed.productRecommendationStrategy || '产品推荐策略',
          healthScore: parsed.healthScore || this.calculateHealthScore(data),
          priorityActions: parsed.priorityActions || this.generatePriorityActions(data)
        };
      }
    } catch (error) {
      logger.error('解析AI响应失败:', error);
    }

    // 如果解析失败，使用文本分析
    return this.parseTextResponse(response, data);
  }

  /**
   * 解析文本响应
   */
  private parseTextResponse(response: string, data: CustomerInsightData): AIInsight {
    const suggestions = this.extractSuggestions(response);
    const healthScore = this.calculateHealthScore(data);
    
    return {
      customerValueAssessment: this.extractSection(response, '客户价值评估') || '基于数据分析，客户群体价值水平良好',
      churnRiskPrediction: this.extractSection(response, '流失风险预测') || '沉睡客户群体存在流失风险',
      personalizedMarketingSuggestions: suggestions,
      productRecommendationStrategy: this.extractSection(response, '产品推荐策略') || '基于客户偏好优化产品组合',
      healthScore,
      priorityActions: this.generatePriorityActions(data)
    };
  }

  /**
   * 提取建议
   */
  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('建议') || line.includes('策略') || line.includes('方案')) {
        const cleanLine = line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim();
        if (cleanLine.length > 10) {
          suggestions.push(cleanLine);
        }
      }
    }
    
    return suggestions.slice(0, 5); // 最多5个建议
  }

  /**
   * 提取特定部分
   */
  private extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}[：:]([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * 计算健康度评分
   */
  private calculateHealthScore(data: CustomerInsightData): number {
    const totalCustomers = data.segments.reduce((sum, seg) => sum + seg.customer_count, 0);
    const coreCustomers = data.segments.find(s => s.segment_name === '核心客户')?.customer_count || 0;
    const activeCustomers = data.segments.find(s => s.segment_name === '活跃客户')?.customer_count || 0;
    const opportunityCustomers = data.segments.find(s => s.segment_name === '机会客户')?.customer_count || 0;
    const dormantCustomers = data.segments.find(s => s.segment_name === '沉睡/新客户')?.customer_count || 0;

    if (totalCustomers === 0) return 0;

    const healthScore = Math.round(
      ((coreCustomers * 4 + activeCustomers * 3 + opportunityCustomers * 2 + dormantCustomers * 1) /
        (totalCustomers * 4)) * 100
    );

    return Math.max(0, Math.min(100, healthScore));
  }

  /**
   * 生成优先行动
   */
  private generatePriorityActions(data: CustomerInsightData): Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }> {
    const totalCustomers = data.segments.reduce((sum, seg) => sum + seg.customer_count, 0);
    const coreCustomers = data.segments.find(s => s.segment_name === '核心客户')?.customer_count || 0;
    const dormantCustomers = data.segments.find(s => s.segment_name === '沉睡/新客户')?.customer_count || 0;

    const actions = [];

    // 核心客户比例检查
    if (coreCustomers / totalCustomers < 0.05) {
      actions.push({
        type: '客户分层',
        priority: 'high' as const,
        title: '核心客户比例偏低',
        description: `当前核心客户仅占${((coreCustomers / totalCustomers) * 100).toFixed(1)}%，建议通过会员权益和个性化服务提升客户粘性`,
        action: '推出VIP会员计划，提供专属优惠和优先服务'
      });
    }

    // 沉睡客户检查
    if (dormantCustomers / totalCustomers > 0.8) {
      actions.push({
        type: '客户激活',
        priority: 'high' as const,
        title: '沉睡客户过多',
        description: `沉睡/新客户占比${((dormantCustomers / totalCustomers) * 100).toFixed(1)}%，需要激活策略`,
        action: '发送个性化优惠券，推出限时促销活动'
      });
    }

    // 时间分布优化
    const peakHours = data.timeDistribution
      .sort((a, b) => b.customer_count - a.customer_count)
      .slice(0, 3)
      .map(h => h.hour);

    if (peakHours.length > 0) {
      actions.push({
        type: '运营优化',
        priority: 'medium' as const,
        title: '高峰时段优化',
        description: `客户主要集中在${peakHours.join('、')}时，建议优化人员配置和产品供应`,
        action: '在高峰时段增加人员配置，提前准备热销产品'
      });
    }

    return actions.slice(0, 3); // 最多3个行动
  }

  /**
   * 生成备用洞察（当AI服务不可用时）
   */
  private generateFallbackInsights(data: CustomerInsightData): AIInsight {
    const healthScore = this.calculateHealthScore(data);
    const priorityActions = this.generatePriorityActions(data);

    return {
      customerValueAssessment: '基于RFM模型分析，客户群体呈现良好的价值分布，核心客户和活跃客户占比较高',
      churnRiskPrediction: '沉睡客户群体需要重点关注，建议通过营销活动激活',
      personalizedMarketingSuggestions: [
        '针对核心客户推出VIP会员计划',
        '为活跃客户提供个性化产品推荐',
        '通过优惠券激活沉睡客户',
        '优化高峰时段的服务体验',
        '建立客户生命周期管理体系'
      ],
      productRecommendationStrategy: '基于客户购买历史和偏好，优化产品组合，提升客单价',
      healthScore,
      priorityActions
    };
  }

  /**
   * 动态调整客户分群阈值
   */
  async adjustSegmentationThresholds(historicalData: any[]): Promise<{
    coreThreshold: { spend: number; orders: number };
    activeThreshold: { spend: number; orders: number };
    opportunityThreshold: { spend: number; orders: number };
  }> {
    try {
      // 基于历史数据计算动态阈值
      const spendValues = historicalData.map(d => d.total_spent).sort((a, b) => a - b);
      const orderValues = historicalData.map(d => d.order_count).sort((a, b) => a - b);

      const spend75 = spendValues[Math.floor(spendValues.length * 0.75)];
      const spend50 = spendValues[Math.floor(spendValues.length * 0.5)];
      const spend25 = spendValues[Math.floor(spendValues.length * 0.25)];

      const order75 = orderValues[Math.floor(orderValues.length * 0.75)];
      const order50 = orderValues[Math.floor(orderValues.length * 0.5)];
      const order25 = orderValues[Math.floor(orderValues.length * 0.25)];

      return {
        coreThreshold: { spend: spend75, orders: order75 },
        activeThreshold: { spend: spend50, orders: order50 },
        opportunityThreshold: { spend: spend25, orders: order25 }
      };
    } catch (error) {
      logger.error('动态阈值调整失败:', error);
      // 返回默认阈值
      return {
        coreThreshold: { spend: 1000, orders: 10 },
        activeThreshold: { spend: 500, orders: 5 },
        opportunityThreshold: { spend: 100, orders: 2 }
      };
    }
  }

  /**
   * 预测客户生命周期
   */
  async predictCustomerLifecycle(customerId: string, customerData: any): Promise<{
    currentStage: string;
    nextStage: string;
    predictedDuration: number;
    churnRisk: number;
    growthPotential: number;
  }> {
    try {
      const { total_spent, order_count, customer_lifespan_days } = customerData;
      
      // 基于数据预测客户生命周期阶段
      let currentStage = '新客户';
      if (customer_lifespan_days > 365 && total_spent > 1000) {
        currentStage = '成熟客户';
      } else if (customer_lifespan_days > 90 && total_spent > 500) {
        currentStage = '成长客户';
      } else if (customer_lifespan_days > 30) {
        currentStage = '活跃客户';
      }

      // 预测下一阶段
      let nextStage = '流失客户';
      if (currentStage === '新客户') {
        nextStage = '活跃客户';
      } else if (currentStage === '活跃客户') {
        nextStage = '成长客户';
      } else if (currentStage === '成长客户') {
        nextStage = '成熟客户';
      }

      // 计算流失风险（0-100）
      const churnRisk = Math.max(0, Math.min(100, 
        (customer_lifespan_days > 0 ? Math.max(0, 365 - customer_lifespan_days) / 365 : 0.5) * 100
      ));

      // 计算增长潜力（0-100）
      const growthPotential = Math.max(0, Math.min(100,
        (total_spent > 0 ? Math.min(1000, total_spent) / 1000 : 0.1) * 100
      ));

      return {
        currentStage,
        nextStage,
        predictedDuration: Math.max(30, customer_lifespan_days + 30),
        churnRisk,
        growthPotential
      };
    } catch (error) {
      logger.error('客户生命周期预测失败:', error);
      return {
        currentStage: '未知',
        nextStage: '未知',
        predictedDuration: 0,
        churnRisk: 50,
        growthPotential: 50
      };
    }
  }
}

export default AdvancedCustomerAnalysisService;
