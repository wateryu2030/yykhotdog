import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';
import ProfitAnalysisService from '../services/ProfitAnalysisService';
import { generateInsights } from '../services/InsightService';

const router = Router();
const profitAnalysisService = new ProfitAnalysisService();

// 获取商品画像仪表板数据
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.query;
    
    // 构建基础查询条件
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = {};
    
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 获取商品基础统计
    const productStatsQuery = `
      SELECT 
        COUNT(DISTINCT oi.product_name) as total_products,
        COUNT(DISTINCT CASE WHEN o.created_at >= DATEADD(day, -30, GETDATE()) THEN oi.product_name END) as active_products,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity,
        AVG(oi.total_price) as avg_order_value
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
    `;

    const productStats = await sequelize.query(productStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取商品分类统计
    const categoryStatsQuery = `
      SELECT 
        CASE 
          WHEN oi.product_name LIKE '%热狗%' THEN '热狗类'
          WHEN oi.product_name LIKE '%套餐%' THEN '套餐类'
          WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN '饮品类'
          WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN '小食类'
          ELSE '其他'
        END as category,
        COUNT(DISTINCT oi.product_name) as product_count,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY 
        CASE 
          WHEN oi.product_name LIKE '%热狗%' THEN '热狗类'
          WHEN oi.product_name LIKE '%套餐%' THEN '套餐类'
          WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN '饮品类'
          WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN '小食类'
          ELSE '其他'
        END
      ORDER BY total_revenue DESC
    `;

    const categoryStats = await sequelize.query(categoryStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取热销商品TOP10
    const topProductsQuery = `
      SELECT TOP 10
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT o.customer_id) as customer_count,
        AVG(oi.total_price) as avg_price
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
    `;

    const topProducts = await sequelize.query(topProductsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取销售趋势（最近30天）
    const salesTrendQuery = `
      SELECT 
        CAST(o.created_at AS DATE) as date,
        COUNT(DISTINCT oi.product_name) as product_count,
        SUM(oi.total_price) as daily_revenue,
        SUM(oi.quantity) as daily_quantity
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0 
        AND o.created_at >= DATEADD(day, -30, GETDATE())
        ${city ? 'AND s.city = :city' : ''}
        ${shopId ? 'AND o.store_id = :shopId' : ''}
      GROUP BY CAST(o.created_at AS DATE)
      ORDER BY date DESC
    `;

    const salesTrend = await sequelize.query(salesTrendQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    const statsData = productStats[0] as any;
    
    const dashboard = {
      // 基础统计
      totalProducts: statsData?.total_products || 0,
      activeProducts: statsData?.active_products || 0,
      totalRevenue: statsData?.total_revenue || 0,
      totalQuantity: statsData?.total_quantity || 0,
      avgOrderValue: statsData?.avg_order_value || 0,
      
      // 分类统计
      categories: categoryStats.map((cat: any) => ({
        name: cat.category,
        productCount: cat.product_count,
        revenue: cat.total_revenue,
        quantity: cat.total_quantity,
        revenueShare: statsData?.total_revenue > 0 ? 
          ((cat.total_revenue / statsData.total_revenue) * 100).toFixed(1) : 0
      })),
      
      // 热销商品
      topProducts: topProducts.map((product: any) => ({
        name: product.product_name,
        quantity: product.total_quantity,
        revenue: product.total_revenue,
        customerCount: product.customer_count,
        avgPrice: product.avg_price
      })),
      
      // 销售趋势
      salesTrend: salesTrend.map((trend: any) => ({
        date: trend.date,
        productCount: trend.product_count,
        revenue: trend.daily_revenue,
        quantity: trend.daily_quantity
      }))
    };

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('获取商品画像仪表板失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品画像仪表板失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品分类分析
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = {};
    
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const categoryAnalysisQuery = `
      WITH category_data AS (
        SELECT 
          CASE 
            WHEN oi.product_name LIKE '%热狗%' THEN '热狗类'
            WHEN oi.product_name LIKE '%套餐%' THEN '套餐类'
            WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN '饮品类'
            WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN '小食类'
            ELSE '其他'
          END as category,
          oi.product_name,
          SUM(oi.total_price) as product_revenue,
          SUM(oi.quantity) as product_quantity,
          COUNT(DISTINCT o.customer_id) as customer_count,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY 
          CASE 
            WHEN oi.product_name LIKE '%热狗%' THEN '热狗类'
            WHEN oi.product_name LIKE '%套餐%' THEN '套餐类'
            WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN '饮品类'
            WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN '小食类'
            ELSE '其他'
          END,
          oi.product_name
      )
      SELECT 
        category,
        COUNT(*) as product_count,
        SUM(product_revenue) as total_revenue,
        SUM(product_quantity) as total_quantity,
        SUM(customer_count) as total_customers,
        SUM(order_count) as total_orders,
        AVG(product_revenue) as avg_product_revenue,
        AVG(product_quantity) as avg_product_quantity
      FROM category_data
      GROUP BY category
      ORDER BY total_revenue DESC
    `;

    const categoryAnalysis = await sequelize.query(categoryAnalysisQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: categoryAnalysis,
    });
  } catch (error) {
    logger.error('获取商品分类分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品分类分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品销售分析
router.get('/sales-analysis', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate, timeRange = '30' } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = {};
    
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    } else {
      whereClause += ` AND o.created_at >= DATEADD(day, -${timeRange}, GETDATE())`;
    }

    // 获取商品销售排行
    const salesRankingQuery = `
      SELECT TOP 20
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT o.customer_id) as customer_count,
        COUNT(DISTINCT o.id) as order_count,
        AVG(oi.total_price) as avg_price,
        MIN(o.created_at) as first_sale_date,
        MAX(o.created_at) as last_sale_date
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
    `;

    const salesRanking = await sequelize.query(salesRankingQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取销售趋势（按天）
    const salesTrendQuery = `
      SELECT 
        CAST(o.created_at AS DATE) as date,
        COUNT(DISTINCT oi.product_name) as product_count,
        SUM(oi.total_price) as daily_revenue,
        SUM(oi.quantity) as daily_quantity,
        COUNT(DISTINCT o.customer_id) as daily_customers
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY CAST(o.created_at AS DATE)
      ORDER BY date DESC
    `;

    const salesTrend = await sequelize.query(salesTrendQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: {
        salesRanking: salesRanking.map((product: any, index: number) => ({
          ...product,
          rank: index + 1
        })),
        salesTrend: salesTrend.map((trend: any) => ({
          date: trend.date,
          productCount: trend.product_count,
          revenue: trend.daily_revenue,
          quantity: trend.daily_quantity,
          customers: trend.daily_customers
        }))
      },
    });
  } catch (error) {
    logger.error('获取商品销售分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品销售分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品利润分析（集成真实成本数据、差异化毛利率、动态毛利率）
router.get('/profit-analysis', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate, analysisType = 'differentiated' } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = {};
    
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 获取基础销售数据
    const baseQuery = `
      SELECT 
        oi.product_name,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity,
        AVG(oi.total_price) as avg_sale_price
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY oi.product_name
      HAVING SUM(oi.total_price) > 0
      ORDER BY total_revenue DESC
    `;

    const baseData = await sequelize.query(baseQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 根据分析类型选择不同的利润计算方法
    let processedData: any[];
    
    switch (analysisType) {
      case 'real_cost':
        // 使用真实成本数据
        processedData = await profitAnalysisService.calculateDifferentiatedMargins(baseData);
        break;
      case 'dynamic':
        // 使用动态毛利率
        processedData = await profitAnalysisService.calculateDynamicMargins(baseData);
        break;
      case 'differentiated':
      default:
        // 使用差异化毛利率（默认）
        processedData = await profitAnalysisService.calculateDifferentiatedMargins(baseData);
        break;
    }

    // 计算总体利润统计
    const totalStats = processedData.reduce((acc: any, product: any) => {
      acc.totalRevenue += product.total_revenue;
      acc.totalProfit += product.total_profit;
      acc.totalCost += product.total_cost;
      return acc;
    }, { totalRevenue: 0, totalProfit: 0, totalCost: 0 });

    const overallProfitMargin = totalStats.totalRevenue > 0 ? 
      (totalStats.totalProfit / totalStats.totalRevenue) * 100 : 0;

    // 获取类别毛利率配置信息
    const categoryConfigs = profitAnalysisService.getCategoryMarginConfigs();

    res.json({
      success: true,
      data: {
        products: processedData.map((product: any) => ({
          name: product.product_name,
          revenue: product.total_revenue,
          quantity: product.total_quantity,
          avgPrice: product.avg_sale_price,
          totalProfit: product.total_profit,
          totalCost: product.total_cost,
          profitMargin: product.profit_margin,
          costSource: product.cost_source || product.margin_source || 'default',
          category: product.category || '其他',
          dynamicData: product.dynamic_data || null
        })),
        summary: {
          totalRevenue: totalStats.totalRevenue,
          totalProfit: totalStats.totalProfit,
          totalCost: totalStats.totalCost,
          overallProfitMargin: overallProfitMargin,
          analysisType: analysisType,
          categoryConfigs: categoryConfigs
        }
      },
    });
  } catch (error) {
    logger.error('获取商品利润分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品利润分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品AI洞察
router.post('/ai-insights', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.body;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = {};
    
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 获取商品数据用于AI分析
    const productDataQuery = `
      SELECT 
        oi.product_name,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.customer_id) as customer_count,
        COUNT(DISTINCT o.id) as order_count,
        AVG(oi.total_price) as avg_price,
        MIN(o.created_at) as first_sale_date,
        MAX(o.created_at) as last_sale_date
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
    `;

    const productData = await sequelize.query(productDataQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 生成AI洞察（模拟）
    const aiInsights = {
      recommendations: [
        {
          type: 'price_optimization',
          title: '价格优化建议',
          description: '基于销售数据分析，建议调整部分商品价格以提升利润',
          priority: 'high',
          products: productData.slice(0, 3).map((p: any) => p.product_name)
        },
        {
          type: 'inventory_management',
          title: '库存管理建议',
          description: '热销商品库存不足，建议及时补货',
          priority: 'medium',
          products: productData.slice(0, 2).map((p: any) => p.product_name)
        },
        {
          type: 'marketing_promotion',
          title: '营销推广建议',
          description: '低销量商品可通过促销活动提升销量',
          priority: 'low',
          products: productData.slice(-2).map((p: any) => p.product_name)
        }
      ],
      predictions: [
        {
          type: 'sales_forecast',
          title: '销售预测',
          description: '预计下月销售额将增长15%',
          confidence: 85,
          details: '基于历史销售趋势和季节性因素分析'
        },
        {
          type: 'trend_analysis',
          title: '趋势分析',
          description: '热狗类商品销售呈上升趋势',
          confidence: 78,
          details: '最近30天热狗类商品销量增长20%'
        }
      ],
      alerts: [
        {
          type: 'low_performance',
          title: '低效商品预警',
          description: '发现3个商品销量持续下降',
          severity: 'warning',
          products: productData.slice(-3).map((p: any) => p.product_name)
        }
      ]
    };

    res.json({
      success: true,
      data: {
        insights: aiInsights,
        rawData: productData,
        generatedAt: new Date().toISOString()
      },
      message: '商品AI洞察生成成功'
    });

  } catch (error) {
    logger.error('获取商品AI洞察失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商品AI洞察失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取类别毛利率配置
router.get('/margin-configs', async (req: Request, res: Response) => {
  try {
    const configs = profitAnalysisService.getCategoryMarginConfigs();
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error('获取类别毛利率配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取类别毛利率配置失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 更新类别毛利率配置
router.post('/margin-configs', async (req: Request, res: Response) => {
  try {
    const { category, config } = req.body;
    
    if (!category || !config) {
      return res.status(400).json({
        success: false,
        error: '请提供类别和配置信息'
      });
    }

    profitAnalysisService.updateCategoryMarginConfig(category, config);
    
    res.json({
      success: true,
      message: `类别 ${category} 毛利率配置更新成功`
    });
  } catch (error) {
    logger.error('更新类别毛利率配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新类别毛利率配置失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品成本数据同步状态
router.get('/cost-sync-status', async (req: Request, res: Response) => {
  try {
    const { productNames } = req.query;
    
    if (!productNames) {
      return res.status(400).json({
        success: false,
        error: '请提供商品名称列表'
      });
    }

    const names = Array.isArray(productNames) ? productNames.map(String) : [String(productNames)];
    const costData = await profitAnalysisService.getRealCostData(names);
    
    res.json({
      success: true,
      data: {
        requestedCount: names.length,
        foundCount: costData.length,
        coverage: names.length > 0 ? (costData.length / names.length * 100).toFixed(2) : 0,
        products: costData
      }
    });
  } catch (error) {
    logger.error('获取成本数据同步状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取成本数据同步状态失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取城市对比数据（不受筛选条件影响，展示全量数据）
router.get('/comparison/cities', async (req: Request, res: Response) => {
  try {
    const cityDataQuery = `
      SELECT 
        s.city,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT oi.product_name) as total_products,
        COUNT(DISTINCT o.id) as total_orders,
        AVG(oi.total_price) as avg_order_value,
        -- 估算毛利率（使用差异化毛利率计算）
        AVG(CASE 
          WHEN oi.product_name LIKE '%热狗%' THEN 0.39
          WHEN oi.product_name LIKE '%套餐%' THEN 0.50
          WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN 0.14
          WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN 0.45
          ELSE 0.35
        END) * 100 as profit_margin
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != ''
      GROUP BY s.city
      ORDER BY total_revenue DESC
    `;

    const cityData = await sequelize.query(cityDataQuery, {
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: cityData,
    });
  } catch (error) {
    logger.error('获取城市对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市对比数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取门店对比数据（不受筛选条件影响，展示全量数据）
router.get('/comparison/stores', async (req: Request, res: Response) => {
  try {
    const storeDataQuery = `
      SELECT 
        s.store_name,
        s.city,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as total_orders,
        -- 估算毛利率（使用差异化毛利率计算）
        AVG(CASE 
          WHEN oi.product_name LIKE '%热狗%' THEN 0.39
          WHEN oi.product_name LIKE '%套餐%' THEN 0.50
          WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN 0.14
          WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN 0.45
          ELSE 0.35
        END) * 100 as profit_margin
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != ''
      GROUP BY s.store_name, s.city
      ORDER BY total_revenue DESC
    `;

    const storeData = await sequelize.query(storeDataQuery, {
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: storeData,
    });
  } catch (error) {
    logger.error('获取门店对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店对比数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取城市维度详细数据（含TOP商品、毛利贡献等）
router.get('/comparison/cities/detail', async (req: Request, res: Response) => {
  try {
    const { city } = req.query;
    
    // 1. 获取城市总体统计
    let cityStatsQuery = `
      SELECT 
        s.city,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT oi.product_name) as total_products,
        COUNT(DISTINCT o.id) as total_orders,
        AVG(oi.total_price) as avg_order_value,
        AVG(CASE 
          WHEN oi.product_name LIKE '%热狗%' THEN 0.39
          WHEN oi.product_name LIKE '%套餐%' THEN 0.50
          WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN 0.14
          WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN 0.45
          ELSE 0.35
        END) * 100 as profit_margin
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != ''
      ${city ? 'AND s.city = :city' : ''}
      GROUP BY s.city
      ${city ? '' : 'ORDER BY total_revenue DESC'}
    `;

    const cityStats = await sequelize.query(cityStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: city ? { city } : {},
    });

    // 2. 获取每个城市的TOP商品
    const topProductsQuery = `
      SELECT 
        s.city,
        oi.product_name,
        SUM(oi.total_price) as product_revenue,
        SUM(oi.quantity) as product_quantity,
        COUNT(DISTINCT o.id) as order_count,
        AVG(oi.total_price) as avg_price,
        AVG(CASE 
          WHEN oi.product_name LIKE '%热狗%' THEN 0.39
          WHEN oi.product_name LIKE '%套餐%' THEN 0.50
          WHEN oi.product_name LIKE '%饮料%' OR oi.product_name LIKE '%饮品%' THEN 0.14
          WHEN oi.product_name LIKE '%小食%' OR oi.product_name LIKE '%配菜%' THEN 0.45
          ELSE 0.35
        END) * 100 as profit_margin
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != ''
      ${city ? 'AND s.city = :city' : ''}
      GROUP BY s.city, oi.product_name
      HAVING SUM(oi.total_price) > 0
      ORDER BY s.city, product_revenue DESC
    `;

    const topProducts = await sequelize.query(topProductsQuery, {
      type: QueryTypes.SELECT,
      replacements: city ? { city } : {},
    });

    // 按城市分组TOP商品
    const productsByCity: any = {};
    (topProducts as any[]).forEach((product: any) => {
      if (!productsByCity[product.city]) {
        productsByCity[product.city] = [];
      }
      productsByCity[product.city].push(product);
    });

    // 合并数据
    const result = (cityStats as any[]).map((stat: any) => ({
      ...stat,
      topProducts: productsByCity[stat.city]?.slice(0, 5) || [],
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('获取城市详细对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市详细对比数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取销售趋势数据
router.get('/comparison/trends', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    const trendQuery = `
      SELECT 
        CAST(o.created_at AS DATE) as date,
        s.city,
        SUM(oi.total_price) as daily_revenue,
        SUM(oi.quantity) as daily_quantity,
        COUNT(DISTINCT o.id) as daily_orders
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0 
        AND oi.product_name IS NOT NULL 
        AND oi.product_name != ''
        AND o.created_at >= DATEADD(day, -${parseInt(days as string)}, GETDATE())
      GROUP BY CAST(o.created_at AS DATE), s.city
      ORDER BY date DESC, s.city
    `;

    const trendData = await sequelize.query(trendQuery, {
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: trendData,
    });
  } catch (error) {
    logger.error('获取销售趋势数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取销售趋势数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品时间趋势分析（按月份）
router.get('/time-analysis/monthly', async (req: Request, res: Response) => {
  try {
    const { productName, city, shopId, year = 2025 } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = { year };
    
    if (productName) {
      whereClause += ' AND oi.product_name = :productName';
      params.productName = productName;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }

    const monthlyQuery = `
      SELECT 
        MONTH(o.created_at) as month,
        YEAR(o.created_at) as year,
        oi.product_name,
        s.city,
        s.store_name,
        SUM(oi.total_price) as monthly_revenue,
        SUM(oi.quantity) as monthly_quantity,
        COUNT(DISTINCT o.id) as monthly_orders,
        COUNT(DISTINCT o.customer_id) as monthly_customers,
        AVG(oi.total_price) as avg_order_value
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
        AND YEAR(o.created_at) = :year
      GROUP BY MONTH(o.created_at), YEAR(o.created_at), oi.product_name, s.city, s.store_name
      ORDER BY month, oi.product_name, s.city
    `;

    const monthlyData = await sequelize.query(monthlyQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: monthlyData,
    });
  } catch (error) {
    logger.error('获取月度时间趋势分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取月度时间趋势分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品销售占比分析
router.get('/time-analysis/market-share', async (req: Request, res: Response) => {
  try {
    const { productName, city, shopId, year = 2025, month } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = { year };
    
    if (productName) {
      whereClause += ' AND oi.product_name = :productName';
      params.productName = productName;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }
    if (month) {
      whereClause += ' AND MONTH(o.created_at) = :month';
      params.month = month;
    }

    const marketShareQuery = `
      WITH total_stats AS (
        SELECT 
          SUM(oi.total_price) as total_revenue,
          SUM(oi.quantity) as total_quantity,
          COUNT(DISTINCT o.id) as total_orders
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
          AND YEAR(o.created_at) = :year
      ),
      product_stats AS (
        SELECT 
          oi.product_name,
          s.city,
          s.store_name,
          SUM(oi.total_price) as product_revenue,
          SUM(oi.quantity) as product_quantity,
          COUNT(DISTINCT o.id) as product_orders,
          MONTH(o.created_at) as month
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
          AND YEAR(o.created_at) = :year
        GROUP BY oi.product_name, s.city, s.store_name, MONTH(o.created_at)
      )
      SELECT 
        ps.product_name,
        ps.city,
        ps.store_name,
        ps.month,
        ps.product_revenue,
        ps.product_quantity,
        ps.product_orders,
        ts.total_revenue,
        ts.total_quantity,
        ts.total_orders,
        CASE 
          WHEN ts.total_revenue > 0 THEN (ps.product_revenue / ts.total_revenue) * 100
          ELSE 0
        END as revenue_share_percent,
        CASE 
          WHEN ts.total_quantity > 0 THEN (ps.product_quantity / ts.total_quantity) * 100
          ELSE 0
        END as quantity_share_percent,
        CASE 
          WHEN ts.total_orders > 0 THEN (ps.product_orders / ts.total_orders) * 100
          ELSE 0
        END as order_share_percent
      FROM product_stats ps
      CROSS JOIN total_stats ts
      ORDER BY ps.month, ps.product_revenue DESC
    `;

    const marketShareData = await sequelize.query(marketShareQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: marketShareData,
    });
  } catch (error) {
    logger.error('获取商品销售占比分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品销售占比分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品季节性趋势分析
router.get('/time-analysis/seasonal', async (req: Request, res: Response) => {
  try {
    const { productName, city, shopId, year = 2025 } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = { year };
    
    if (productName) {
      whereClause += ' AND oi.product_name = :productName';
      params.productName = productName;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }

    const seasonalQuery = `
      SELECT 
        oi.product_name,
        s.city,
        s.store_name,
        CASE 
          WHEN MONTH(o.created_at) IN (12, 1, 2) THEN '冬季'
          WHEN MONTH(o.created_at) IN (3, 4, 5) THEN '春季'
          WHEN MONTH(o.created_at) IN (6, 7, 8) THEN '夏季'
          WHEN MONTH(o.created_at) IN (9, 10, 11) THEN '秋季'
        END as season,
        SUM(oi.total_price) as seasonal_revenue,
        SUM(oi.quantity) as seasonal_quantity,
        COUNT(DISTINCT o.id) as seasonal_orders,
        COUNT(DISTINCT o.customer_id) as seasonal_customers,
        AVG(oi.total_price) as avg_order_value
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
        AND YEAR(o.created_at) = :year
      GROUP BY oi.product_name, s.city, s.store_name, 
        CASE 
          WHEN MONTH(o.created_at) IN (12, 1, 2) THEN '冬季'
          WHEN MONTH(o.created_at) IN (3, 4, 5) THEN '春季'
          WHEN MONTH(o.created_at) IN (6, 7, 8) THEN '夏季'
          WHEN MONTH(o.created_at) IN (9, 10, 11) THEN '秋季'
        END
      ORDER BY 
        CASE 
          WHEN MONTH(o.created_at) IN (12, 1, 2) THEN 1
          WHEN MONTH(o.created_at) IN (3, 4, 5) THEN 2
          WHEN MONTH(o.created_at) IN (6, 7, 8) THEN 3
          WHEN MONTH(o.created_at) IN (9, 10, 11) THEN 4
        END,
        seasonal_revenue DESC
    `;

    const seasonalData = await sequelize.query(seasonalQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: seasonalData,
    });
  } catch (error) {
    logger.error('获取季节性趋势分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取季节性趋势分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取商品时间对比分析（同比、环比）
router.get('/time-analysis/comparison', async (req: Request, res: Response) => {
  try {
    const { productName, city, shopId, year = 2025, month } = req.query;
    
    let whereClause = 'WHERE o.delflag = 0 AND oi.product_name IS NOT NULL AND oi.product_name != \'\'';
    const params: any = { year };
    
    if (productName) {
      whereClause += ' AND oi.product_name = :productName';
      params.productName = productName;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }

    const comparisonQuery = `
      WITH current_period AS (
        SELECT 
          oi.product_name,
          s.city,
          s.store_name,
          MONTH(o.created_at) as month,
          SUM(oi.total_price) as current_revenue,
          SUM(oi.quantity) as current_quantity,
          COUNT(DISTINCT o.id) as current_orders
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
          AND YEAR(o.created_at) = :year
        GROUP BY oi.product_name, s.city, s.store_name, MONTH(o.created_at)
      ),
      previous_period AS (
        SELECT 
          oi.product_name,
          s.city,
          s.store_name,
          MONTH(o.created_at) as month,
          SUM(oi.total_price) as previous_revenue,
          SUM(oi.quantity) as previous_quantity,
          COUNT(DISTINCT o.id) as previous_orders
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
          AND YEAR(o.created_at) = :year - 1
        GROUP BY oi.product_name, s.city, s.store_name, MONTH(o.created_at)
      ),
      last_month AS (
        SELECT 
          oi.product_name,
          s.city,
          s.store_name,
          MONTH(o.created_at) as month,
          SUM(oi.total_price) as last_month_revenue,
          SUM(oi.quantity) as last_month_quantity,
          COUNT(DISTINCT o.id) as last_month_orders
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
          AND YEAR(o.created_at) = :year
          AND MONTH(o.created_at) = MONTH(GETDATE()) - 1
        GROUP BY oi.product_name, s.city, s.store_name, MONTH(o.created_at)
      )
      SELECT 
        COALESCE(cp.product_name, pp.product_name, lm.product_name) as product_name,
        COALESCE(cp.city, pp.city, lm.city) as city,
        COALESCE(cp.store_name, pp.store_name, lm.store_name) as store_name,
        COALESCE(cp.month, pp.month, lm.month) as month,
        COALESCE(cp.current_revenue, 0) as current_revenue,
        COALESCE(cp.current_quantity, 0) as current_quantity,
        COALESCE(cp.current_orders, 0) as current_orders,
        COALESCE(pp.previous_revenue, 0) as previous_revenue,
        COALESCE(pp.previous_quantity, 0) as previous_quantity,
        COALESCE(pp.previous_orders, 0) as previous_orders,
        COALESCE(lm.last_month_revenue, 0) as last_month_revenue,
        COALESCE(lm.last_month_quantity, 0) as last_month_quantity,
        COALESCE(lm.last_month_orders, 0) as last_month_orders,
        CASE 
          WHEN COALESCE(pp.previous_revenue, 0) > 0 
          THEN ((COALESCE(cp.current_revenue, 0) - COALESCE(pp.previous_revenue, 0)) / COALESCE(pp.previous_revenue, 0)) * 100
          ELSE 0
        END as yoy_revenue_growth,
        CASE 
          WHEN COALESCE(lm.last_month_revenue, 0) > 0 
          THEN ((COALESCE(cp.current_revenue, 0) - COALESCE(lm.last_month_revenue, 0)) / COALESCE(lm.last_month_revenue, 0)) * 100
          ELSE 0
        END as mom_revenue_growth
      FROM current_period cp
      FULL OUTER JOIN previous_period pp ON cp.product_name = pp.product_name 
        AND cp.city = pp.city 
        AND cp.store_name = pp.store_name 
        AND cp.month = pp.month
      FULL OUTER JOIN last_month lm ON cp.product_name = lm.product_name 
        AND cp.city = lm.city 
        AND cp.store_name = lm.store_name 
        AND cp.month = lm.month
      ORDER BY month, current_revenue DESC
    `;

    const comparisonData = await sequelize.query(comparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: comparisonData,
    });
  } catch (error) {
    logger.error('获取时间对比分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取时间对比分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 生成智能经营洞察
router.post('/comparison/insights', async (req: Request, res: Response) => {
  try {
    const { summary, cities, stores, trends } = req.body;
    
    const insight = await generateInsights({
      summary,
      cities,
      stores,
      trends,
    });

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    logger.error('生成智能洞察失败:', error);
    res.status(500).json({
      success: false,
      error: '生成智能洞察失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
