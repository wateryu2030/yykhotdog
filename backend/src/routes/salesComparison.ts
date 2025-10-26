// 销售对比分析API架构重新设计
// backend/src/routes/salesComparison.ts

import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();

// ==================== 商品品类API ====================

/**
 * 获取商品品类列表API
 * GET /api/sales-comparison/product-categories
 */
router.get('/product-categories', async (req: Request, res: Response) => {
  try {
    // 先尝试从数据库获取商品品类
    let categories: any[] = [];
    
    try {
      // 修复SQL查询，使用SQL Server语法
      const categoryQuery = `
        SELECT DISTINCT 
          ISNULL(product_category, '未知品类') as category
        FROM order_items
        WHERE product_category IS NOT NULL
          AND product_category != ''
        ORDER BY category
      `;

      const result = await sequelize.query(categoryQuery, {
        type: QueryTypes.SELECT,
      });
      
      categories = result as any[];
    } catch (dbError) {
      console.log('数据库查询失败，使用默认品类:', dbError);
    }

    // 如果没有从数据库获取到品类，使用默认品类
    if (categories.length === 0) {
      categories = [
        { category: '热狗类' },
        { category: '饮料类' },
        { category: '小食类' },
        { category: '套餐类' }
      ];
    }

    res.json({
      success: true,
      data: categories.map(cat => ({
        value: cat.category,
        label: cat.category
      }))
    });

  } catch (error) {
    console.error('获取商品品类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品品类失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== 城市对比分析 ====================

/**
 * 城市对比分析API
 * GET /api/sales-comparison/city-comparison
 * 参数: startDate, endDate, compareType, cities[]
 */
router.get('/city-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, compareType = 'previous', cities } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    // 计算对比期间
    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string, 
      endDate as string, 
      compareType as string
    );

    // 获取城市销售数据
    const cityComparisonQuery = `
      SELECT 
        s.city,
        COUNT(DISTINCT s.id) as store_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(COUNT(o.id), 0) as total_orders,
        COALESCE(COUNT(DISTINCT o.customer_id), 0) as total_customers,
        CASE 
          WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
          ELSE 0 
        END as avg_order_value,
        CASE 
          WHEN COUNT(DISTINCT s.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT s.id)
          ELSE 0 
        END as sales_per_store
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
        ${cities ? 'AND s.city IN (:cities)' : ''}
      GROUP BY s.city
      ORDER BY total_sales DESC
    `;

    const currentData = await sequelize.query(cityComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        cities: cities ? (cities as string).split(',') : null
      }
    });

    const compareData = await sequelize.query(cityComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate,
        cities: cities ? (cities as string).split(',') : null
      }
    });

    // 计算对比数据
    const cityComparison = calculateCityComparison(currentData, compareData);

    res.json({
      success: true,
      data: {
        currentPeriod,
        comparePeriod,
        cityComparison,
        summary: calculateCitySummary(cityComparison)
      }
    });

  } catch (error) {
    console.error('获取城市对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市对比数据失败'
    });
  }
});

// ==================== 门店对比分析 ====================

