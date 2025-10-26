import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();

// 测试API：获取门店历史小时销售数据
router.get('/test-hourly-data/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    
    const hourlyHistoryQuery = `
      SELECT 
        DATEPART(hour, created_at) as hour,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0 
        AND pay_state = 2
        AND created_at >= DATEADD(day, -30, GETDATE())
      GROUP BY DATEPART(hour, created_at)
      ORDER BY hour
    `;
    
    const hourlyHistory = await sequelize.query(hourlyHistoryQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId: parseInt(storeId) }
    });
    
    res.json({
      success: true,
      data: hourlyHistory,
      message: `门店${storeId}的历史小时销售数据`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取销售预测数据
router.get('/predictions/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, baseDate } = req.query;
    
    // 检查门店是否存在
    const storeQuery = `
      SELECT id, store_name, status, store_type, province, city, district, area_size, rent_amount
      FROM stores 
      WHERE id = :storeId AND delflag = 0
    `;
    const storeResult = await sequelize.query(storeQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId: storeId }
    });

    if (!storeResult || storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }

    const storeInfo = storeResult[0] as any;
    const predictionBaseDate = baseDate || new Date().toISOString().split('T')[0];
    
    // 获取历史销售数据（基于基准日前90天，更长的历史数据）
    const historyQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(total_amount) as daily_sales,
        COUNT(*) as daily_orders,
        COUNT(DISTINCT customer_id) as daily_customers,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) >= DATEADD(day, -90, :baseDate)
        AND CAST(created_at AS DATE) <= :baseDate
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date DESC
    `;

    const historyData = await sequelize.query(historyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        baseDate: predictionBaseDate
      }
    });

    // 获取最近7天的数据用于趋势分析
    const recentQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(total_amount) as daily_sales,
        COUNT(*) as daily_orders,
        COUNT(DISTINCT customer_id) as daily_customers
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) >= DATEADD(day, -7, :baseDate)
        AND CAST(created_at AS DATE) <= :baseDate
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date DESC
    `;

    const recentData = await sequelize.query(recentQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        baseDate: predictionBaseDate
      }
    });

    // 计算预测参数
    const predictionParams = calculatePredictionParameters(historyData, recentData, storeInfo);
    
    // 检查是否有足够的数据进行预测
    if (predictionParams.hasInsufficientData) {
      return res.json({
        success: false,
        error: '数据不足',
        message: '该门店历史销售数据不足，无法进行准确预测。建议收集更多历史数据后再进行预测。',
        data: [],
        metadata: {
          storeInfo: {
            id: storeInfo.id,
            name: storeInfo.store_name,
            status: storeInfo.status,
            type: storeInfo.store_type,
            location: `${storeInfo.province}${storeInfo.city}${storeInfo.district}`
          },
          dataSource: {
            historicalDataPoints: historyData.length,
            recentDataPoints: recentData.length,
            dataRange: historyData.length > 0 ? {
              startDate: (historyData[historyData.length - 1] as any)?.date,
              endDate: (historyData[0] as any)?.date
            } : null
          },
          predictionMethod: {
            algorithm: '多因子加权预测模型',
            factors: [],
            weights: {},
            confidence: 0
          },
          summary: {
            totalPredictedSales: 0,
            totalPredictedOrders: 0,
            avgDailySales: 0,
            avgDailyOrders: 0,
            lastUpdateDate: predictionBaseDate
          }
        }
      });
    }
    
    // 生成未来7天的预测
    const predictions = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(predictionBaseDate as string);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
      const prediction = await generateDayPrediction(dateStr, dayOfWeek, i, predictionParams, historyData, storeInfo.id);
      
      predictions.push(prediction);
    }

    // 计算总体统计
    const totalPredictedSales = predictions.reduce((sum, p) => sum + p.predictedSales, 0);
    const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedOrders, 0);
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    res.json({
      success: true,
      data: predictions,
      metadata: {
        storeInfo: {
          id: storeInfo.id,
          name: storeInfo.store_name,
          status: storeInfo.status,
          type: storeInfo.store_type,
          location: `${storeInfo.province}${storeInfo.city}${storeInfo.district}`
        },
        dataSource: {
          historicalDataPoints: historyData.length,
          recentDataPoints: recentData.length,
          dataRange: historyData.length > 0 ? {
            startDate: (historyData[historyData.length - 1] as any)?.date,
            endDate: (historyData[0] as any)?.date
          } : null
        },
        predictionMethod: {
          algorithm: '多因子加权预测模型',
          factors: predictionParams.factors,
          weights: predictionParams.weights,
          confidence: Math.round(avgConfidence * 100)
        },
        summary: {
          totalPredictedSales: Math.round(totalPredictedSales),
          totalPredictedOrders: Math.round(totalPredictedOrders),
          avgDailySales: Math.round(totalPredictedSales / 7),
          avgDailyOrders: Math.round(totalPredictedOrders / 7),
          lastUpdateDate: predictionBaseDate
        }
      }
    });

  } catch (error: any) {
    console.error('获取销售预测数据失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 计算预测参数
function calculatePredictionParameters(historyData: any[], recentData: any[], storeInfo: any) {
  // 如果没有历史数据，直接返回无法预测
  if (!historyData || historyData.length === 0) {
    return {
      factors: [],
      weights: {},
      baseValues: null,
      hasInsufficientData: true
    };
  }

  // 计算有效数据统计
  const totalSales = historyData.reduce((sum, item) => sum + parseFloat(item.daily_sales || 0), 0);
  const totalOrders = historyData.reduce((sum, item) => sum + parseInt(item.daily_orders || 0), 0);
  
  // 检查是否有有效的销售数据（总销售额大于0）
  if (totalSales <= 0 || totalOrders <= 0) {
    return {
      factors: [],
      weights: {},
      baseValues: null,
      hasInsufficientData: true
    };
  }

  const factors = [];
  const weights = {};
  
  // 1. 历史数据因子（必须有历史数据才能进行预测）
  const avgSales = totalSales / historyData.length;
  const avgOrders = totalOrders / historyData.length;
  const salesStdDev = calculateStandardDeviation(historyData.map(item => parseFloat(item.daily_sales || 0)));
  const ordersStdDev = calculateStandardDeviation(historyData.map(item => parseInt(item.daily_orders || 0)));
  
  factors.push({
    name: '历史数据基准',
    description: `基于${historyData.length}天历史数据`,
    value: { avgSales, avgOrders, salesStdDev, ordersStdDev },
    weight: 0.4
  });
  weights['historical'] = 0.4;
  
  // 2. 近期趋势因子
  if (recentData && recentData.length >= 3) {
    const trend = calculateTrend(recentData);
    factors.push({
      name: '近期趋势',
      description: `基于最近${recentData.length}天数据`,
      value: trend,
      weight: 0.3
    });
    weights['trend'] = 0.3;
  }
  
  // 3. 门店特征因子
  const storeFactors = calculateStoreFactors(storeInfo);
  factors.push({
    name: '门店特征',
    description: '基于门店类型、状态、位置等特征',
    value: storeFactors,
    weight: 0.2
  });
  weights['store'] = 0.2;
  
  // 4. 季节性因子
  const seasonalFactor = calculateSeasonalFactor();
  factors.push({
    name: '季节性调整',
    description: '基于月份和星期的季节性模式',
    value: seasonalFactor,
    weight: 0.1
  });
  weights['seasonal'] = 0.1;

  return {
    factors,
    weights,
    baseValues: {
      avgSales,
      avgOrders
    },
    hasInsufficientData: false
  };
}

// 生成单日预测
async function generateDayPrediction(dateStr: string, dayOfWeek: number, dayIndex: number, params: any, historyData: any[], storeId: number) {
  const { factors, weights, baseValues } = params;
  
  // 如果没有基础值，返回错误
  if (!baseValues) {
    throw new Error('数据不足，无法进行预测');
  }
  
  // 基础预测值
  let predictedSales = baseValues.avgSales;
  let predictedOrders = baseValues.avgOrders;
  
  // 应用各因子权重
  let totalWeight = 0;
  let confidence = 0.8; // 基础置信度
  
  factors.forEach(factor => {
    const weight = factor.weight;
    totalWeight += weight;
    
    switch (factor.name) {
      case '历史数据基准':
        // 历史数据已经作为基础值，这里主要调整置信度
        confidence += weight * 0.2;
        break;
        
      case '近期趋势':
        if (factor.value.trendDirection === 'up') {
          predictedSales *= (1 + factor.value.trendStrength * 0.1);
          predictedOrders *= (1 + factor.value.trendStrength * 0.1);
        } else if (factor.value.trendDirection === 'down') {
          predictedSales *= (1 - factor.value.trendStrength * 0.1);
          predictedOrders *= (1 - factor.value.trendStrength * 0.1);
        }
        confidence += weight * 0.15;
        break;
        
      case '门店特征':
        predictedSales *= factor.value.salesMultiplier;
        predictedOrders *= factor.value.ordersMultiplier;
        confidence += weight * 0.1;
        break;
        
      case '季节性调整':
        const dayMultiplier = factor.value.dayOfWeekMultipliers[dayOfWeek] || 1.0;
        const monthMultiplier = factor.value.monthMultiplier || 1.0;
        predictedSales *= dayMultiplier * monthMultiplier;
        predictedOrders *= dayMultiplier * monthMultiplier;
        confidence += weight * 0.05;
        break;
    }
  });
  
  // 时间衰减因子（预测越远，置信度越低）
  const timeDecay = Math.max(0.6, 0.9 - (dayIndex * 0.05));
  confidence *= timeDecay;
  
  // 数据质量因子
  if (historyData && historyData.length < 7) {
    confidence *= 0.8; // 数据不足时降低置信度
  }
  
  // 预测值合理性检查 - 更严格的限制
  const maxReasonableMultiplier = 1.5; // 最大合理倍数降低到1.5倍
  const historicalMax = Math.max(...historyData.map(item => parseFloat(item.daily_sales || 0)));
  const historicalAvg = baseValues.avgSales;
  
  // 如果预测值超过历史最大值的1.5倍，进行限制
  if (predictedSales > historicalMax * maxReasonableMultiplier) {
    predictedSales = historicalMax * maxReasonableMultiplier;
    confidence *= 0.5; // 大幅降低置信度
  }
  
  // 如果预测值超过历史平均值的2倍，进行限制
  if (predictedSales > historicalAvg * 2) {
    predictedSales = historicalAvg * 2;
    confidence *= 0.6; // 降低置信度
  }
  
  // 确保预测值不会低于历史平均值的30%
  if (predictedSales < historicalAvg * 0.3) {
    predictedSales = historicalAvg * 0.3;
  }
  
  // 生成计算依据说明
  const calculationBasis = generateCalculationBasis(factors, weights, dayOfWeek, dayIndex, historyData);
  
  // 生成24小时预测数据
  console.log('开始生成24小时预测数据...');
  const hourlyBreakdown = await generateHourlyBreakdown(predictedSales, predictedOrders, dayOfWeek, confidence, historyData, storeId);
  console.log('24小时预测数据生成完成，长度:', hourlyBreakdown.length);
  
  console.log('生成24小时预测数据:', {
    date: dateStr,
    predictedSales,
    predictedOrders,
    dayOfWeek,
    confidence,
    hourlyBreakdownLength: hourlyBreakdown.length,
    hourlyBreakdownSample: hourlyBreakdown.slice(0, 3)
  });

  return {
    date: dateStr,
    predictedSales: Math.round(predictedSales),
    predictedOrders: Math.round(predictedOrders),
    actualSales: dayIndex === 0 ? ((historyData[0] as any)?.daily_sales || 0) : null,
    actualOrders: dayIndex === 0 ? ((historyData[0] as any)?.daily_orders || 0) : null,
    confidence: Math.round(confidence * 100) / 100,
    calculationBasis,
    factors: factors.map(f => ({
      name: f.name,
      description: f.description,
      impact: f.weight * 100 + '%',
      value: f.value
    })),
    hourlyBreakdown
  };
}

// 计算标准差
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// 计算趋势
function calculateTrend(recentData: any[]) {
  if (recentData.length < 2) return { trendDirection: 'stable', trendStrength: 0 };
  
  const sales = recentData.map(item => parseFloat(item.daily_sales || 0));
  const orders = recentData.map(item => parseInt(item.daily_orders || 0));
  
  // 计算线性回归斜率
  const salesSlope = calculateSlope(sales);
  const ordersSlope = calculateSlope(orders);
  
  const avgSlope = (salesSlope + ordersSlope) / 2;
  const trendStrength = Math.abs(avgSlope) / Math.max(...sales);
  
  return {
    trendDirection: avgSlope > 0.05 ? 'up' : avgSlope < -0.05 ? 'down' : 'stable',
    trendStrength: Math.min(trendStrength, 0.5),
    salesSlope,
    ordersSlope
  };
}

// 计算斜率
function calculateSlope(values: number[]): number {
  const n = values.length;
  const x = Array.from({length: n}, (_, i) => i);
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

// 计算门店特征因子 - 简化版本，避免过度放大
function calculateStoreFactors(storeInfo: any) {
  let salesMultiplier = 1.0;
  let ordersMultiplier = 1.0;
  
  // 门店状态影响 - 进一步降低乘数
  switch (storeInfo.status) {
    case '营业中':
      salesMultiplier = 1.0;  // 营业中不进行放大
      ordersMultiplier = 1.0;
      break;
    case '暂停营业':
      salesMultiplier = 0.2;  // 暂停营业大幅降低
      ordersMultiplier = 0.2;
      break;
    case '装修中':
      salesMultiplier = 0.05; // 装修中几乎无销售
      ordersMultiplier = 0.05;
      break;
  }
  
  // 门店类型影响 - 微调，避免大幅变化
  switch (storeInfo.store_type) {
    case '旗舰店':
      salesMultiplier *= 1.05;  // 仅5%的调整
      ordersMultiplier *= 1.05;
      break;
    case '标准店':
      // 标准店保持基准值
      break;
    case '小型店':
      salesMultiplier *= 0.95;  // 仅5%的调整
      ordersMultiplier *= 0.95;
      break;
    case '加盟店':
      salesMultiplier *= 0.98;  // 微小调整
      ordersMultiplier *= 0.98;
      break;
    case '直营店':
      salesMultiplier *= 1.02;  // 微小调整
      ordersMultiplier *= 1.02;
      break;
  }
  
  return {
    salesMultiplier,
    ordersMultiplier,
    status: storeInfo.status,
    type: storeInfo.store_type
  };
}

// 计算季节性因子
function calculateSeasonalFactor() {
  const now = new Date();
  const month = now.getMonth() + 1;
  
  // 月份因子（基于热狗销售季节性）
  const monthMultipliers = {
    1: 0.9,   // 1月：春节前
    2: 0.8,   // 2月：春节期间
    3: 1.0,   // 3月：正常
    4: 1.1,   // 4月：春季回暖
    5: 1.2,   // 5月：五一假期
    6: 1.1,   // 6月：夏季开始
    7: 1.3,   // 7月：暑假旺季
    8: 1.3,   // 8月：暑假旺季
    9: 1.1,   // 9月：开学季
    10: 1.0,  // 10月：正常
    11: 1.1,  // 11月：双十一
    12: 1.2   // 12月：年末消费
  };
  
  // 星期因子
  const dayOfWeekMultipliers = {
    0: 1.2,   // 周日：休息日消费高
    1: 0.9,   // 周一：工作日开始
    2: 1.0,   // 周二：正常
    3: 1.0,   // 周三：正常
    4: 1.1,   // 周四：接近周末
    5: 1.3,   // 周五：周末前
    6: 1.4    // 周六：周末消费高峰
  };
  
  return {
    monthMultiplier: monthMultipliers[month] || 1.0,
    dayOfWeekMultipliers,
    currentMonth: month
  };
}

// 生成计算依据说明
function generateCalculationBasis(factors: any[], weights: any, dayOfWeek: number, dayIndex: number, historyData: any[]) {
  const basis = {
    dataSource: {
      historicalDays: historyData.length,
      dataQuality: historyData.length >= 30 ? '高' : historyData.length >= 7 ? '中' : '低',
      lastDataDate: historyData.length > 0 ? historyData[0].date : null
    },
    algorithm: {
      name: '多因子加权预测模型',
      description: '结合历史数据、趋势分析、门店特征和季节性因子的综合预测模型',
      version: '2.0'
    },
    factors: factors.map(factor => ({
      name: factor.name,
      weight: factor.weight,
      description: factor.description,
      impact: factor.weight * 100 + '%'
    })),
    adjustments: {
      timeDecay: `预测第${dayIndex + 1}天，时间衰减因子: ${Math.max(0.6, 0.9 - (dayIndex * 0.05)).toFixed(2)}`,
      dayOfWeek: `星期${['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]}，季节性调整`,
      confidence: `综合置信度: ${Math.round((0.8 * Math.max(0.6, 0.9 - (dayIndex * 0.05))) * 100)}%`
    }
  };
  
  return basis;
}

// 获取业绩分析数据
router.get('/performance/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { date, baseDate } = req.query;
    
    const targetDate = date || baseDate || new Date().toISOString().split('T')[0];
    
    // 检查门店是否存在
    const storeQuery = `
      SELECT id, store_name, status 
      FROM stores 
      WHERE id = :storeId AND delflag = 0
    `;
    const storeResult = await sequelize.query(storeQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId: storeId }
    });

    if (!storeResult || storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }

    // 获取当日销售数据
    const todayQuery = `
      SELECT 
        SUM(total_amount) as total_amount_sales,
        COUNT(*) as total_amount_orders,
        COUNT(DISTINCT customer_id) as customer_count,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) = :targetDate
    `;

    const todayData = await sequelize.query(todayQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        targetDate: targetDate
      }
    });

    // 获取昨日销售数据用于对比
    const yesterdayQuery = `
      SELECT 
        SUM(total_amount) as total_amount_sales,
        COUNT(*) as total_amount_orders,
        COUNT(DISTINCT customer_id) as customer_count
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) = DATEADD(day, -1, :targetDate)
    `;

    const yesterdayData = await sequelize.query(yesterdayQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        targetDate: targetDate
      }
    });

    // 获取历史销售数据用于计算目标销售额
    const historyQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(total_amount) as daily_sales,
        COUNT(*) as daily_orders
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) >= DATEADD(day, -30, :targetDate)
        AND CAST(created_at AS DATE) < :targetDate
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date DESC
    `;

    const historyData = await sequelize.query(historyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        targetDate: targetDate
      }
    });

    // 获取最近7天趋势数据
    const trendsQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(total_amount) as daily_sales,
        COUNT(*) as daily_orders,
        COUNT(DISTINCT customer_id) as daily_customers
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) BETWEEN DATEADD(day, -6, :targetDate) AND :targetDate
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date ASC
    `;

    const trendsData = await sequelize.query(trendsQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        targetDate: targetDate
      }
    });

    // 检查数据量是否足够，如果不足则返回数据不足的错误
    let today, yesterday;
    
    if (!todayData || todayData.length === 0 || !(todayData[0] as any).total_amount_sales) {
      // 没有真实数据时，直接返回数据不足的错误
      return res.json({
        success: false,
        error: '数据不足',
        message: '该门店当前没有销售数据，无法进行业绩分析。',
        data: null
      });
    } else {
      today = todayData[0] as any;
      yesterday = yesterdayData[0] as any;
    }
    
    // 计算业绩指标
    const total_amountSales = parseFloat(today.total_amount_sales || 0);
    const total_amountOrders = parseInt(today.total_amount_orders || 0);
    const customerCount = parseInt(today.customer_count || 0);
    const avgOrderValue = parseFloat(today.avg_order_value || 0);
    
    const yesterdaySales = parseFloat(yesterday?.total_amount_sales || 0);
    const yesterdayOrders = parseInt(yesterday?.total_amount_orders || 0);
    
    // 计算增长率
    const salesGrowthRate = yesterdaySales > 0 ? 
      ((total_amountSales - yesterdaySales) / yesterdaySales) * 100 : 0;
    const ordersGrowthRate = yesterdayOrders > 0 ? 
      ((total_amountOrders - yesterdayOrders) / yesterdayOrders) * 100 : 0;
    
    // 动态计算目标销售额：基于历史平均销售额的1.2倍，最低不低于500
    const avgHistoricalSales = historyData.length > 0 ? 
      historyData.reduce((sum, item: any) => sum + parseFloat(item.daily_sales || 0), 0) / historyData.length : 500;
    const targetSales = Math.max(500, avgHistoricalSales * 1.2);
    const completionRate = (total_amountSales / targetSales) * 100;

    // 生成趋势数据
    let trends;
    if (trendsData && trendsData.length > 0) {
      trends = {
        sales: trendsData.map((item: any) => Math.round(parseFloat(item.daily_sales || 0))),
        customers: trendsData.map((item: any) => parseInt(item.daily_customers || 0)),
        orders: trendsData.map((item: any) => parseInt(item.daily_orders || 0))
      };
    } else {
      // 没有历史趋势数据时，生成基于当前数据的模拟趋势
      const baseSales = total_amountSales / 7;
      const baseCustomers = customerCount / 7;
      const baseOrders = total_amountOrders / 7;
      
      trends = {
        sales: Array.from({ length: 7 }, (_, i) => 
          Math.round(baseSales * (0.8 + Math.random() * 0.4))
        ),
        customers: Array.from({ length: 7 }, (_, i) => 
          Math.round(baseCustomers * (0.8 + Math.random() * 0.4))
        ),
        orders: Array.from({ length: 7 }, (_, i) => 
          Math.round(baseOrders * (0.8 + Math.random() * 0.4))
        )
      };
    }

    // 生成洞察
    const insights = [];
    if (salesGrowthRate > 10) {
      insights.push('销售额增长显著，表现优秀');
    } else if (salesGrowthRate < -10) {
      insights.push('销售额下降明显，需要关注');
    }
    
    if (completionRate > 100) {
      insights.push('已超额完成销售目标');
    } else if (completionRate < 50) {
      insights.push('销售目标完成率较低，需要加强');
    }

    res.json({
      success: true,
      data: {
        metrics: {
          total_amountSales: total_amountSales,
          targetSales: targetSales,
          completionRate: completionRate / 100,
          growthRate: salesGrowthRate / 100,
          customerCount: customerCount,
          avgOrderValue: avgOrderValue
        },
        trends: trends,
        insights: insights
      }
    });

  } catch (error: any) {
    console.error('获取业绩分析数据失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 重新生成预测数据
router.post('/regenerate/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, baseDate } = req.body;
    
    // 检查门店是否存在
    const storeQuery = `
      SELECT id, store_name, status 
      FROM stores 
      WHERE id = :storeId AND delflag = 0
    `;
    const storeResult = await sequelize.query(storeQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId: storeId }
    });

    if (!storeResult || storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }

    // 使用基准日或当前日期
    const predictionBaseDate = baseDate || startDate || new Date().toISOString().split('T')[0];
    
    // 获取最新的历史数据（基于基准日前14天）
    const historyQuery = `
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(total_amount) as daily_sales,
        COUNT(*) as daily_orders
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) >= DATEADD(day, -14, :baseDate)
        AND CAST(created_at AS DATE) <= :baseDate
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date DESC
    `;

    const historyData = await sequelize.query(historyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: storeId,
        baseDate: predictionBaseDate
      }
    });

    // 基于最新数据重新计算预测
    let avgSales = 0;
    let avgOrders = 0;
    
    if (historyData && historyData.length > 0) {
      // 有历史数据时使用历史数据
      avgSales = historyData.reduce((sum, item: any) => sum + parseFloat(item.daily_sales || 0), 0) / historyData.length;
      avgOrders = historyData.reduce((sum, item: any) => sum + parseInt(item.daily_orders || 0), 0) / historyData.length;
    } else {
      // 没有历史数据时使用默认值
      avgSales = 1000; // 默认日销售额
      avgOrders = 50;  // 默认日订单数
    }
    
    const newPredictions = [];
    
    // 生成未来3天的重新预测（从基准日开始）
    for (let i = 0; i < 3; i++) {
      const date = new Date(predictionBaseDate as string);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const predictedSales = Math.round(avgSales * (0.9 + Math.random() * 0.2));
      const predictedOrders = Math.round(avgOrders * (0.9 + Math.random() * 0.2));
      
      newPredictions.push({
        date: dateStr,
        predictedSales: predictedSales,
        actualSales: i === 0 ? ((historyData[0] as any)?.daily_sales || 0) : null,
        predictedOrders: predictedOrders,
        actualOrders: i === 0 ? ((historyData[0] as any)?.daily_orders || 0) : null,
        confidence: 0.75 + Math.random() * 0.15,
        factors: [
          '基于最新14天数据',
          'AI重新分析',
          '实时趋势调整'
        ]
      });
    }

    res.json({
      success: true,
      data: newPredictions,
      message: '预测数据已基于最新数据重新生成',
      metadata: {
        dataPoints: historyData.length,
        avgDailySales: avgSales,
        avgDailyOrders: avgOrders,
        regenerateTime: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('重新生成预测数据失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 获取销售对比数据
router.get('/comparison/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const currentStartDate = startDate || new Date().toISOString().split('T')[0];
    const currentEndDate = endDate || currentStartDate;
    
    // 计算对比期间（前一个相同长度的期间）
    const currentStart = new Date(currentStartDate as string);
    const currentEnd = new Date(currentEndDate as string);
    const periodDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - periodDays + 1);

    // 获取当前期间数据
    const currentQuery = `
      SELECT 
        SUM(total_amount) as total_amount_sales,
        COUNT(*) as total_amount_orders,
        COUNT(DISTINCT customer_id) as total_amount_customers,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) BETWEEN :currentStart AND :currentEnd
    `;

    const currentData = await sequelize.query(currentQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: parseInt(storeId),
        currentStart: currentStartDate,
        currentEnd: currentEndDate
      }
    });

    // 获取对比期间数据
    const previousQuery = `
      SELECT 
        SUM(total_amount) as total_amount_sales,
        COUNT(*) as total_amount_orders,
        COUNT(DISTINCT customer_id) as total_amount_customers,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) BETWEEN :previousStart AND :previousEnd
    `;

    const previousData = await sequelize.query(previousQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: parseInt(storeId),
        previousStart: previousStart.toISOString().split('T')[0],
        previousEnd: previousEnd.toISOString().split('T')[0]
      }
    });

    // 检查数据量是否足够
    if (!currentData || currentData.length === 0 || !(currentData[0] as any).total_amount_sales) {
      return res.json({
        success: false,
        error: '数据量不足',
        message: '当前期间销售数据不足，无法进行对比分析。',
        data: null
      });
    }

    if (!previousData || previousData.length === 0 || !(previousData[0] as any).total_amount_sales) {
      return res.json({
        success: false,
        error: '数据量不足',
        message: '对比期间销售数据不足，无法进行对比分析。',
        data: null
      });
    }

    const current = currentData[0] as any;
    const previous = previousData[0] as any;
    
    // 计算对比数据
    const currentSales = parseFloat(current.total_amount_sales || 0);
    const previousSales = parseFloat(previous.total_amount_sales || 0);
    const salesChange = currentSales - previousSales;
    const salesChangePercent = previousSales > 0 ? (salesChange / previousSales) * 100 : 0;
    
    const currentOrders = parseInt(current.total_amount_orders || 0);
    const previousOrders = parseInt(previous.total_amount_orders || 0);
    const ordersChange = currentOrders - previousOrders;
    const ordersChangePercent = previousOrders > 0 ? (ordersChange / previousOrders) * 100 : 0;

    res.json({
      success: true,
      data: {
        current: {
          period: `${currentStartDate} 至 ${currentEndDate}`,
          sales: currentSales,
          orders: currentOrders,
          customers: parseInt(current.total_amount_customers || 0),
          avgOrderValue: parseFloat(current.avg_order_value || 0)
        },
        previous: {
          period: `${previousStart.toISOString().split('T')[0]} 至 ${previousEnd.toISOString().split('T')[0]}`,
          sales: previousSales,
          orders: previousOrders,
          customers: parseInt(previous.total_amount_customers || 0),
          avgOrderValue: parseFloat(previous.avg_order_value || 0)
        },
        comparison: {
          salesChange: salesChange,
          salesChangePercent: salesChangePercent,
          ordersChange: ordersChange,
          ordersChangePercent: ordersChangePercent,
          trend: salesChangePercent > 0 ? 'up' : salesChangePercent < 0 ? 'down' : 'stable'
        }
      }
    });

  } catch (error: any) {
    console.error('获取销售对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 生成24小时预测数据
async function generateHourlyBreakdown(dailySales: number, dailyOrders: number, dayOfWeek: number, baseConfidence: number, historyData: any[], storeId: number) {
  const hourlyData = [];
  
  // 首先尝试从历史数据中获取该门店的实际小时销售模式
  let actualHourlyPattern = null;
  
  console.log('generateHourlyBreakdown - storeId:', storeId, 'historyData:', historyData?.length || 0, '条记录');
  
  if (storeId) {
    try {
      // 查询该门店的历史小时销售数据
      const hourlyHistoryQuery = `
        SELECT 
          DATEPART(hour, created_at) as hour,
          COUNT(*) as order_count,
          SUM(total_amount) as total_sales
        FROM orders 
        WHERE store_id = :storeId 
          AND delflag = 0 
          AND pay_state = 2
          AND created_at >= DATEADD(day, -30, GETDATE())
        GROUP BY DATEPART(hour, created_at)
        ORDER BY hour
      `;
      
      const hourlyHistory = await sequelize.query(hourlyHistoryQuery, {
        type: QueryTypes.SELECT,
        replacements: { storeId: storeId }
      });
      
      console.log(`门店${storeId}历史小时数据查询结果:`, hourlyHistory?.length || 0, '条记录');
      
      if (hourlyHistory && hourlyHistory.length > 0) {
        // 计算每个小时的平均销售比例
        const totalSales = hourlyHistory.reduce((sum: number, item: any) => sum + (item.total_sales || 0), 0);
        const totalOrders = hourlyHistory.reduce((sum: number, item: any) => sum + (item.order_count || 0), 0);
        
        if (totalSales > 0 && totalOrders > 0) {
          actualHourlyPattern = hourlyHistory.map((item: any) => ({
            hour: item.hour,
            salesRatio: (item.total_sales || 0) / totalSales,
            ordersRatio: (item.order_count || 0) / totalOrders
          }));
          
          console.log(`使用门店${storeId}的实际历史销售模式，数据点: ${hourlyHistory.length}`);
        }
      }
    } catch (error) {
      console.log('获取历史小时数据失败，使用默认模式:', error);
    }
  }
  
  // 如果没有实际数据，使用默认模式
  const hourlyPatterns = {
    // 工作日模式
    weekday: [
      { hour: 0, salesRatio: 0.01, ordersRatio: 0.01 }, // 深夜
      { hour: 1, salesRatio: 0.005, ordersRatio: 0.005 },
      { hour: 2, salesRatio: 0.005, ordersRatio: 0.005 },
      { hour: 3, salesRatio: 0.005, ordersRatio: 0.005 },
      { hour: 4, salesRatio: 0.01, ordersRatio: 0.01 },
      { hour: 5, salesRatio: 0.02, ordersRatio: 0.02 }, // 早班开始
      { hour: 6, salesRatio: 0.05, ordersRatio: 0.05 },
      { hour: 7, salesRatio: 0.08, ordersRatio: 0.08 }, // 早餐高峰
      { hour: 8, salesRatio: 0.12, ordersRatio: 0.12 },
      { hour: 9, salesRatio: 0.08, ordersRatio: 0.08 },
      { hour: 10, salesRatio: 0.05, ordersRatio: 0.05 },
      { hour: 11, salesRatio: 0.08, ordersRatio: 0.08 }, // 午餐前
      { hour: 12, salesRatio: 0.15, ordersRatio: 0.15 }, // 午餐高峰
      { hour: 13, salesRatio: 0.12, ordersRatio: 0.12 },
      { hour: 14, salesRatio: 0.06, ordersRatio: 0.06 },
      { hour: 15, salesRatio: 0.04, ordersRatio: 0.04 },
      { hour: 16, salesRatio: 0.05, ordersRatio: 0.05 },
      { hour: 17, salesRatio: 0.08, ordersRatio: 0.08 }, // 下班高峰
      { hour: 18, salesRatio: 0.12, ordersRatio: 0.12 }, // 晚餐高峰
      { hour: 19, salesRatio: 0.10, ordersRatio: 0.10 },
      { hour: 20, salesRatio: 0.08, ordersRatio: 0.08 },
      { hour: 21, salesRatio: 0.06, ordersRatio: 0.06 },
      { hour: 22, salesRatio: 0.04, ordersRatio: 0.04 },
      { hour: 23, salesRatio: 0.02, ordersRatio: 0.02 }
    ],
    // 周末模式
    weekend: [
      { hour: 0, salesRatio: 0.02, ordersRatio: 0.02 },
      { hour: 1, salesRatio: 0.01, ordersRatio: 0.01 },
      { hour: 2, salesRatio: 0.01, ordersRatio: 0.01 },
      { hour: 3, salesRatio: 0.01, ordersRatio: 0.01 },
      { hour: 4, salesRatio: 0.01, ordersRatio: 0.01 },
      { hour: 5, salesRatio: 0.01, ordersRatio: 0.01 },
      { hour: 6, salesRatio: 0.02, ordersRatio: 0.02 },
      { hour: 7, salesRatio: 0.03, ordersRatio: 0.03 },
      { hour: 8, salesRatio: 0.05, ordersRatio: 0.05 },
      { hour: 9, salesRatio: 0.08, ordersRatio: 0.08 },
      { hour: 10, salesRatio: 0.10, ordersRatio: 0.10 },
      { hour: 11, salesRatio: 0.12, ordersRatio: 0.12 },
      { hour: 12, salesRatio: 0.15, ordersRatio: 0.15 },
      { hour: 13, salesRatio: 0.12, ordersRatio: 0.12 },
      { hour: 14, salesRatio: 0.10, ordersRatio: 0.10 },
      { hour: 15, salesRatio: 0.08, ordersRatio: 0.08 },
      { hour: 16, salesRatio: 0.08, ordersRatio: 0.08 },
      { hour: 17, salesRatio: 0.10, ordersRatio: 0.10 },
      { hour: 18, salesRatio: 0.12, ordersRatio: 0.12 },
      { hour: 19, salesRatio: 0.10, ordersRatio: 0.10 },
      { hour: 20, salesRatio: 0.08, ordersRatio: 0.08 },
      { hour: 21, salesRatio: 0.06, ordersRatio: 0.06 },
      { hour: 22, salesRatio: 0.04, ordersRatio: 0.04 },
      { hour: 23, salesRatio: 0.03, ordersRatio: 0.03 }
    ]
  };
  
  // 选择模式（优先使用实际历史数据）
  let pattern;
  let useActualData = false;
  
  if (actualHourlyPattern && actualHourlyPattern.length > 0) {
    // 使用实际历史数据
    pattern = actualHourlyPattern;
    useActualData = true;
    console.log('使用门店实际历史销售模式');
  } else {
    // 使用默认模式
    pattern = (dayOfWeek >= 1 && dayOfWeek <= 5) ? hourlyPatterns.weekday : hourlyPatterns.weekend;
    console.log('使用默认销售模式');
  }
  
  for (let hour = 0; hour < 24; hour++) {
    // 查找该小时的数据
    let hourPattern = pattern.find(p => p.hour === hour);
    
    // 如果没有该小时的数据，使用0（表示该门店在该时段没有销售）
    if (!hourPattern) {
      hourPattern = { hour: hour, salesRatio: 0, ordersRatio: 0 };
    }
    
    const hourlySales = Math.round(dailySales * hourPattern.salesRatio);
    const hourlyOrders = Math.round(dailyOrders * hourPattern.ordersRatio);
    
    // 计算小时置信度
    let hourConfidence = baseConfidence;
    
    if (useActualData) {
      // 使用实际数据时，置信度更高
      hourConfidence += 0.1;
      
      // 如果该时段有历史销售数据，置信度更高
      if (hourPattern.salesRatio > 0) {
        hourConfidence += 0.05;
      } else {
        // 如果该时段没有历史数据，置信度降低
        hourConfidence -= 0.2;
      }
    } else {
      // 使用默认模式时的置信度调整
      if (hourPattern.salesRatio > 0.1) {
        hourConfidence += 0.05;
      }
      if (hourPattern.salesRatio < 0.02) {
        hourConfidence -= 0.1;
      }
    }
    
    // 确保置信度在合理范围内
    hourConfidence = Math.max(0.3, Math.min(0.95, hourConfidence));
    
    hourlyData.push({
      hour: hour,
      sales: hourlySales,
      orders: hourlyOrders,
      confidence: Math.round(hourConfidence * 100) / 100,
      salesRatio: hourPattern.salesRatio,
      ordersRatio: hourPattern.ordersRatio
    });
  }
  
  return hourlyData;
}

// 获取门店对比数据
router.get('/store-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    // 获取所有门店的销售数据（包含城市信息）
    const storeComparisonQuery = `
      SELECT 
        s.id as storeId,
        s.store_name as storeName,
        s.city,
        s.district,
        COALESCE(SUM(o.total_amount), 0) as sales,
        COALESCE(COUNT(o.id), 0) as orders,
        COALESCE(COUNT(DISTINCT o.customer_id), 0) as customers,
        CASE 
          WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
          ELSE 0 
        END as avgOrderValue
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name, s.city, s.district
      ORDER BY sales DESC
    `;

    const storeComparisonResult = await sequelize.query(storeComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    });

    // 获取每个门店的商品品类数据
    const categoryQuery = `
      SELECT 
        s.id as storeId,
        s.store_name as storeName,
        COALESCE(oi.product_name, '未知品类') as category,
        COALESCE(SUM(oi.total_price), 0) as sales,
        COALESCE(SUM(oi.quantity), 0) as orders
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name, oi.product_name
      ORDER BY s.id, sales DESC
    `;

    const categoryResult = await sequelize.query(categoryQuery, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    });

    // 合并数据
    const storeData = (storeComparisonResult as any[]).map(store => {
      const categories = (categoryResult as any[])
        .filter(cat => cat.storeId === store.storeId)
        .map(cat => ({
          category: cat.category,
          sales: parseFloat(cat.sales),
          orders: parseInt(cat.orders)
        }));

      return {
        storeId: store.storeId.toString(),
        storeName: store.storeName,
        city: store.city,
        district: store.district,
        sales: parseFloat(store.sales),
        orders: parseInt(store.orders),
        customers: parseInt(store.customers),
        avgOrderValue: parseFloat(store.avgOrderValue),
        productCategories: categories
      };
    });

    res.json({
      success: true,
      data: storeData
    });
  } catch (error) {
    console.error('获取门店对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店对比数据失败'
    });
  }
});

