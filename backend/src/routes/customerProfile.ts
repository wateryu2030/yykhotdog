import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import AdvancedCustomerAnalysisService from '../services/AdvancedCustomerAnalysisService';
import { logger } from '../utils/logger';

const router = Router();
const aiAnalysisService = new AdvancedCustomerAnalysisService();

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
      type: QueryTypes.SELECT,
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
      type: QueryTypes.SELECT,
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
      type: QueryTypes.SELECT,
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
      type: QueryTypes.SELECT,
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
      avgOrderValue:
        salesData?.total_orders > 0 ? salesData?.total_sales / salesData?.total_orders : 0,
      
      // 城市数据
      topCities: cityStats.map((city: any) => ({
        name: city.city,
        count: city.count,
      })),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('获取客户画像摘要失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户画像摘要失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 别名路由：兼容前端调用 /dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.query;
    
    // 构建基础查询条件 - 过滤空客户ID
    let whereClause = 'WHERE o.delflag = 0 AND o.customer_id IS NOT NULL AND o.customer_id != \'\'';
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
      replacements: params,
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
      replacements: params,
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
      replacements: params,
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
      replacements: params,
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
      replacements: params,
    });

    // 补全24小时数据
    const fullTimeDistribution = Array.from({ length: 24 }, (_, i) => {
      const hourData = timeDistribution.find((item: any) => item.hour === i) as any;
      return {
        hour: i.toString().padStart(2, '0'),
        customer_count: (hourData as any)?.customer_count || 0,
        order_count: (hourData as any)?.order_count || 0,
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
      aiSuggestions: [],
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('获取客户画像仪表板失败:', error);
    res.status(500).json({
      success: false,
      error: '获取客户画像仪表板失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取城市列表（从stores表获取实际有门店的城市，确保数据真实）
router.get('/cities', async (req: Request, res: Response) => {
  try {
    // 直接从stores表获取实际有门店的城市（这是最真实的数据源）
    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY city) as id,
        city as name,
        MAX(province) as province,
        COUNT(*) as store_count
      FROM stores s
      WHERE s.delflag = 0 
        AND s.city IS NOT NULL 
        AND s.city != ''
      GROUP BY city
      ORDER BY city
    `;

    const cities = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    console.error('获取城市列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市列表失败',
      details: error instanceof Error ? error.message : '未知错误',
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
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      data: stores,
    });
  } catch (error) {
    console.error('获取所有门店列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取所有门店列表失败',
      details: error instanceof Error ? error.message : '未知错误',
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
      replacements: { cityName: decodeURIComponent(cityName) },
    });

    res.json({
      success: true,
      data: stores,
    });
  } catch (error) {
    console.error('获取门店列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店列表失败',
      details: error instanceof Error ? error.message : '未知错误',
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
      type: QueryTypes.SELECT,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('调试门店状态失败:', error);
    res.status(500).json({
      success: false,
      error: '调试门店状态失败',
      details: error instanceof Error ? error.message : '未知错误',
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
      sortOrder = 'desc',
    } = req.query;
    
    // 构建基础查询条件 - 过滤空客户ID
    let whereClause = 'WHERE o.delflag = 0 AND o.customer_id IS NOT NULL AND o.customer_id != \'\'';
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
          MAX(NULLIF(LTRIM(RTRIM(c.customer_name)), '')) as raw_customer_name,
          MAX(NULLIF(LTRIM(RTRIM(c.phone)), '')) as raw_phone,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days,
          MAX(CASE 
                WHEN c.customer_name IS NOT NULL 
                     AND s.director IS NOT NULL 
                     AND LTRIM(RTRIM(c.customer_name)) = LTRIM(RTRIM(s.director)) 
                  THEN 1 ELSE 0 
              END) as name_matches_store_contact,
          MAX(CASE 
                WHEN c.phone IS NOT NULL 
                     AND s.director_phone IS NOT NULL 
                     AND LTRIM(RTRIM(c.phone)) = LTRIM(RTRIM(s.director_phone)) 
                  THEN 1 ELSE 0 
              END) as phone_matches_store_contact
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY o.customer_id
      ),
      customer_segments AS (
        SELECT 
          customer_id,
          CASE 
            WHEN name_matches_store_contact = 1 
              OR raw_customer_name IS NULL 
              OR raw_customer_name = '' 
              OR raw_customer_name LIKE N'%店长%' 
              OR raw_customer_name LIKE N'%经理%' 
            THEN NULL
            ELSE raw_customer_name
          END as customer_name,
          CASE 
            WHEN phone_matches_store_contact = 1 
              OR raw_phone IS NULL 
              OR LEN(raw_phone) < 6 
            THEN NULL
            ELSE raw_phone
          END as phone,
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
        CASE 
          WHEN order_count > 0 THEN CEILING(CAST(customer_lifespan_days + 1 AS FLOAT) / NULLIF(order_count, 0))
          ELSE NULL
        END AS avg_purchase_interval_days,
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
      replacements: params,
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
      replacements: segment ? { ...params, segment } : params,
    });
    
    const total = (countResult[0] as any)?.total || 0;
    
    res.json({
      success: true,
      data: customers,
      total: total,
    });
  } catch (error) {
    logger.error('获取客户列表失败', error);
    res.status(500).json({
      success: false,
      error: '获取客户列表失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 获取门店优质客户（以平均购间隔不超过7天为准）
router.get('/store-premium-customers', async (req: Request, res: Response) => {
  try {
    const {
      city,
      shopId,
      startDate,
      endDate,
      intervalThreshold = '7',
      inactivityDays = '30',
      limitPerStore = '5',
    } = req.query;

    let whereClause = `
      WHERE o.delflag = 0 
        AND o.customer_id IS NOT NULL 
        AND o.customer_id != '' 
        AND o.store_id IS NOT NULL
    `;
    const params: Record<string, any> = {
      intervalThreshold: Number(intervalThreshold) || 7,
      inactivityDays: Number(inactivityDays) || 30,
      limit: Number(limitPerStore) || 5,
    };

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

    const premiumQuery = `
      WITH order_stats AS (
        SELECT
          o.store_id,
          s.store_name,
          o.customer_id,
          MAX(NULLIF(LTRIM(RTRIM(c.customer_name)), '')) as raw_customer_name,
          MAX(NULLIF(LTRIM(RTRIM(c.phone)), '')) as raw_phone,
          COUNT(*) AS order_count,
          SUM(o.total_amount) AS total_spent,
          MIN(o.created_at) AS first_order_date,
          MAX(o.created_at) AS last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) AS customer_lifespan_days,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) AS days_since_last_order,
          MAX(CASE 
                WHEN c.customer_name IS NOT NULL 
                     AND s.director IS NOT NULL 
                     AND LTRIM(RTRIM(c.customer_name)) = LTRIM(RTRIM(s.director)) 
                  THEN 1 ELSE 0 
              END) as name_matches_store_contact,
          MAX(CASE 
                WHEN c.phone IS NOT NULL 
                     AND s.director_phone IS NOT NULL 
                     AND LTRIM(RTRIM(c.phone)) = LTRIM(RTRIM(s.director_phone)) 
                  THEN 1 ELSE 0 
              END) as phone_matches_store_contact
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY 
          o.store_id, 
          s.store_name,
          s.store_code,
          o.customer_id
      ),
      premium_candidates AS (
        SELECT
          os.store_id,
          os.store_name,
          os.customer_id,
          CASE 
            WHEN os.name_matches_store_contact = 1 
              OR os.raw_customer_name IS NULL 
              OR os.raw_customer_name = '' 
              OR os.raw_customer_name LIKE N'%店长%' 
              OR os.raw_customer_name LIKE N'%经理%' 
            THEN NULL
            ELSE os.raw_customer_name
          END AS customer_name,
          CASE 
            WHEN os.phone_matches_store_contact = 1 
              OR os.raw_phone IS NULL 
              OR LEN(os.raw_phone) < 6 
            THEN NULL
            ELSE os.raw_phone
          END AS phone,
          os.order_count,
          os.total_spent,
          os.first_order_date,
          os.last_order_date,
          os.days_since_last_order,
          CASE 
            WHEN os.order_count > 0 
              THEN CAST(os.customer_lifespan_days + 1 AS FLOAT) / NULLIF(os.order_count, 0)
            ELSE NULL
          END AS avg_purchase_interval_days
        FROM order_stats os
      ),
      ranked_premium AS (
        SELECT
          pc.*,
          s.store_code,
          ROW_NUMBER() OVER (
            PARTITION BY pc.store_id 
            ORDER BY pc.total_spent DESC, pc.last_order_date DESC
          ) AS rn
        FROM premium_candidates pc
        LEFT JOIN stores s ON pc.store_id = s.id
        WHERE pc.avg_purchase_interval_days IS NOT NULL
          AND pc.avg_purchase_interval_days <= :intervalThreshold
      )
      SELECT
        rp.store_id,
        COALESCE(rp.store_name, '未命名门店') AS store_name,
        rp.customer_id,
        COALESCE(rp.customer_name, rp.customer_id) AS customer_name,
        rp.phone,
        rp.order_count,
        rp.total_spent,
        rp.avg_purchase_interval_days,
        rp.first_order_date,
        rp.last_order_date,
        rp.days_since_last_order,
        CASE 
          WHEN rp.order_count = 1 THEN N'新客户'
          WHEN rp.days_since_last_order >= :inactivityDays THEN N'超过30天未购'
          ELSE N'购频稳定'
        END AS customer_status,
        CASE 
          WHEN rp.days_since_last_order >= :inactivityDays THEN 1 
          ELSE 0 
        END AS is_inactive,
        COALESCE(rp.store_code, '') AS store_code
      FROM ranked_premium rp
      WHERE rp.rn <= :limit
      ORDER BY COALESCE(rp.store_code, rp.store_name), rp.total_spent DESC;
    `;

    const premiumCustomers = (await sequelize.query(premiumQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    })) as any[];

    const stats = {
      totalPremiumCustomers: premiumCustomers.length,
      inactivePremiumCustomers: premiumCustomers.filter((item) => item.is_inactive === 1).length,
      storeCount: new Set(premiumCustomers.map((item) => item.store_id)).size,
    };

    res.json({
      success: true,
      data: {
        records: premiumCustomers,
        stats,
      },
    });
  } catch (error) {
    logger.error('获取门店优质客户失败', error);
    res.status(500).json({
      success: false,
      message: '获取门店优质客户失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 获取某个门店的所有优质客户（不分限制）
router.get('/store-premium-customers-all', async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      startDate,
      endDate,
      intervalThreshold = '7',
      inactivityDays = '30',
      page = 1,
      pageSize = 50,
    } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: '门店ID参数必填',
      });
    }

    let whereClause = `
      WHERE o.delflag = 0 
        AND o.customer_id IS NOT NULL 
        AND o.customer_id != '' 
        AND o.store_id = :storeId
    `;
    const params: Record<string, any> = {
      storeId,
      intervalThreshold: Number(intervalThreshold) || 7,
      inactivityDays: Number(inactivityDays) || 30,
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    };

    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const premiumQuery = `
      WITH order_stats AS (
        SELECT
          o.store_id,
          s.store_name,
          s.store_code,
          o.customer_id,
          MAX(NULLIF(LTRIM(RTRIM(c.customer_name)), '')) as raw_customer_name,
          MAX(NULLIF(LTRIM(RTRIM(c.phone)), '')) as raw_phone,
          COUNT(*) AS order_count,
          SUM(o.total_amount) AS total_spent,
          MIN(o.created_at) AS first_order_date,
          MAX(o.created_at) AS last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) AS customer_lifespan_days,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) AS days_since_last_order,
          MAX(CASE 
                WHEN c.customer_name IS NOT NULL 
                     AND s.director IS NOT NULL 
                     AND LTRIM(RTRIM(c.customer_name)) = LTRIM(RTRIM(s.director)) 
                  THEN 1 ELSE 0 
              END) as name_matches_store_contact,
          MAX(CASE 
                WHEN c.phone IS NOT NULL 
                     AND s.director_phone IS NOT NULL 
                     AND LTRIM(RTRIM(c.phone)) = LTRIM(RTRIM(s.director_phone)) 
                  THEN 1 ELSE 0 
              END) as phone_matches_store_contact
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY 
          o.store_id, 
          s.store_name,
          s.store_code,
          o.customer_id
      ),
      premium_candidates AS (
        SELECT
          os.store_id,
          os.store_name,
          os.store_code,
          os.customer_id,
          CASE 
            WHEN os.name_matches_store_contact = 1 
              OR os.raw_customer_name IS NULL 
              OR os.raw_customer_name = '' 
              OR os.raw_customer_name LIKE N'%店长%' 
              OR os.raw_customer_name LIKE N'%经理%' 
            THEN NULL
            ELSE os.raw_customer_name
          END AS customer_name,
          CASE 
            WHEN os.phone_matches_store_contact = 1 
              OR os.raw_phone IS NULL 
              OR LEN(os.raw_phone) < 6 
            THEN NULL
            ELSE os.raw_phone
          END AS phone,
          os.order_count,
          os.total_spent,
          os.first_order_date,
          os.last_order_date,
          os.days_since_last_order,
          CASE 
            WHEN os.order_count > 0 
              THEN CAST(os.customer_lifespan_days + 1 AS FLOAT) / NULLIF(os.order_count, 0)
            ELSE NULL
          END AS avg_purchase_interval_days
        FROM order_stats os
      )
      SELECT
        pc.store_id,
        COALESCE(pc.store_name, '未命名门店') AS store_name,
        COALESCE(pc.store_code, '') AS store_code,
        pc.customer_id,
        COALESCE(pc.customer_name, pc.customer_id) AS customer_name,
        pc.phone,
        pc.order_count,
        pc.total_spent,
        pc.avg_purchase_interval_days,
        pc.first_order_date,
        pc.last_order_date,
        pc.days_since_last_order,
        CASE 
          WHEN pc.order_count = 1 THEN N'新客户'
          WHEN pc.days_since_last_order >= :inactivityDays THEN N'超过30天未购'
          ELSE N'购频稳定'
        END AS customer_status,
        CASE 
          WHEN pc.days_since_last_order >= :inactivityDays THEN 1 
          ELSE 0 
        END AS is_inactive
      FROM premium_candidates pc
      WHERE pc.avg_purchase_interval_days IS NOT NULL
        AND pc.avg_purchase_interval_days <= :intervalThreshold
      ORDER BY pc.total_spent DESC, pc.last_order_date DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY;
    `;

    const countQuery = `
      WITH order_stats AS (
        SELECT
          o.store_id,
          o.customer_id,
          COUNT(*) AS order_count,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) AS customer_lifespan_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY 
          o.store_id, 
          o.customer_id
      ),
      premium_candidates AS (
        SELECT
          os.customer_id,
          CASE 
            WHEN os.order_count > 0 
              THEN CAST(os.customer_lifespan_days + 1 AS FLOAT) / NULLIF(os.order_count, 0)
            ELSE NULL
          END AS avg_purchase_interval_days
        FROM order_stats os
      )
      SELECT COUNT(*) AS total
      FROM premium_candidates pc
      WHERE pc.avg_purchase_interval_days IS NOT NULL
        AND pc.avg_purchase_interval_days <= :intervalThreshold;
    `;

    const [premiumCustomers, countResult] = await Promise.all([
      sequelize.query(premiumQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(countQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
    ]);

    const total = (countResult[0] as any)?.total || 0;

    res.json({
      success: true,
      data: {
        records: premiumCustomers,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    logger.error('获取门店优质客户失败', error);
    res.status(500).json({
      success: false,
      message: '获取门店优质客户失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 获取某个城市的所有优质客户（不分门店限制）
router.get('/city-premium-customers', async (req: Request, res: Response) => {
  try {
    const {
      city,
      startDate,
      endDate,
      intervalThreshold = '7',
      inactivityDays = '30',
      page = 1,
      pageSize = 50,
    } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: '城市参数必填',
      });
    }

    let whereClause = `
      WHERE o.delflag = 0 
        AND o.customer_id IS NOT NULL 
        AND o.customer_id != '' 
        AND o.store_id IS NOT NULL
        AND s.city = :city
    `;
    const params: Record<string, any> = {
      city,
      intervalThreshold: Number(intervalThreshold) || 7,
      inactivityDays: Number(inactivityDays) || 30,
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    };

    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const premiumQuery = `
      WITH order_stats AS (
        SELECT
          o.store_id,
          s.store_name,
          s.store_code,
          o.customer_id,
          MAX(NULLIF(LTRIM(RTRIM(c.customer_name)), '')) as raw_customer_name,
          MAX(NULLIF(LTRIM(RTRIM(c.phone)), '')) as raw_phone,
          COUNT(*) AS order_count,
          SUM(o.total_amount) AS total_spent,
          MIN(o.created_at) AS first_order_date,
          MAX(o.created_at) AS last_order_date,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) AS customer_lifespan_days,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) AS days_since_last_order,
          MAX(CASE 
                WHEN c.customer_name IS NOT NULL 
                     AND s.director IS NOT NULL 
                     AND LTRIM(RTRIM(c.customer_name)) = LTRIM(RTRIM(s.director)) 
                  THEN 1 ELSE 0 
              END) as name_matches_store_contact,
          MAX(CASE 
                WHEN c.phone IS NOT NULL 
                     AND s.director_phone IS NOT NULL 
                     AND LTRIM(RTRIM(c.phone)) = LTRIM(RTRIM(s.director_phone)) 
                  THEN 1 ELSE 0 
              END) as phone_matches_store_contact
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY 
          o.store_id, 
          s.store_name,
          s.store_code,
          o.customer_id
      ),
      premium_candidates AS (
        SELECT
          os.store_id,
          os.store_name,
          os.store_code,
          os.customer_id,
          CASE 
            WHEN os.name_matches_store_contact = 1 
              OR os.raw_customer_name IS NULL 
              OR os.raw_customer_name = '' 
              OR os.raw_customer_name LIKE N'%店长%' 
              OR os.raw_customer_name LIKE N'%经理%' 
            THEN NULL
            ELSE os.raw_customer_name
          END AS customer_name,
          CASE 
            WHEN os.phone_matches_store_contact = 1 
              OR os.raw_phone IS NULL 
              OR LEN(os.raw_phone) < 6 
            THEN NULL
            ELSE os.raw_phone
          END AS phone,
          os.order_count,
          os.total_spent,
          os.first_order_date,
          os.last_order_date,
          os.days_since_last_order,
          CASE 
            WHEN os.order_count > 0 
              THEN CAST(os.customer_lifespan_days + 1 AS FLOAT) / NULLIF(os.order_count, 0)
            ELSE NULL
          END AS avg_purchase_interval_days
        FROM order_stats os
      )
      SELECT
        pc.store_id,
        COALESCE(pc.store_name, '未命名门店') AS store_name,
        COALESCE(pc.store_code, '') AS store_code,
        pc.customer_id,
        COALESCE(pc.customer_name, pc.customer_id) AS customer_name,
        pc.phone,
        pc.order_count,
        pc.total_spent,
        pc.avg_purchase_interval_days,
        pc.first_order_date,
        pc.last_order_date,
        pc.days_since_last_order,
        CASE 
          WHEN pc.order_count = 1 THEN N'新客户'
          WHEN pc.days_since_last_order >= :inactivityDays THEN N'超过30天未购'
          ELSE N'购频稳定'
        END AS customer_status,
        CASE 
          WHEN pc.days_since_last_order >= :inactivityDays THEN 1 
          ELSE 0 
        END AS is_inactive
      FROM premium_candidates pc
      WHERE pc.avg_purchase_interval_days IS NOT NULL
        AND pc.avg_purchase_interval_days <= :intervalThreshold
      ORDER BY COALESCE(pc.store_code, pc.store_name), pc.total_spent DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY;
    `;

    const countQuery = `
      WITH order_stats AS (
        SELECT
          o.store_id,
          s.store_name,
          s.store_code,
          o.customer_id,
          COUNT(*) AS order_count,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) AS customer_lifespan_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        ${whereClause}
        GROUP BY 
          o.store_id, 
          s.store_name,
          s.store_code,
          o.customer_id
      ),
      premium_candidates AS (
        SELECT
          os.customer_id,
          CASE 
            WHEN os.order_count > 0 
              THEN CAST(os.customer_lifespan_days + 1 AS FLOAT) / NULLIF(os.order_count, 0)
            ELSE NULL
          END AS avg_purchase_interval_days
        FROM order_stats os
      )
      SELECT COUNT(*) AS total
      FROM premium_candidates pc
      WHERE pc.avg_purchase_interval_days IS NOT NULL
        AND pc.avg_purchase_interval_days <= :intervalThreshold;
    `;

    const [premiumCustomers, countResult] = await Promise.all([
      sequelize.query(premiumQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(countQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
    ]);

    const total = (countResult[0] as any)?.total || 0;

    res.json({
      success: true,
      data: {
        records: premiumCustomers,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    logger.error('获取城市优质客户失败', error);
    res.status(500).json({
      success: false,
      message: '获取城市优质客户失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 获取单个客户的订单列表
router.get('/customers/:customerId/orders', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
    const offset = (page - 1) * pageSize;
    const { startDate, endDate } = req.query;

    let whereClause = 'WHERE o.customer_id = :customerId';
    const replacements: Record<string, any> = {
      customerId,
      offset,
      limit: pageSize,
    };

    // 添加日期范围筛选
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    const ordersQuery = `
      SELECT
        o.id AS order_id,
        o.order_no,
        o.total_amount,
        o.pay_state,
        o.pay_mode,
        o.created_at AS order_date,
        s.store_name AS shop_name,
        o.store_id
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const orders = await sequelize.query(ordersQuery, {
      type: QueryTypes.SELECT,
      replacements,
    });

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM orders o
      ${whereClause}
    `;

    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        customerId,
        ...(startDate && endDate ? { startDate, endDate } : {}),
      },
    });

    const total = (countResult[0] as any)?.total || 0;

    res.json({
      success: true,
      data: {
        orders,
        total,
      },
    });
  } catch (error) {
    logger.error('获取客户订单失败', error);
    res.status(500).json({
      success: false,
      message: '获取客户订单失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 获取订单详情及商品信息
router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const orderQuery = `
      SELECT
        o.id AS order_id,
        o.order_no,
        o.customer_id,
        o.total_amount,
        o.pay_state,
        o.pay_mode,
        o.created_at AS order_date,
        o.created_at,
        s.store_name AS shop_name,
        c.customer_name,
        c.phone
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.id = :orderId
    `;

    const orderResult = await sequelize.query(orderQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId },
    });

    if (!orderResult.length) {
      return res.status(404).json({
        success: false,
        message: '订单不存在',
      });
    }

    const goodsQuery = `
      SELECT
        oi.id,
        oi.product_id,
        oi.product_name AS goods_name,
        oi.quantity AS goods_number,
        oi.price AS goods_price,
        oi.total_price,
        NULL AS category,
        NULL AS discount_amount,
        NULL AS refund_amount
      FROM order_items oi
      WHERE oi.order_id = :orderId
      ORDER BY oi.id
    `;

    const goods = await sequelize.query(goodsQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId },
    });

    res.json({
      success: true,
      data: {
        ...(orderResult[0] as any),
        goods,
      },
    });
  } catch (error) {
    logger.error('获取订单详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// AI智能客户分析 - 提供个性化营销建议
router.get('/ai-analysis', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.query;

    // 构建基础查询条件 - 过滤空客户ID
    let whereClause = 'WHERE o.delflag = 0 AND o.customer_id IS NOT NULL AND o.customer_id != \'\'';
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
      replacements: params,
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
      replacements: params,
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
      replacements: params,
    });

    // AI分析逻辑
    const analysis = generateAIAnalysis(segments, timeDistribution, productPreferences);

    res.json({
      success: true,
      data: {
        segments,
        timeDistribution,
        productPreferences,
        aiAnalysis: analysis,
      },
    });
  } catch (error) {
    console.error('AI客户分析失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI客户分析失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// AI分析生成函数
function generateAIAnalysis(segments: any[], timeDistribution: any[], productPreferences: any[]) {
  const totalCustomers = segments.reduce((sum, seg) => sum + seg.customer_count, 0);
  const coreCustomers = segments.find(s => s.segment_name === '核心客户')?.customer_count || 0;
  const activeCustomers = segments.find(s => s.segment_name === '活跃客户')?.customer_count || 0;
  const opportunityCustomers =
    segments.find(s => s.segment_name === '机会客户')?.customer_count || 0;
  const dormantCustomers =
    segments.find(s => s.segment_name === '沉睡/新客户')?.customer_count || 0;

  // 计算客户健康度
  const healthScore = Math.round(
    ((coreCustomers * 4 + activeCustomers * 3 + opportunityCustomers * 2 + dormantCustomers * 1) /
      (totalCustomers * 4)) *
      100
  );

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
      action: '推出VIP会员计划，提供专属优惠和优先服务',
    });
  }

  if (dormantCustomers / totalCustomers > 0.8) {
    suggestions.push({
      type: '客户激活',
      priority: '高',
      title: '沉睡客户过多',
      description: `沉睡/新客户占比${((dormantCustomers / totalCustomers) * 100).toFixed(1)}%，需要激活策略`,
      action: '发送个性化优惠券，推出限时促销活动',
    });
  }

  // 时间分布建议
  if (peakHours.length > 0) {
    suggestions.push({
      type: '运营优化',
      priority: '中',
      title: '高峰时段分析',
      description: `客户活跃高峰时段：${peakHours.join('点、')}点`,
      action: '在高峰时段增加人手，优化服务流程',
    });
  }

  // 产品偏好建议
  if (topProducts.length > 0) {
    suggestions.push({
      type: '产品策略',
      priority: '中',
      title: '热门产品分析',
      description: `最受欢迎的产品：${topProducts.map(p => p.product_name).join('、')}`,
      action: '增加热门产品库存，开发相关衍生产品',
    });
  }

  // 客户生命周期价值建议
  const avgLifetimeValue =
    segments.reduce((sum, seg) => sum + seg.lifetime_value_3y * seg.customer_count, 0) /
    totalCustomers;
  if (avgLifetimeValue < 100) {
    suggestions.push({
      type: '价值提升',
      priority: '高',
      title: '客户生命周期价值偏低',
      description: `平均客户生命周期价值仅${avgLifetimeValue.toFixed(2)}元`,
      action: '推出套餐优惠，鼓励客户增加购买频次和金额',
    });
  }

  return {
    healthScore,
    totalCustomers,
    customerDistribution: {
      core: coreCustomers,
      active: activeCustomers,
      opportunity: opportunityCustomers,
      dormant: dormantCustomers,
    },
    peakHours,
    topProducts: topProducts.map(p => ({
      name: p.product_name,
      revenue: p.total_revenue,
      orders: p.order_count,
    })),
    suggestions,
    summary: {
      strengths: healthScore > 70 ? ['客户基础稳定', '产品受欢迎度高'] : ['需要客户激活'],
      improvements: healthScore < 70 ? ['提升客户粘性', '增加客户价值'] : ['维持现有优势'],
      nextSteps: suggestions.slice(0, 3).map(s => s.action),
    },
  };
}

// ==================== 新增AI分析API端点 ====================

// AI深度客户洞察分析
router.post('/ai-insights', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.body;

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

    // 获取客户分层数据
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
      replacements: params,
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
      replacements: params,
    });

    // 补全24小时数据
    const fullTimeDistribution = Array.from({ length: 24 }, (_, i) => {
      const hourData = timeDistribution.find((item: any) => item.hour === i) as any;
      return {
        hour: i.toString().padStart(2, '0'),
        customer_count: hourData?.customer_count || 0,
        order_count: hourData?.order_count || 0,
      };
    });

    // 获取产品偏好数据
    const productPreferencesQuery = `
      SELECT TOP 5
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT o.customer_id) as customer_count
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
    `;

    const productPreferences = await sequelize.query(productPreferencesQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 确定分析范围，并获取店铺级别的详细数据（当选择城市时）
    let analysisScope: { type: 'all_cities' | 'city' | 'store'; city?: string; storeName?: string; storeCount?: number; cityStoreCount?: number } | undefined;
    let storeLevelData: any[] = []; // 存储每个店铺的详细数据
    
    if (shopId) {
      // 获取店铺信息
      const storeInfo = await sequelize.query(`
        SELECT store_name, city, 
          (SELECT COUNT(*) FROM stores WHERE city = s.city AND delflag = 0) as city_store_count
        FROM stores s
        WHERE id = :shopId AND delflag = 0
      `, {
        type: QueryTypes.SELECT,
        replacements: { shopId }
      });
      
      if (storeInfo && storeInfo.length > 0) {
        const store = storeInfo[0] as any;
        analysisScope = {
          type: 'store',
          city: store.city,
          storeName: store.store_name,
          cityStoreCount: store.city_store_count
        };
      }
    } else if (city) {
      // 获取城市店铺数量
      const cityStoreCount = await sequelize.query(`
        SELECT COUNT(*) as count FROM stores WHERE city = :city AND delflag = 0
      `, {
        type: QueryTypes.SELECT,
        replacements: { city }
      });
      
      const storeCount = (cityStoreCount[0] as any)?.count || 0;
      
      analysisScope = {
        type: 'city',
        city: city,
        cityStoreCount: storeCount
      };
      
      // 获取该城市下每个店铺的详细数据
      if (storeCount > 0) {
        const storeLevelQuery = `
          WITH store_customer_stats AS (
            SELECT 
              s.id as store_id,
              s.store_name,
              o.customer_id,
              COUNT(*) as order_count,
              SUM(o.total_amount) as total_spent,
              AVG(o.total_amount) as avg_order_value,
              MIN(o.created_at) as first_order_date,
              MAX(o.created_at) as last_order_date
            FROM orders o
            INNER JOIN stores s ON o.store_id = s.id
            ${whereClause}
            GROUP BY s.id, s.store_name, o.customer_id
          ),
          store_customer_segments AS (
            SELECT 
              store_id,
              store_name,
              customer_id,
              order_count,
              total_spent,
              avg_order_value,
              CASE 
                WHEN total_spent >= 1000 AND order_count >= 10 THEN N'核心客户'
                WHEN total_spent >= 500 AND order_count >= 5 THEN N'活跃客户'
                WHEN total_spent >= 100 AND order_count >= 2 THEN N'机会客户'
                ELSE N'沉睡/新客户'
              END as segment_name
            FROM store_customer_stats
          ),
          store_segments_summary AS (
            SELECT 
              store_id,
              store_name,
              segment_name,
              COUNT(*) as customer_count,
              AVG(avg_order_value) as avg_spend,
              AVG(CAST(order_count AS FLOAT)) as avg_orders,
              SUM(total_spent) as total_revenue
            FROM store_customer_segments
            GROUP BY store_id, store_name, segment_name
          ),
          store_product_preferences AS (
            SELECT 
              s.id as store_id,
              s.store_name,
              oi.product_name,
              SUM(oi.quantity) as total_quantity,
              SUM(oi.total_price) as total_revenue,
              COUNT(DISTINCT o.customer_id) as customer_count
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN stores s ON o.store_id = s.id
            ${whereClause}
            GROUP BY s.id, s.store_name, oi.product_name
          )
          SELECT 
            ss.store_id,
            ss.store_name,
            ss.segment_name,
            ss.customer_count,
            ss.avg_spend,
            ss.avg_orders,
            ss.total_revenue,
            (
              SELECT TOP 3 product_name + ':' + CAST(total_revenue AS VARCHAR) + '元'
              FROM store_product_preferences spp
              WHERE spp.store_id = ss.store_id
              ORDER BY total_revenue DESC
              FOR XML PATH('')
            ) as top_products
          FROM store_segments_summary ss
          ORDER BY ss.store_id, 
            CASE ss.segment_name
              WHEN N'核心客户' THEN 1
              WHEN N'活跃客户' THEN 2
              WHEN N'机会客户' THEN 3
              WHEN N'沉睡/新客户' THEN 4
            END
        `;
        
        const storeLevelResults = await sequelize.query(storeLevelQuery, {
          type: QueryTypes.SELECT,
          replacements: params,
        });
        
        // 按店铺组织数据
        const storeMap = new Map();
        (storeLevelResults as any[]).forEach((row: any) => {
          if (!storeMap.has(row.store_id)) {
            storeMap.set(row.store_id, {
              store_id: row.store_id,
              store_name: row.store_name,
              segments: [],
              top_products: []
            });
          }
          const store = storeMap.get(row.store_id);
          store.segments.push({
            segment_name: row.segment_name,
            customer_count: row.customer_count,
            avg_spend: row.avg_spend,
            avg_orders: row.avg_orders,
            total_revenue: row.total_revenue
          });
        });
        
        // 获取每个店铺的热门产品
        const storeProductsQuery = `
          SELECT 
            s.id as store_id,
            s.store_name,
            oi.product_name,
            SUM(oi.total_price) as total_revenue,
            SUM(oi.quantity) as total_quantity
          FROM order_items oi
          INNER JOIN orders o ON oi.order_id = o.id
          INNER JOIN stores s ON o.store_id = s.id
          ${whereClause}
          GROUP BY s.id, s.store_name, oi.product_name
          ORDER BY s.id, total_revenue DESC
        `;
        
        const storeProducts = await sequelize.query(storeProductsQuery, {
          type: QueryTypes.SELECT,
          replacements: params,
        });
        
        // 为每个店铺添加热门产品（前5个）
        (storeProducts as any[]).forEach((row: any) => {
          const store = storeMap.get(row.store_id);
          if (store && store.top_products.length < 5) {
            store.top_products.push({
              product_name: row.product_name,
              total_revenue: row.total_revenue,
              total_quantity: row.total_quantity
            });
          }
        });
        
        storeLevelData = Array.from(storeMap.values());
      }
    } else {
      // 全部城市
      analysisScope = {
        type: 'all_cities'
      };
    }

    // 构建AI分析数据
    const customerData = {
      segments: segments as any[],
      behavior: {
        timeDistribution: fullTimeDistribution,
        productPreferences: productPreferences as any[]
      },
      timeDistribution: fullTimeDistribution,
      analysisScope,
      storeLevelData: storeLevelData.length > 0 ? storeLevelData : undefined // 添加店铺级别数据
    };

    // 调用AI分析服务
    logger.info('AI分析请求 - 分析范围:', JSON.stringify(analysisScope));
    logger.info('AI分析请求 - 客户数据摘要:', {
      segmentsCount: customerData.segments.length,
      totalCustomers: customerData.segments.reduce((sum, seg) => sum + (seg.customer_count || 0), 0)
    });
    
    const aiInsights = await aiAnalysisService.generateCustomerInsights(customerData, analysisScope);

    res.json({
      success: true,
      data: {
        insights: aiInsights,
        rawData: customerData,
        analysisScope: analysisScope, // 添加分析范围到响应中，方便调试
        generatedAt: new Date().toISOString()
      },
      message: 'AI客户洞察生成成功'
    });

  } catch (error) {
    logger.error('AI客户洞察分析失败:', error);
    res.status(500).json({
      success: false,
      message: 'AI客户洞察分析失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 客户生命周期预测
router.get('/customer-lifecycle/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    // 获取客户详细数据
    const customerQuery = `
      SELECT 
        o.customer_id,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MIN(o.created_at) as first_order_date,
        MAX(o.created_at) as last_order_date,
        DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days
      FROM orders o
      WHERE o.customer_id = :customerId AND o.delflag = 0
      GROUP BY o.customer_id
    `;

    const customerData = await sequelize.query(customerQuery, {
      type: QueryTypes.SELECT,
      replacements: { customerId }
    });

    if (customerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 预测客户生命周期
    const lifecyclePrediction = await aiAnalysisService.predictCustomerLifecycle(
      customerId, 
      customerData[0] as any
    );

    res.json({
      success: true,
      data: {
        customerId,
        currentData: customerData[0],
        prediction: lifecyclePrediction,
        predictedAt: new Date().toISOString()
      },
      message: '客户生命周期预测成功'
    });

  } catch (error) {
    logger.error('客户生命周期预测失败:', error);
    res.status(500).json({
      success: false,
      message: '客户生命周期预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 动态调整分群阈值
router.post('/adjust-segmentation-thresholds', async (req: Request, res: Response) => {
  try {
    const { city, shopId, startDate, endDate } = req.body;

    // 构建查询条件
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

    // 获取历史客户数据
    const historicalDataQuery = `
      SELECT 
        o.customer_id,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY o.customer_id
    `;

    const historicalData = await sequelize.query(historicalDataQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 调整分群阈值
    const adjustedThresholds = await aiAnalysisService.adjustSegmentationThresholds(
      historicalData as any[]
    );

    res.json({
      success: true,
      data: {
        thresholds: adjustedThresholds,
        sampleSize: historicalData.length,
        adjustedAt: new Date().toISOString()
      },
      message: '分群阈值调整成功'
    });

  } catch (error) {
    logger.error('分群阈值调整失败:', error);
    res.status(500).json({
      success: false,
      message: '分群阈值调整失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 客户流失预警
router.get('/churn-alert', async (req: Request, res: Response) => {
  try {
    const { city, shopId, days = 30 } = req.query;

    // 构建查询条件
    let whereClause = 'WHERE o.delflag = 0';
    const params: any = { days };

    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (shopId) {
      whereClause += ' AND o.store_id = :shopId';
      params.shopId = shopId;
    }

    // 获取潜在流失客户（包含首次购买时间和购买频率）
    const churnAlertQuery = `
      WITH customer_stats AS (
        SELECT 
          o.customer_id,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          COUNT(*) as total_orders,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
      )
      SELECT 
        customer_id,
        first_order_date,
        last_order_date,
        total_orders,
        total_spent,
        avg_order_value,
        DATEDIFF(day, last_order_date, GETDATE()) as days_since_last_order,
        CASE 
          WHEN customer_lifespan_days > 0 AND total_orders > 0
            THEN CEILING(CAST(customer_lifespan_days + 1 AS FLOAT) / NULLIF(total_orders, 0))
          ELSE NULL
        END as avg_purchase_interval_days,
        CASE 
          WHEN DATEDIFF(day, last_order_date, GETDATE()) > CAST(:days AS INT) THEN N'高风险'
          WHEN DATEDIFF(day, last_order_date, GETDATE()) > CAST(:days AS INT)/2 THEN N'中风险'
          ELSE N'低风险'
        END as churn_risk_level
      FROM customer_stats
      WHERE DATEDIFF(day, last_order_date, GETDATE()) > CAST(:days AS INT)/2
      ORDER BY days_since_last_order DESC, total_spent DESC
    `;

    const churnAlerts = await sequelize.query(churnAlertQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 统计风险分布
    const riskStats = {
      high: churnAlerts.filter((c: any) => c.churn_risk_level === '高风险').length,
      medium: churnAlerts.filter((c: any) => c.churn_risk_level === '中风险').length,
      low: churnAlerts.filter((c: any) => c.churn_risk_level === '低风险').length,
      total: churnAlerts.length
    };

    res.json({
      success: true,
      data: {
        alerts: churnAlerts,
        riskStats,
        alertThreshold: days,
        generatedAt: new Date().toISOString()
      },
      message: '客户流失预警生成成功'
    });

  } catch (error) {
    logger.error('客户流失预警失败:', error);
    res.status(500).json({
      success: false,
      message: '客户流失预警失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== 城市/门店购买习惯分析API ====================

// 1. 城市级购买模式分析
router.get('/city-purchase-patterns', async (req: Request, res: Response) => {
  try {
    const { city, startDate, endDate } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: '城市参数必填',
      });
    }

    let whereClause = `
      WHERE o.delflag = 0 
        AND s.city = :city
    `;
    const params: Record<string, any> = { city };

    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 1. 购买时段分布（24小时）
    const timeDistributionQuery = `
      SELECT 
        DATEPART(hour, o.created_at) as hour,
        COUNT(*) as order_count,
        COUNT(DISTINCT o.customer_id) as customer_count,
        AVG(o.total_amount) as avg_amount,
        SUM(o.total_amount) as total_revenue
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY DATEPART(hour, o.created_at)
      ORDER BY hour
    `;

    // 2. 星期分布
    const weekdayDistributionQuery = `
      SELECT 
        (DATEPART(weekday, o.created_at) + @@DATEFIRST - 2) % 7 + 1 as weekday,
        CASE (DATEPART(weekday, o.created_at) + @@DATEFIRST - 2) % 7 + 1
          WHEN 1 THEN N'周一'
          WHEN 2 THEN N'周二'
          WHEN 3 THEN N'周三'
          WHEN 4 THEN N'周四'
          WHEN 5 THEN N'周五'
          WHEN 6 THEN N'周六'
          WHEN 7 THEN N'周日'
        END as weekday_name,
        COUNT(*) as order_count,
        COUNT(DISTINCT o.customer_id) as customer_count,
        AVG(o.total_amount) as avg_amount
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY (DATEPART(weekday, o.created_at) + @@DATEFIRST - 2) % 7 + 1
      ORDER BY weekday
    `;

    // 3. 客户生命周期分布
    const lifecycleDistributionQuery = `
      WITH customer_lifecycle AS (
        SELECT 
          o.customer_id,
          DATEDIFF(day, MIN(o.created_at), GETDATE()) as customer_age_days,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) as days_since_last_order,
          CASE 
            WHEN DATEDIFF(day, MIN(o.created_at), GETDATE()) <= 30 THEN N'新客'
            WHEN DATEDIFF(day, MAX(o.created_at), GETDATE()) <= 7 THEN N'活跃客'
            WHEN DATEDIFF(day, MAX(o.created_at), GETDATE()) <= 30 THEN N'沉睡客'
            ELSE N'流失客'
          END as lifecycle_stage
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
      )
      SELECT 
        lifecycle_stage,
        COUNT(*) as customer_count,
        AVG(total_spent) as avg_spent,
        AVG(CAST(order_count AS FLOAT)) as avg_orders
      FROM customer_lifecycle
      GROUP BY lifecycle_stage
      ORDER BY 
        CASE lifecycle_stage
          WHEN N'新客' THEN 1
          WHEN N'活跃客' THEN 2
          WHEN N'沉睡客' THEN 3
          WHEN N'流失客' THEN 4
        END
    `;

    // 4. 价格敏感度分布
    const priceSensitivityQuery = `
      WITH price_segments AS (
        SELECT 
          o.customer_id,
          AVG(o.total_amount) as avg_order_value,
          CASE 
            WHEN AVG(o.total_amount) >= 100 THEN N'高价值'
            WHEN AVG(o.total_amount) >= 50 THEN N'中价值'
            ELSE N'低价值'
          END as price_segment
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
      )
      SELECT 
        price_segment,
        COUNT(*) as customer_count,
        AVG(avg_order_value) as avg_value
      FROM price_segments
      GROUP BY price_segment
      ORDER BY 
        CASE price_segment
          WHEN N'高价值' THEN 1
          WHEN N'中价值' THEN 2
          WHEN N'低价值' THEN 3
        END
    `;

    // 5. 平均购买间隔分析
    const purchaseIntervalQuery = `
      WITH customer_intervals AS (
        SELECT 
          o.customer_id,
          COUNT(*) as order_count,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days,
          CASE 
            WHEN COUNT(*) > 0 
              THEN CAST(DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) + 1 AS FLOAT) / NULLIF(COUNT(*), 0)
            ELSE NULL
          END as avg_interval_days
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        interval_category,
        COUNT(*) as customer_count,
        AVG(avg_interval_days) as avg_interval
      FROM (
        SELECT 
          CASE 
            WHEN avg_interval_days <= 7 THEN N'周购频(≤7天)'
            WHEN avg_interval_days <= 14 THEN N'双周购频(8-14天)'
            WHEN avg_interval_days <= 30 THEN N'月购频(15-30天)'
            ELSE N'低频(>30天)'
          END as interval_category,
          avg_interval_days
        FROM customer_intervals
        WHERE avg_interval_days IS NOT NULL
      ) categorized
      GROUP BY interval_category
      ORDER BY 
        CASE interval_category
          WHEN N'周购频(≤7天)' THEN 1
          WHEN N'双周购频(8-14天)' THEN 2
          WHEN N'月购频(15-30天)' THEN 3
          WHEN N'低频(>30天)' THEN 4
          ELSE 5
        END
    `;

    const [
      timeDistribution,
      weekdayDistribution,
      lifecycleDistribution,
      priceSensitivity,
      purchaseInterval,
    ] = await Promise.all([
      sequelize.query(timeDistributionQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(weekdayDistributionQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(lifecycleDistributionQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(priceSensitivityQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(purchaseIntervalQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
    ]);

    res.json({
      success: true,
      data: {
        city,
        timeDistribution,
        weekdayDistribution,
        lifecycleDistribution,
        priceSensitivity,
        purchaseInterval,
      },
    });
  } catch (error) {
    logger.error('获取城市购买模式失败', error);
    res.status(500).json({
      success: false,
      message: '获取城市购买模式失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 2. 门店级购买模式分析
router.get('/store-purchase-patterns', async (req: Request, res: Response) => {
  try {
    const { storeId, city, startDate, endDate } = req.query;

    let whereClause = `WHERE o.delflag = 0`;
    const params: Record<string, any> = {};

    if (storeId) {
      whereClause += ' AND o.store_id = :storeId';
      params.storeId = storeId;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 门店购买时段分析
    const timePatternQuery = `
      SELECT 
        s.store_name,
        s.store_code,
        DATEPART(hour, o.created_at) as hour,
        COUNT(*) as order_count,
        AVG(o.total_amount) as avg_amount
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY s.store_name, s.store_code, DATEPART(hour, o.created_at)
      ORDER BY s.store_code, hour
    `;

    // 门店客户分层
    const storeSegmentationQuery = `
      WITH store_customer_stats AS (
        SELECT 
          s.id AS store_id,
          s.store_name,
          s.store_code,
          o.customer_id,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) as days_since_last_order
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY s.id, s.store_name, s.store_code, o.customer_id
        HAVING COUNT(*) > 0
      ),
      store_segments AS (
        SELECT 
          store_id,
          store_name,
          store_code,
          customer_id,
          CASE 
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'核心客户'
            WHEN total_spent >= 500 AND order_count >= 5 THEN N'活跃客户'
            WHEN total_spent >= 100 AND order_count >= 2 THEN N'机会客户'
            ELSE N'沉睡/新客户'
          END as segment_name,
          days_since_last_order
        FROM store_customer_stats
      )
      SELECT 
        store_id,
        store_name,
        store_code,
        segment_name,
        COUNT(*) as customer_count,
        SUM(CASE WHEN days_since_last_order >= 30 THEN 1 ELSE 0 END) as inactive_count
      FROM store_segments
      GROUP BY store_id, store_name, store_code, segment_name
      ORDER BY store_code, 
        CASE segment_name
          WHEN N'核心客户' THEN 1
          WHEN N'活跃客户' THEN 2
          WHEN N'机会客户' THEN 3
          ELSE 4
        END
    `;

    const [timePatterns, storeSegmentation] = await Promise.all([
      sequelize.query(timePatternQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(storeSegmentationQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
    ]);

    res.json({
      success: true,
      data: {
        timePatterns,
        storeSegmentation,
      },
    });
  } catch (error) {
    logger.error('获取门店购买模式失败', error);
    res.status(500).json({
      success: false,
      message: '获取门店购买模式失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 3. 产品推荐分析
router.get('/product-recommendations', async (req: Request, res: Response) => {
  try {
    const { city, storeId, customerId, startDate, endDate } = req.query;

    let whereClause = `WHERE o.delflag = 0 AND oi.delflag = 0`;
    const params: Record<string, any> = {};

    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (storeId) {
      whereClause += ' AND o.store_id = :storeId';
      params.storeId = storeId;
    }
    if (customerId) {
      whereClause += ' AND o.customer_id = :customerId';
      params.customerId = customerId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 热销产品组合分析
    const productComboQuery = `
      WITH order_products AS (
        SELECT 
          o.id as order_id,
          o.store_id,
          COALESCE(s.city, N'未知城市') as city,
          STUFF((
            SELECT ' + ' + p2.product_name
            FROM order_items oi2
            JOIN products p2 ON oi2.product_id = p2.id
            WHERE oi2.order_id = o.id
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 3, '') as product_combo,
          COUNT(DISTINCT p.id) as product_count
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.id, o.store_id, COALESCE(s.city, N'未知城市')
        HAVING COUNT(DISTINCT p.id) >= 2
      )
      SELECT 
        city,
        product_combo,
        COUNT(*) as combo_frequency,
        AVG(CAST(product_count AS FLOAT)) as avg_products_per_order
      FROM order_products
      WHERE product_combo IS NOT NULL AND product_combo != ''
      GROUP BY city, product_combo
      HAVING COUNT(*) >= 3
      ORDER BY city, combo_frequency DESC
    `;

    // 产品关联分析
    // 构建产品关联查询的WHERE子句
    let associationWhereClause = `WHERE o.delflag = 0 AND oi1.delflag = 0 AND oi2.delflag = 0`;
    if (city) {
      associationWhereClause += ' AND s.city = :city';
    }
    if (storeId) {
      associationWhereClause += ' AND o.store_id = :storeId';
    }
    if (customerId) {
      associationWhereClause += ' AND o.customer_id = :customerId';
    }
    if (startDate && endDate) {
      associationWhereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
    }
    
    const productAssociationQuery = `
      WITH product_pairs AS (
        SELECT 
          p1.product_name as product_a,
          p2.product_name as product_b,
          COUNT(DISTINCT o.id) as co_occurrence_count
        FROM orders o
        JOIN order_items oi1 ON o.id = oi1.order_id
        JOIN products p1 ON oi1.product_id = p1.id
        JOIN order_items oi2 ON o.id = oi2.order_id
        JOIN products p2 ON oi2.product_id = p2.id
        LEFT JOIN stores s ON o.store_id = s.id
        ${associationWhereClause}
        AND p1.id < p2.id
        GROUP BY p1.product_name, p2.product_name
        HAVING COUNT(DISTINCT o.id) >= 2
      )
      SELECT TOP 20
        product_a,
        product_b,
        co_occurrence_count
      FROM product_pairs
      ORDER BY co_occurrence_count DESC
    `;

    const [productCombos, productAssociations] = await Promise.all([
      sequelize.query(productComboQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(productAssociationQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
    ]);

    res.json({
      success: true,
      data: {
        productCombos,
        productAssociations,
      },
    });
  } catch (error) {
    logger.error('获取产品推荐失败', error);
    res.status(500).json({
      success: false,
      message: '获取产品推荐失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 4. 自动化营销建议生成
router.get('/marketing-suggestions', async (req: Request, res: Response) => {
  try {
    const { city, storeId, startDate, endDate } = req.query;

    let whereClause = `WHERE o.delflag = 0`;
    const params: Record<string, any> = {};

    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (storeId) {
      whereClause += ' AND o.store_id = :storeId';
      params.storeId = storeId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 生成营销建议
    const suggestionsQuery = `
      WITH customer_analysis AS (
        SELECT 
          o.customer_id,
          s.city,
          s.id AS store_id,
          s.store_name,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          DATEDIFF(day, MAX(o.created_at), GETDATE()) as days_since_last_order,
          DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) as customer_lifespan_days,
          CASE 
            WHEN COUNT(*) > 0 
              THEN CAST(DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)) + 1 AS FLOAT) / NULLIF(COUNT(*), 0)
            ELSE NULL
          END as avg_purchase_interval
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
        GROUP BY o.customer_id, s.city, s.id, s.store_name
      ),
      suggestions AS (
        SELECT 
          city,
          store_id,
          store_name,
          CASE 
            WHEN days_since_last_order >= 30 AND total_spent >= 500 THEN N'高价值流失预警'
            WHEN days_since_last_order >= 30 THEN N'流失客户唤醒'
            WHEN avg_purchase_interval <= 7 AND days_since_last_order >= 14 THEN N'优质客户复购提醒'
            WHEN order_count = 1 AND DATEDIFF(day, first_order_date, GETDATE()) <= 7 THEN N'新客二次转化'
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'VIP客户维护'
            WHEN avg_order_value >= 100 THEN N'高客单价客户升级'
            ELSE N'常规客户维护'
          END as suggestion_type,
          CASE 
            WHEN days_since_last_order >= 30 AND total_spent >= 500 THEN 
              N'该客户累计消费' + CAST(CAST(total_spent AS INT) AS NVARCHAR) + N'元，已' + CAST(days_since_last_order AS NVARCHAR) + N'天未购买，建议发送专属优惠券唤醒'
            WHEN days_since_last_order >= 30 THEN 
              N'该客户已' + CAST(days_since_last_order AS NVARCHAR) + N'天未购买，建议发送限时优惠'
            WHEN avg_purchase_interval <= 7 AND days_since_last_order >= 14 THEN 
              N'该客户平均' + CAST(CAST(avg_purchase_interval AS INT) AS NVARCHAR) + N'天购买一次，已超过预期购买时间，建议推送优惠'
            WHEN order_count = 1 AND DATEDIFF(day, first_order_date, GETDATE()) <= 7 THEN 
              N'新客户首次购买后，建议发送二次购买优惠券'
            WHEN total_spent >= 1000 AND order_count >= 10 THEN 
              N'VIP客户，建议提供专属服务和会员升级'
            WHEN avg_order_value >= 100 THEN 
              N'高客单价客户，建议推荐高价值产品组合'
            ELSE N'常规客户，建议定期推送新品和优惠信息'
          END as suggestion_content,
          COUNT(*) as customer_count
        FROM customer_analysis
        GROUP BY city, store_id, store_name, 
          CASE 
            WHEN days_since_last_order >= 30 AND total_spent >= 500 THEN N'高价值流失预警'
            WHEN days_since_last_order >= 30 THEN N'流失客户唤醒'
            WHEN avg_purchase_interval <= 7 AND days_since_last_order >= 14 THEN N'优质客户复购提醒'
            WHEN order_count = 1 AND DATEDIFF(day, first_order_date, GETDATE()) <= 7 THEN N'新客二次转化'
            WHEN total_spent >= 1000 AND order_count >= 10 THEN N'VIP客户维护'
            WHEN avg_order_value >= 100 THEN N'高客单价客户升级'
            ELSE N'常规客户维护'
          END,
          CASE 
            WHEN days_since_last_order >= 30 AND total_spent >= 500 THEN 
              N'该客户累计消费' + CAST(CAST(total_spent AS INT) AS NVARCHAR) + N'元，已' + CAST(days_since_last_order AS NVARCHAR) + N'天未购买，建议发送专属优惠券唤醒'
            WHEN days_since_last_order >= 30 THEN 
              N'该客户已' + CAST(days_since_last_order AS NVARCHAR) + N'天未购买，建议发送限时优惠'
            WHEN avg_purchase_interval <= 7 AND days_since_last_order >= 14 THEN 
              N'该客户平均' + CAST(CAST(avg_purchase_interval AS INT) AS NVARCHAR) + N'天购买一次，已超过预期购买时间，建议推送优惠'
            WHEN order_count = 1 AND DATEDIFF(day, first_order_date, GETDATE()) <= 7 THEN 
              N'新客户首次购买后，建议发送二次购买优惠券'
            WHEN total_spent >= 1000 AND order_count >= 10 THEN 
              N'VIP客户，建议提供专属服务和会员升级'
            WHEN avg_order_value >= 100 THEN 
              N'高客单价客户，建议推荐高价值产品组合'
            ELSE N'常规客户，建议定期推送新品和优惠信息'
          END
      )
      SELECT 
        COALESCE(city, N'未知城市') as city,
        store_id,
        COALESCE(store_name, N'未知门店') as store_name,
        suggestion_type,
        suggestion_content,
        customer_count
      FROM suggestions
      ORDER BY city, store_id, 
        CASE suggestion_type
          WHEN N'高价值流失预警' THEN 1
          WHEN N'流失客户唤醒' THEN 2
          WHEN N'优质客户复购提醒' THEN 3
          WHEN N'新客二次转化' THEN 4
          WHEN N'VIP客户维护' THEN 5
          WHEN N'高客单价客户升级' THEN 6
          ELSE 7
        END
    `;

    const suggestions = await sequelize.query(suggestionsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 按城市和门店汇总建议
    const summary = (suggestions as any[]).reduce((acc: any, item: any) => {
      const key = `${item.city}_${item.store_id}`;
      if (!acc[key]) {
        acc[key] = {
          city: item.city,
          storeId: item.store_id,
          storeName: item.store_name,
          suggestions: [],
          totalCustomers: 0,
        };
      }
      acc[key].suggestions.push({
        type: item.suggestion_type,
        content: item.suggestion_content,
        customerCount: item.customer_count,
      });
      acc[key].totalCustomers += item.customer_count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        suggestions,
        summary: Object.values(summary),
      },
    });
  } catch (error) {
    logger.error('生成营销建议失败', error);
    res.status(500).json({
      success: false,
      message: '生成营销建议失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 5. 城市级别对比分析
router.get('/city-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = `WHERE o.delflag = 0`;
    const params: Record<string, any> = {};

    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const cityComparisonQuery = `
      WITH filtered_orders AS (
        SELECT 
          o.id,
          o.customer_id,
          o.total_amount,
          ISNULL(o.total_profit, 0) AS total_profit,
          o.store_id,
          COALESCE(s.city, N'未知城市') AS city,
          COALESCE(s.open_date, s.created_at) AS store_open_date
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
      ),
      city_totals AS (
        SELECT 
          city,
          COUNT(DISTINCT customer_id) AS customer_count,
          COUNT(*) AS order_count,
          SUM(total_amount) AS total_revenue,
          SUM(ISNULL(total_amount, 0) - total_profit) AS total_cost,
          SUM(total_profit) AS total_profit,
          AVG(total_amount) AS avg_order_value,
          MIN(store_open_date) AS first_store_open_date,
          MAX(store_open_date) AS last_store_open_date
        FROM filtered_orders
        GROUP BY city
      ),
      repeat_customers AS (
        SELECT 
          city,
          COUNT(*) AS repeat_customers
        FROM (
          SELECT city, customer_id
          FROM filtered_orders
          GROUP BY city, customer_id
          HAVING COUNT(*) >= 2
        ) r
        GROUP BY city
      )
      SELECT 
        ct.city,
        ct.customer_count,
        ct.order_count,
        CASE 
          WHEN ct.customer_count > 0 
            THEN CAST(ISNULL(rc.repeat_customers, 0) * 100.0 / ct.customer_count AS DECIMAL(10, 2))
          ELSE 0 
        END AS repeat_rate,
        ct.avg_order_value,
        ct.total_revenue,
        ct.total_cost,
        ct.total_profit,
        CASE 
          WHEN ct.customer_count > 0 
            THEN CAST(ct.order_count * 1.0 / ct.customer_count AS DECIMAL(10, 2))
          ELSE 0 
        END AS avg_orders_per_customer,
        ct.first_store_open_date,
        ct.last_store_open_date,
        DATEDIFF(day, ct.first_store_open_date, GETDATE()) AS days_since_first_store
      FROM city_totals ct
      LEFT JOIN repeat_customers rc ON rc.city = ct.city
      ORDER BY ct.total_revenue DESC
    `;

    const cityComparison = await sequelize.query(cityComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: cityComparison,
    });
  } catch (error) {
    logger.error('获取城市对比分析失败', error);
    res.status(500).json({
      success: false,
      message: '获取城市对比分析失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 6. 门店级别对比分析
router.get('/store-comparison', async (req: Request, res: Response) => {
  try {
    const { city, startDate, endDate } = req.query;

    let whereClause = `WHERE o.delflag = 0`;
    const params: Record<string, any> = {};

    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const storeComparisonQuery = `
      WITH filtered_orders AS (
        SELECT 
          o.id,
          o.customer_id,
          o.total_amount,
          ISNULL(o.total_profit, 0) AS total_profit,
          o.store_id,
          s.store_name,
          s.store_code,
          COALESCE(s.city, N'未知城市') AS city,
          COALESCE(s.open_date, s.created_at) AS store_open_date
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        WHERE o.delflag = 0 ${city ? 'AND s.city = :city' : ''}
        ${startDate && endDate ? 'AND o.created_at BETWEEN :startDate AND :endDate' : ''}
      ),
      store_totals AS (
        SELECT 
          store_id,
          MAX(store_name) AS store_name,
          MAX(store_code) AS store_code,
          MAX(city) AS city,
          MAX(store_open_date) AS store_open_date,
          COUNT(DISTINCT customer_id) AS customer_count,
          COUNT(*) AS order_count,
          SUM(total_amount) AS total_revenue,
          SUM(ISNULL(total_amount, 0) - total_profit) AS total_cost,
          SUM(total_profit) AS total_profit,
          AVG(total_amount) AS avg_order_value
        FROM filtered_orders
        GROUP BY store_id
      ),
      repeat_customers AS (
        SELECT 
          store_id,
          COUNT(*) AS repeat_customers
        FROM (
          SELECT store_id, customer_id
          FROM filtered_orders
          GROUP BY store_id, customer_id
          HAVING COUNT(*) >= 2
        ) r
        GROUP BY store_id
      )
      SELECT 
        st.store_id,
        st.store_name,
        st.store_code,
        st.city,
        st.store_open_date,
        DATEDIFF(day, st.store_open_date, GETDATE()) AS days_since_open,
        st.customer_count,
        st.order_count,
        CASE 
          WHEN st.customer_count > 0 
            THEN CAST(ISNULL(rc.repeat_customers, 0) * 100.0 / st.customer_count AS DECIMAL(10, 2))
          ELSE 0 
        END AS repeat_rate,
        st.avg_order_value,
        st.total_revenue,
        st.total_cost,
        st.total_profit,
        CASE 
          WHEN st.customer_count > 0 
            THEN CAST(st.order_count * 1.0 / st.customer_count AS DECIMAL(10, 2))
          ELSE 0 
        END AS avg_orders_per_customer
      FROM store_totals st
      LEFT JOIN repeat_customers rc ON rc.store_id = st.store_id
      ORDER BY st.total_revenue DESC
    `;

    const storeComparison = await sequelize.query(storeComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    res.json({
      success: true,
      data: storeComparison,
    });
  } catch (error) {
    logger.error('获取门店对比分析失败', error);
    res.status(500).json({
      success: false,
      message: '获取门店对比分析失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

// 7. AI智能洞察 - 综合分析
router.get('/ai-comprehensive-analysis', async (req: Request, res: Response) => {
  try {
    const { city, storeId, startDate, endDate } = req.query;

    let whereClause = `WHERE o.delflag = 0`;
    const params: Record<string, any> = {};

    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (storeId) {
      whereClause += ' AND o.store_id = :storeId';
      params.storeId = storeId;
    }
    if (startDate && endDate) {
      whereClause += ' AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // 综合分析查询
    const comprehensiveAnalysisQuery = `
      WITH filtered_orders AS (
        SELECT 
          o.id,
          o.customer_id,
          o.total_amount,
          ISNULL(o.total_profit, 0) AS total_profit,
          o.store_id,
          o.created_at,
          s.city,
          s.store_name
        FROM orders o
        LEFT JOIN stores s ON o.store_id = s.id
        ${whereClause}
      ),
      base_stats AS (
        SELECT 
          COUNT(DISTINCT customer_id) as total_customers,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          SUM(ISNULL(total_amount, 0) - total_profit) as total_cost,
          SUM(total_profit) as total_profit,
          AVG(total_amount) as avg_order_value
        FROM filtered_orders
      ),
      repeat_customer_counts AS (
        SELECT COUNT(*) as repeat_customers
        FROM (
          SELECT customer_id
          FROM filtered_orders
          GROUP BY customer_id
          HAVING COUNT(*) >= 2
        ) r
      ),
      customer_lifecycle AS (
        SELECT 
          customer_id,
          COUNT(*) as order_count,
          SUM(total_amount) as total_spent,
          MIN(created_at) as first_order_date,
          MAX(created_at) as last_order_date,
          DATEDIFF(day, MAX(created_at), GETDATE()) as days_since_last_order
        FROM filtered_orders
        GROUP BY customer_id
      ),
      lifecycle_segments AS (
        SELECT 
          CASE 
            WHEN days_since_last_order <= 7 THEN N'活跃客户'
            WHEN days_since_last_order <= 30 THEN N'沉睡客户'
            ELSE N'流失客户'
          END as segment,
          COUNT(*) as count
        FROM customer_lifecycle
        GROUP BY 
          CASE 
            WHEN days_since_last_order <= 7 THEN N'活跃客户'
            WHEN days_since_last_order <= 30 THEN N'沉睡客户'
            ELSE N'流失客户'
          END
      )
      SELECT 
        bs.total_customers,
        bs.total_orders,
        bs.total_revenue,
        bs.total_cost,
        bs.total_profit,
        bs.avg_order_value,
        ISNULL(rcc.repeat_customers, 0) as repeat_customers,
        bs.total_customers - ISNULL(rcc.repeat_customers, 0) as new_customers,
        CASE 
          WHEN bs.total_customers > 0 
            THEN CAST(ISNULL(rcc.repeat_customers, 0) * 100.0 / bs.total_customers AS DECIMAL(10, 2))
          ELSE 0 
        END as repeat_rate,
        CASE 
          WHEN bs.total_orders > 0 
            THEN CAST(bs.total_revenue / bs.total_orders AS DECIMAL(10, 2))
          ELSE 0 
        END as revenue_per_order,
        CASE 
          WHEN bs.total_revenue > 0 
            THEN CAST(bs.total_profit * 100.0 / bs.total_revenue AS DECIMAL(10, 2))
          ELSE 0 
        END as profit_margin
      FROM base_stats bs
      CROSS JOIN repeat_customer_counts rcc
    `;

    const [analysisResult, lifecycleSegments] = await Promise.all([
      sequelize.query(comprehensiveAnalysisQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
      sequelize.query(`
        SELECT 
          CASE 
            WHEN days_since_last_order <= 7 THEN N'活跃客户'
            WHEN days_since_last_order <= 30 THEN N'沉睡客户'
            ELSE N'流失客户'
          END as segment,
          COUNT(*) as count,
          AVG(total_spent) as avg_spent,
          AVG(CAST(order_count AS FLOAT)) as avg_orders
        FROM (
          SELECT 
            o.customer_id,
            COUNT(*) as order_count,
            SUM(o.total_amount) as total_spent,
            DATEDIFF(day, MAX(o.created_at), GETDATE()) as days_since_last_order
          FROM orders o
          LEFT JOIN stores s ON o.store_id = s.id
          ${whereClause}
          GROUP BY o.customer_id
        ) customer_lifecycle
        GROUP BY 
          CASE 
            WHEN days_since_last_order <= 7 THEN N'活跃客户'
            WHEN days_since_last_order <= 30 THEN N'沉睡客户'
            ELSE N'流失客户'
          END
      `, {
        type: QueryTypes.SELECT,
        replacements: params,
      }),
    ]);

    // 生成AI洞察建议
    const insights = [];
    const baseStats = analysisResult[0] as any;
    
    if (baseStats) {
      if (baseStats.repeat_rate < 30) {
        insights.push({
          type: 'warning',
          title: '复购率偏低',
          content: `当前复购率为${baseStats.repeat_rate}%，低于行业平均水平。建议加强客户留存策略，如会员积分、优惠券等。`,
        });
      }
      
      if (baseStats.profit_margin < 20) {
        insights.push({
          type: 'warning',
          title: '利润率偏低',
          content: `当前利润率为${baseStats.profit_margin}%，建议优化成本结构或提升客单价。`,
        });
      }
      
      const activeCustomers = lifecycleSegments.find((s: any) => s.segment === '活跃客户') as any;
      const churnCustomers = lifecycleSegments.find((s: any) => s.segment === '流失客户') as any;
      
      if (churnCustomers && activeCustomers && (churnCustomers.count || 0) > (activeCustomers.count || 0) * 0.3) {
        insights.push({
          type: 'error',
          title: '客户流失风险高',
          content: `流失客户占比过高，建议立即启动客户唤醒计划。`,
        });
      }
    }

    res.json({
      success: true,
      data: {
        summary: baseStats,
        lifecycleSegments,
        insights,
      },
    });
  } catch (error) {
    logger.error('获取AI综合分析失败', error);
    res.status(500).json({
      success: false,
      message: '获取AI综合分析失败',
      details: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
});

export default router;