// 临时调试API - 使用城市对比API的成功模式
router.get('/store-comparison-debug', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 使用与城市对比API相同的查询模式
    const query = `
      SELECT 
        s.id as store_id,
        s.store_name,
        s.city,
        s.district,
        COUNT(DISTINCT s.id) as store_count,
        SUM(o.total_amount) as total_sales,
        COUNT(o.id) as total_orders,
        COUNT(DISTINCT o.customer_id) as total_customers
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name, s.city, s.district
      ORDER BY total_sales DESC
    `;

    const data = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: startDate,
        endDate: endDate
      }
    });

    res.json({
      success: true,
      data: data,
      count: data.length
    });

  } catch (error) {
    console.error('调试门店查询失败:', error);
    res.status(500).json({
      success: false,
      error: '调试门店查询失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 门店对比分析API
 * GET /api/sales-comparison/store-comparison
 * 参数: startDate, endDate, compareType, storeIds[]
 */
router.get('/store-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, compareType = 'previous', storeIds, city } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string, 
      endDate as string, 
      compareType as string
    );

    // 获取门店详细对比数据 - 使用成功的查询模式
    const storeComparisonQuery = `
      SELECT 
        s.id as store_id,
        s.store_name,
        s.city,
        s.district,
        COUNT(DISTINCT s.id) as store_count,
        SUM(o.total_amount) as total_sales,
        COUNT(o.id) as total_orders,
        COUNT(DISTINCT o.customer_id) as total_customers
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name, s.city, s.district
      ORDER BY total_sales DESC
    `;

    // 获取当前期间数据
    const currentData = await sequelize.query(storeComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    });

    // 获取对比期间数据
    const compareData = await sequelize.query(storeComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    });

    // 计算对比数据
    const storeComparison = calculateStoreComparison(currentData, compareData);
    const summary = calculateStoreSummary(storeComparison);

    res.json({
      success: true,
      data: {
        currentPeriod,
        comparePeriod,
        storeComparison,
        summary
      }
    });

  } catch (error) {
    console.error('获取门店对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店对比数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== 商品明细对比分析 ====================

/**
 * 商品明细对比分析API
 * GET /api/sales-comparison/product-comparison
 * 参数: startDate, endDate, compareType, storeIds[], categories[]
 */
router.get('/product-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, compareType = 'previous', storeIds, categories } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string, 
      endDate as string, 
      compareType as string
    );

    // 获取商品对比数据 - 修复SQL查询
    const productComparisonQuery = `
      SELECT 
        oi.product_name,
        oi.product_category,
        COUNT(DISTINCT o.store_id) as store_count,
        SUM(ISNULL(oi.total_price, 0)) as total_sales,
        SUM(ISNULL(oi.quantity, 0)) as total_quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      GROUP BY oi.product_name, oi.product_category
      ORDER BY total_sales DESC
    `;

    // 获取当前期间数据
    const currentData = await sequelize.query(productComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    });

    // 获取对比期间数据
    const compareData = await sequelize.query(productComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    });

    // 计算对比数据
    const productComparison = calculateProductComparison(currentData, compareData);
    const summary = calculateProductSummary(productComparison);

    res.json({
      success: true,
      data: {
        currentPeriod,
        comparePeriod,
        productComparison,
        summary
      }
    });

  } catch (error) {
    console.error('获取商品对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品对比数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== 运营效率对比分析 ====================

/**
 * 运营效率对比分析API
 * GET /api/sales-comparison/efficiency-comparison
 * 参数: startDate, endDate, compareType, storeIds[]
 */
router.get('/efficiency-comparison', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, compareType = 'previous', storeIds } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供开始日期和结束日期'
      });
    }

    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string, 
      endDate as string, 
      compareType as string
    );

    // 获取运营效率对比数据 - 修复SQL查询
    const efficiencyQuery = `
      SELECT 
        s.id as store_id,
        s.store_name,
        s.city,
        s.district,
        ISNULL(s.store_area, 0) as store_area,
        ISNULL(s.staff_count, 0) as staff_count,
        SUM(ISNULL(o.total_amount, 0)) as total_sales,
        COUNT(o.id) as total_orders
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name, s.city, s.district, s.store_area, s.staff_count
      ORDER BY total_sales DESC
    `;

    // 获取当前期间数据
    const currentData = await sequelize.query(efficiencyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    });

    // 获取对比期间数据
    const compareData = await sequelize.query(efficiencyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    });

    // 计算对比数据
    const efficiencyComparison = calculateEfficiencyComparison(currentData, compareData);
    const summary = calculateEfficiencySummary(efficiencyComparison);

    res.json({
      success: true,
      data: {
        currentPeriod,
        comparePeriod,
        efficiencyComparison,
        summary
      }
    });

  } catch (error) {
    console.error('获取运营效率对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取运营效率对比数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== 小时级对比分析 ====================

/**
 * 小时级对比分析
 * GET /api/sales-comparison/hourly-comparison
 */
router.get('/hourly-comparison', async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      compareType = 'previous',
      storeIds = '',
      city = ''
    } = req.query;

    // 计算对比时间段
    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string,
      endDate as string, 
      compareType as string
    );

    // 构建门店过滤条件
    let storeFilter = '';
    if (storeIds) {
      const storeIdList = (storeIds as string).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (storeIdList.length > 0) {
        storeFilter = `AND s.id IN (${storeIdList.join(',')})`;
      }
    }

    // 构建城市过滤条件
    let cityFilter = '';
    if (city) {
      cityFilter = `AND s.city = '${city}'`;
    }

    // 获取小时级对比数据
    const hourlyQuery = `
      SELECT 
        DATEPART(hour, o.created_at) as hour,
        s.id as store_id,
        s.store_name,
        s.city,
        SUM(ISNULL(o.total_amount, 0)) as total_sales,
        COUNT(o.id) as total_orders,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      WHERE s.delflag = 0
        ${storeFilter}
        ${cityFilter}
      GROUP BY DATEPART(hour, o.created_at), s.id, s.store_name, s.city
      ORDER BY hour, total_sales DESC
    `;

    // 获取当前期间数据
    const currentData = await sequelize.query(hourlyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    });

    // 获取对比期间数据
    const compareData = await sequelize.query(hourlyQuery, {
      type: QueryTypes.SELECT,
      replacements: { 
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    });

    // 处理小时级对比数据
    const hourlyComparison = calculateHourlyComparison(currentData, compareData);
    const summary = calculateHourlySummary(hourlyComparison);

    res.json({
      success: true,
      data: {
        currentPeriod,
        comparePeriod,
        hourlyComparison,
        summary
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

// ==================== 辅助函数 ====================


/**
 * 计算城市对比数据
 */
function calculateCityComparison(currentData: any[], compareData: any[]) {
  const cityMap = new Map();
  
  // 处理当前期间数据
  currentData.forEach(city => {
    cityMap.set(city.city, {
      city: city.city,
      current: {
        storeCount: parseInt(city.store_count),
        totalSales: parseFloat(city.total_sales),
        totalOrders: parseInt(city.total_orders),
        totalCustomers: parseInt(city.total_customers),
        avgOrderValue: parseFloat(city.avg_order_value),
        salesPerStore: parseFloat(city.sales_per_store)
      }
    });
  });
  
  // 处理对比期间数据
  compareData.forEach(city => {
    const existing = cityMap.get(city.city) || { city: city.city, current: {} };
    cityMap.set(city.city, {
      ...existing,
      compare: {
        storeCount: parseInt(city.store_count),
        totalSales: parseFloat(city.total_sales),
        totalOrders: parseInt(city.total_orders),
        totalCustomers: parseInt(city.total_customers),
        avgOrderValue: parseFloat(city.avg_order_value),
        salesPerStore: parseFloat(city.sales_per_store)
      }
    });
  });
  
  // 计算对比结果
  const result = Array.from(cityMap.values()).map(city => {
    const current = city.current || {};
    const compare = city.compare || {};
    
    const salesChange = (current.totalSales || 0) - (compare.totalSales || 0);
    const salesChangePercent = compare.totalSales > 0 ? (salesChange / compare.totalSales) * 100 : 0;
    
    const ordersChange = (current.totalOrders || 0) - (compare.totalOrders || 0);
    const ordersChangePercent = compare.totalOrders > 0 ? (ordersChange / compare.totalOrders) * 100 : 0;
    
    return {
      ...city,
      comparison: {
        salesChange,
        salesChangePercent,
        ordersChange,
        ordersChangePercent,
        trend: salesChangePercent > 5 ? 'up' : salesChangePercent < -5 ? 'down' : 'stable'
      }
    };
  });
  
  return result.sort((a, b) => (b.current?.totalSales || 0) - (a.current?.totalSales || 0));
}

/**
 * 计算门店对比数据
 */
function calculateStoreComparison(currentData: any[], compareData: any[]) {
  const storeMap = new Map();
  
  // 处理当前期间数据
  currentData.forEach(store => {
    const totalSales = parseFloat(store.total_sales || 0);
    const totalOrders = parseInt(store.total_orders || 0);
    
    storeMap.set(store.store_id, {
      storeId: store.store_id,
      storeName: store.store_name,
      city: store.city,
      district: store.district,
      storeArea: 0, // 暂时设为0，因为查询中没有这个字段
      staffCount: 0, // 暂时设为0，因为查询中没有这个字段
      current: {
        totalSales: totalSales,
        totalOrders: totalOrders,
        totalCustomers: parseInt(store.total_customers || 0),
        avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        salesPerSqm: 0, // 暂时设为0，因为没有面积数据
        salesPerStaff: 0 // 暂时设为0，因为没有员工数据
      }
    });
  });
  
  // 处理对比期间数据
  compareData.forEach(store => {
    const existing = storeMap.get(store.store_id) || { 
      storeId: store.store_id, 
      storeName: store.store_name,
      city: store.city,
      district: store.district,
      storeArea: 0,
      staffCount: 0,
      current: {} 
    };
    
    const totalSales = parseFloat(store.total_sales || 0);
    const totalOrders = parseInt(store.total_orders || 0);
    
    storeMap.set(store.store_id, {
      ...existing,
      compare: {
        totalSales: totalSales,
        totalOrders: totalOrders,
        totalCustomers: parseInt(store.total_customers || 0),
        avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        salesPerSqm: 0, // 暂时设为0，因为没有面积数据
        salesPerStaff: 0 // 暂时设为0，因为没有员工数据
      }
    });
  });
  
  // 计算对比结果
  const result = Array.from(storeMap.values()).map(store => {
    const current = store.current || {};
    const compare = store.compare || {};
    
    const salesChange = (current.totalSales || 0) - (compare.totalSales || 0);
    const salesChangePercent = compare.totalSales > 0 ? (salesChange / compare.totalSales) * 100 : 0;
    
    const efficiencyChange = (current.salesPerSqm || 0) - (compare.salesPerSqm || 0);
    const efficiencyChangePercent = compare.salesPerSqm > 0 ? (efficiencyChange / compare.salesPerSqm) * 100 : 0;
    
    return {
      ...store,
      comparison: {
        salesChange,
        salesChangePercent,
        efficiencyChange,
        efficiencyChangePercent,
        trend: salesChangePercent > 5 ? 'up' : salesChangePercent < -5 ? 'down' : 'stable'
      }
    };
  });
  
  return result.sort((a, b) => (b.current?.totalSales || 0) - (a.current?.totalSales || 0));
}

/**
 * 计算商品对比数据
 */
function calculateProductComparison(currentData: any[], compareData: any[]) {
  const productMap = new Map();
  
  // 处理当前期间数据
  currentData.forEach(product => {
    const totalSales = parseFloat(product.total_sales || 0);
    const totalQuantity = parseInt(product.total_quantity || 0);
    
    productMap.set(product.product_name, {
      productName: product.product_name,
      productCategory: product.product_category,
      current: {
        storeCount: parseInt(product.store_count || 0),
        totalSales: totalSales,
        totalQuantity: totalQuantity,
        avgUnitPrice: totalQuantity > 0 ? totalSales / totalQuantity : 0,
        orderCount: parseInt(product.order_count || 0),
        customerCount: parseInt(product.customer_count || 0)
      }
    });
  });
  
  // 处理对比期间数据
  compareData.forEach(product => {
    const existing = productMap.get(product.product_name) || { 
      productName: product.product_name,
      productCategory: product.product_category,
      current: {} 
    };
    productMap.set(product.product_name, {
      ...existing,
      compare: {
        storeCount: parseInt(product.store_count),
        totalSales: parseFloat(product.total_sales),
        totalQuantity: parseInt(product.total_quantity),
        avgUnitPrice: product.total_quantity > 0 ? parseFloat(product.total_sales) / parseInt(product.total_quantity) : 0,
        orderCount: parseInt(product.order_count),
        customerCount: 0  // 暂时设为0，因为SQL查询中没有这个字段
      }
    });
  });
  
  // 计算对比结果
  const result = Array.from(productMap.values()).map(product => {
    const current = product.current || {};
    const compare = product.compare || {};
    
    const salesChange = (current.totalSales || 0) - (compare.totalSales || 0);
    const salesChangePercent = compare.totalSales > 0 ? (salesChange / compare.totalSales) * 100 : 0;
    
    const quantityChange = (current.totalQuantity || 0) - (compare.totalQuantity || 0);
    const quantityChangePercent = compare.totalQuantity > 0 ? (quantityChange / compare.totalQuantity) * 100 : 0;
    
    return {
      ...product,
      comparison: {
        salesChange,
        salesChangePercent,
        quantityChange,
        quantityChangePercent,
        trend: salesChangePercent > 5 ? 'up' : salesChangePercent < -5 ? 'down' : 'stable'
      }
    };
  });
  
  return result.sort((a, b) => (b.current?.totalSales || 0) - (a.current?.totalSales || 0));
}

/**
 * 计算运营效率对比数据
 */
function calculateEfficiencyComparison(currentData: any[], compareData: any[]) {
  const storeMap = new Map();
  
  // 处理当前期间数据
  currentData.forEach(store => {
    storeMap.set(store.store_id, {
      storeId: store.store_id,
      storeName: store.store_name,
      city: store.city,
      storeArea: parseFloat(store.store_area || 0),
      staffCount: parseInt(store.staff_count || 0),
      rentCost: parseFloat(store.rent_cost || 0),
      current: {
        totalSales: parseFloat(store.total_sales),
        totalOrders: parseInt(store.total_orders),
        totalCustomers: 0,  // SQL查询中没有这个字段
        salesPerSqm: store.store_area > 0 ? parseFloat(store.total_sales) / parseFloat(store.store_area) : 0,
        salesPerStaff: store.staff_count > 0 ? parseFloat(store.total_sales) / parseInt(store.staff_count) : 0,
        avgOrderValue: store.total_orders > 0 ? parseFloat(store.total_sales) / parseInt(store.total_orders) : 0,
        dailyOrders: 0,  // SQL查询中没有这个字段
        rentReturnRate: 0  // SQL查询中没有这个字段
      }
    });
  });
  
  // 处理对比期间数据
  compareData.forEach(store => {
    const existing = storeMap.get(store.store_id) || { 
      storeId: store.store_id, 
      storeName: store.store_name,
      city: store.city,
      storeArea: parseFloat(store.store_area || 0),
      staffCount: parseInt(store.staff_count || 0),
      rentCost: parseFloat(store.rent_cost || 0),
      current: {} 
    };
    storeMap.set(store.store_id, {
      ...existing,
      compare: {
        totalSales: parseFloat(store.total_sales),
        totalOrders: parseInt(store.total_orders),
        totalCustomers: 0,  // SQL查询中没有这个字段
        salesPerSqm: store.store_area > 0 ? parseFloat(store.total_sales) / parseFloat(store.store_area) : 0,
        salesPerStaff: store.staff_count > 0 ? parseFloat(store.total_sales) / parseInt(store.staff_count) : 0,
        avgOrderValue: store.total_orders > 0 ? parseFloat(store.total_sales) / parseInt(store.total_orders) : 0,
        dailyOrders: 0,  // SQL查询中没有这个字段
        rentReturnRate: 0  // SQL查询中没有这个字段
      }
    });
  });
  
  // 计算对比结果
  const result = Array.from(storeMap.values()).map(store => {
    const current = store.current || {};
    const compare = store.compare || {};
    
    const salesChange = (current.totalSales || 0) - (compare.totalSales || 0);
    const salesChangePercent = compare.totalSales > 0 ? (salesChange / compare.totalSales) * 100 : 0;
    
    const efficiencyChange = (current.salesPerSqm || 0) - (compare.salesPerSqm || 0);
    const efficiencyChangePercent = compare.salesPerSqm > 0 ? (efficiencyChange / compare.salesPerSqm) * 100 : 0;
    
    return {
      ...store,
      comparison: {
        salesChange,
        salesChangePercent,
        efficiencyChange,
        efficiencyChangePercent,
        trend: salesChangePercent > 5 ? 'up' : salesChangePercent < -5 ? 'down' : 'stable'
      }
    };
  });
  
  return result.sort((a, b) => (b.current?.salesPerSqm || 0) - (a.current?.salesPerSqm || 0));
}


// 汇总计算函数
function calculateCitySummary(cityComparison: any[]) {
  const totalSales = cityComparison.reduce((sum, city) => sum + (city.current?.totalSales || 0), 0);
  const totalOrders = cityComparison.reduce((sum, city) => sum + (city.current?.totalOrders || 0), 0);
  const avgSalesChange = cityComparison.reduce((sum, city) => sum + (city.comparison?.salesChangePercent || 0), 0) / cityComparison.length;
  
  return {
    totalCities: cityComparison.length,
    totalSales,
    totalOrders,
    avgSalesChange,
    topCity: cityComparison[0],
    bottomCity: cityComparison[cityComparison.length - 1]
  };
}

function calculateStoreSummary(storeComparison: any[]) {
  const totalSales = storeComparison.reduce((sum, store) => sum + (store.current?.totalSales || 0), 0);
  const totalStores = storeComparison.length;
  const avgSalesPerStore = totalSales / totalStores;
  const avgEfficiencyChange = storeComparison.reduce((sum, store) => sum + (store.comparison?.efficiencyChangePercent || 0), 0) / totalStores;
  
  return {
    totalStores,
    totalSales,
    avgSalesPerStore,
    avgEfficiencyChange,
    topStore: storeComparison[0],
    bottomStore: storeComparison[storeComparison.length - 1]
  };
}

function calculateProductSummary(productComparison: any[]) {
  const totalSales = productComparison.reduce((sum, product) => sum + (product.current?.totalSales || 0), 0);
  const totalProducts = productComparison.length;
  const avgSalesChange = productComparison.reduce((sum, product) => sum + (product.comparison?.salesChangePercent || 0), 0) / totalProducts;
  
  return {
    totalProducts,
    totalSales,
    avgSalesChange,
    topProduct: productComparison[0],
    bottomProduct: productComparison[productComparison.length - 1]
  };
}

function calculateEfficiencySummary(efficiencyComparison: any[]) {
  const totalStores = efficiencyComparison.length;
  const avgSalesPerSqm = efficiencyComparison.reduce((sum, store) => sum + (store.current?.salesPerSqm || 0), 0) / totalStores;
  const avgEfficiencyChange = efficiencyComparison.reduce((sum, store) => sum + (store.comparison?.efficiencyChangePercent || 0), 0) / totalStores;
  
  return {
    totalStores,
    avgSalesPerSqm,
    avgEfficiencyChange,
    topEfficiencyStore: efficiencyComparison[0],
    bottomEfficiencyStore: efficiencyComparison[efficiencyComparison.length - 1]
  };
}

// ==================== 多维度对比分析API ====================

// 测试API - 逐步调试概览功能
router.get('/overview-test', async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      compareType = 'previous'
    } = req.query;

    // 计算对比时间段
    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string,
      endDate as string, 
      compareType as string
    );

    // 只测试城市数据
    const cityData = await getCityComparisonData(currentPeriod, comparePeriod);

    res.json({
      success: true,
      data: {
        currentPeriod,
        comparePeriod,
        cityData,
        message: "测试模式：只返回城市数据"
      }
    });

  } catch (error) {
    console.error('测试概览API失败:', error);
    res.status(500).json({
      success: false,
      error: '测试概览API失败',
      details: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * 获取多维度对比数据概览
 * 支持：城市对比、门店对比、商品对比、时间对比
 * GET /api/sales-comparison/overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      compareType = 'previous',
      dimensions = ['city', 'store', 'product'],
      timeRange = 'week'
    } = req.query;

    // 计算对比时间段
    const { currentPeriod, comparePeriod } = calculateComparePeriods(
      startDate as string,
      endDate as string, 
      compareType as string
    );

    // 并行获取各维度数据
    const [cityData, storeData, productData, timeData] = await Promise.all([
      getCityComparisonData(currentPeriod, comparePeriod),
      getStoreComparisonData(currentPeriod, comparePeriod),
      getProductComparisonData(currentPeriod, comparePeriod),
      getTimeComparisonData(currentPeriod, comparePeriod, timeRange as string)
    ]);

    res.json({
      success: true,
      data: {
        periods: {
          current: currentPeriod,
          compare: comparePeriod
        },
        dimensions: {
          city: cityData,
          store: storeData,
          product: productData,
          time: timeData
        },
        summary: {
          totalCities: cityData.length,
          totalStores: storeData.length,
          totalProducts: productData.length,
          avgGrowthRate: calculateAvgGrowthRate(cityData, storeData, productData)
        }
      }
    });

  } catch (error) {
    console.error('获取多维度对比数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取多维度对比数据失败',
      details: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * 城市维度对比分析
 */
async function getCityComparisonData(currentPeriod: any, comparePeriod: any) {
  const query = `
    SELECT 
      s.city,
      COUNT(DISTINCT s.id) as store_count,
      SUM(ISNULL(o.total_amount, 0)) as total_sales,
      COUNT(o.id) as total_orders,
      COUNT(DISTINCT o.customer_id) as total_customers,
      CASE 
        WHEN COUNT(o.id) > 0 THEN SUM(ISNULL(o.total_amount, 0)) / COUNT(o.id)
        ELSE 0 
      END as avg_order_value,
      SUM(ISNULL(oi.quantity, 0)) as total_quantity
    FROM stores s
    LEFT JOIN orders o ON s.id = o.store_id 
      AND o.delflag = 0
      AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE s.delflag = 0
    GROUP BY s.city
    ORDER BY total_sales DESC
  `;

  const [currentData, compareData] = await Promise.all([
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    }),
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    })
  ]);

  return calculateComparisonMetrics(currentData, compareData, 'city');
}

/**
 * 门店维度对比分析
 */
async function getStoreComparisonData(currentPeriod: any, comparePeriod: any) {
  const query = `
    SELECT 
      s.id as store_id,
      s.store_name,
      s.city,
      s.district,
      COUNT(DISTINCT s.id) as store_count,
      SUM(ISNULL(o.total_amount, 0)) as total_sales,
      COUNT(o.id) as total_orders,
      COUNT(DISTINCT o.customer_id) as total_customers
    FROM stores s
    LEFT JOIN orders o ON s.id = o.store_id 
      AND o.delflag = 0
      AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
    WHERE s.delflag = 0
    GROUP BY s.id, s.store_name, s.city, s.district
    ORDER BY total_sales DESC
  `;

  const [currentData, compareData] = await Promise.all([
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    }),
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    })
  ]);

  return calculateComparisonMetrics(currentData, compareData, 'store');
}

