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
      LEFT JOIN orders o ON s.id = o.store_id
      ${whereClause.replace('o.delflag', 's.delflag')}
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
    
    const summary = {
      total_stores: storeData?.total_stores || 0,
      operating_stores: storeData?.operating_stores || 0,
      total_sales: salesData?.total_sales || 0,
      total_orders: salesData?.total_orders || 0,
      totalCustomers: customerData?.total_customers || 0,
      activeCustomers: customerData?.active_customers || 0,
      avgOrderValue: salesData?.avg_order_value || 0
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

// 获取城市列表
router.get('/cities', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, city_name as name, province, region
      FROM city 
      WHERE delflag = 0 AND city_name IS NOT NULL AND city_name != ''
      ORDER BY city_name
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
      SELECT 
        s.id,
        s.store_name,
        s.store_code,
        s.address,
        s.city,
        s.district,
        s.province,
        s.status,
        s.store_type,
        s.director,
        s.director_phone
      FROM stores s
      WHERE s.delflag = 0
      ORDER BY s.created_at DESC
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

export default router;
