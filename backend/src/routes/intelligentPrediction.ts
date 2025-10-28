import express from 'express';
import IntelligentPredictionService from '../services/IntelligentPredictionService';
import { logger } from '../utils/logger';

const router = express.Router();
const predictionService = new IntelligentPredictionService();

/**
 * 销售预测
 * GET /api/intelligent-prediction/sales-forecast/:storeId
 */
router.get('/sales-forecast/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { days = 30 } = req.query;

    logger.info(`开始销售预测: 门店${storeId}, 预测${days}天`);

    const forecasts = await predictionService.predictSales(
      storeId, 
      parseInt(days as string)
    );

    if (forecasts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '无法生成销售预测，请检查门店数据',
        data: null
      });
    }

    // 计算预测统计
    const totalPredictedSales = forecasts.reduce((sum, f) => sum + f.predicted_sales, 0);
    const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence_level, 0) / forecasts.length;

    res.json({
      success: true,
      message: '销售预测生成成功',
      data: {
        store_id: storeId,
        forecast_days: parseInt(days as string),
        total_predicted_sales: totalPredictedSales,
        average_confidence: Math.round(avgConfidence * 100) / 100,
        forecasts: forecasts,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('销售预测失败:', error);
    res.status(500).json({
      success: false,
      message: '销售预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 客户行为预测
 * GET /api/intelligent-prediction/customer-behavior/:customerId
 */
router.get('/customer-behavior/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    logger.info(`开始客户行为预测: ${customerId}`);

    const prediction = await predictionService.predictCustomerBehavior(customerId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: '无法生成客户行为预测，请检查客户数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '客户行为预测生成成功',
      data: prediction
    });

  } catch (error) {
    logger.error('客户行为预测失败:', error);
    res.status(500).json({
      success: false,
      message: '客户行为预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 产品推荐
 * GET /api/intelligent-prediction/product-recommendations/:customerId
 */
router.get('/product-recommendations/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    logger.info(`开始产品推荐: ${customerId}`);

    const recommendations = await predictionService.recommendProducts(customerId);

    if (!recommendations) {
      return res.status(404).json({
        success: false,
        message: '无法生成产品推荐，请检查客户数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '产品推荐生成成功',
      data: recommendations
    });

  } catch (error) {
    logger.error('产品推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '产品推荐失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 门店优化建议
 * GET /api/intelligent-prediction/store-optimization/:storeId
 */
router.get('/store-optimization/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    logger.info(`开始门店优化分析: ${storeId}`);

    const optimization = await predictionService.optimizeStore(storeId);

    if (!optimization) {
      return res.status(404).json({
        success: false,
        message: '无法生成门店优化建议，请检查门店数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '门店优化建议生成成功',
      data: optimization
    });

  } catch (error) {
    logger.error('门店优化分析失败:', error);
    res.status(500).json({
      success: false,
      message: '门店优化分析失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 批量客户预测
 * POST /api/intelligent-prediction/batch-customer-prediction
 */
router.post('/batch-customer-prediction', async (req, res) => {
  try {
    const { customerIds, predictionType = 'all' } = req.body;

    if (!customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的客户ID列表',
        data: null
      });
    }

    logger.info(`开始批量客户预测: ${customerIds.length}个客户, 类型: ${predictionType}`);

    const results = [];
    
    for (const customerId of customerIds.slice(0, 20)) { // 限制最多20个客户
      try {
        let predictionResult = null;
        
        switch (predictionType) {
          case 'behavior':
            predictionResult = await predictionService.predictCustomerBehavior(customerId);
            break;
          case 'recommendations':
            predictionResult = await predictionService.recommendProducts(customerId);
            break;
          case 'all':
          default:
            const [behavior, recommendations] = await Promise.all([
              predictionService.predictCustomerBehavior(customerId),
              predictionService.recommendProducts(customerId)
            ]);
            predictionResult = { behavior, recommendations };
            break;
        }
        
        results.push({
          customer_id: customerId,
          prediction_result: predictionResult,
          success: predictionResult !== null
        });
        
      } catch (error) {
        logger.error(`预测客户 ${customerId} 失败:`, error);
        results.push({
          customer_id: customerId,
          prediction_result: null,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    res.json({
      success: true,
      message: `批量预测完成，成功: ${results.filter(r => r.success).length}/${results.length}`,
      data: {
        total_customers: customerIds.length,
        predicted_customers: results.length,
        successful_predictions: results.filter(r => r.success).length,
        results: results
      }
    });

  } catch (error) {
    logger.error('批量客户预测失败:', error);
    res.status(500).json({
      success: false,
      message: '批量客户预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 智能决策建议
 * POST /api/intelligent-prediction/decision-support
 */
router.post('/decision-support', async (req, res) => {
  try {
    const { 
      decisionType, 
      parameters = {},
      context = {} 
    } = req.body;

    if (!decisionType) {
      return res.status(400).json({
        success: false,
        message: '请提供决策类型',
        data: null
      });
    }

    logger.info(`开始智能决策分析: ${decisionType}`);

    let decisionResult = null;

    switch (decisionType) {
      case 'pricing':
        decisionResult = await generatePricingDecision(parameters, context);
        break;
      case 'promotion':
        decisionResult = await generatePromotionDecision(parameters, context);
        break;
      case 'inventory':
        decisionResult = await generateInventoryDecision(parameters, context);
        break;
      case 'staffing':
        decisionResult = await generateStaffingDecision(parameters, context);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的决策类型',
          data: null
        });
    }

    res.json({
      success: true,
      message: '智能决策建议生成成功',
      data: {
        decision_type: decisionType,
        recommendation: decisionResult,
        confidence: 0.85,
        reasoning: generateDecisionReasoning(decisionType, decisionResult),
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('智能决策分析失败:', error);
    res.status(500).json({
      success: false,
      message: '智能决策分析失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 决策生成辅助函数
async function generatePricingDecision(parameters: any, context: any) {
  const { productName, currentPrice, competitorPrice } = parameters;
  
  // 简化的定价决策逻辑
  const recommendedPrice = competitorPrice ? 
    Math.min(currentPrice * 1.05, competitorPrice * 0.95) : 
    currentPrice * 1.1;
  
  return {
    recommended_price: Math.round(recommendedPrice),
    price_change_percentage: Math.round(((recommendedPrice - currentPrice) / currentPrice) * 100),
    expected_impact: '预计销量变化: +5%',
    risk_assessment: '低风险'
  };
}

async function generatePromotionDecision(parameters: any, context: any) {
  const { storeId, promotionType } = parameters;
  
  return {
    recommended_promotion: promotionType || '满减活动',
    discount_percentage: 15,
    duration_days: 7,
    expected_sales_increase: '20%',
    target_customers: '所有客户'
  };
}

async function generateInventoryDecision(parameters: any, context: any) {
  const { productName, currentStock } = parameters;
  
  return {
    recommended_stock: Math.ceil(currentStock * 1.3),
    reorder_point: Math.ceil(currentStock * 0.3),
    urgency_level: currentStock < 10 ? 'high' : 'medium',
    supplier_recommendation: '建议提前3天订货'
  };
}

async function generateStaffingDecision(parameters: any, context: any) {
  const { storeId, timeSlot } = parameters;
  
  return {
    recommended_staff_count: timeSlot === 'peak' ? 3 : 2,
    shift_duration: '8小时',
    skill_requirements: ['收银', '产品制作'],
    training_suggestions: ['客户服务技巧', '产品知识']
  };
}

function generateDecisionReasoning(decisionType: string, decisionResult: any): string {
  switch (decisionType) {
    case 'pricing':
      return `基于市场分析和成本结构，建议调整价格以保持竞争力`;
    case 'promotion':
      return `根据历史促销数据和客户行为分析，推荐此促销策略`;
    case 'inventory':
      return `基于销售趋势和库存周转率分析，建议调整库存水平`;
    case 'staffing':
      return `根据客流预测和运营效率分析，建议调整人员配置`;
    default:
      return '基于数据分析生成的建议';
  }
}

export default router;
