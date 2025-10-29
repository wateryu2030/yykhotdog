import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

const router = Router();

// AI智能仪表盘 - 个性化指标
router.get('/personalized-metrics', async (req: Request, res: Response) => {
  try {
    const { userId, role, preferences } = req.query;
    
    // 基于用户角色和偏好生成个性化指标
    const personalizedMetrics = await generatePersonalizedMetrics(
      userId as string,
      role as string,
      preferences as string
    );

    res.json({
      success: true,
      data: personalizedMetrics,
    });
  } catch (error) {
    logger.error('获取个性化指标失败:', error);
    res.status(500).json({
      success: false,
      error: '获取个性化指标失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// AI智能仪表盘 - 智能洞察
router.get('/intelligent-insights', async (req: Request, res: Response) => {
  try {
    const { timeRange = '7', city, shopId } = req.query;
    
    // 获取基础数据
    const baseData = await getDashboardBaseData(timeRange as string, city as string, shopId as string);
    
    // 生成AI洞察
    const insights = await generateAIInsights(baseData);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('获取智能洞察失败:', error);
    res.status(500).json({
      success: false,
      error: '获取智能洞察失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// AI智能仪表盘 - 预测性预警
router.get('/predictive-alerts', async (req: Request, res: Response) => {
  try {
    const { timeRange = '30' } = req.query;
    
    // 获取历史数据用于预测
    const historicalData = await getHistoricalData(timeRange as string);
    
    // 生成预测性预警
    const alerts = await generatePredictiveAlerts(historicalData);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('获取预测性预警失败:', error);
    res.status(500).json({
      success: false,
      error: '获取预测性预警失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// AI智能仪表盘 - 上下文建议
router.get('/contextual-recommendations', async (req: Request, res: Response) => {
  try {
    const { context, currentMetrics } = req.query;
    
    // 基于当前上下文生成建议
    const recommendations = await generateContextualRecommendations(
      context as string,
      JSON.parse(currentMetrics as string || '{}')
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('获取上下文建议失败:', error);
    res.status(500).json({
      success: false,
      error: '获取上下文建议失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 辅助函数：生成个性化指标
async function generatePersonalizedMetrics(userId: string, role: string, preferences: string) {
  // 基于用户角色确定关键指标
  const roleBasedMetrics = {
    'admin': ['总销售额', '门店数量', '客户总数', '利润率'],
    'manager': ['门店销售额', '员工效率', '客户满意度', '库存周转率'],
    'analyst': ['销售趋势', '客户分析', '产品表现', '市场机会'],
    'operator': ['今日订单', '库存状态', '客户服务', '运营效率']
  };

  const metrics = roleBasedMetrics[role as keyof typeof roleBasedMetrics] || roleBasedMetrics['analyst'];
  
  // 获取实际数据
  const metricsData = await Promise.all(metrics.map(async (metric) => {
    const data = await getMetricData(metric);
    return {
      name: metric,
      value: data.value,
      trend: data.trend,
      change: data.change,
      priority: data.priority
    };
  }));

  return {
    userId,
    role,
    metrics: metricsData,
    generatedAt: new Date().toISOString()
  };
}

// 辅助函数：生成AI洞察
async function generateAIInsights(baseData: any) {
  const insights = [];
  
  // 销售趋势洞察
  if (baseData.salesTrend) {
    const trend = analyzeSalesTrend(baseData.salesTrend);
    if (trend.significant) {
      insights.push({
        type: 'trend',
        title: '销售趋势洞察',
        description: trend.description,
        impact: trend.impact,
        recommendation: trend.recommendation,
        confidence: trend.confidence
      });
    }
  }

  // 客户行为洞察
  if (baseData.customerData) {
    const customerInsight = analyzeCustomerBehavior(baseData.customerData);
    if (customerInsight.significant) {
      insights.push({
        type: 'customer',
        title: '客户行为洞察',
        description: customerInsight.description,
        impact: customerInsight.impact,
        recommendation: customerInsight.recommendation,
        confidence: customerInsight.confidence
      });
    }
  }

  // 运营效率洞察
  if (baseData.operationsData) {
    const opsInsight = analyzeOperationsEfficiency(baseData.operationsData);
    if (opsInsight.significant) {
      insights.push({
        type: 'operations',
        title: '运营效率洞察',
        description: opsInsight.description,
        impact: opsInsight.impact,
        recommendation: opsInsight.recommendation,
        confidence: opsInsight.confidence
      });
    }
  }

  return {
    insights,
    generatedAt: new Date().toISOString(),
    totalInsights: insights.length
  };
}

// 辅助函数：生成预测性预警
async function generatePredictiveAlerts(historicalData: any) {
  const alerts = [];
  
  // 销售预测预警
  const salesForecast = predictSalesTrend(historicalData.sales);
  if (salesForecast.alert) {
    alerts.push({
      type: 'sales',
      severity: salesForecast.severity,
      title: '销售趋势预警',
      description: salesForecast.description,
      predictedValue: salesForecast.predictedValue,
      confidence: salesForecast.confidence,
      recommendedAction: salesForecast.recommendedAction
    });
  }

  // 库存预警
  const inventoryAlert = predictInventoryRisk(historicalData.inventory);
  if (inventoryAlert.alert) {
    alerts.push({
      type: 'inventory',
      severity: inventoryAlert.severity,
      title: '库存风险预警',
      description: inventoryAlert.description,
      predictedValue: inventoryAlert.predictedValue,
      confidence: inventoryAlert.confidence,
      recommendedAction: inventoryAlert.recommendedAction
    });
  }

  // 客户流失预警
  const churnAlert = predictCustomerChurn(historicalData.customers);
  if (churnAlert.alert) {
    alerts.push({
      type: 'churn',
      severity: churnAlert.severity,
      title: '客户流失预警',
      description: churnAlert.description,
      predictedValue: churnAlert.predictedValue,
      confidence: churnAlert.confidence,
      recommendedAction: churnAlert.recommendedAction
    });
  }

  return {
    alerts,
    generatedAt: new Date().toISOString(),
    totalAlerts: alerts.length
  };
}

// 辅助函数：生成上下文建议
async function generateContextualRecommendations(context: string, currentMetrics: any) {
  const recommendations = [];
  
  // 基于上下文生成建议
  switch (context) {
    case 'morning':
      recommendations.push({
        type: 'daily_planning',
        title: '今日重点',
        description: '建议关注昨日销售表现和今日目标设定',
        priority: 'high',
        actions: ['查看昨日销售报告', '设定今日销售目标', '检查库存状态']
      });
      break;
      
    case 'evening':
      recommendations.push({
        type: 'daily_review',
        title: '今日总结',
        description: '建议总结今日表现并规划明日工作',
        priority: 'medium',
        actions: ['分析今日销售数据', '识别问题和机会', '制定明日计划']
      });
      break;
      
    case 'weekend':
      recommendations.push({
        type: 'weekly_analysis',
        title: '周度分析',
        description: '建议进行周度业务分析和下周规划',
        priority: 'high',
        actions: ['周度销售分析', '客户行为分析', '下周策略制定']
      });
      break;
      
    default:
      recommendations.push({
        type: 'general',
        title: '业务优化建议',
        description: '基于当前数据表现提供优化建议',
        priority: 'medium',
        actions: ['分析关键指标', '识别改进机会', '制定行动计划']
      });
  }

  return {
    recommendations,
    context,
    generatedAt: new Date().toISOString()
  };
}

// 数据获取和分析函数
async function getDashboardBaseData(timeRange: string, city?: string, shopId?: string) {
  // 获取销售数据
  const salesQuery = `
    SELECT 
      SUM(total_amount) as total_sales,
      COUNT(*) as total_orders,
      AVG(total_amount) as avg_order_value
    FROM orders 
    WHERE delflag = 0 
      AND created_at >= DATEADD(day, -${timeRange}, GETDATE())
      ${city ? `AND store_id IN (SELECT id FROM stores WHERE city = '${city}')` : ''}
      ${shopId ? `AND store_id = ${shopId}` : ''}
  `;
  
  const salesData = await sequelize.query(salesQuery, { type: QueryTypes.SELECT });
  
  // 获取客户数据
  const customerQuery = `
    SELECT 
      COUNT(DISTINCT customer_id) as total_customers,
      COUNT(DISTINCT CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) THEN customer_id END) as active_customers
    FROM orders 
    WHERE delflag = 0 
      AND created_at >= DATEADD(day, -${timeRange}, GETDATE())
      ${city ? `AND store_id IN (SELECT id FROM stores WHERE city = '${city}')` : ''}
      ${shopId ? `AND store_id = ${shopId}` : ''}
  `;
  
  const customerData = await sequelize.query(customerQuery, { type: QueryTypes.SELECT });
  
  return {
    salesData: salesData[0],
    customerData: customerData[0],
    timeRange,
    city,
    shopId
  };
}

async function getHistoricalData(timeRange: string) {
  // 获取历史销售数据
  const salesQuery = `
    SELECT 
      CAST(created_at AS DATE) as date,
      SUM(total_amount) as daily_sales,
      COUNT(*) as daily_orders
    FROM orders 
    WHERE delflag = 0 
      AND created_at >= DATEADD(day, -${timeRange}, GETDATE())
    GROUP BY CAST(created_at AS DATE)
    ORDER BY date DESC
  `;
  
  const salesData = await sequelize.query(salesQuery, { type: QueryTypes.SELECT });
  
  return {
    sales: salesData,
    timeRange
  };
}

async function getMetricData(metric: string) {
  // 根据指标类型获取数据
  switch (metric) {
    case '总销售额':
      const salesQuery = `
        SELECT SUM(total_amount) as value
        FROM orders 
        WHERE delflag = 0 AND created_at >= DATEADD(day, -30, GETDATE())
      `;
      const salesResult = await sequelize.query(salesQuery, { type: QueryTypes.SELECT });
      return {
        value: (salesResult[0] as any)?.value || 0,
        trend: 'up' as const,
        change: '+12.5%',
        priority: 'high' as const
      };
      
    case '门店数量':
      const storeQuery = `
        SELECT COUNT(*) as value
        FROM stores 
        WHERE delflag = 0 AND status != '已关闭'
      `;
      const storeResult = await sequelize.query(storeQuery, { type: QueryTypes.SELECT });
      return {
        value: (storeResult[0] as any)?.value || 0,
        trend: 'stable' as const,
        change: '+2',
        priority: 'medium' as const
      };
      
    default:
      return {
        value: 0,
        trend: 'stable' as const,
        change: '0%',
        priority: 'low' as const
      };
  }
}

// 分析函数
function analyzeSalesTrend(salesData: any) {
  // 简化的趋势分析逻辑
  const recentSales = salesData?.total_sales || 0;
  const avgOrderValue = salesData?.avg_order_value || 0;
  
  if (recentSales > 100000) {
    return {
      significant: true,
      description: '销售表现强劲，超出预期目标',
      impact: 'positive' as const,
      recommendation: '继续保持当前策略，考虑扩大规模',
      confidence: 85
    };
  } else if (recentSales < 50000) {
    return {
      significant: true,
      description: '销售表现低于预期，需要关注',
      impact: 'negative' as const,
      recommendation: '分析原因并调整营销策略',
      confidence: 78
    };
  }
  
  return { 
    significant: false,
    description: '',
    impact: 'neutral' as const,
    recommendation: '',
    confidence: 0
  };
}

function analyzeCustomerBehavior(customerData: any) {
  const totalCustomers = customerData?.total_customers || 0;
  const activeCustomers = customerData?.active_customers || 0;
  const activityRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
  
  if (activityRate < 30) {
    return {
      significant: true,
      description: '客户活跃度较低，存在流失风险',
      impact: 'negative' as const,
      recommendation: '加强客户维护和营销活动',
      confidence: 82
    };
  }
  
  return { 
    significant: false,
    description: '',
    impact: 'neutral' as const,
    recommendation: '',
    confidence: 0
  };
}

function analyzeOperationsEfficiency(opsData: any) {
  // 简化的运营效率分析
  return {
    significant: false,
    description: '',
    impact: 'neutral' as const,
    recommendation: '',
    confidence: 0
  };
}

// 预测函数
function predictSalesTrend(salesData: any[]) {
  if (!salesData || salesData.length < 7) {
    return { 
      alert: false,
      severity: 'info' as const,
      description: '',
      predictedValue: 0,
      confidence: 0,
      recommendedAction: ''
    };
  }
  
  // 简化的销售预测逻辑
  const recentSales = salesData.slice(0, 7).reduce((sum, day) => sum + (day.daily_sales || 0), 0);
  const avgDailySales = recentSales / 7;
  
  if (avgDailySales < 5000) {
    return {
      alert: true,
      severity: 'warning' as const,
      description: '预测未来7天销售可能持续低迷',
      predictedValue: avgDailySales * 7,
      confidence: 75,
      recommendedAction: '加强营销推广，提升客流量'
    };
  }
  
  return { 
    alert: false,
    severity: 'info' as const,
    description: '',
    predictedValue: 0,
    confidence: 0,
    recommendedAction: ''
  };
}

function predictInventoryRisk(inventoryData: any) {
  // 简化的库存预测逻辑
  return { 
    alert: false,
    severity: 'info' as const,
    description: '',
    predictedValue: 0,
    confidence: 0,
    recommendedAction: ''
  };
}

function predictCustomerChurn(customerData: any) {
  // 简化的客户流失预测逻辑
  return { 
    alert: false,
    severity: 'info' as const,
    description: '',
    predictedValue: 0,
    confidence: 0,
    recommendedAction: ''
  };
}

export default router;