/**
 * 商品维度对比分析
 */
async function getProductComparisonData(currentPeriod: any, comparePeriod: any) {
  const query = `
    SELECT 
      oi.product_name,
      oi.product_category,
      COUNT(DISTINCT o.store_id) as store_count,
      SUM(ISNULL(oi.total_price, 0)) as total_sales,
      SUM(ISNULL(oi.quantity, 0)) as total_quantity,
      COUNT(DISTINCT o.id) as order_count,
      COUNT(DISTINCT o.customer_id) as customer_count
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    WHERE o.delflag = 0
      AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
    GROUP BY oi.product_name, oi.product_category
    ORDER BY total_sales DESC
  `;

  const [currentData, compareData] = await Promise.all([
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    }),
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    })
  ]);

  return calculateComparisonMetrics(currentData, compareData, 'product');
}

/**
 * 时间维度对比分析（支持历史对比和未来预测）
 */
async function getTimeComparisonData(currentPeriod: any, comparePeriod: any, timeRange: string) {
  const timeGroupBy = timeRange === 'day' ? 'CAST(o.created_at AS DATE)' : 
                     timeRange === 'week' ? 'DATEPART(week, o.created_at)' :
                     'DATEPART(month, o.created_at)';

  const query = `
    SELECT 
      ${timeGroupBy} as time_period,
      SUM(ISNULL(o.total_amount, 0)) as total_sales,
      COUNT(o.id) as total_orders,
      COUNT(DISTINCT o.store_id) as active_stores,
      COUNT(DISTINCT o.customer_id) as unique_customers
    FROM orders o
    WHERE o.delflag = 0
      AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
    GROUP BY ${timeGroupBy}
    ORDER BY time_period
  `;

  const [currentData, compareData] = await Promise.all([
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate
      }
    }),
    sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: comparePeriod.startDate,
        endDate: comparePeriod.endDate
      }
    })
  ]);

  return calculateTimeComparisonMetrics(currentData, compareData, timeRange);
}

