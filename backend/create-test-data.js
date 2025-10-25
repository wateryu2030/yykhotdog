const sql = require('mssql');

// RDS数据库配置
const dbConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'cyrg2025',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// 测试数据
const testShops = [
  {
    ShopName: '沈阳一中店',
    ShopAddress: '沈阳市和平区南京南街123号',
    Director: '张店长',
    DirectorPhone: '13800138001',
    FirstImg: '/images/shop1.jpg',
    RecordId: 'S001',
    Delflag: 0,
    RecordTime: new Date(),
    location: '123.456,78.901',
    state: 0, // 已开业
    isUse: 0, // 可用
    blurb: '位于沈阳一中附近的热狗店',
    province: '辽宁省',
    city: '沈阳市',
    district: '和平区',
    morningTime: '07:00',
    nightTime: '22:00',
    passengerFlow: 500,
    interval: 15,
    isClose: 0,
    enterPriseId: 'ENT001',
    merchantId: 'MER001',
    meituanId: 'MT001',
    elemeId: 'EL001',
    douyinId: 'DY001',
    establishTime: new Date('2023-01-01'),
    openingTime: new Date('2023-01-15'),
    isSettlement: 1,
    settlementRate: 0.05,
    rent: 8000.00,
    morningTime1: '07:00',
    nightTime1: '12:00',
    morningTime2: '17:00',
    nightTime2: '22:00',
    posImg: '/menu/shop1_menu.jpg',
    posImgName: 'shop1_menu.jpg',
    isSelf: 1
  },
  {
    ShopName: '沈阳实验中学店',
    ShopAddress: '沈阳市沈河区青年大街456号',
    Director: '李店长',
    DirectorPhone: '13800138002',
    FirstImg: '/images/shop2.jpg',
    RecordId: 'S002',
    Delflag: 0,
    RecordTime: new Date(),
    location: '123.457,78.902',
    state: 0, // 已开业
    isUse: 0, // 可用
    blurb: '位于沈阳实验中学附近的热狗店',
    province: '辽宁省',
    city: '沈阳市',
    district: '沈河区',
    morningTime: '07:30',
    nightTime: '21:30',
    passengerFlow: 400,
    interval: 20,
    isClose: 0,
    enterPriseId: 'ENT001',
    merchantId: 'MER002',
    meituanId: 'MT002',
    elemeId: 'EL002',
    douyinId: 'DY002',
    establishTime: new Date('2023-02-01'),
    openingTime: new Date('2023-02-15'),
    isSettlement: 1,
    settlementRate: 0.05,
    rent: 7500.00,
    morningTime1: '07:30',
    nightTime1: '12:30',
    morningTime2: '17:30',
    nightTime2: '21:30',
    posImg: '/menu/shop2_menu.jpg',
    posImgName: 'shop2_menu.jpg',
    isSelf: 1
  },
  {
    ShopName: '北京清华东门店',
    ShopAddress: '北京市海淀区清华东路789号',
    Director: '王店长',
    DirectorPhone: '13800138003',
    FirstImg: '/images/shop3.jpg',
    RecordId: 'B001',
    Delflag: 0,
    RecordTime: new Date(),
    location: '116.407,39.904',
    state: 0, // 已开业
    isUse: 0, // 可用
    blurb: '位于清华大学东门附近的热狗店',
    province: '北京市',
    city: '北京市',
    district: '海淀区',
    morningTime: '08:00',
    nightTime: '23:00',
    passengerFlow: 800,
    interval: 10,
    isClose: 0,
    enterPriseId: 'ENT001',
    merchantId: 'MER003',
    meituanId: 'MT003',
    elemeId: 'EL003',
    douyinId: 'DY003',
    establishTime: new Date('2023-03-01'),
    openingTime: new Date('2023-03-15'),
    isSettlement: 1,
    settlementRate: 0.06,
    rent: 12000.00,
    morningTime1: '08:00',
    nightTime1: '14:00',
    morningTime2: '18:00',
    nightTime2: '23:00',
    posImg: '/menu/shop3_menu.jpg',
    posImgName: 'shop3_menu.jpg',
    isSelf: 1
  }
];

async function createTestData() {
  let pool;
  
  try {
    console.log('🔄 开始创建测试数据...\n');
    
    // 连接数据库
    console.log('=== 连接数据库 ===');
    pool = await sql.connect(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 切换到cyrg2025数据库
    await pool.request().query('USE cyrg2025');
    console.log('✅ 已切换到cyrg2025数据库\n');
    
    // 检查shop表是否存在
    console.log('=== 检查shop表结构 ===');
    const tableCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'shop' 
      ORDER BY ORDINAL_POSITION
    `);
    
    if (tableCheck.recordset.length === 0) {
      console.log('❌ shop表不存在，请先创建表结构');
      return;
    }
    
    console.log('✅ shop表存在，字段列表:');
    tableCheck.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    console.log('');
    
    // 插入测试数据
    console.log('=== 插入测试数据 ===');
    for (const shop of testShops) {
      try {
        // 使用动态SQL，只插入存在的字段
        const fields = [];
        const values = [];
        const inputs = [];
        
        // 根据实际表结构动态构建SQL
        for (const [key, value] of Object.entries(shop)) {
          if (tableCheck.recordset.some(col => col.COLUMN_NAME === key)) {
            fields.push(key);
            values.push(`@${key}`);
            inputs.push({ name: key, value: value });
          }
        }
        
        const sql = `
          IF NOT EXISTS (SELECT * FROM shop WHERE ShopName = @ShopName)
          INSERT INTO shop (${fields.join(', ')})
          VALUES (${values.join(', ')})
        `;
        
        const request = pool.request();
        inputs.forEach(input => {
          request.input(input.name, input.value);
        });
        
        await request.query(sql);
        console.log(`✅ 门店 "${shop.ShopName}" 测试数据插入成功`);
        
      } catch (error) {
        console.log(`⚠️  门店 "${shop.ShopName}" 数据插入失败: ${error.message}`);
      }
    }
    
    console.log('\n=== 验证数据 ===');
    const result = await pool.request().query(`
      SELECT Id, ShopName, ShopAddress, state, isUse 
      FROM shop 
      WHERE state = 0 AND isUse = 0
      ORDER BY Id
    `);
    
    console.log(`✅ 查询到 ${result.recordset.length} 条可用门店数据:`);
    result.recordset.forEach(shop => {
      console.log(`  - ID: ${shop.Id}, 名称: ${shop.ShopName}, 地址: ${shop.ShopAddress}`);
    });
    
    console.log('\n🎉 测试数据创建完成！');
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行创建测试数据
createTestData(); 