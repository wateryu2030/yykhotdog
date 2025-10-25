import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();

// 获取客户画像仪表板摘要
router.get('/dashboard-summary', async (req: Request, res: Response) => {
  try {
    // 获取门店统计
    const storeStatsQuery = `
      SELECT 
        COUNT(*) as total_stores,
        SUM(CASE WHEN status != '已关闭' THEN 1 ELSE 0 END) as operating_stores,
        SUM(CASE WHEN status = '计划中' THEN 1 ELSE 0 END) as planned_stores,
        SUM(CASE WHEN status = '拓展中' THEN 1 ELSE 0 END) as expanding_stores
      FROM stores 
      WHERE delflag = 0
    `;
    
    const storeStats = await sequelize.query(storeStatsQuery, {
      type: QueryTypes.SELECT
    });
    
    // 获取销售统计
    const salesStatsQuery = `
      SELECT 
        SUM(total_amount) as total_sales,
        COUNT(*) as total_orders
      FROM orders 
      WHERE delflag = 0
    `;
    
    const salesStats = await sequelize.query(salesStatsQuery, {
      type: QueryTypes.SELECT
    });
    
    // 获取客户统计
    const customerStatsQuery = `
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) THEN customer_id END) as active_customers,
        COUNT(DISTINCT CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) THEN customer_id END) as new_customers
      FROM orders 
      WHERE delflag = 0
    `;
    
    const customerStats = await sequelize.query(customerStatsQuery, {
      type: QueryTypes.SELECT
    });
    
    // 获取城市统计
    const cityStatsQuery = `
      SELECT TOP 5
        city,
        COUNT(*) as count
      FROM stores 
      WHERE delflag = 0 AND city IS NOT NULL AND city != ''
      GROUP BY city
      ORDER BY count DESC
    `;
    
    const cityStats = await sequelize.query(cityStatsQuery, {
      type: QueryTypes.SELECT
    });
    
    const storeData = storeStats[0] as any;
    const salesData = salesStats[0] as any;
    const customerData = customerStats[0] as any;
    
    const summary = {
      // 门店数据
      total_stores: storeData?.total_stores || 0,
      operating_stores: storeData?.operating_stores || 0,
      planned_stores: storeData?.planned_stores || 0,
      expanding_stores: storeData?.expanding_stores || 0,
      
      // 销售数据
      total_sales: salesData?.total_sales || 0,
      total_orders: salesData?.total_orders || 0,
      
      // 客户数据
      totalCustomers: customerData?.total_customers || 0,
      activeCustomers: customerData?.active_customers || 0,
      newCustomers: customerData?.new_customers || 0,
      avgOrderValue: salesData?.total_orders > 0 ? (salesData?.total_sales / salesData?.total_orders) : 0,
      
      // 城市数据
      topCities: cityStats.map((city: any) => ({
        name: city.city,
        count: city.count
      }))
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('获取客户画像摘要失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户画像摘要失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 别名路由：兼容前端调用 /dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.query;
    
    // 构建基础查询条件
    let whereClause = 'WHERE o.delflag = 0';
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
    
    // 获取门店统计
    const storeStatsQuery = `
      SELECT 
        COUNT(DISTINCT s.id) as total_stores,
        SUM(CASE WHEN s.status != '已关闭' THEN 1 ELSE 0 END) as operating_stores
      FROM stores s
      WHERE s.delflag = 0
    `;
    
    const storeStats = await sequelize.query(storeStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    // 获取销售统计
    const salesStatsQuery = `
      SELECT 
        SUM(o.total_amount) as total_sales,
        COUNT(*) as total_orders,
        AVG(o.total_amount) as avg_order_value
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
    `;
    
    const salesStats = await sequelize.query(salesStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    // 获取客户统计
    // 客户统计查询 - 使用真实客户ID来识别独立客户
    const customerStatsQuery = `
      SELECT 
        COUNT(DISTINCT o.customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN o.created_at >= DATEADD(day, -30, GETDATE()) THEN o.customer_id END) as active_customers
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
    `;
    
    const customerStats = await sequelize.query(customerStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const storeData = storeStats[0] as any;
    const salesData = salesStats[0] as any;
    const customerData = customerStats[0] as any;
    
    // 获取客户分层数据 - 基于真实客户ID识别独立客户
    const segmentsQuery = `
      WITH customer_stats AS (
        SELECT 
          o.customer_id,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
      ),
      customer_segments AS (
        SELECT 
          customer_id,
          order_count,
          total_spent,
          avg_order_value,
          first_order_date,
          last_order_date,
          customer_lifespan_days,
          CASE 
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'核心客户'
            WHEN total_spent >= 500 AND order_count >= 5 THEN N'活跃客户'
            WHEN total_spent >= 100 AND order_count >= 2 THEN N'机会客户'
            ELSE N'沉睡/新客户'
          END as segment_name
        FROM customer_stats
      )
      SELECT 
        segment_name,
        COUNT(*) as customer_count,
        AVG(avg_order_value) as avg_spend,
        AVG(CAST(order_count AS FLOAT)) as avg_orders,
        SUM(total_spent) as total_revenue,
        AVG(total_spent * 3) as lifetime_value_3y
      FROM customer_segments
      GROUP BY segment_name
      ORDER BY 
        CASE segment_name
          WHEN N'核心客户' THEN 1
          WHEN N'活跃客户' THEN 2
          WHEN N'机会客户' THEN 3
          WHEN N'沉睡/新客户' THEN 4
        END
    `;

    const segments = await sequelize.query(segmentsQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    // 获取时间分布数据 - 基于真实客户ID识别独立客户
    const timeDistributionQuery = `
      SELECT 
        DATEPART(hour, o.created_at) as hour,
        COUNT(DISTINCT o.customer_id) as customer_count,
        COUNT(*) as order_count
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY DATEPART(hour, o.created_at)
      ORDER BY hour
    `;

    const timeDistribution = await sequelize.query(timeDistributionQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    // 补全24小时数据
    const fullTimeDistribution = Array.from({ length: 24 }, (_, i) => {
      const hourData = timeDistribution.find((item: any) => item.hour === i) as any;
      return {
        hour: i.toString().padStart(2, '0'),
        customer_count: (hourData as any)?.customer_count || 0,
        order_count: (hourData as any)?.order_count || 0
      };
    });

    const summary = {
      total_stores: storeData?.total_stores || 0,
      operating_stores: storeData?.operating_stores || 0,
      total_sales: salesData?.total_sales || 0,
      total_orders: salesData?.total_orders || 0,
      totalCustomers: customerData?.total_customers || 0,
      activeCustomers: customerData?.active_customers || 0,
      avgOrderValue: salesData?.avg_order_value || 0,
      segments: segments || [],
      timeDistribution: fullTimeDistribution,
      productPreferences: [],
      aiSuggestions: []
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('获取客户画像仪表板失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户画像仪表板失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取城市列表（从实际有门店的城市获取）
router.get('/cities', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY city) as id,
        city as name,
        province,
        store_count
      FROM (
        SELECT DISTINCT
          s.city,
          s.province,
          COUNT(*) OVER (PARTITION BY s.city) as store_count
        FROM stores s
        WHERE s.delflag = 0 
          AND s.city IS NOT NULL 
          AND s.city != ''
          AND s.status = N'营业中'
      ) AS city_list
      ORDER BY city
    `;

    const cities = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('获取城市列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取所有门店列表
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT TOP 50
        s.id,
        s.store_name,
        s.store_code,
        s.city,
        s.district,
        s.province,
        s.status,
        s.store_type
      FROM stores s
      WHERE s.delflag = 0
      ORDER BY s.id DESC
    `;

    const stores = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('获取所有门店列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取所有门店列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 根据城市名称获取门店列表
router.get('/stores/by-city-name/:cityName', async (req: Request, res: Response) => {
  try {
    const { cityName } = req.params;
    
    const query = `
      SELECT 
        s.id,
        s.store_name,
        s.store_code,
        s.address,
        s.city,
        s.district,
        s.status
      FROM stores s
      WHERE s.city = :cityName 
        AND s.delflag = 0
      ORDER BY s.store_name
    `;

    const stores = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: { cityName: decodeURIComponent(cityName) }
    });

    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('获取门店列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 调试API - 检查门店状态
router.get('/debug-stores', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM stores 
      WHERE delflag = 0
      GROUP BY status
    `;
    
    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('调试门店状态失败:', error);
    res.status(500).json({
      success: false,
      error: '调试门店状态失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取客户列表
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { 
      city, 
      shopId, 
      startDate, 
      endDate, 
      segment,
      page = 1, 
      pageSize = 10, 
      sortField = 'total_spent', 
      sortOrder = 'desc' 
    } = req.query;
    
    // 构建基础查询条件
    let whereClause = 'WHERE o.delflag = 0';
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
    
    // 客户分层查询 - 基于真实客户ID
    const customerQuery = `
      WITH customer_stats AS (
        SELECT 
          o.customer_id,
          c.customer_name,
          c.phone,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY o.customer_id, c.customer_name, c.phone
      ),
      customer_segments AS (
        SELECT 
          customer_id,
          customer_name,
          phone,
          order_count,
          total_spent,
          avg_order_value,
          first_order_date,
          last_order_date,
          customer_lifespan_days,
          CASE 
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'核心客户'
            WHEN total_spent >= 500 AND order_count >= 5 THEN N'活跃客户'
            WHEN total_spent >= 100 AND order_count >= 2 THEN N'机会客户'
            ELSE N'沉睡/新客户'
          END as segment_name
        FROM customer_stats
      )
      SELECT 
        customer_id,
        customer_name,
        phone,
        order_count,
        total_spent,
        avg_order_value,
        first_order_date,
        last_order_date,
        customer_lifespan_days,
        segment_name
      FROM customer_segments
      ${segment && segment !== 'all' ? 'WHERE segment_name = :segment' : ''}
      ORDER BY ${sortField} ${sortOrder}
      OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
    `;
    
    // 添加分页参数
    params.offset = (Number(page) - 1) * Number(pageSize);
    params.pageSize = Number(pageSize);
    if (segment) {
      params.segment = segment;
    }
    
    const customers = await sequelize.query(customerQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    // 获取总数 - 基于真实客户ID
    const countQuery = `
      WITH customer_stats AS (
        SELECT 
          o.customer_id,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
      ),
      customer_segments AS (
        SELECT 
          customer_id,
          CASE 
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'核心客户'
            WHEN total_spent >= 500 AND order_count >= 5 THEN N'活跃客户'
            WHEN total_spent >= 100 AND order_count >= 2 THEN N'机会客户'
            ELSE N'沉睡/新客户'
          END as segment_name
        FROM customer_stats
      )
      SELECT COUNT(*) as total
      FROM customer_segments
      ${segment && segment !== 'all' ? 'WHERE segment_name = :segment' : ''}
    `;
    
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: segment ? { ...params, segment } : params
    });
    
    const total = (countResult[0] as any)?.total || 0;
    
    res.json({
      success: true,
      data: customers,
      total: total
    });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// AI智能客户分析 - 提供个性化营销建议
router.get('/ai-analysis', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.query;

    // 构建基础查询条件
    let whereClause = 'WHERE o.delflag = 0';
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

    // 获取客户分层统计
    const segmentsQuery = `
      WITH customer_stats AS (
        SELECT 
          o.customer_id,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
      ),
      customer_segments AS (
        SELECT 
          customer_id,
          order_count,
          total_spent,
          avg_order_value,
          first_order_date,
          last_order_date,
          customer_lifespan_days,
          CASE 
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'核心客户'
            WHEN total_spent >= 500 AND order_count >= 5 THEN N'活跃客户'
            WHEN total_spent >= 100 AND order_count >= 2 THEN N'机会客户'
            ELSE N'沉睡/新客户'
          END as segment_name
        FROM customer_stats
      )
      SELECT 
        segment_name,
        COUNT(*) as customer_count,
        AVG(avg_order_value) as avg_spend,
        AVG(CAST(order_count AS FLOAT)) as avg_orders,
        SUM(total_spent) as total_revenue,
        AVG(total_spent * 3) as lifetime_value_3y
      FROM customer_segments
      GROUP BY segment_name
      ORDER BY 
        CASE segment_name
          WHEN N'核心客户' THEN 1
          WHEN N'活跃客户' THEN 2
          WHEN N'机会客户' THEN 3
          WHEN N'沉睡/新客户' THEN 4
        END
    `;

    const segments = await sequelize.query(segmentsQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    // 获取时间分布数据
    const timeDistributionQuery = `
      SELECT 
        DATEPART(hour, o.created_at) as hour,
        COUNT(DISTINCT o.customer_id) as customer_count,
        COUNT(*) as order_count
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY DATEPART(hour, o.created_at)
      ORDER BY hour
    `;

    const timeDistribution = await sequelize.query(timeDistributionQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    // 获取产品偏好数据
    const productPreferencesQuery = `
      SELECT 
        p.product_name,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY p.product_name
      ORDER BY total_revenue DESC
    `;

    const productPreferences = await sequelize.query(productPreferencesQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    // AI分析逻辑
    const analysis = generateAIAnalysis(segments, timeDistribution, productPreferences);

    res.json({
      success: true,
      data: {
        segments,
        timeDistribution,
        productPreferences,
        aiAnalysis: analysis
      }
    });
  } catch (error) {
    console.error('AI客户分析失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI客户分析失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// AI分析生成函数
function generateAIAnalysis(segments: any[], timeDistribution: any[], productPreferences: any[]) {
  const totalCustomers = segments.reduce((sum, seg) => sum + seg.customer_count, 0);
  const coreCustomers = segments.find(s => s.segment_name === '核心客户')?.customer_count || 0;
  const activeCustomers = segments.find(s => s.segment_name === '活跃客户')?.customer_count || 0;
  const opportunityCustomers = segments.find(s => s.segment_name === '机会客户')?.customer_count || 0;
  const dormantCustomers = segments.find(s => s.segment_name === '沉睡/新客户')?.customer_count || 0;

  // 计算客户健康度
  const healthScore = Math.round(((coreCustomers * 4 + activeCustomers * 3 + opportunityCustomers * 2 + dormantCustomers * 1) / (totalCustomers * 4)) * 100);

  // 分析高峰时段
  const peakHours = timeDistribution
    .sort((a, b) => b.customer_count - a.customer_count)
    .slice(0, 3)
    .map(h => h.hour);

  // 分析热门产品
  const topProducts = productPreferences.slice(0, 3);

  // 生成AI建议
  const suggestions = [];

  // 客户分层建议
  if (coreCustomers / totalCustomers < 0.05) {
    suggestions.push({
      type: '客户分层',
      priority: '高',
      title: '核心客户比例偏低',
      description: `当前核心客户仅占${((coreCustomers / totalCustomers) * 100).toFixed(1)}%，建议通过会员权益和个性化服务提升客户粘性`,
      action: '推出VIP会员计划，提供专属优惠和优先服务'
    });
  }

  if (dormantCustomers / totalCustomers > 0.8) {
    suggestions.push({
      type: '客户激活',
      priority: '高',
      title: '沉睡客户过多',
      description: `沉睡/新客户占比${((dormantCustomers / totalCustomers) * 100).toFixed(1)}%，需要激活策略`,
      action: '发送个性化优惠券，推出限时促销活动'
    });
  }

  // 时间分布建议
  if (peakHours.length > 0) {
    suggestions.push({
      type: '运营优化',
      priority: '中',
      title: '高峰时段分析',
      description: `客户活跃高峰时段：${peakHours.join('点、')}点`,
      action: '在高峰时段增加人手，优化服务流程'
    });
  }

  // 产品偏好建议
  if (topProducts.length > 0) {
    suggestions.push({
      type: '产品策略',
      priority: '中',
      title: '热门产品分析',
      description: `最受欢迎的产品：${topProducts.map(p => p.product_name).join('、')}`,
      action: '增加热门产品库存，开发相关衍生产品'
    });
  }

  // 客户生命周期价值建议
  const avgLifetimeValue = segments.reduce((sum, seg) => sum + (seg.lifetime_value_3y * seg.customer_count), 0) / totalCustomers;
  if (avgLifetimeValue < 100) {
    suggestions.push({
      type: '价值提升',
      priority: '高',
      title: '客户生命周期价值偏低',
      description: `平均客户生命周期价值仅${avgLifetimeValue.toFixed(2)}元`,
      action: '推出套餐优惠，鼓励客户增加购买频次和金额'
    });
  }

  return {
    healthScore,
    totalCustomers,
    customerDistribution: {
      core: coreCustomers,
      active: activeCustomers,
      opportunity: opportunityCustomers,
      dormant: dormantCustomers
    },
    peakHours,
    topProducts: topProducts.map(p => ({
      name: p.product_name,
      revenue: p.total_revenue,
      orders: p.order_count
    })),
    suggestions,
    summary: {
      strengths: healthScore > 70 ? ['客户基础稳定', '产品受欢迎度高'] : ['需要客户激活'],
      improvements: healthScore < 70 ? ['提升客户粘性', '增加客户价值'] : ['维持现有优势'],
      nextSteps: suggestions.slice(0, 3).map(s => s.action)
    }
  };
}

export default router;
