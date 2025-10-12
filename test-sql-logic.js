const { Sequelize } = require('sequelize');

// 数据库配置
const sequelize = new Sequelize('cyrg2025', 'hotdog', 'Zhkj@62102218', {
  host: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: 1433,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  logging: console.log
});

async function testSQLLogic() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 测试1: 总订单数、总销售额、客单价
    console.log('\n=== 测试1: 总订单数、总销售额、客单价 ===');
    const salesQuery = `
      SELECT 
        COUNT(*) AS 订单数,
        SUM(vipAmount + vipAmountZengSong + cash + total) AS 总销售额,
        CONVERT(DECIMAL(10,2), round(SUM(vipAmount + vipAmountZengSong + cash + total) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 2)) AS 客单价 
      FROM dbo.Orders 
      WHERE delflag = 0 AND payState IN (1,2,3)
    `;
    
    const salesResult = await sequelize.query(salesQuery, { type: Sequelize.QueryTypes.SELECT });
    console.log('销售统计结果:', salesResult[0]);

    // 测试2: 总用户数
    console.log('\n=== 测试2: 总用户数 ===');
    const userQuery = `
      SELECT COUNT(*) AS 总用户数 
      FROM (
        SELECT DISTINCT openId AS 用户名称 
        FROM Orders 
        WHERE delflag = 0 AND payState IN (1,2,3) AND openId != ''
      ) a
    `;
    
    const userResult = await sequelize.query(userQuery, { type: Sequelize.QueryTypes.SELECT });
    console.log('用户统计结果:', userResult[0]);

    // 测试3: 按门店ID查询
    console.log('\n=== 测试3: 按门店ID查询 (shopId=1) ===');
    const storeSalesQuery = `
      SELECT 
        COUNT(*) AS 订单数,
        SUM(vipAmount + vipAmountZengSong + cash + total) AS 总销售额,
        CONVERT(DECIMAL(10,2), round(SUM(vipAmount + vipAmountZengSong + cash + total) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 2)) AS 客单价 
      FROM dbo.Orders 
      WHERE delflag = 0 AND payState IN (1,2,3) AND shopId = 1
    `;
    
    const storeSalesResult = await sequelize.query(storeSalesQuery, { type: Sequelize.QueryTypes.SELECT });
    console.log('门店1销售统计结果:', storeSalesResult[0]);

    // 测试4: 按时间范围查询
    console.log('\n=== 测试4: 按时间范围查询 (今日) ===');
    const today = new Date().toISOString().split('T')[0];
    const timeSalesQuery = `
      SELECT 
        COUNT(*) AS 订单数,
        SUM(vipAmount + vipAmountZengSong + cash + total) AS 总销售额,
        CONVERT(DECIMAL(10,2), round(SUM(vipAmount + vipAmountZengSong + cash + total) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 2)) AS 客单价 
      FROM dbo.Orders 
      WHERE delflag = 0 AND payState IN (1,2,3) 
        AND shopId = 1 
        AND recordTime >= '${today} 00:00:00' 
        AND recordTime <= '${today} 23:59:59'
    `;
    
    const timeSalesResult = await sequelize.query(timeSalesQuery, { type: Sequelize.QueryTypes.SELECT });
    console.log('今日销售统计结果:', timeSalesResult[0]);

    // 测试5: 检查订单数据
    console.log('\n=== 测试5: 检查订单数据 ===');
    const orderCheckQuery = `
      SELECT TOP 10 
        id, shopId, orderNo, total, vipAmount, vipAmountZengSong, cash, payState, delflag, recordTime, openId
      FROM dbo.Orders 
      WHERE delflag = 0 AND payState IN (1,2,3)
      ORDER BY recordTime DESC
    `;
    
    const orderCheckResult = await sequelize.query(orderCheckQuery, { type: Sequelize.QueryTypes.SELECT });
    console.log('最近10个订单:', orderCheckResult);

    // 测试6: 检查数据库表结构
    console.log('\n=== 测试6: 检查数据库表结构 ===');
    const tables = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = 'cyrg2025'
      ORDER BY TABLE_NAME
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('数据库中的表:', tables.map(t => t.TABLE_NAME));

    // 测试7: 检查Orders表结构
    console.log('\n=== 测试7: 检查Orders表结构 ===');
    const orderColumns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Orders' AND TABLE_CATALOG = 'cyrg2025'
      ORDER BY ORDINAL_POSITION
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('Orders表字段:', orderColumns);

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await sequelize.close();
    console.log('\n数据库连接已关闭');
  }
}

testSQLLogic(); 