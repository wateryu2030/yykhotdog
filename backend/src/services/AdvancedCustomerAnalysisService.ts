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
  // 分析范围信息
  analysisScope?: {
    type: 'all_cities' | 'city' | 'store';
    city?: string;
    storeName?: string;
    storeCount?: number;
    cityStoreCount?: number;
  };
  // 店铺级别数据（当分析城市时）
  storeLevelData?: Array<{
    store_id: number;
    store_name: string;
    segments: Array<{
      segment_name: string;
      customer_count: number;
      avg_spend: number;
      avg_orders: number;
      total_revenue: number;
    }>;
    top_products: Array<{
      product_name: string;
      total_revenue: number;
      total_quantity: number;
    }>;
  }>;
}

export interface AIInsight {
  customerValueAssessment: string;
  churnRiskPrediction: string;
  personalizedMarketingSuggestions: string[];
  competitiveMarketingSuggestions?: string[];
  productRecommendationStrategy: string;
  healthScore: number;
  priorityActions: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;
  dataTables?: Array<{
    title: string;
    data: any[];
    columns: string[];
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
  async generateCustomerInsights(
    customerData: CustomerInsightData,
    analysisScope?: { type: 'all_cities' | 'city' | 'store'; city?: string; storeName?: string; storeCount?: number; cityStoreCount?: number }
  ): Promise<AIInsight> {
    try {
      // 合并分析范围信息
      if (analysisScope) {
        customerData.analysisScope = analysisScope;
        logger.info('AI分析 - 分析范围已设置:', JSON.stringify(analysisScope));
      } else {
        logger.warn('AI分析 - 未提供分析范围信息');
      }
      const prompt = this.buildAnalysisPrompt(customerData);
      logger.info('AI分析 - Prompt长度:', prompt.length, '字符');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "你是一个专业的餐饮行业客户分析专家，擅长基于数据生成深度洞察和营销建议。请用中文回答，提供详细、具体、可操作的建议。每个分析部分需要深入、专业，不少于200字。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
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

    // 构建详细的数据信息
    const segmentsDetail = data.segments.map(seg => 
      `${seg.segment_name}: ${seg.customer_count}人, 平均消费¥${seg.avg_spend?.toFixed(2) || '0.00'}, 平均订单${seg.avg_orders?.toFixed(1) || '0'}单, 总营收¥${seg.total_revenue?.toFixed(2) || '0.00'}`
    ).join('\n');

    const peakHours = data.timeDistribution
      .sort((a, b) => b.customer_count - a.customer_count)
      .slice(0, 5)
      .map(h => `${h.hour}时(${h.customer_count}人)`);

    const topProducts = (data.behavior?.productPreferences || []).slice(0, 5)
      .map((p: any) => `${p.product_name || p.goods_name || '未知'}: ¥${p.total_revenue?.toFixed(2) || '0.00'}`);

    // 根据分析范围构建不同的上下文描述
    let scopeDescription = '';
    let analysisFocus = '';
    
    if (data.analysisScope) {
      const scope = data.analysisScope;
      if (scope.type === 'all_cities') {
        scopeDescription = '本次分析覆盖所有城市的门店数据，属于全平台综合分析。';
        analysisFocus = `
**重点分析方向**：
- 分析各个城市的整体数据特征和差异
- 识别不同城市的客户购买习惯差异
- 分析各城市的常规购买商品特征
- 提供跨城市的营销策略建议
- 识别表现优秀的城市和需要改进的城市
`;
      } else if (scope.type === 'city') {
        scopeDescription = `本次分析聚焦于"${scope.city}"城市，涵盖该城市下${scope.cityStoreCount || '多个'}个门店的数据。`;
        
        // 添加店铺级别的详细数据描述
        let storeDetails = '';
        if (data.storeLevelData && data.storeLevelData.length > 0) {
          storeDetails = `\n\n## 各店铺详细数据：\n\n`;
          data.storeLevelData.forEach((store: any, index: number) => {
            const totalCustomers = store.segments.reduce((sum: number, seg: any) => sum + (seg.customer_count || 0), 0);
            const totalRevenue = store.segments.reduce((sum: number, seg: any) => sum + (seg.total_revenue || 0), 0);
            const coreCustomers = store.segments.find((s: any) => s.segment_name === '核心客户')?.customer_count || 0;
            const activeCustomers = store.segments.find((s: any) => s.segment_name === '活跃客户')?.customer_count || 0;
            
            storeDetails += `**店铺${index + 1}：${store.store_name}**\n`;
            storeDetails += `- 总客户数：${totalCustomers}人\n`;
            storeDetails += `- 总营收：¥${totalRevenue.toFixed(2)}\n`;
            storeDetails += `- 核心客户：${coreCustomers}人\n`;
            storeDetails += `- 活跃客户：${activeCustomers}人\n`;
            storeDetails += `- 客户分层详情：\n`;
            store.segments.forEach((seg: any) => {
              storeDetails += `  * ${seg.segment_name}：${seg.customer_count}人，平均消费¥${seg.avg_spend?.toFixed(2) || '0.00'}，平均订单${seg.avg_orders?.toFixed(1) || '0'}单，总营收¥${seg.total_revenue?.toFixed(2) || '0.00'}\n`;
            });
            if (store.top_products && store.top_products.length > 0) {
              storeDetails += `- 热门商品（前5名）：${store.top_products.map((p: any) => `${p.product_name}(¥${p.total_revenue?.toFixed(2) || '0.00'})`).join('、')}\n`;
            }
            storeDetails += `\n`;
          });
        }
        
        analysisFocus = `
**重点分析方向**：
- 详细描述"${scope.city}"城市的整体数据特征（客户规模、订单量、营收、客户分层等）
- **必须分别分析该城市下每个店铺的特点**，包括：
  * 每个店铺的客户分层情况（核心客户、活跃客户、机会客户、沉睡客户的比例和数量）
  * 每个店铺的客户购买习惯（购买频次、客单价、购买时间分布等）
  * 每个店铺的热门商品和商品购买偏好
  * 每个店铺的经营优势和劣势
  * 每个店铺的客户流失风险
- 对比分析各个店铺之间的差异，识别表现优秀的店铺和需要改进的店铺
- 分析该城市客户的整体购买习惯和偏好
- 分析该城市客户的常规购买商品特征
- 提供针对该城市的本地化营销策略建议
- 提供针对每个店铺的具体改进建议和营销策略
${storeDetails}
`;
      } else if (scope.type === 'store') {
        scopeDescription = `本次分析聚焦于"${scope.storeName}"店铺（位于${scope.city || '未知城市'}）。`;
        analysisFocus = `
**重点分析方向**：
- 详细描述"${scope.storeName}"店铺的基本情况（客户规模、订单量、营收等）
- 分析该店铺客户的购买习惯和特征
- 分析该店铺客户的常规购买商品特征
- 识别该店铺的优势和劣势
- 分析该店铺的客户流失风险
- 提供针对该店铺的具体改进建议和营销策略
`;
      }
    }

    return `
你是一个专业的餐饮行业客户分析专家，擅长基于数据生成深度洞察和营销建议。请基于以下热狗连锁店的客户数据，生成一份详细、专业、可操作的分析报告。

## 分析范围：
${scopeDescription || '本次分析基于选定的数据范围。'}

${analysisFocus || ''}

## 客户分层数据（详细）：
${segmentsDetail}

## 客户行为数据：
- 总客户数：${totalCustomers}人
- 高峰时段：${peakHours.join(', ')}
- 热门产品：${topProducts.join(', ')}

## 分析要求：

请提供以下深度分析（每个部分需要详细、具体，不少于200字）：

1. **客户价值评估**（详细分析）：
   ${data.analysisScope?.type === 'all_cities' ? '- 分析各城市的客户价值分布和差异\n   - 识别高价值城市和低价值城市\n   - 分析城市间的客户价值特征差异' : ''}
   ${data.analysisScope?.type === 'city' ? `- 评估"${data.analysisScope.city}"城市的整体客户价值水平\n   - 分析该城市各客户群体的价值特征\n   - 对比该城市与其他城市的客户价值差异` : ''}
   ${data.analysisScope?.type === 'store' ? `- 评估"${data.analysisScope.storeName}"店铺的客户价值水平\n   - 分析该店铺客户群体的价值特征\n   - 对比该店铺与同城市其他店铺的客户价值差异` : ''}
   - 评估当前客户群体的整体价值水平
   - 分析各客户群体的价值特征和潜力
   - 识别高价值客户的特征和行为模式
   - 提供价值提升的具体建议

2. **流失风险预测**（详细分析）：
   - 识别哪些客户群体存在流失风险
   - 分析流失风险的原因和预警信号
   - 评估不同客户群体的流失概率
   - 提供预防流失的具体措施

3. **个性化营销建议**（5-8条详细建议）：
   - 针对核心客户的VIP营销策略
   - 针对活跃客户的忠诚度提升方案
   - 针对机会客户的转化策略
   - 针对沉睡客户的激活方案
   - 基于时间分布的精准营销建议
   - 基于产品偏好的推荐策略
   - 会员体系优化建议
   - 促销活动设计建议

4. **竞品营销方法参考**（5-8条）：
   - 参考麦当劳、肯德基等快餐连锁的会员营销方法
   - 参考星巴克的客户忠诚度计划
   - 参考瑞幸咖啡的数字化营销策略
   - 参考其他餐饮品牌的社群运营方法
   - 参考新零售企业的私域流量运营
   - 提供适合热狗连锁店的借鉴方案

5. **产品推荐策略**（详细策略）：
   - 基于客户行为的产品组合优化
   - 新品推广策略
   - 套餐搭配建议
   - 季节性产品策略
   - 价格策略建议

6. **健康度评分**：根据实际数据特征（客户分层比例、客户价值、购买频次、流失风险等）给出0-100分的客户健康度评分，**必须基于实际数据计算，不能使用固定公式**。评分依据要详细说明，包括：
   - 核心客户和活跃客户的比例（比例越高，评分越高）
   - 平均客单价和购买频次（数值越高，评分越高）
   - 客户流失风险（风险越低，评分越高）
   - 客户生命周期价值（价值越高，评分越高）
   - 如果分析城市，还要考虑各店铺的健康度差异

7. **优先行动**：列出3-5个最重要的改进行动，每个行动包含：
   - 优先级（high/medium/low）
   - 标题
   - 详细描述（不少于100字）
   - 具体行动建议（可执行的步骤）

请用JSON格式返回结果，格式如下：
{
  "customerValueAssessment": "详细的价值评估分析（不少于200字）",
  "churnRiskPrediction": "详细的流失风险分析（不少于200字）",
  "personalizedMarketingSuggestions": ["建议1（详细）", "建议2（详细）", ...],
  "competitiveMarketingSuggestions": ["竞品方法1（详细）", "竞品方法2（详细）", ...],
  "productRecommendationStrategy": "详细的产品推荐策略（不少于300字）",
  "healthScore": 85,
  "priorityActions": [
    {
      "priority": "high",
      "title": "行动标题",
      "description": "详细描述（不少于100字）",
      "action": "具体行动步骤"
    }
  ]
}
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
        const insight = {
          customerValueAssessment: parsed.customerValueAssessment || '客户价值分析',
          churnRiskPrediction: parsed.churnRiskPrediction || '流失风险预测',
          personalizedMarketingSuggestions: parsed.personalizedMarketingSuggestions || [],
          competitiveMarketingSuggestions: parsed.competitiveMarketingSuggestions || this.generateCompetitiveSuggestions(data),
          productRecommendationStrategy: parsed.productRecommendationStrategy || '产品推荐策略',
          healthScore: parsed.healthScore || this.calculateHealthScore(data),
          priorityActions: parsed.priorityActions || this.generatePriorityActions(data),
          dataTables: this.generateDataTables(data)
        };
        return insight;
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
      competitiveMarketingSuggestions: this.generateCompetitiveSuggestions(data),
      productRecommendationStrategy: this.extractSection(response, '产品推荐策略') || '基于客户偏好优化产品组合',
      healthScore,
      priorityActions: this.generatePriorityActions(data),
      dataTables: this.generateDataTables(data)
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
      customerValueAssessment: '基于RFM模型分析，客户群体呈现良好的价值分布，核心客户和活跃客户占比较高。核心客户具有高消费频次和高客单价特征，是业务的主要收入来源。活跃客户虽然单次消费较低，但购买频次稳定，具有较高的成长潜力。机会客户需要重点关注转化，通过精准营销可以提升为活跃客户。',
      churnRiskPrediction: '沉睡客户群体需要重点关注，建议通过营销活动激活。根据数据分析，超过30天未购买的客户流失风险较高，需要及时采取激活措施。核心客户虽然价值高，但如果出现购买频次下降，也需要及时预警和干预。',
      personalizedMarketingSuggestions: [
        '针对核心客户推出VIP会员计划，提供专属优惠和优先服务，增强客户粘性',
        '为活跃客户提供个性化产品推荐，基于历史购买行为推送相关产品',
        '通过优惠券激活沉睡客户，设计限时促销活动吸引回流',
        '优化高峰时段的服务体验，增加人员配置和产品供应',
        '建立客户生命周期管理体系，对不同阶段的客户采取差异化策略',
        '推出积分兑换系统，提升客户复购率',
        '开展社群运营，建立客户微信群，定期推送优惠信息',
        '实施精准营销，基于客户画像推送个性化优惠券'
      ],
      competitiveMarketingSuggestions: this.generateCompetitiveSuggestions(data),
      productRecommendationStrategy: '基于客户购买历史和偏好，优化产品组合，提升客单价。重点关注热门产品的供应和推广，同时推出新品吸引客户尝试。设计套餐组合，提升单次消费金额。',
      healthScore,
      priorityActions,
      dataTables: this.generateDataTables(data)
    };
  }

  /**
   * 生成竞品营销建议
   */
  private generateCompetitiveSuggestions(data: CustomerInsightData): string[] {
    const suggestions = [
      '参考麦当劳的会员体系：推出积分卡系统，消费累计积分可兑换免费产品或优惠券，提升客户复购率',
      '借鉴星巴克的数字化营销：建立小程序和APP，实现线上点餐、会员管理、优惠推送一体化，提升客户体验',
      '学习瑞幸咖啡的社交裂变：推出"邀请好友得优惠"活动，通过社交传播扩大客户群体',
      '参考肯德基的套餐策略：设计多款套餐组合，提升客单价和客户满意度',
      '借鉴海底捞的服务理念：提供超出预期的服务体验，建立客户情感连接，提升忠诚度',
      '参考新零售企业的私域运营：建立企业微信群，定期推送优惠信息和新品信息，维护客户关系',
      '学习喜茶的品牌营销：通过社交媒体和KOL合作，提升品牌知名度和年轻客户吸引力',
      '借鉴盒马鲜生的精准推荐：基于客户购买历史，推送个性化产品推荐，提升转化率'
    ];
    return suggestions;
  }

  /**
   * 生成数据表格
   */
  private generateDataTables(data: CustomerInsightData): Array<{
    title: string;
    data: any[];
    columns: string[];
  }> {
    const tables = [];
    
    // 1. 客户分层数据表
    if (data.segments && data.segments.length > 0) {
      const segmentData = data.segments.slice(0, 20).map(seg => ({
        '客户群体': seg.segment_name,
        '客户数': seg.customer_count,
        '平均消费': `¥${Number(seg.avg_spend || 0).toFixed(2)}`,
        '平均订单数': Number(seg.avg_orders || 0).toFixed(1),
        '总营收': `¥${Number(seg.total_revenue || 0).toFixed(2)}`
      }));
      
      tables.push({
        title: '客户分层数据统计',
        data: segmentData,
        columns: ['客户群体', '客户数', '平均消费', '平均订单数', '总营收']
      });
    }
    
    // 2. 时间分布数据表
    if (data.timeDistribution && data.timeDistribution.length > 0) {
      const timeData = data.timeDistribution
        .filter((h: any) => h.customer_count > 0)
        .sort((a: any, b: any) => b.customer_count - a.customer_count)
        .slice(0, 20)
        .map((h: any) => ({
          '时段': `${h.hour}时`,
          '客户数': h.customer_count,
          '订单数': h.order_count
        }));
      
      if (timeData.length > 0) {
        tables.push({
          title: '客户购买时间分布',
          data: timeData,
          columns: ['时段', '客户数', '订单数']
        });
      }
    }
    
    // 3. 产品偏好数据表
    if (data.behavior?.productPreferences && data.behavior.productPreferences.length > 0) {
      const productData = data.behavior.productPreferences
        .slice(0, 20)
        .map((p: any) => ({
          '产品名称': p.product_name || p.goods_name || '未知',
          '购买次数': p.total_quantity || p.purchase_count || 0,
          '总营收': `¥${Number(p.total_revenue || 0).toFixed(2)}`,
          '客户数': p.customer_count || 0
        }));
      
      if (productData.length > 0) {
        tables.push({
          title: '热门产品偏好分析',
          data: productData,
          columns: ['产品名称', '购买次数', '总营收', '客户数']
        });
      }
    }
    
    return tables;
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
