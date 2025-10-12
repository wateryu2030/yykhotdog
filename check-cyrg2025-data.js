const express = require('express');
const { Sequelize } = require('sequelize');

const app = express();

// 创建cyrg2025数据库连接
const cyrg2025Sequelize = new Sequelize({
  dialect: 'mssql',
  host: 'localhost',
  port: 1433,
  database: 'cyrg2025',
  username: 'sa',
  password: 'Hotdog123!',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
});

app.get('/check-cyrg2025', async (req, res) => {
  try {
    await cyrg2025Sequelize.authenticate();
    console.log('✅ cyrg2025数据库连接成功');
    
    // 检查仙桃相关门店
    const storesQuery = "SELECT id, store_name, store_code, status FROM stores WHERE store_name LIKE '%仙桃%' AND delflag = 0";
    const storesResult = await cyrg2025Sequelize.query(storesQuery, { type: cyrg2025Sequelize.QueryTypes.SELECT });
    console.log('cyrg2025中的仙桃相关门店:', storesResult);
    
    let result = {
      stores: storesResult,
      orders: []
    };
    
    if (storesResult.length > 0) {
      const storeId = storesResult[0].id;
      console.log(`检查门店ID ${storeId} 的订单数据:`);
      
      // 检查该门店的订单统计
      const orderQuery = `SELECT COUNT(*) as order_count, SUM(total_amount) as total_amount FROM orders WHERE store_id = ${storeId} AND delflag = 0`;
      const orderResult = await cyrg2025Sequelize.query(orderQuery, { type: cyrg2025Sequelize.QueryTypes.SELECT });
      console.log('订单统计:', orderResult);
      
      // 检查最近几天的订单
      const recentQuery = `SELECT TOP 10 CAST(created_at AS DATE) as order_date, COUNT(*) as order_count, SUM(total_amount) as total_amount FROM orders WHERE store_id = ${storeId} AND delflag = 0 GROUP BY CAST(created_at AS DATE) ORDER BY order_date DESC`;
      const recentResult = await cyrg2025Sequelize.query(recentQuery, { type: cyrg2025Sequelize.QueryTypes.SELECT });
      console.log('最近订单:', recentResult);
      
      result.orders = recentResult;
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('查询失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`检查服务运行在端口 ${PORT}`);
});
