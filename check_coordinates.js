#!/usr/bin/env node

// 确保从 backend 目录加载依赖
const path = require('path');
const Module = require('module');

// 将 backend/node_modules 添加到模块搜索路径
const backendPath = path.join(__dirname, 'backend');
const backendNodeModules = path.join(backendPath, 'node_modules');

// 修改模块解析路径
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' && !request.startsWith('.') && !path.isAbsolute(request)) {
      try {
        const backendModulePath = path.join(backendNodeModules, request);
        return originalResolveFilename.call(this, backendModulePath, parent, isMain, options);
      } catch (e2) {
        throw e;
      }
    }
    throw e;
  }
};

const sql = require('mssql');

// 数据库配置
const config = {
    server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    database: 'hotdog2030',
    user: process.env.DB_USERNAME || 'hotdog',
    password: process.env.DB_PASSWORD || 'your_password',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function checkCoordinates() {
    let conn;
    
    try {
        console.log('🔗 连接数据库...');
        conn = await sql.connect(config);
        console.log('✅ hotdog2030数据库连接成功\n');

        // 统计坐标数据
        const statsResult = await conn.request().query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN 1 ELSE 0 END) as with_coords,
                SUM(CASE WHEN longitude IS NULL OR latitude IS NULL THEN 1 ELSE 0 END) as without_coords,
                SUM(CASE WHEN location IS NOT NULL AND LTRIM(RTRIM(location)) <> '' THEN 1 ELSE 0 END) as with_location_text
            FROM hotdog2030.dbo.candidate_locations
            WHERE ISNULL(delflag, 0) = 0
        `);

        const stats = statsResult.recordset[0];
        console.log('📊 坐标数据统计:');
        console.log(`   总记录数: ${stats.total_count}`);
        console.log(`   有坐标的记录: ${stats.with_coords}`);
        console.log(`   无坐标的记录: ${stats.without_coords}`);
        console.log(`   有location文本的记录: ${stats.with_location_text}`);
        console.log('');

        // 显示前10条有坐标的记录
        const withCoordsResult = await conn.request().query(`
            SELECT TOP 10
                id,
                shop_name,
                shop_address,
                location,
                longitude,
                latitude
            FROM hotdog2030.dbo.candidate_locations
            WHERE longitude IS NOT NULL AND latitude IS NOT NULL
              AND ISNULL(delflag, 0) = 0
            ORDER BY id
        `);

        if (withCoordsResult.recordset.length > 0) {
            console.log('✅ 前10条有坐标的记录:');
            withCoordsResult.recordset.forEach((row, index) => {
                console.log(`\n${index + 1}. ID: ${row.id}`);
                console.log(`   店铺名: ${row.shop_name || '(空)'}`);
                console.log(`   地址: ${row.shop_address || '(空)'}`);
                console.log(`   location字段: ${row.location || '(空)'}`);
                console.log(`   经度: ${row.longitude}`);
                console.log(`   纬度: ${row.latitude}`);
            });
        } else {
            console.log('⚠️ 没有找到有坐标的记录');
        }

        console.log('');

        // 显示前10条无坐标但有location文本的记录
        const withoutCoordsResult = await conn.request().query(`
            SELECT TOP 10
                id,
                shop_name,
                shop_address,
                location,
                longitude,
                latitude
            FROM hotdog2030.dbo.candidate_locations
            WHERE (longitude IS NULL OR latitude IS NULL)
              AND location IS NOT NULL
              AND LTRIM(RTRIM(location)) <> ''
              AND ISNULL(delflag, 0) = 0
            ORDER BY id
        `);

        if (withoutCoordsResult.recordset.length > 0) {
            console.log('⚠️ 前10条无坐标但有location文本的记录（需要解析）:');
            withoutCoordsResult.recordset.forEach((row, index) => {
                console.log(`\n${index + 1}. ID: ${row.id}`);
                console.log(`   店铺名: ${row.shop_name || '(空)'}`);
                console.log(`   地址: ${row.shop_address || '(空)'}`);
                console.log(`   location字段: ${row.location || '(空)'}`);
                console.log(`   经度: ${row.longitude || '(空)'}`);
                console.log(`   纬度: ${row.latitude || '(空)'}`);
            });
        } else {
            console.log('✅ 所有有location文本的记录都已解析出坐标');
        }

        // 检查原始数据中的坐标格式
        console.log('\n📋 检查cyrgweixin原始数据中的坐标格式...');
        const cargoConfig = {
            server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
            database: 'cyrgweixin',
            user: process.env.DB_USERNAME || 'hotdog',
            password: process.env.DB_PASSWORD || 'your_password',
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };

        const cargoConn = await sql.connect(cargoConfig);
        const originalDataResult = await cargoConn.request().query(`
            SELECT TOP 10
                Id,
                ShopName,
                ShopAddress,
                location
            FROM cyrgweixin.dbo.Rg_SeekShop
            WHERE Delflag = 0
              AND location IS NOT NULL
              AND LTRIM(RTRIM(location)) <> ''
            ORDER BY Id
        `);

        if (originalDataResult.recordset.length > 0) {
            console.log('前10条原始数据中的location字段:');
            originalDataResult.recordset.forEach((row, index) => {
                console.log(`\n${index + 1}. ID: ${row.Id}`);
                console.log(`   店铺名: ${row.ShopName || '(空)'}`);
                console.log(`   地址: ${row.ShopAddress || '(空)'}`);
                console.log(`   location字段: ${row.location || '(空)'}`);
            });
        }

        await cargoConn.close();
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        if (conn) await conn.close();
        console.log('\n🔌 数据库连接已关闭');
    }
}

// 执行检查
checkCoordinates();