/**
 * 计算对比指标
 */
function calculateComparisonMetrics(currentData: any[], compareData: any[], dimension: string) {
  const keyField = dimension === 'city' ? 'city' : 
                  dimension === 'store' ? 'store_id' : 'product_name';
  
  const compareMap = new Map();
  compareData.forEach((item: any) => {
    compareMap.set(item[keyField], item);
  });

  return currentData.map((current: any) => {
    const compare = compareMap.get(current[keyField]) || {};
    
    return {
      ...current,
      comparison: {
        salesChange: calculateChange(current.total_sales, compare.total_sales),
        ordersChange: calculateChange(current.total_orders, compare.total_orders),
        customersChange: calculateChange(current.total_customers, compare.total_customers),
        avgOrderValueChange: calculateChange(current.avg_order_value, compare.avg_order_value),
        trend: getTrend(current.total_sales, compare.total_sales)
      }
    };
  });
}

/**
 * 计算时间对比指标
 */
function calculateTimeComparisonMetrics(currentData: any[], compareData: any[], timeRange: string) {
  const compareMap = new Map();
  compareData.forEach((item: any) => {
    compareMap.set(item.time_period, item);
  });

  return currentData.map((current: any) => {
    const compare = compareMap.get(current.time_period) || {};
    
    return {
      ...current,
      comparison: {
        salesChange: calculateChange(current.total_sales, compare.total_sales),
        ordersChange: calculateChange(current.total_orders, compare.total_orders),
        storesChange: calculateChange(current.active_stores, compare.active_stores),
        customersChange: calculateChange(current.unique_customers, compare.unique_customers),
        trend: getTrend(current.total_sales, compare.total_sales)
      }
    };
  });
}