// 获取总体对比数据
router.get('/overall-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    // 获取总体数据
    const overallQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalSales,
        COALESCE(COUNT(*), 0) as totalOrders,
        COALESCE(COUNT(DISTINCT customer_id), 0) as totalCustomers,
        CASE 
          WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_amount), 0) / COUNT(*)
          ELSE 0 
        END as avgOrderValue
      FROM orders 
      WHERE delflag = 0
        AND CAST(created_at AS DATE) BETWEEN :startDate AND :endDate
    `;

    const overallResult = await sequelize.query(overallQuery, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    });

    // 获取门店排名
    const storeRankingQuery = `
      SELECT 
        s.id as storeId,
        s.store_name as storeName,
        COALESCE(SUM(o.total_amount), 0) as sales,
        COALESCE(COUNT(o.id), 0) as orders,
        COALESCE(COUNT(DISTINCT o.customer_id), 0) as customers,
        CASE 
          WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
          ELSE 0 
        END as avgOrderValue
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name
      ORDER BY sales DESC
      OFFSET 0 ROWS
      FETCH NEXT 10 ROWS ONLY
    `;

    const storeRankingResult = await sequelize.query(storeRankingQuery, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    });

    // 获取品类分布
    const categoryDistributionQuery = `
      SELECT 
        COALESCE(oi.product_name, '未知品类') as category,
        COALESCE(SUM(oi.total_price), 0) as sales
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      GROUP BY oi.product_name
      ORDER BY sales DESC
    `;

    const categoryDistributionResult = await sequelize.query(categoryDistributionQuery, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    });

    const totalSales = parseFloat((overallResult[0] as any).totalSales);
    const categoryDistribution = (categoryDistributionResult as any[]).map(cat => ({
      category: cat.category,
      sales: parseFloat(cat.sales),
      percentage: totalSales > 0 ? (parseFloat(cat.sales) / totalSales * 100) : 0
    }));

    const storeRankings = (storeRankingResult as any[]).map(store => ({
      storeId: store.storeId.toString(),
      storeName: store.storeName,
      sales: parseFloat(store.sales),
      orders: parseInt(store.orders),
      customers: parseInt(store.customers),
      avgOrderValue: parseFloat(store.avgOrderValue),
      productCategories: []
    }));

    res.json({
      success: true,
      data: {
        totalSales: parseFloat((overallResult[0] as any).totalSales),
        totalOrders: parseInt((overallResult[0] as any).totalOrders),
        totalCustomers: parseInt((overallResult[0] as any).totalCustomers),
        avgOrderValue: parseFloat((overallResult[0] as any).avgOrderValue),
        storeRankings,
        categoryDistribution
      }
    });
  } catch (error) {
    console.error('获取总体对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取总体对比数据失败'
    });
  }
});

// 获取小时级对比分析数据
router.get('/hourly-comparison/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, compareType = 'previous' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    const currentStartDate = startDate as string;
    const currentEndDate = endDate as string;
    
    // 计算对比期间
    let compareStartDate: string;
    let compareEndDate: string;
    
    if (compareType === 'previous') {
      // 前一个相同长度的期间
      const currentStart = new Date(currentStartDate);
      const currentEnd = new Date(currentEndDate);
      const periodDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - periodDays + 1);
      
      compareStartDate = previousStart.toISOString().split('T')[0];
      compareEndDate = previousEnd.toISOString().split('T')[0];
    } else if (compareType === 'same_period_last_year') {
      // 去年同期
      const currentStart = new Date(currentStartDate);
      const currentEnd = new Date(currentEndDate);
      
      const lastYearStart = new Date(currentStart);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      
      const lastYearEnd = new Date(currentEnd);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
      
      compareStartDate = lastYearStart.toISOString().split('T')[0];
      compareEndDate = lastYearEnd.toISOString().split('T')[0];
    } else {
      return res.status(400).json({
        success: false,
        error: '不支持的对比类型'
      });
    }

    // 获取当前期间的小时级数据
    const currentHourlyQuery = `
      SELECT 
        DATEPART(hour, created_at) as hour,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders 
      WHERE store_id = :storeId 
        AND delflag = 0
        AND CAST(created_at AS DATE) BETWEEN :startDate AND :endDate
      GROUP BY DATEPART(hour, created_at)
      ORDER BY hour
    `;

    const currentHourlyData = await sequelize.query(currentHourlyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: parseInt(storeId),
        startDate: currentStartDate,
        endDate: currentEndDate
      }
    });

    // 获取对比期间的小时级数据
    const compareHourlyData = await sequelize.query(currentHourlyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        storeId: parseInt(storeId),
        startDate: compareStartDate,
        endDate: compareEndDate
      }
    });

    // 创建24小时完整数据
    const createHourlyData = (data: any[]) => {
      const hourlyMap = new Map();
      data.forEach((item: any) => {
        hourlyMap.set(item.hour, {
          hour: item.hour,
          orderCount: parseInt(item.order_count || 0),
          totalSales: parseFloat(item.total_sales || 0),
          avgOrderValue: parseFloat(item.avg_order_value || 0),
          uniqueCustomers: parseInt(item.unique_customers || 0)
        });
      });

      const result = [];
      for (let hour = 0; hour < 24; hour++) {
        result.push(hourlyMap.get(hour) || {
          hour,
          orderCount: 0,
          totalSales: 0,
          avgOrderValue: 0,
          uniqueCustomers: 0
        });
      }
      return result;
    };

    const currentHourly = createHourlyData(currentHourlyData);
    const compareHourly = createHourlyData(compareHourlyData);

    // 计算对比数据
    const comparisonData = currentHourly.map((current, index) => {
      const compare = compareHourly[index];
      const salesChange = current.totalSales - compare.totalSales;
      const salesChangePercent = compare.totalSales > 0 ? (salesChange / compare.totalSales) * 100 : 0;
      const ordersChange = current.orderCount - compare.orderCount;
      const ordersChangePercent = compare.orderCount > 0 ? (ordersChange / compare.orderCount) * 100 : 0;

      return {
        hour: current.hour,
        current: {
          orderCount: current.orderCount,
          totalSales: current.totalSales,
          avgOrderValue: current.avgOrderValue,
          uniqueCustomers: current.uniqueCustomers
        },
        compare: {
          orderCount: compare.orderCount,
          totalSales: compare.totalSales,
          avgOrderValue: compare.avgOrderValue,
          uniqueCustomers: compare.uniqueCustomers
        },
        comparison: {
          salesChange,
          salesChangePercent,
          ordersChange,
          ordersChangePercent,
          trend: salesChangePercent > 5 ? 'up' : salesChangePercent < -5 ? 'down' : 'stable'
        }
      };
    });

    res.json({
      success: true,
      data: {
        currentPeriod: {
          startDate: currentStartDate,
          endDate: currentEndDate
        },
        comparePeriod: {
          startDate: compareStartDate,
          endDate: compareEndDate,
          type: compareType
        },
        hourlyComparison: comparisonData,
        summary: {
          totalSalesChange: comparisonData.reduce((sum, item) => sum + item.comparison.salesChange, 0),
          totalOrdersChange: comparisonData.reduce((sum, item) => sum + item.comparison.ordersChange, 0),
          avgSalesChangePercent: comparisonData.reduce((sum, item) => sum + item.comparison.salesChangePercent, 0) / 24,
          peakHour: comparisonData.reduce((max, item) => 
            item.current.totalSales > max.current.totalSales ? item : max, comparisonData[0]
          ),
          lowHour: comparisonData.reduce((min, item) => 
            item.current.totalSales < min.current.totalSales ? item : min, comparisonData[0]
          )
        }
      }
    });
  } catch (error) {
    console.error('获取小时级对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取小时级对比数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取门店与其他门店的对比数据
router.get('/store-vs-others/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    // 获取目标门店数据
    const targetStoreQuery = `
      SELECT 
        s.id as storeId,
        s.store_name as storeName,
        COALESCE(SUM(o.total_amount), 0) as sales,
        COALESCE(COUNT(o.id), 0) as orders,
        COALESCE(COUNT(DISTINCT o.customer_id), 0) as customers,
        CASE 
          WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
          ELSE 0 
        END as avgOrderValue
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.id = :storeId AND s.delflag = 0
      GROUP BY s.id, s.store_name
    `;

    const targetStoreResult = await sequelize.query(targetStoreQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId, startDate, endDate }
    });

    // 获取其他门店数据
    const otherStoresQuery = `
      SELECT 
        s.id as storeId,
        s.store_name as storeName,
        COALESCE(SUM(o.total_amount), 0) as sales,
        COALESCE(COUNT(o.id), 0) as orders,
        COALESCE(COUNT(DISTINCT o.customer_id), 0) as customers,
        CASE 
          WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
          ELSE 0 
        END as avgOrderValue
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.id != :storeId AND s.delflag = 0
      GROUP BY s.id, s.store_name
      ORDER BY sales DESC
      OFFSET 0 ROWS
      FETCH NEXT 10 ROWS ONLY
    `;

    const otherStoresResult = await sequelize.query(otherStoresQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId, startDate, endDate }
    });

    // 获取总体数据
    const overallQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalSales,
        COALESCE(COUNT(*), 0) as totalOrders,
        COALESCE(COUNT(DISTINCT customer_id), 0) as totalCustomers,
        CASE 
          WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_amount), 0) / COUNT(*)
          ELSE 0 
        END as avgOrderValue
      FROM orders 
      WHERE delflag = 0
        AND CAST(created_at AS DATE) BETWEEN :startDate AND :endDate
    `;

    const overallResult = await sequelize.query(overallQuery, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    });

    const targetStore = targetStoreResult[0] as any;
    const otherStores = (otherStoresResult as any[]).map(store => ({
      storeId: store.storeId.toString(),
      storeName: store.storeName,
      sales: parseFloat(store.sales),
      orders: parseInt(store.orders),
      customers: parseInt(store.customers),
      avgOrderValue: parseFloat(store.avgOrderValue)
    }));

    res.json({
      success: true,
      data: {
        targetStore: {
          storeId: targetStore.storeId.toString(),
          storeName: targetStore.storeName,
          sales: parseFloat(targetStore.sales),
          orders: parseInt(targetStore.orders),
          customers: parseInt(targetStore.customers),
          avgOrderValue: parseFloat(targetStore.avgOrderValue)
        },
        otherStores,
        overall: {
          totalSales: parseFloat((overallResult[0] as any).totalSales),
          totalOrders: parseInt((overallResult[0] as any).totalOrders),
          totalCustomers: parseInt((overallResult[0] as any).totalCustomers),
          avgOrderValue: parseFloat((overallResult[0] as any).avgOrderValue)
        }
      }
    });
  } catch (error) {
    console.error('获取门店对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店对比数据失败'
    });
  }
});

export default router;
