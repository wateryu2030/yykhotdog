const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// 新RDS数据库配置
const newDbConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'cyrg2025', // 先连接到cyrg2025数据库
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// 模拟的本地备份数据（实际使用时需要替换为真实的备份数据）
const backupData = {
  // shop表数据
  shops: [
    {
      Id: 1,
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
      meituantuangould: 'MTG001',
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
      Id: 2,
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
      meituantuangould: 'MTG002',
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
      Id: 3,
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
      meituantuangould: 'MTG003',
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
  ],
  
  // 用户表数据
  users: [
    {
      Id: 1,
      UserName: 'admin',
      Password: 'admin123',
      RealName: '系统管理员',
      Phone: '13800138000',
      Role: 'admin',
      Status: 1,
      CreateTime: new Date()
    },
    {
      Id: 2,
      UserName: 'manager1',
      Password: 'manager123',
      RealName: '张店长',
      Phone: '13800138001',
      Role: 'manager',
      Status: 1,
      CreateTime: new Date()
    }
  ],
  
  // 订单表数据（模拟）
  orders: [
    {
      Id: 1,
      OrderNo: 'ORD20240101001',
      ShopId: 1,
      CustomerName: '张三',
      CustomerPhone: '13900139001',
      TotalAmount: 25.50,
      ActualAmount: 25.50,
      PaymentMethod: '微信支付',
      PaymentStatus: 1,
      OrderStatus: 1,
      CreateTime: new Date('2024-01-01 12:30:00')
    },
    {
      Id: 2,
      OrderNo: 'ORD20240101002',
      ShopId: 1,
      CustomerName: '李四',
      CustomerPhone: '13900139002',
      TotalAmount: 18.00,
      ActualAmount: 18.00,
      PaymentMethod: '支付宝',
      PaymentStatus: 1,
      OrderStatus: 1,
      CreateTime: new Date('2024-01-01 13:15:00')
    }
  ],
  
  // 商品表数据
  goods: [
    {
      Id: 1,
      GoodsName: '辣条爆浆热狗',
      GoodsCode: 'HOT001',
      CategoryId: 1,
      Price: 12.50,
      CostPrice: 5.00,
      Stock: 100,
      Status: 1,
      CreateTime: new Date()
    },
    {
      Id: 2,
      GoodsName: '芝士双拼热狗',
      GoodsCode: 'HOT002',
      CategoryId: 1,
      Price: 15.00,
      CostPrice: 6.00,
      Stock: 80,
      Status: 1,
      CreateTime: new Date()
    },
    {
      Id: 3,
      GoodsName: '经典原味热狗',
      GoodsCode: 'HOT003',
      CategoryId: 1,
      Price: 10.00,
      CostPrice: 4.00,
      Stock: 120,
      Status: 1,
      CreateTime: new Date()
    }
  ]
};

async function restoreDatabase() {
  let pool;
  
  try {
    console.log('🔄 开始数据库恢复...\n');
    
    // 连接数据库
    console.log('=== 连接数据库 ===');
    pool = await sql.connect(newDbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 切换到cyrg2025数据库
    await pool.request().query('USE cyrg2025');
    console.log('✅ 已切换到cyrg2025数据库\n');
    
    // 1. 恢复shop表数据
    console.log('=== 恢复shop表数据 ===');
    for (const shop of backupData.shops) {
      try {
        await pool.request()
          .input('Id', sql.BigInt, shop.Id)
          .input('ShopName', sql.NVarChar, shop.ShopName)
          .input('ShopAddress', sql.NVarChar, shop.ShopAddress)
          .input('Director', sql.NVarChar, shop.Director)
          .input('DirectorPhone', sql.NVarChar, shop.DirectorPhone)
          .input('FirstImg', sql.NVarChar, shop.FirstImg)
          .input('RecordId', sql.NVarChar, shop.RecordId)
          .input('Delflag', sql.Int, shop.Delflag)
          .input('RecordTime', sql.DateTime2, shop.RecordTime)
          .input('location', sql.NVarChar, shop.location)
          .input('state', sql.Int, shop.state)
          .input('isUse', sql.Int, shop.isUse)
          .input('blurb', sql.NText, shop.blurb)
          .input('province', sql.NVarChar, shop.province)
          .input('city', sql.NVarChar, shop.city)
          .input('district', sql.NVarChar, shop.district)
          .input('morningTime', sql.NVarChar, shop.morningTime)
          .input('nightTime', sql.NVarChar, shop.nightTime)
          .input('passengerFlow', sql.Int, shop.passengerFlow)
          .input('interval', sql.Int, shop.interval)
          .input('isClose', sql.Int, shop.isClose)
          .input('enterPriseId', sql.NVarChar, shop.enterPriseId)
          .input('merchantId', sql.NVarChar, shop.merchantId)
          .input('meituanId', sql.NVarChar, shop.meituanId)
          .input('elemeId', sql.NVarChar, shop.elemeId)
          .input('douyinId', sql.NVarChar, shop.douyinId)
          .input('establishTime', sql.DateTime2, shop.establishTime)
          .input('meituantuangould', sql.NVarChar, shop.meituantuangould)
          .input('openingTime', sql.DateTime2, shop.openingTime)
          .input('isSettlement', sql.Int, shop.isSettlement)
          .input('settlementRate', sql.Decimal(5,2), shop.settlementRate)
          .input('rent', sql.Decimal(10,2), shop.rent)
          .input('morningTime1', sql.NVarChar, shop.morningTime1)
          .input('nightTime1', sql.NVarChar, shop.nightTime1)
          .input('morningTime2', sql.NVarChar, shop.morningTime2)
          .input('nightTime2', sql.NVarChar, shop.nightTime2)
          .input('posImg', sql.NVarChar, shop.posImg)
          .input('posImgName', sql.NVarChar, shop.posImgName)
          .input('isSelf', sql.Int, shop.isSelf)
          .query(`
            IF NOT EXISTS (SELECT * FROM shop WHERE Id = @Id)
            INSERT INTO shop (
              Id, ShopName, ShopAddress, Director, DirectorPhone, FirstImg, RecordId, 
              Delflag, RecordTime, location, state, isUse, blurb, province, city, district,
              morningTime, nightTime, passengerFlow, interval, isClose, enterPriseId,
              merchantId, meituanId, elemeId, douyinId, establishTime, meituantuangould,
              openingTime, isSettlement, settlementRate, rent, morningTime1, nightTime1,
              morningTime2, nightTime2, posImg, posImgName, isSelf
            ) VALUES (
              @Id, @ShopName, @ShopAddress, @Director, @DirectorPhone, @FirstImg, @RecordId,
              @Delflag, @RecordTime, @location, @state, @isUse, @blurb, @province, @city, @district,
              @morningTime, @nightTime, @passengerFlow, @interval, @isClose, @enterPriseId,
              @merchantId, @meituanId, @elemeId, @douyinId, @establishTime, @meituantuangould,
              @openingTime, @isSettlement, @settlementRate, @rent, @morningTime1, @nightTime1,
              @morningTime2, @nightTime2, @posImg, @posImgName, @isSelf
            )
          `);
        console.log(`✅ 门店 "${shop.ShopName}" 数据恢复成功`);
      } catch (error) {
        console.log(`⚠️  门店 "${shop.ShopName}" 数据恢复失败: ${error.message}`);
      }
    }
    console.log('');
    
    // 2. 恢复用户表数据（如果表存在）
    console.log('=== 恢复用户表数据 ===');
    try {
      for (const user of backupData.users) {
        await pool.request()
          .input('Id', sql.BigInt, user.Id)
          .input('UserName', sql.NVarChar, user.UserName)
          .input('Password', sql.NVarChar, user.Password)
          .input('RealName', sql.NVarChar, user.RealName)
          .input('Phone', sql.NVarChar, user.Phone)
          .input('Role', sql.NVarChar, user.Role)
          .input('Status', sql.Int, user.Status)
          .input('CreateTime', sql.DateTime2, user.CreateTime)
          .query(`
            IF NOT EXISTS (SELECT * FROM XcxUser WHERE Id = @Id)
            INSERT INTO XcxUser (Id, UserName, Password, RealName, Phone, Role, Status, CreateTime)
            VALUES (@Id, @UserName, @Password, @RealName, @Phone, @Role, @Status, @CreateTime)
          `);
        console.log(`✅ 用户 "${user.RealName}" 数据恢复成功`);
      }
    } catch (error) {
      console.log(`⚠️  用户表数据恢复失败: ${error.message}`);
    }
    console.log('');
    
    // 3. 恢复商品表数据（如果表存在）
    console.log('=== 恢复商品表数据 ===');
    try {
      for (const good of backupData.goods) {
        await pool.request()
          .input('Id', sql.BigInt, good.Id)
          .input('GoodsName', sql.NVarChar, good.GoodsName)
          .input('GoodsCode', sql.NVarChar, good.GoodsCode)
          .input('CategoryId', sql.BigInt, good.CategoryId)
          .input('Price', sql.Decimal(10,2), good.Price)
          .input('CostPrice', sql.Decimal(10,2), good.CostPrice)
          .input('Stock', sql.Int, good.Stock)
          .input('Status', sql.Int, good.Status)
          .input('CreateTime', sql.DateTime2, good.CreateTime)
          .query(`
            IF NOT EXISTS (SELECT * FROM goods WHERE Id = @Id)
            INSERT INTO goods (Id, GoodsName, GoodsCode, CategoryId, Price, CostPrice, Stock, Status, CreateTime)
            VALUES (@Id, @GoodsName, @GoodsCode, @CategoryId, @Price, @CostPrice, @Stock, @Status, @CreateTime)
          `);
        console.log(`✅ 商品 "${good.GoodsName}" 数据恢复成功`);
      }
    } catch (error) {
      console.log(`⚠️  商品表数据恢复失败: ${error.message}`);
    }
    console.log('');
    
    // 4. 恢复订单表数据（如果表存在）
    console.log('=== 恢复订单表数据 ===');
    try {
      for (const order of backupData.orders) {
        await pool.request()
          .input('Id', sql.BigInt, order.Id)
          .input('OrderNo', sql.NVarChar, order.OrderNo)
          .input('ShopId', sql.BigInt, order.ShopId)
          .input('CustomerName', sql.NVarChar, order.CustomerName)
          .input('CustomerPhone', sql.NVarChar, order.CustomerPhone)
          .input('TotalAmount', sql.Decimal(10,2), order.TotalAmount)
          .input('ActualAmount', sql.Decimal(10,2), order.ActualAmount)
          .input('PaymentMethod', sql.NVarChar, order.PaymentMethod)
          .input('PaymentStatus', sql.Int, order.PaymentStatus)
          .input('OrderStatus', sql.Int, order.OrderStatus)
          .input('CreateTime', sql.DateTime2, order.CreateTime)
          .query(`
            IF NOT EXISTS (SELECT * FROM orders WHERE Id = @Id)
            INSERT INTO orders (Id, OrderNo, ShopId, CustomerName, CustomerPhone, TotalAmount, ActualAmount, PaymentMethod, PaymentStatus, OrderStatus, CreateTime)
            VALUES (@Id, @OrderNo, @ShopId, @CustomerName, @CustomerPhone, @TotalAmount, @ActualAmount, @PaymentMethod, @PaymentStatus, @OrderStatus, @CreateTime)
          `);
        console.log(`✅ 订单 "${order.OrderNo}" 数据恢复成功`);
      }
    } catch (error) {
      console.log(`⚠️  订单表数据恢复失败: ${error.message}`);
    }
    console.log('');
    
    console.log('🎉 数据库恢复完成！');
    
  } catch (error) {
    console.error('❌ 数据库恢复失败:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行恢复
restoreDatabase(); 