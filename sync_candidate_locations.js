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
const fs = require('fs');

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

const cargoConfig = {
    server: process.env.CARGO_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    database: 'cyrgweixin',
    user: process.env.DB_USERNAME || 'hotdog',
    password: process.env.DB_PASSWORD || 'your_password',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

function isValidLngLat(longitude, latitude) {
    return typeof longitude === 'number' &&
        typeof latitude === 'number' &&
        !isNaN(longitude) &&
        !isNaN(latitude) &&
        longitude >= -180 && longitude <= 180 &&
        latitude >= -90 && latitude <= 90;
}

function finalizeCoordinates(longitude, latitude) {
    if (!isValidLngLat(longitude, latitude)) {
        if (isValidLngLat(latitude, longitude)) {
            return { longitude: latitude, latitude: longitude };
        }
        return { longitude: null, latitude: null };
    }
    return { longitude, latitude };
}

function parseCoordinates(location) {
    if (!location || typeof location !== 'string') {
        return { longitude: null, latitude: null };
    }

    let text = location.trim();
    if (!text) {
        return { longitude: null, latitude: null };
    }

    text = text
        .replace(/POINT\s*\(/i, '')
        .replace(/\)/g, '')
        .replace(/；|;|、|\|/g, ',')
        .replace(/：/g, ':')
        .replace(/\s+/g, ' ');

    const lngMatch = text.match(/(?:lon|lng|经度)\s*[:：]?\s*(-?\d+\.?\d*)/i);
    const latMatch = text.match(/(?:lat|纬度)\s*[:：]?\s*(-?\d+\.?\d*)/i);

    if (lngMatch && latMatch) {
        const longitude = parseFloat(lngMatch[1]);
        const latitude = parseFloat(latMatch[1]);
        if (!isNaN(longitude) && !isNaN(latitude)) {
            return finalizeCoordinates(longitude, latitude);
        }
    }

    const numberMatches = text.match(/-?\d+\.?\d*/g);
    if (!numberMatches || numberMatches.length < 2) {
        return { longitude: null, latitude: null };
    }

    let first = parseFloat(numberMatches[0]);
    let second = parseFloat(numberMatches[1]);

    if (isNaN(first) || isNaN(second)) {
        return { longitude: null, latitude: null };
    }

    // 如果第一段文本包含“lat/纬”，则说明先出现纬度
    const lowerText = text.toLowerCase();
    const firstIndex = lowerText.indexOf(numberMatches[0]);
    if (firstIndex > -1) {
        const beforeFirst = lowerText.slice(0, firstIndex);
        const latFirst = /lat|纬/.test(beforeFirst) && !/lon|lng|经/.test(beforeFirst);
        if (latFirst) {
            return finalizeCoordinates(second, first);
        }
    }

    return finalizeCoordinates(first, second);
}

async function recalculateCoordinates(mainConn) {
    console.log('\n🔄 正在校验并纠正 candidate_locations 表中的经纬度...');
    const updateResult = await mainConn.request().query(`
        SELECT id, location, longitude, latitude
        FROM hotdog2030.dbo.candidate_locations
        WHERE location IS NOT NULL
          AND LTRIM(RTRIM(location)) <> ''
    `);

    if (updateResult.recordset.length === 0) {
        console.log('⚠️ 没有可用于校验的记录');
        return;
    }

    let updated = 0;
    for (const row of updateResult.recordset) {
        const parsed = parseCoordinates(row.location);
        if (parsed.longitude === null || parsed.latitude === null) {
            continue;
        }

        const currentValid = isValidLngLat(row.longitude, row.latitude);
        const needUpdate =
            !currentValid ||
            row.longitude === null ||
            row.latitude === null ||
            Math.abs(row.longitude - parsed.longitude) > 0.000001 ||
            Math.abs(row.latitude - parsed.latitude) > 0.000001;

        if (needUpdate) {
            await mainConn.request()
                .input('id', sql.BigInt, row.id)
                .input('longitude', sql.Decimal(10, 7), parsed.longitude)
                .input('latitude', sql.Decimal(10, 7), parsed.latitude)
                .query(`
                    UPDATE hotdog2030.dbo.candidate_locations
                    SET longitude = @longitude,
                        latitude = @latitude,
                        updated_at = GETDATE()
                    WHERE id = @id
                `);
            updated++;
        }
    }

    console.log(`✅ 已纠正 ${updated} 条记录的经纬度`);
}

async function syncCandidateLocations() {
    let cargoConn, mainConn;
    
    try {
        console.log('🔗 连接数据库...');
        
        // 连接cyrgweixin数据库
        cargoConn = await sql.connect(cargoConfig);
        console.log('✅ cyrgweixin数据库连接成功');
        
        // 连接hotdog2030数据库
        mainConn = await sql.connect(config);
        console.log('✅ hotdog2030数据库连接成功');

        console.log('🧹 清空 hotdog2030.dbo.candidate_locations 表...');
        await mainConn.request().query('TRUNCATE TABLE hotdog2030.dbo.candidate_locations;');
        console.log('✅ 已清空 candidate_locations 表');

        // 查询cyrgweixin中的意向铺位数据
        console.log('📋 查询cyrgweixin.Rg_SeekShop数据...');
        const result = await cargoConn.request().query(`
            SELECT 
                Id,
                ShopName,
                ShopAddress,
                location,
                blurb,
                RecordTime,
                approvalState,
                approvalRemarks,
                amount
            FROM cyrgweixin.dbo.Rg_SeekShop 
            WHERE Delflag = 0 
            ORDER BY Id
        `);
        
        console.log(`📊 找到 ${result.recordset.length} 条意向铺位数据`);
        
        if (result.recordset.length === 0) {
            console.log('⚠️ 没有找到意向铺位数据');
            return;
        }

        // 显示前几条数据
        console.log('\\n📋 前5条数据预览:');
        result.recordset.slice(0, 5).forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.Id}, 店铺名: ${row.ShopName}, 地址: ${row.ShopAddress}`);
        });

        // 开始同步数据
        console.log('\\n🔄 开始同步数据到candidate_locations表...');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of result.recordset) {
            try {
                // 解析地址信息
                const address = row.ShopAddress || '';
                const location = row.location || '';
                const { longitude, latitude } = parseCoordinates(location);
                
                // 简单的地址解析（实际项目中可能需要更复杂的解析）
                let province = '未知';
                let city = '未知';
                let district = '未知';
                
                if (address.includes('北京')) {
                    province = '北京市';
                    city = '北京市';
                    if (address.includes('朝阳')) district = '朝阳区';
                    else if (address.includes('海淀')) district = '海淀区';
                    else if (address.includes('西城')) district = '西城区';
                    else if (address.includes('东城')) district = '东城区';
                } else if (address.includes('上海')) {
                    province = '上海市';
                    city = '上海市';
                    if (address.includes('浦东')) district = '浦东新区';
                    else if (address.includes('黄浦')) district = '黄浦区';
                    else if (address.includes('静安')) district = '静安区';
                } else if (address.includes('广州')) {
                    province = '广东省';
                    city = '广州市';
                    if (address.includes('天河')) district = '天河区';
                    else if (address.includes('越秀')) district = '越秀区';
                    else if (address.includes('海珠')) district = '海珠区';
                } else if (address.includes('深圳')) {
                    province = '广东省';
                    city = '深圳市';
                    if (address.includes('南山')) district = '南山区';
                    else if (address.includes('福田')) district = '福田区';
                    else if (address.includes('罗湖')) district = '罗湖区';
                }

                // 插入数据到candidate_locations表
                await mainConn.request()
                    .input('shop_name', sql.NVarChar(255), row.ShopName || '')
                    .input('shop_address', sql.NVarChar(255), address)
                    .input('location', sql.NVarChar(255), location)
                    .input('description', sql.NVarChar(1000), row.blurb || '')
                    .input('province', sql.NVarChar(50), province)
                    .input('city', sql.NVarChar(50), city)
                    .input('district', sql.NVarChar(50), district)
                    .input('rent_amount', sql.Decimal(18,2), row.amount || 0)
                    .input('approval_state', sql.NVarChar(50), row.approvalState || 'pending')
                    .input('approval_remarks', sql.NVarChar(1000), row.approvalRemarks || '')
                    .input('record_time', sql.NVarChar(255), row.RecordTime || '')
                    .input('status', sql.VarChar(20), 'pending')
                    .input('longitude', sql.Decimal(10, 7), longitude)
                    .input('latitude', sql.Decimal(10, 7), latitude)
                    .query(`
                        INSERT INTO hotdog2030.dbo.candidate_locations (
                            shop_name, shop_address, location, description,
                            province, city, district, rent_amount,
                            approval_state, approval_remarks, record_time, status,
                            longitude, latitude
                        ) VALUES (
                            @shop_name, @shop_address, @location, @description,
                            @province, @city, @district, @rent_amount,
                            @approval_state, @approval_remarks, @record_time, @status,
                            @longitude, @latitude
                        )
                    `);
                
                successCount++;
                
                if (successCount % 50 === 0) {
                    console.log(`✅ 已同步 ${successCount} 条数据...`);
                }
                
            } catch (error) {
                errorCount++;
                console.log(`❌ 同步第 ${row.Id} 条数据失败: ${error.message}`);
            }
        }
        
        console.log(`\\n🎉 数据同步完成！`);
        console.log(`✅ 成功: ${successCount} 条`);
        console.log(`❌ 失败: ${errorCount} 条`);
        console.log(`📊 总计: ${result.recordset.length} 条`);

        await recalculateCoordinates(mainConn);
        
        // 更新同步状态
        await mainConn.request()
            .input('table_name', sql.NVarChar(100), 'candidate_locations')
            .input('source_database', sql.NVarChar(50), 'cyrgweixin')
            .input('sync_status', sql.VarChar(20), 'success')
            .input('records_count', sql.Int, successCount)
            .query(`
                INSERT INTO hotdog2030.dbo.data_sync_status (table_name, source_database, last_sync_time, sync_status, records_count)
                VALUES (@table_name, @source_database, GETDATE(), @sync_status, @records_count)
            `);
        
        console.log('✅ 同步状态已更新');
        
    } catch (error) {
        console.error('❌ 同步失败:', error.message);
        
        // 记录错误状态
        try {
            if (mainConn) {
                await mainConn.request()
                    .input('table_name', sql.NVarChar(100), 'candidate_locations')
                    .input('source_database', sql.NVarChar(50), 'cyrgweixin')
                    .input('sync_status', sql.VarChar(20), 'failed')
                    .input('error_message', sql.NVarChar(MAX), error.message)
                    .query(`
                        INSERT INTO hotdog2030.dbo.data_sync_status (table_name, source_database, last_sync_time, sync_status, error_message)
                        VALUES (@table_name, @source_database, GETDATE(), @sync_status, @error_message)
                    `);
            }
        } catch (e) {
            console.log('⚠️ 无法记录错误状态');
        }
    } finally {
        if (cargoConn) await cargoConn.close();
        if (mainConn) await mainConn.close();
        console.log('🔌 数据库连接已关闭');
    }
}

// 执行同步
syncCandidateLocations();
