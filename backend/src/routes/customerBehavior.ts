import express from 'express';
import CustomerBehaviorAnalysisService from '../services/CustomerBehaviorAnalysisService';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = express.Router();
const behaviorAnalysisService = new CustomerBehaviorAnalysisService();

/**
 * 分析客户购买路径
 * GET /api/customer-behavior/path/:customerId
 */
router.get('/path/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { timeRange = 30 } = req.query;

    logger.info(`分析客户购买路径: ${customerId}, 时间范围: ${timeRange}天`);

    const pathAnalysis = await behaviorAnalysisService.analyzeCustomerPath(
      customerId, 
      parseInt(timeRange as string)
    );

    if (!pathAnalysis) {
      return res.status(404).json({
        success: false,
        message: '未找到客户行为数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '客户购买路径分析成功',
      data: pathAnalysis
    });

  } catch (error) {
    logger.error('分析客户购买路径失败:', error);
    res.status(500).json({
      success: false,
      message: '分析客户购买路径失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 分析客户旅程
 * GET /api/customer-behavior/journey/:customerId
 */
router.get('/journey/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { timeRange = 90 } = req.query;

    logger.info(`分析客户旅程: ${customerId}, 时间范围: ${timeRange}天`);

    const journeyAnalysis = await behaviorAnalysisService.analyzeCustomerJourney(
      customerId, 
      parseInt(timeRange as string)
    );

    if (!journeyAnalysis) {
      return res.status(404).json({
        success: false,
        message: '未找到客户旅程数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '客户旅程分析成功',
      data: journeyAnalysis
    });

  } catch (error) {
    logger.error('分析客户旅程失败:', error);
    res.status(500).json({
      success: false,
      message: '分析客户旅程失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 分析客户行为模式
 * GET /api/customer-behavior/patterns/:customerId
 */
router.get('/patterns/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    logger.info(`分析客户行为模式: ${customerId}`);

    const patternAnalysis = await behaviorAnalysisService.analyzeBehaviorPatterns(customerId);

    if (!patternAnalysis) {
      return res.status(404).json({
        success: false,
        message: '未找到客户行为模式数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '客户行为模式分析成功',
      data: patternAnalysis
    });

  } catch (error) {
    logger.error('分析客户行为模式失败:', error);
    res.status(500).json({
      success: false,
      message: '分析客户行为模式失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取客户行为洞察
 * GET /api/customer-behavior/insights/:customerId
 */
router.get('/insights/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    logger.info(`获取客户行为洞察: ${customerId}`);

    const behaviorInsights = await behaviorAnalysisService.getCustomerBehaviorInsights(customerId);

    if (!behaviorInsights) {
      return res.status(404).json({
        success: false,
        message: '未找到客户行为洞察数据',
        data: null
      });
    }

    res.json({
      success: true,
      message: '客户行为洞察获取成功',
      data: behaviorInsights
    });

  } catch (error) {
    logger.error('获取客户行为洞察失败:', error);
    res.status(500).json({
      success: false,
      message: '获取客户行为洞察失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 批量分析客户行为
 * POST /api/customer-behavior/batch-analysis
 */
router.post('/batch-analysis', async (req, res) => {
  try {
    const { customerIds, analysisType = 'all' } = req.body;

    if (!customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的客户ID列表',
        data: null
      });
    }

    logger.info(`批量分析客户行为: ${customerIds.length}个客户, 分析类型: ${analysisType}`);

    const results = [];
    
    for (const customerId of customerIds.slice(0, 10)) { // 限制最多10个客户
      try {
        let analysisResult = null;
        
        switch (analysisType) {
          case 'path':
            analysisResult = await behaviorAnalysisService.analyzeCustomerPath(customerId);
            break;
          case 'journey':
            analysisResult = await behaviorAnalysisService.analyzeCustomerJourney(customerId);
            break;
          case 'patterns':
            analysisResult = await behaviorAnalysisService.analyzeBehaviorPatterns(customerId);
            break;
          case 'all':
          default:
            analysisResult = await behaviorAnalysisService.getCustomerBehaviorInsights(customerId);
            break;
        }
        
        results.push({
          customer_id: customerId,
          analysis_result: analysisResult,
          success: analysisResult !== null
        });
        
      } catch (error) {
        logger.error(`分析客户 ${customerId} 行为失败:`, error);
        results.push({
          customer_id: customerId,
          analysis_result: null,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    res.json({
      success: true,
      message: `批量分析完成，成功: ${results.filter(r => r.success).length}/${results.length}`,
      data: {
        total_customers: customerIds.length,
        analyzed_customers: results.length,
        successful_analyses: results.filter(r => r.success).length,
        results: results
      }
    });

  } catch (error) {
    logger.error('批量分析客户行为失败:', error);
    res.status(500).json({
      success: false,
      message: '批量分析客户行为失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取行为分析统计
 * GET /api/customer-behavior/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { timeRange = 30 } = req.query;

    logger.info(`获取行为分析统计, 时间范围: ${timeRange}天`);

    // 查询总体统计信息 - 简化查询避免参数绑定问题
    const timeRangeDays = parseInt(timeRange as string);
    const query = `
      SELECT 
        COUNT(DISTINCT o.customer_id) as total_customers,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT oi.product_id) as unique_products
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at >= DATEADD(day, -${timeRangeDays}, GETDATE())
    `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT
    }) as any[];

    const statistics = results[0] || {};

    res.json({
      success: true,
      message: '行为分析统计获取成功',
      data: {
        time_range_days: parseInt(timeRange as string),
        total_customers: statistics.total_customers || 0,
        total_orders: statistics.total_orders || 0,
        total_revenue: statistics.total_revenue || 0,
        avg_order_value: statistics.avg_order_value || 0,
        unique_products: statistics.unique_products || 0,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('获取行为分析统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取行为分析统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
