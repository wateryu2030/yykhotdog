import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();

// 获取仪表盘概览数据
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, city, storeId } = req.query;

    // 构建基础查询条件
    let whereClause = 'WHERE o.delflag = 0';
    const params: any = {};

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
    } else {
      // 默认查询最近30天的数据
      whereClause += ' AND o.created_at >= DATEADD(day, -30, GETDATE())';
    }

    // 获取门店统计
    const storeStatsQuery = `
      SELECT 
        COUNT(DISTINCT s.id) as total_stores,
        SUM(CASE WHEN s.status != '已关闭' THEN 1 ELSE 0 END) as operating_stores,
        SUM(CASE WHEN s.status = '计划中' THEN 1 ELSE 0 END) as planned_stores,
        SUM(CASE WHEN s.status = '拓展中' THEN 1 ELSE 0 END) as expanding_stores
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
        ISNULL(SUM(o.total_amount), 0) as total_sales,
        COUNT(o.id) as total_orders,
        ISNULL(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
    `;

    const salesStats = await sequelize.query(salesStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取客户统计
    const customerStatsQuery = `
      SELECT 
        COUNT(DISTINCT o.customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN o.created_at >= DATEADD(day, -30, GETDATE()) THEN o.customer_id END) as active_customers,
        COUNT(DISTINCT CASE WHEN o.created_at >= DATEADD(day, -7, GETDATE()) THEN o.customer_id END) as new_customers
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
    `;

    const customerStats = await sequelize.query(customerStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取城市统计
    const cityStatsQuery = `
      SELECT TOP 5
        s.city,
        COUNT(DISTINCT s.id) as store_count,
        ISNULL(SUM(o.total_amount), 0) as total_sales
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
      WHERE s.delflag = 0 AND s.city IS NOT NULL AND s.city != ''
      GROUP BY s.city
      ORDER BY total_sales DESC
    `;

    const cityStats = await sequelize.query(cityStatsQuery, {
      type: QueryTypes.SELECT,
    });

    // 获取产品统计
    const productStatsQuery = `
      SELECT TOP 5
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        ISNULL(SUM(oi.total_price), 0) as total_sales
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
    `;

    const productStats = await sequelize.query(productStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 获取时间趋势数据（最近7天）
    const trendQuery = `
      SELECT 
        CAST(o.created_at AS DATE) as date,
        ISNULL(SUM(o.total_amount), 0) as daily_sales,
        COUNT(o.id) as daily_orders
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
      AND o.created_at >= DATEADD(day, -7, GETDATE())
      GROUP BY CAST(o.created_at AS DATE)
      ORDER BY date DESC
    `;

    const trendData = await sequelize.query(trendQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    const storeData = storeStats[0] as any;
    const salesData = salesStats[0] as any;
    const customerData = customerStats[0] as any;

    const dashboardData = {
      summary: {
        totalStores: storeData?.total_stores || 0,
        operatingStores: storeData?.operating_stores || 0,
        plannedStores: storeData?.planned_stores || 0,
        expandingStores: storeData?.expanding_stores || 0,
        totalSales: salesData?.total_sales || 0,
        totalOrders: salesData?.total_orders || 0,
        avgOrderValue: salesData?.avg_order_value || 0,
        totalCustomers: customerData?.total_customers || 0,
        activeCustomers: customerData?.active_customers || 0,
        newCustomers: customerData?.new_customers || 0,
      },
      cityStats: cityStats || [],
      productStats: productStats || [],
      trendData: trendData || [],
      kpis: {
        sales: salesData?.total_sales || 0,
        target: Math.max(10000, (salesData?.total_sales || 0) * 1.2),
        totalSales: salesData?.total_sales || 0,
        totalSalesTrend: {
          vsYesterday: 0, // 可以后续计算
        },
        transactions: salesData?.total_orders || 0,
        transactionsTrend: {
          vsYesterday: 0, // 可以后续计算
        },
        avgSpend: salesData?.avg_order_value || 0,
        avgSpendTrend: {
          vsYesterday: 0, // 可以后续计算
        },
        newMembers: customerData?.new_customers || 0,
      },
      charts: {
        hourlyStats: [],
        paymentStats: [],
        productStats: productStats || [],
      },
    };

    res.json({
      success: true,
      data: dashboardData,
      message: '仪表盘数据获取成功',
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取仪表盘数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取仪表盘KPI数据
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, city, storeId } = req.query;

    // 构建基础查询条件
    let whereClause = 'WHERE o.delflag = 0';
    const params: any = {};

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
    } else {
      // 默认查询今天的数据
      whereClause += ' AND CAST(o.created_at AS DATE) = CAST(GETDATE() AS DATE)';
    }

    // 获取KPI数据
    const kpiQuery = `
      SELECT 
        ISNULL(SUM(o.total_amount), 0) as total_sales,
        COUNT(o.id) as total_orders,
        ISNULL(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      ${whereClause}
    `;

    const kpiResult = await sequelize.query(kpiQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    const kpiData = kpiResult[0] as any;

    res.json({
      success: true,
      data: {
        sales: kpiData?.total_sales || 0,
        target: Math.max(5000, (kpiData?.total_sales || 0) * 1.2),
        totalSales: kpiData?.total_sales || 0,
        totalSalesTrend: {
          vsYesterday: 0,
        },
        transactions: kpiData?.total_orders || 0,
        transactionsTrend: {
          vsYesterday: 0,
        },
        avgSpend: kpiData?.avg_order_value || 0,
        avgSpendTrend: {
          vsYesterday: 0,
        },
        newMembers: kpiData?.unique_customers || 0,
      },
      message: 'KPI数据获取成功',
    });
  } catch (error) {
    console.error('获取KPI数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取KPI数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