/**
 * 计算变化百分比
 */
function calculateChange(current: number, compare: number): number {
  const currentVal = current || 0;
  const compareVal = compare || 0;
  
  if (compareVal === 0) return currentVal > 0 ? 100 : 0;
  return ((currentVal - compareVal) / compareVal) * 100;
}

/**
 * 获取趋势
 */
function getTrend(current: number, compare: number): 'up' | 'down' | 'stable' {
  const change = calculateChange(current, compare);
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

/**
 * 计算平均增长率
 */
function calculateAvgGrowthRate(cityData: any[], storeData: any[], productData: any[]): number {
  const allChanges = [
    ...cityData.map(item => item.comparison?.salesChange || 0),
    ...storeData.map(item => item.comparison?.salesChange || 0),
    ...productData.map(item => item.comparison?.salesChange || 0)
  ].filter(change => !isNaN(change));
  
  return allChanges.length > 0 ? 
    allChanges.reduce((sum, change) => sum + change, 0) / allChanges.length : 0;
}

/**
 * 计算对比时间段
 */
function calculateComparePeriods(startDate: string, endDate: string, compareType: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();
  
  let compareStart: Date;
  let compareEnd: Date;
  
  switch (compareType) {
    case 'previous':
      compareEnd = new Date(start.getTime() - 1);
      compareStart = new Date(compareEnd.getTime() - duration);
      break;
    case 'same_period_last_year':
      compareStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate());
      compareEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
      break;
    case 'same_period_last_month':
      compareStart = new Date(start.getFullYear(), start.getMonth() - 1, start.getDate());
      compareEnd = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
      break;
    default:
      compareEnd = new Date(start.getTime() - 1);
      compareStart = new Date(compareEnd.getTime() - duration);
  }
  
  return {
    currentPeriod: {
      startDate: startDate,
      endDate: endDate,
      type: 'current'
    },
    comparePeriod: {
      startDate: compareStart.toISOString().split('T')[0],
      endDate: compareEnd.toISOString().split('T')[0],
      type: compareType
    }
  };
}

