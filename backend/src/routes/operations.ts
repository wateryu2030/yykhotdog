import { Router, Request, Response } from 'express';
import { sequelize, cyrg2025Sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();

// 获取门店列表 - 优化版本
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const { province, city, district, status, page = 1, limit = 20 } = req.query;
    
    let whereClause = 'WHERE s.delflag = 0';
    const params: any = {};
    
    if (province) {
      whereClause += ' AND s.province = :province';
      params.province = province;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (district) {
      whereClause += ' AND s.district = :district';
      params.district = district;
    }
    if (status) {
      whereClause += ' AND s.status = :status';
      params.status = status;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // 包含统计数据的查询
    const query = `
      SELECT 
        s.id,
        s.store_code,
        s.store_name,
        s.store_type,
        s.status,
        s.province,
        s.city,
        s.district,
        s.address,
        s.longitude,
        s.latitude,
        s.area_size,
        s.rent_amount,
        s.investment_amount,
        s.expected_revenue,
        s.director,
        s.director_phone,
        s.morning_time,
        s.night_time,
        s.passenger_flow,
        s.is_self,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT CASE WHEN o.pay_state = 2 THEN o.id END) as total_orders,
        COUNT(DISTINCT CASE WHEN o.pay_state = 2 THEN o.customer_id END) as total_customers,
        SUM(CASE WHEN o.pay_state = 2 THEN o.total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN o.pay_state = 2 THEN o.total_amount END) as avg_order_value
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
      ${whereClause}
      GROUP BY s.id, s.store_code, s.store_name, s.store_type, s.status,
               s.province, s.city, s.district, s.address, s.longitude, s.latitude,
               s.area_size, s.rent_amount, s.investment_amount, s.expected_revenue,
               s.director, s.director_phone, s.morning_time, s.night_time,
               s.passenger_flow, s.is_self, s.created_at, s.updated_at
      ORDER BY total_revenue DESC
      OFFSET :offset ROWS
      FETCH NEXT :limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM stores s
      ${whereClause}
    `;

    const stores = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: { ...params, offset, limit: parseInt(limit as string) }
    });

    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    const total = (countResult[0] as any).total;

    res.json({
      success: true,
      data: stores,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
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

// 获取门店详情
router.get('/stores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        s.id,
        s.store_code,
        s.store_name,
        s.store_type,
        s.status,
        s.province,
        s.city,
        s.district,
        s.address,
        s.longitude,
        s.latitude,
        s.area_size,
        s.rent_amount,
        s.investment_amount,
        s.expected_revenue,
        s.director,
        s.director_phone,
        s.morning_time,
        s.night_time,
        s.passenger_flow,
        s.is_self,
        s.created_at,
        s.updated_at,
        s.delflag,
        COUNT(DISTINCT CASE WHEN o.pay_state = 2 THEN o.id END) as total_orders,
        COUNT(DISTINCT CASE WHEN o.pay_state = 2 THEN o.customer_id END) as total_customers,
        SUM(CASE WHEN o.pay_state = 2 THEN o.total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN o.pay_state = 2 THEN o.total_amount END) as avg_order_value,
        MIN(CASE WHEN o.pay_state = 2 THEN o.created_at END) as first_order_date,
        MAX(CASE WHEN o.pay_state = 2 THEN o.created_at END) as last_order_date,
        CASE 
          WHEN MIN(CASE WHEN o.pay_state = 2 THEN o.created_at END) IS NOT NULL 
          THEN DATEDIFF(day, MIN(CASE WHEN o.pay_state = 2 THEN o.created_at END), 
                        COALESCE(MAX(CASE WHEN o.pay_state = 2 THEN o.created_at END), GETDATE())) + 1
          ELSE 0
        END as operating_days,
        COUNT(DISTINCT CASE WHEN o.pay_state = 2 AND CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN o.id END) as recent_orders_30d,
        SUM(CASE WHEN o.pay_state = 2 AND CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN o.total_amount ELSE 0 END) as recent_revenue_30d,
        COUNT(DISTINCT CASE WHEN o.pay_state = 2 AND CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN o.id END) as recent_orders_7d,
        SUM(CASE WHEN o.pay_state = 2 AND CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN o.total_amount ELSE 0 END) as recent_revenue_7d
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
      WHERE s.id = :id AND s.delflag = 0
      GROUP BY s.id, s.store_code, s.store_name, s.store_type, s.status,
               s.province, s.city, s.district, s.address, s.longitude, s.latitude,
               s.area_size, s.rent_amount, s.investment_amount, s.expected_revenue,
               s.director, s.director_phone, s.morning_time, s.night_time,
               s.passenger_flow, s.is_self, s.created_at, s.updated_at, s.delflag
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: { id: parseInt(id) }
    });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('获取门店详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店详情失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取单个订单详情 (必须在 /orders/:storeId 之前)
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const orderQuery = `
      SELECT 
        o.*
      FROM orders o
      WHERE o.id = :orderId AND o.delflag = 0
    `;
    
    const result = await sequelize.query(orderQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId: id }
    });
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单详情失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取门店订单明细 (按storeId)
router.get('/orders/store/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20, startDate, endDate, timeType = 'today' } = req.query;
    
    let dateCondition = '';
    const params: any = { storeId: parseInt(storeId) };
    
    if (startDate && endDate) {
      dateCondition = 'AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (timeType === 'today') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(GETDATE() AS DATE)';
    } else if (timeType === 'yesterday') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(DATEADD(day, -1, GETDATE()) AS DATE)';
    }
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const query = `
      SELECT 
        o.id,
        o.order_no as order_code,
        o.total_amount,
        o.pay_mode as payment_method,
        o.pay_state,
        o.customer_id,
        o.created_at
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
      ORDER BY o.created_at DESC
      OFFSET :offset ROWS
      FETCH NEXT :limit ROWS ONLY
    `;
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
    `;
    
    const orders = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: { ...params, offset, limit: parseInt(limit as string) }
    });
    
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const total = (countResult[0] as any).total;

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('获取门店订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店订单列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取门店订单明细 (按storeId - 兼容性路由)
router.get('/stores/:id/orders', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建日期过滤条件
    let dateCondition = '';
    const params: any = { 
      storeId: parseInt(id),
      offset,
      limit: parseInt(limit as string)
    };
    
    if (startDate && endDate) {
      dateCondition = 'AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    // 获取订单列表
    const query = `
      SELECT 
        o.id,
        o.order_no,
        o.total_amount,
        o.pay_mode,
        o.pay_state,
        o.customer_id,
        o.created_at
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
      ORDER BY o.created_at DESC
      OFFSET :offset ROWS
      FETCH NEXT :limit ROWS ONLY
    `;
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
    `;
    
    const orders = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const total = (countResult[0] as any).total;
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('获取门店订单明细失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店订单明细失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取门店客户明细
router.get('/stores/:id/customers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建日期过滤条件
    let dateCondition = '';
    const params: any = { 
      storeId: parseInt(id),
      offset,
      limit: parseInt(limit as string)
    };
    
    if (startDate && endDate) {
      dateCondition = 'AND o.created_at BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    // 获取门店客户数据
    const query = `
      SELECT 
        o.customer_id,
        c.customer_name,
        c.phone,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MIN(o.created_at) as first_order_date,
        MAX(o.created_at) as last_order_date,
        CASE 
          WHEN SUM(o.total_amount) >= 1000 AND COUNT(*) >= 10 THEN N'核心客户'
          WHEN SUM(o.total_amount) >= 500 AND COUNT(*) >= 5 THEN N'活跃客户'
          WHEN SUM(o.total_amount) >= 100 AND COUNT(*) >= 2 THEN N'机会客户'
          ELSE N'沉睡/新客户'
        END as segment_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
      GROUP BY o.customer_id, c.customer_name, c.phone
      ORDER BY total_spent DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT o.customer_id) as total
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
    `;
    
    const customers = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const total = (countResult[0] as any).total;
    
    res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('获取门店客户明细失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店客户明细失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取订单详情 (带门店信息)
router.get('/orders/detail/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const orderQuery = `
      SELECT 
        o.*,
        s.store_name,
        s.city,
        s.district
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = :orderId AND o.delflag = 0
    `;
    
    const result = await sequelize.query(orderQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId: id }
    });
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单详情失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取订单完整详情 (包含商品信息)
router.get('/orders/full-detail/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取订单基本信息
    const orderQuery = `
      SELECT 
        o.*,
        s.store_name,
        s.city,
        s.district
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = :orderId AND o.delflag = 0
    `;
    
    // 获取订单商品明细
    const itemsQuery = `
      SELECT 
        oi.id,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.price,
        oi.total_price,
        oi.created_at
      FROM order_items oi
      WHERE oi.order_id = :orderId AND oi.delflag = 0
      ORDER BY oi.id
    `;
    
    const orderResult = await sequelize.query(orderQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId: id }
    });
    
    const itemsResult = await sequelize.query(itemsQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId: id }
    });
    
    if (orderResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        order: orderResult[0],
        items: itemsResult
      }
    });
  } catch (error) {
    console.error('获取订单完整详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单完整详情失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取订单商品明细
router.get('/orders/:id/items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const itemsQuery = `
      SELECT 
        oi.id,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.price,
        oi.total_price,
        oi.created_at
      FROM order_items oi
      WHERE oi.order_id = :orderId AND oi.delflag = 0
      ORDER BY oi.id
    `;
    
    const result = await sequelize.query(itemsQuery, {
      type: QueryTypes.SELECT,
      replacements: { orderId: id }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取订单商品明细失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单商品明细失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 添加门店
router.post('/stores', async (req: Request, res: Response) => {
  try {
    const {
      store_code,
      store_name,
      store_type,
      status,
      province,
      city,
      district,
      address,
      longitude,
      latitude,
      area_size,
      rent_amount,
      investment_amount,
      expected_revenue,
      director,
      director_phone,
      morning_time,
      night_time,
      passenger_flow,
      establish_time,
      opening_time,
      is_self,
      is_close
    } = req.body;

    const insertQuery = `
      INSERT INTO stores (
        store_code, store_name, store_type, status, province, city, district,
        address, longitude, latitude, area_size, rent_amount, investment_amount,
        expected_revenue, director, director_phone, morning_time, night_time,
        passenger_flow, establish_time, opening_time, is_self, is_close
      ) VALUES (
        :store_code, :store_name, :store_type, :status, :province, :city, :district,
        :address, :longitude, :latitude, :area_size, :rent_amount, :investment_amount,
        :expected_revenue, :director, :director_phone, :morning_time, :night_time,
        :passenger_flow, :establish_time, :opening_time, :is_self, :is_close
      )
    `;

    await sequelize.query(insertQuery, {
      type: QueryTypes.INSERT,
      replacements: {
        store_code,
        store_name,
        store_type,
        status,
        province,
        city,
        district,
        address,
        longitude,
        latitude,
        area_size,
        rent_amount,
        investment_amount,
        expected_revenue,
        director,
        director_phone,
        morning_time,
        night_time,
        passenger_flow,
        establish_time,
        opening_time,
        is_self,
        is_close
      }
    });

    res.json({
      success: true,
      message: '门店添加成功'
    });
  } catch (error) {
    console.error('添加门店失败:', error);
    res.status(500).json({
      success: false,
      error: '添加门店失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 更新门店
router.put('/stores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updateFields = Object.keys(updateData)
      .filter(key => updateData[key] !== undefined)
      .map(key => `${key} = :${key}`)
      .join(', ');

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有要更新的字段'
      });
    }

    const updateQuery = `
      UPDATE stores 
      SET ${updateFields}, updated_at = GETDATE()
      WHERE id = :id AND delflag = 0
    `;

    const result = await sequelize.query(updateQuery, {
      type: QueryTypes.UPDATE,
      replacements: { ...updateData, id: parseInt(id) }
    });

    res.json({
      success: true,
      message: '门店更新成功'
    });
  } catch (error) {
    console.error('更新门店失败:', error);
    res.status(500).json({
      success: false,
      error: '更新门店失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 删除门店
router.delete('/stores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const updateQuery = `
      UPDATE stores 
      SET delflag = 1, updated_at = GETDATE()
      WHERE id = :id AND delflag = 0
    `;

    await sequelize.query(updateQuery, {
      type: QueryTypes.UPDATE,
      replacements: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: '门店删除成功'
    });
  } catch (error) {
    console.error('删除门店失败:', error);
    res.status(500).json({
      success: false,
      error: '删除门店失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取分时段统计
router.get('/hourly-stats/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, timeType = 'today' } = req.query;
    
    let dateCondition = '';
    const params: any = { storeId: parseInt(storeId) };
    
    if (timeType === 'today') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(GETDATE() AS DATE)';
    } else if (startDate && endDate) {
      dateCondition = 'AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    const query = `
      SELECT 
        DATEPART(HOUR, o.created_at) as hour,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_amount,
        AVG(o.total_amount) as avg_amount
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
      GROUP BY DATEPART(HOUR, o.created_at)
      ORDER BY hour
    `;
    
    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取分时段统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分时段统计失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取支付方式统计
router.get('/payment-stats/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, timeType = 'today' } = req.query;
    
    let dateCondition = '';
    const params: any = { storeId: parseInt(storeId) };
    
    if (timeType === 'today') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(GETDATE() AS DATE)';
    } else if (startDate && endDate) {
      dateCondition = 'AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    const query = `
      SELECT 
        o.pay_mode as payment_method,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_amount,
        AVG(o.total_amount) as avg_amount
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
      GROUP BY o.pay_mode
      ORDER BY total_amount DESC
    `;
    
    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取支付方式统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付方式统计失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取商品销售统计
router.get('/product-stats/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, timeType = 'today' } = req.query;
    
    let dateCondition = '';
    const params: any = { storeId: parseInt(storeId) };
    
    if (timeType === 'today') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(GETDATE() AS DATE)';
    } else if (startDate && endDate) {
      dateCondition = 'AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    // 先检查order_items表是否存在
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'order_items'
    `;
    
    const tableExists = await sequelize.query(checkTableQuery, {
      type: QueryTypes.SELECT
    });
    
    if (!tableExists || (tableExists[0] as any).count === 0) {
      // 如果order_items表不存在，返回空数据
      res.json({
        success: true,
        data: []
      });
      return;
    }
    
    const query = `
      SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_amount,
        AVG(oi.price) as avg_price
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        AND oi.delflag = 0
        ${dateCondition}
      GROUP BY oi.product_name
      ORDER BY total_quantity DESC
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取商品销售统计失败:', error);
    // 如果查询失败，返回空数据而不是错误
    res.json({
      success: true,
      data: []
    });
  }
});

// 获取运营概览汇总数据（所有门店）- 超简版本
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { timeType = 'today' } = req.query;
    
    // 使用固定日期避免复杂计算
    let targetDate = new Date();
    if (timeType === 'yesterday') {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // 超简查询 - 只查询最基本的统计数据
    const basicStatsQuery = `
      SELECT TOP 1
        COUNT(*) as total_orders,
        ISNULL(SUM(total_amount), 0) as total_sales,
        ISNULL(AVG(total_amount), 0) as avg_order_value
      FROM orders 
      WHERE delflag = 0 
        AND pay_state = 2
        AND CAST(created_at AS DATE) = :targetDate
    `;
    
    // 门店统计查询 - 简化
    const storeStatsQuery = `
      SELECT TOP 1
        COUNT(*) as operating_stores
      FROM stores 
      WHERE delflag = 0 
        AND status = N'营业中'
    `;
    
    // 执行查询
    const todayResult = await sequelize.query(basicStatsQuery, {
      type: QueryTypes.SELECT,
      replacements: { targetDate: dateStr }
    });
    
    const storeResult = await sequelize.query(storeStatsQuery, {
      type: QueryTypes.SELECT
    });
    
    const today = todayResult[0] as any;
    const operatingStores = storeResult[0] as any;
    
    // 返回极简的数据结构
    const overviewData = {
      kpis: {
        sales: today?.total_sales || 0,
        totalOrders: today?.total_orders || 0,
        avgOrderValue: today?.avg_order_value || 0,
        totalCustomers: 0, // 简化，不查询客户数
        operatingStores: operatingStores?.operating_stores || 0,
        operatingCities: 0 // 简化，不查询城市数
      },
      summary: {
        dateRange: {
          start: dateStr,
          end: dateStr,
          type: timeType
        },
        filters: {
          city: '全部'
        }
      }
    };
    
    res.json({
      success: true,
      data: overviewData
    });
  } catch (error) {
    console.error('获取运营概览数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取运营概览数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取门店运营仪表板数据
router.get('/dashboard/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, timeType = 'today' } = req.query;
    
    let dateCondition = '';
    const params: any = { storeId: parseInt(storeId) };
    
    if (startDate && endDate) {
      // 如果传入了具体的日期范围，优先使用
      dateCondition = 'AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate';
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (timeType === 'today') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(GETDATE() AS DATE)';
    } else if (timeType === 'yesterday') {
      dateCondition = 'AND CAST(o.created_at AS DATE) = CAST(DATEADD(day, -1, GETDATE()) AS DATE)';
    }
    
    // 获取门店基本信息
    const storeQuery = `
      SELECT 
        s.id,
        s.store_code,
        s.store_name,
        s.store_type,
        s.status,
        s.province,
        s.city,
        s.district,
        s.address,
        s.longitude,
        s.latitude,
        s.area_size,
        s.rent_amount,
        s.investment_amount,
        s.expected_revenue,
        s.director,
        s.director_phone,
        s.morning_time,
        s.night_time,
        s.passenger_flow,
        s.is_self,
        s.created_at,
        s.updated_at
      FROM stores s
      WHERE s.id = :storeId AND s.delflag = 0
    `;
    
    const storeResult = await sequelize.query(storeQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId: parseInt(storeId) }
    });
    
    if (storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }
    
    // 获取销售数据 - 移除pay_state过滤，统计所有订单
    const salesQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(o.total_amount) as total_sales,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
    `;
    
    // 添加调试日志
    console.log('【调试】门店仪表板查询参数:', params);
    console.log('【调试】日期条件:', dateCondition);
    console.log('【调试】销售查询SQL:', salesQuery);
    
    const salesResult = await sequelize.query(salesQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    console.log('【调试】销售查询结果:', salesResult);
    
    // 获取昨日对比数据
    const yesterdayCondition = timeType === 'today' 
      ? 'AND CAST(o.created_at AS DATE) = CAST(DATEADD(day, -1, GETDATE()) AS DATE)'
      : '';
    
    const yesterdayQuery = `
      SELECT 
        COUNT(*) as yesterday_orders,
        SUM(o.total_amount) as yesterday_sales,
        AVG(o.total_amount) as yesterday_avg_order_value
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${yesterdayCondition}
    `;
    
    const yesterdayResult = await sequelize.query(yesterdayQuery, {
      type: QueryTypes.SELECT,
      replacements: { storeId: parseInt(storeId) }
    });
    
    const sales = salesResult[0] as any;
    const yesterday = yesterdayResult[0] as any;
    
    // 计算趋势
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    const salesTrend = calculateTrend(sales?.total_sales || 0, yesterday?.yesterday_sales || 0);
    const ordersTrend = calculateTrend(sales?.total_orders || 0, yesterday?.yesterday_orders || 0);
    const avgOrderTrend = calculateTrend(sales?.avg_order_value || 0, yesterday?.yesterday_avg_order_value || 0);
    
    // 获取最近订单
    const recentOrdersQuery = `
      SELECT TOP 5
        o.id,
        o.order_no as order_code,
        o.total_amount,
        o.pay_mode as payment_method,
        o.pay_state,
        o.customer_id,
        o.created_at
      FROM orders o
      WHERE o.store_id = :storeId 
        AND o.delflag = 0
        ${dateCondition}
      ORDER BY o.created_at DESC
    `;
    
    const recentOrdersResult = await sequelize.query(recentOrdersQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    const dashboardData = {
      store: storeResult[0],
      kpis: {
        sales: sales?.total_sales || 0,
        target: Math.max(500, (sales?.total_sales || 0) * 1.2), // 基于实际销售额动态设置目标
        totalSales: sales?.total_sales || 0,
        totalSalesTrend: {
          vsYesterday: salesTrend
        },
        transactions: sales?.total_orders || 0,
        transactionsTrend: {
          vsYesterday: ordersTrend
        },
        avgSpend: sales?.avg_order_value || 0,
        avgSpendTrend: {
          vsYesterday: avgOrderTrend
        },
        newMembers: sales?.unique_customers || 0
      },
      salesChart: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        data: [0, 0, 0, 0, 0, 0]
      },
      aiScore: {
        total: 75
      },
      charts: {
        hourlyStats: [],
        paymentStats: [],
        productStats: []
      },
      recentOrders: recentOrdersResult || []
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('获取门店运营数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店运营数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 检查cyrg2025数据库中的仙桃第一中学店数据
router.get('/check-cyrg2025-xiantao', async (req: Request, res: Response) => {
  try {
    // 首先检查cyrg2025数据库中的表结构
    const tablesQuery = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME";
    const tablesResult = await cyrg2025Sequelize.query(tablesQuery, { type: QueryTypes.SELECT });
    console.log('cyrg2025数据库中的表:', tablesResult);
    
    let result: any = {
      tables: tablesResult,
      stores: [],
      orders: []
    };
    
    // 查找可能的门店表
    const storeTables = tablesResult.filter((table: any) => 
      (table as any).TABLE_NAME.toLowerCase().includes('store') || 
      (table as any).TABLE_NAME.toLowerCase().includes('shop') ||
      (table as any).TABLE_NAME.toLowerCase().includes('门店')
    );
    
    console.log('可能的门店表:', storeTables);
    
    if (storeTables.length > 0) {
      const storeTableName = (storeTables[0] as any).TABLE_NAME;
      
      // 检查门店表结构
      const columnsQuery = `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${storeTableName}' ORDER BY ORDINAL_POSITION`;
      const columnsResult = await cyrg2025Sequelize.query(columnsQuery, { type: QueryTypes.SELECT });
      console.log(`表 ${storeTableName} 的列结构:`, columnsResult);
      
      // 查找仙桃相关门店
      const storesQuery = `SELECT * FROM ${storeTableName} WHERE store_name LIKE '%仙桃%' OR name LIKE '%仙桃%' OR title LIKE '%仙桃%'`;
      const storesResult = await cyrg2025Sequelize.query(storesQuery, { type: QueryTypes.SELECT });
      console.log('cyrg2025中的仙桃相关门店:', storesResult);
      
      result.stores = storesResult;
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('查询cyrg2025失败:', error);
    res.status(500).json({
      success: false,
      error: '查询cyrg2025失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取GIS地图数据
router.get('/gis-map', async (req: Request, res: Response) => {
  try {
    const { status, city, type } = req.query;
    
    let whereClause = 'WHERE s.delflag = 0 AND s.longitude IS NOT NULL AND s.latitude IS NOT NULL';
    const params: any = {};
    
    if (status) {
      whereClause += ' AND s.status = :status';
      params.status = status;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (type) {
      whereClause += ' AND s.store_code LIKE :type';
      params.type = type === 'potential' ? 'RG_%' : 'NOT LIKE RG_%';
    }
    
    const mapQuery = `
      SELECT 
        s.id,
        s.store_code,
        s.store_name,
        s.status,
        s.state,
        s.city,
        s.district,
        s.address,
        s.longitude,
        s.latitude,
        s.is_self,
        s.blurb,
        s.created_at,
        -- 统计信息（仅对营业中的门店）
        CASE 
          WHEN s.status = N'营业中' THEN COUNT(DISTINCT CASE WHEN o.pay_state = 2 THEN o.id END)
          ELSE 0
        END as order_count,
        CASE 
          WHEN s.status = N'营业中' THEN SUM(CASE WHEN o.pay_state = 2 THEN o.total_amount ELSE 0 END)
          ELSE 0
        END as total_revenue,
        -- 区分门店类型
        CASE 
          WHEN s.store_code LIKE 'RG_%' THEN 'potential'
          ELSE 'existing'
        END as store_type,
        -- 门店状态颜色
        CASE 
          WHEN s.status = N'营业中' THEN '#52c41a'
          WHEN s.status = N'筹备中' THEN '#1890ff'
          WHEN s.status = N'拓展中' THEN '#faad14'
          ELSE '#d9d9d9'
        END as marker_color
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0
      ${whereClause}
      GROUP BY s.id, s.store_code, s.store_name, s.status, s.state, s.city, s.district, 
               s.address, s.longitude, s.latitude, s.is_self, s.blurb, s.created_at
      ORDER BY s.created_at DESC
    `;
    
    const result = await sequelize.query(mapQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    
    // 统计不同类型门店数量
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN s.status = N'营业中' THEN 1 END) as operating,
        COUNT(CASE WHEN s.status = N'筹备中' THEN 1 END) as preparing,
        COUNT(CASE WHEN s.status = N'拓展中' THEN 1 END) as expanding,
        COUNT(CASE WHEN s.store_code LIKE 'RG_%' THEN 1 END) as potential,
        COUNT(*) as total
      FROM stores s
      WHERE s.delflag = 0 AND s.longitude IS NOT NULL AND s.latitude IS NOT NULL
    `;
    
    const stats = await sequelize.query(statsQuery, {
      type: QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      data: {
        stores: result,
        statistics: stats[0],
        total: result.length
      }
    });
  } catch (error) {
    console.error('获取GIS地图数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取GIS地图数据失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取门店地图详情
router.get('/stores/:id/map-details', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const storeQuery = `
      SELECT 
        s.*,
        CASE 
          WHEN s.store_code LIKE 'RG_%' THEN 'potential'
          ELSE 'existing'
        END as store_type,
        -- 如果是意向店铺，获取审核信息
        CASE 
          WHEN s.store_code LIKE 'RG_%' THEN rgs.approval_state
          ELSE NULL
        END as approval_state,
        CASE 
          WHEN s.store_code LIKE 'RG_%' THEN rgs.approval_remarks
          ELSE NULL
        END as approval_remarks,
        CASE 
          WHEN s.store_code LIKE 'RG_%' THEN rgs.amount
          ELSE NULL
        END as reward_amount
      FROM stores s
      LEFT JOIN rg_seek_shop rgs ON s.store_name = rgs.shop_name
      WHERE s.id = :id AND s.delflag = 0
    `;
    
    const store = await sequelize.query(storeQuery, {
      type: QueryTypes.SELECT,
      replacements: { id }
    });
    
    if (store.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }
    
    // 如果是营业中的门店，获取运营数据
    let operationData = null;
    if ((store[0] as any).status === '营业中') {
      const operationQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN o.pay_state = 2 THEN o.id END) as order_count,
          SUM(CASE WHEN o.pay_state = 2 THEN o.total_amount ELSE 0 END) as total_revenue,
          AVG(CASE WHEN o.pay_state = 2 THEN o.total_amount END) as avg_order_value,
          COUNT(DISTINCT o.customer_id) as customer_count
        FROM orders o
        WHERE o.store_id = :storeId AND o.delflag = 0
      `;
      
      const operation = await sequelize.query(operationQuery, {
        type: QueryTypes.SELECT,
        replacements: { storeId: id }
      });
      
      operationData = operation[0];
    }
    
    res.json({
      success: true,
      data: {
        store: store[0],
        operation: operationData
      }
    });
  } catch (error) {
    console.error('获取门店地图详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取门店地图详情失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取城市销售趋势数据
router.get('/city-sales-trend', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        s.city,
        s.province,
        COUNT(DISTINCT s.id) as store_count,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        MIN(o.created_at) as first_order_date,
        MAX(o.created_at) as last_order_date,
        COUNT(DISTINCT CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN o.id END) as recent_orders_30d,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN o.total_amount ELSE 0 END) as recent_revenue_30d,
        COUNT(DISTINCT CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN o.id END) as recent_orders_7d,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN o.total_amount ELSE 0 END) as recent_revenue_7d
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0 AND o.pay_state = 2
      WHERE s.delflag = 0 AND s.status = N'营业中'
      GROUP BY s.city, s.province
      ORDER BY total_revenue DESC
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    // 计算增长趋势
    const citiesWithTrend = result.map((city: any) => {
      const totalDays = city.first_order_date && city.last_order_date 
        ? Math.ceil((new Date(city.last_order_date).getTime() - new Date(city.first_order_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;
      
      const dailyAvgOrders = city.total_orders / totalDays;
      const dailyAvgRevenue = (city.total_revenue || 0) / totalDays;
      
      // 计算近期vs历史平均的增长趋势
      const recent30dDailyAvg = (city.recent_orders_30d || 0) / 30;
      const growthRate = dailyAvgOrders > 0 ? ((recent30dDailyAvg - dailyAvgOrders) / dailyAvgOrders) * 100 : 0;

      return {
        ...city,
        total_days: totalDays,
        daily_avg_orders: Math.round(dailyAvgOrders * 100) / 100,
        daily_avg_revenue: Math.round(dailyAvgRevenue * 100) / 100,
        growth_rate: Math.round(growthRate * 100) / 100,
        growth_trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable'
      };
    });

    res.json({
      success: true,
      data: citiesWithTrend
    });
  } catch (error) {
    console.error('获取城市销售趋势失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市销售趋势失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取商品销售趋势数据
router.get('/product-sales-trend', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        oi.product_name,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.price) as avg_price,
        AVG(oi.quantity) as avg_quantity_per_order,
        COUNT(DISTINCT oi.order_id) as unique_orders,
        MIN(o.created_at) as first_order_date,
        MAX(o.created_at) as last_order_date,
        COUNT(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN oi.id END) as recent_orders_30d,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN oi.total_price ELSE 0 END) as recent_revenue_30d,
        COUNT(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN oi.id END) as recent_orders_7d,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN oi.total_price ELSE 0 END) as recent_revenue_7d
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE oi.delflag = 0 AND o.delflag = 0 AND o.pay_state = 2
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    // 计算增长趋势和分类
    const productsWithTrend = result.map((product: any, index: number) => {
      const totalDays = product.first_order_date && product.last_order_date 
        ? Math.ceil((new Date(product.last_order_date).getTime() - new Date(product.first_order_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;
      
      const dailyAvgOrders = product.order_count / totalDays;
      const dailyAvgRevenue = (product.total_revenue || 0) / totalDays;
      
      // 计算近期vs历史平均的增长趋势
      const recent30dDailyAvg = (product.recent_orders_30d || 0) / 30;
      const growthRate = dailyAvgOrders > 0 ? ((recent30dDailyAvg - dailyAvgOrders) / dailyAvgOrders) * 100 : 0;

      // 商品分类（基于名称关键词）
      let category = '其他';
      if (product.product_name.includes('热狗')) {
        category = '热狗类';
      } else if (product.product_name.includes('套餐')) {
        category = '套餐类';
      } else if (product.product_name.includes('饮料') || product.product_name.includes('饮品')) {
        category = '饮品类';
      } else if (product.product_name.includes('小食') || product.product_name.includes('配菜')) {
        category = '小食类';
      }

      return {
        ...product,
        rank: index + 1,
        category,
        total_days: totalDays,
        daily_avg_orders: Math.round(dailyAvgOrders * 100) / 100,
        daily_avg_revenue: Math.round(dailyAvgRevenue * 100) / 100,
        growth_rate: Math.round(growthRate * 100) / 100,
        growth_trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable'
      };
    });

    res.json({
      success: true,
      data: productsWithTrend
    });
  } catch (error) {
    console.error('获取商品销售趋势失败:', error);
    res.status(500).json({
      success: false,
      error: '获取商品销售趋势失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取实时运营数据
router.get('/real-time-stats', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const selectedDate = date ? new Date(date as string) : new Date();
    const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // 计算基于选定日期的相对日期
    const selectedDateObj = new Date(dateStr);
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay()); // 本周开始（周日）
    
    const startOfMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1); // 本月开始
    
    const query = `
      SELECT 
        COUNT(DISTINCT s.id) as total_stores,
        COUNT(DISTINCT CASE WHEN s.status = N'营业中' THEN s.id END) as operating_stores,
        COUNT(DISTINCT CASE WHEN s.status = N'筹备中' THEN s.id END) as preparing_stores,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        COUNT(DISTINCT CASE WHEN CAST(o.created_at AS DATE) = CAST(:selectedDate AS DATE) THEN o.id END) as today_orders,
        SUM(CASE WHEN CAST(o.created_at AS DATE) = CAST(:selectedDate AS DATE) THEN o.total_amount ELSE 0 END) as today_revenue,
        COUNT(DISTINCT CASE WHEN CAST(o.created_at AS DATE) >= CAST(:startOfWeek AS DATE) AND CAST(o.created_at AS DATE) <= CAST(:selectedDate AS DATE) THEN o.id END) as week_orders,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(:startOfWeek AS DATE) AND CAST(o.created_at AS DATE) <= CAST(:selectedDate AS DATE) THEN o.total_amount ELSE 0 END) as week_revenue,
        COUNT(DISTINCT CASE WHEN CAST(o.created_at AS DATE) >= CAST(:startOfMonth AS DATE) AND CAST(o.created_at AS DATE) <= CAST(:selectedDate AS DATE) THEN o.id END) as month_orders,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(:startOfMonth AS DATE) AND CAST(o.created_at AS DATE) <= CAST(:selectedDate AS DATE) THEN o.total_amount ELSE 0 END) as month_revenue
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0 AND o.pay_state = 2
      WHERE s.delflag = 0
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        selectedDate: dateStr,
        startOfWeek: startOfWeek.toISOString().split('T')[0],
        startOfMonth: startOfMonth.toISOString().split('T')[0]
      }
    });

    const stats = result[0] as any;

    res.json({
      success: true,
      data: {
        selectedDate: dateStr,
        stores: {
          total: stats.total_stores || 0,
          operating: stats.operating_stores || 0,
          preparing: stats.preparing_stores || 0
        },
        orders: {
          total: stats.total_orders || 0,
          today: stats.today_orders || 0,
          week: stats.week_orders || 0,
          month: stats.month_orders || 0
        },
        revenue: {
          total: stats.total_revenue || 0,
          today: stats.today_revenue || 0,
          week: stats.week_revenue || 0,
          month: stats.month_revenue || 0
        }
      }
    });
  } catch (error) {
    console.error('获取实时运营数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取实时运营数据失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取热门商品排行榜
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT TOP ${parseInt(limit as string)}
        oi.product_name,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.price) as avg_price,
        COUNT(DISTINCT oi.order_id) as unique_orders,
        MIN(o.created_at) as first_sale_date,
        MAX(o.created_at) as last_sale_date,
        COUNT(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN oi.id END) as recent_week_orders,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) THEN oi.total_price ELSE 0 END) as recent_week_revenue
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE oi.delflag = 0 AND o.delflag = 0 AND o.pay_state = 2
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    // 添加排名和分类
    const productsWithRank = result.map((product: any, index: number) => {
      let category = '其他';
      if (product.product_name.includes('热狗')) {
        category = '热狗类';
      } else if (product.product_name.includes('套餐')) {
        category = '套餐类';
      } else if (product.product_name.includes('饮料') || product.product_name.includes('饮品')) {
        category = '饮品类';
      } else if (product.product_name.includes('小食') || product.product_name.includes('配菜')) {
        category = '小食类';
      }

      // 计算近期热度
      const recentWeekAvg = (product.recent_week_orders || 0) / 7;
      const historicalAvg = (product.order_count || 0) / Math.max(1, Math.ceil((new Date().getTime() - new Date(product.first_sale_date).getTime()) / (1000 * 60 * 60 * 24)));
      const hotScore = recentWeekAvg > historicalAvg * 1.2 ? 'hot' : recentWeekAvg > historicalAvg * 0.8 ? 'normal' : 'cool';

      return {
        ...product,
        rank: index + 1,
        category,
        hot_score: hotScore,
        recent_vs_historical: Math.round((recentWeekAvg / Math.max(historicalAvg, 1)) * 100) / 100
      };
    });

    res.json({
      success: true,
      data: productsWithRank
    });
  } catch (error) {
    console.error('获取热门商品失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热门商品失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取省份分析数据
router.get('/province-analysis', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        s.province,
        COUNT(DISTINCT s.id) as store_count,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT s.city) as city_count,
        MIN(o.created_at) as first_order_date,
        MAX(o.created_at) as last_order_date,
        COUNT(DISTINCT CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN o.id END) as recent_orders_30d,
        SUM(CASE WHEN CAST(o.created_at AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE) THEN o.total_amount ELSE 0 END) as recent_revenue_30d
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.delflag = 0 AND o.pay_state = 2
      WHERE s.delflag = 0
      GROUP BY s.province
      ORDER BY total_revenue DESC
    `;

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    const provincesWithAnalysis = result.map((province: any) => {
      const totalDays = province.first_order_date && province.last_order_date 
        ? Math.ceil((new Date(province.last_order_date).getTime() - new Date(province.first_order_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;
      
      const dailyAvgOrders = (province.total_orders || 0) / totalDays;
      const dailyAvgRevenue = (province.total_revenue || 0) / totalDays;
      
      const recent30dDailyAvg = (province.recent_orders_30d || 0) / 30;
      const growthRate = dailyAvgOrders > 0 ? ((recent30dDailyAvg - dailyAvgOrders) / dailyAvgOrders) * 100 : 0;

      return {
        ...province,
        total_days: totalDays,
        daily_avg_orders: Math.round(dailyAvgOrders * 100) / 100,
        daily_avg_revenue: Math.round(dailyAvgRevenue * 100) / 100,
        growth_rate: Math.round(growthRate * 100) / 100,
        growth_trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
        store_density: province.city_count > 0 ? Math.round((province.store_count / province.city_count) * 100) / 100 : 0
      };
    });

    res.json({
      success: true,
      data: provincesWithAnalysis
    });
  } catch (error) {
    console.error('获取省份分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取省份分析失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