/**
 * 计算小时级对比数据
 */
function calculateHourlyComparison(currentData: any[], compareData: any[]) {
  const hourlyMap = new Map();
  
  // 处理当前期间数据
  currentData.forEach(item => {
    const hour = item.hour;
    const storeId = item.store_id;
    const key = `${hour}_${storeId}`;
    
    if (!hourlyMap.has(key)) {
      hourlyMap.set(key, {
        hour: hour,
        storeId: storeId,
        storeName: item.store_name,
        city: item.city,
        current: {
          totalSales: 0,
          totalOrders: 0,
          uniqueCustomers: 0
        },
        compare: {
          totalSales: 0,
          totalOrders: 0,
          uniqueCustomers: 0
        }
      });
    }
    
    const existing = hourlyMap.get(key);
    existing.current = {
      totalSales: parseFloat(item.total_sales || 0),
      totalOrders: parseInt(item.total_orders || 0),
      uniqueCustomers: parseInt(item.unique_customers || 0)
    };
  });
  
  // 处理对比期间数据
  compareData.forEach(item => {
    const hour = item.hour;
    const storeId = item.store_id;
    const key = `${hour}_${storeId}`;
    
    if (!hourlyMap.has(key)) {
      hourlyMap.set(key, {
        hour: hour,
        storeId: storeId,
        storeName: item.store_name,
        city: item.city,
        current: {
          totalSales: 0,
          totalOrders: 0,
          uniqueCustomers: 0
        },
        compare: {
          totalSales: 0,
          totalOrders: 0,
          uniqueCustomers: 0
        }
      });
    }
    
    const existing = hourlyMap.get(key);
    existing.compare = {
      totalSales: parseFloat(item.total_sales || 0),
      totalOrders: parseInt(item.total_orders || 0),
      uniqueCustomers: parseInt(item.unique_customers || 0)
    };
  });
  
  // 计算对比结果
  const result = Array.from(hourlyMap.values()).map(item => {
    const current = item.current;
    const compare = item.compare;
    
    return {
      hour: item.hour,
      storeId: item.storeId,
      storeName: item.storeName,
      city: item.city,
      current: current,
      compare: compare,
      comparison: {
        salesChange: calculateChange(current.totalSales, compare.totalSales),
        salesChangePercent: calculateChange(current.totalSales, compare.totalSales),
        ordersChange: calculateChange(current.totalOrders, compare.totalOrders),
        ordersChangePercent: calculateChange(current.totalOrders, compare.totalOrders),
        customersChange: calculateChange(current.uniqueCustomers, compare.uniqueCustomers),
        customersChangePercent: calculateChange(current.uniqueCustomers, compare.uniqueCustomers),
        trend: getTrend(current.totalSales, compare.totalSales)
      }
    };
  });
  
  return result.sort((a, b) => a.hour - b.hour || (b.current?.totalSales || 0) - (a.current?.totalSales || 0));
}

/**
 * 计算小时级对比汇总
 */
function calculateHourlySummary(hourlyComparison: any[]) {
  const hourlyStats = new Map();
  
  // 按小时汇总数据
  hourlyComparison.forEach(item => {
    const hour = item.hour;
    if (!hourlyStats.has(hour)) {
      hourlyStats.set(hour, {
        hour: hour,
        current: { totalSales: 0, totalOrders: 0, uniqueCustomers: 0 },
        compare: { totalSales: 0, totalOrders: 0, uniqueCustomers: 0 }
      });
    }
    
    const stats = hourlyStats.get(hour);
    stats.current.totalSales += item.current.totalSales;
    stats.current.totalOrders += item.current.totalOrders;
    stats.current.uniqueCustomers += item.current.uniqueCustomers;
    stats.compare.totalSales += item.compare.totalSales;
    stats.compare.totalOrders += item.compare.totalOrders;
    stats.compare.uniqueCustomers += item.compare.uniqueCustomers;
  });
  
  const hourlySummary = Array.from(hourlyStats.values()).map(stats => ({
    ...stats,
    comparison: {
      salesChange: calculateChange(stats.current.totalSales, stats.compare.totalSales),
      salesChangePercent: calculateChange(stats.current.totalSales, stats.compare.totalSales),
      ordersChange: calculateChange(stats.current.totalOrders, stats.compare.totalOrders),
      ordersChangePercent: calculateChange(stats.current.totalOrders, stats.compare.totalOrders),
      customersChange: calculateChange(stats.current.uniqueCustomers, stats.compare.uniqueCustomers),
      customersChangePercent: calculateChange(stats.current.uniqueCustomers, stats.compare.uniqueCustomers),
      trend: getTrend(stats.current.totalSales, stats.compare.totalSales)
    }
  }));
  
  // 找出最佳和最差时段
  const bestHour = hourlySummary.reduce((best, current) => 
    current.current.totalSales > best.current.totalSales ? current : best
  );
  const worstHour = hourlySummary.reduce((worst, current) => 
    current.current.totalSales < worst.current.totalSales ? current : worst
  );
  
  return {
    hourlySummary: hourlySummary.sort((a, b) => a.hour - b.hour),
    bestHour,
    worstHour,
    totalHours: hourlySummary.length,
    avgSalesPerHour: hourlySummary.reduce((sum, h) => sum + h.current.totalSales, 0) / hourlySummary.length,
    peakHours: hourlySummary
      .filter(h => h.current.totalSales > 0)
      .sort((a, b) => b.current.totalSales - a.current.totalSales)
      .slice(0, 3)
  };
}

export default router;
