import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

// 区域配置
export const REGIONS = {
  NORTH: 'north', // 华北
  EAST: 'east', // 华东
  SOUTH: 'south', // 华南
  CENTRAL: 'central', // 华中
  SOUTHWEST: 'southwest', // 西南
  NORTHWEST: 'northwest', // 西北
  NORTHEAST: 'northeast', // 东北
} as const;

// 数据库分片配置
export const DATABASE_SHARDS = {
  [REGIONS.NORTH]: {
    host: process.env['DB_NORTH_HOST'] || 'localhost',
    port: parseInt(process.env['DB_NORTH_PORT'] || '1433'),
    database: 'hotdog_north_001',
    username: process.env['DB_NORTH_USER'] || 'sa',
    password: process.env['DB_NORTH_PASSWORD'] || 'YourStrong@Passw0rd',
  },
  [REGIONS.EAST]: {
    host: process.env['DB_EAST_HOST'] || 'localhost',
    port: parseInt(process.env['DB_EAST_PORT'] || '1433'),
    database: 'hotdog_east_001',
    username: process.env['DB_EAST_USER'] || 'sa',
    password: process.env['DB_EAST_PASSWORD'] || 'YourStrong@Passw0rd',
  },
  [REGIONS.SOUTH]: {
    host: process.env['DB_SOUTH_HOST'] || 'localhost',
    port: parseInt(process.env['DB_SOUTH_PORT'] || '1433'),
    database: 'hotdog_south_001',
    username: process.env['DB_SOUTH_USER'] || 'sa',
    password: process.env['DB_SOUTH_PASSWORD'] || 'YourStrong@Passw0rd',
  },
  [REGIONS.CENTRAL]: {
    host: process.env['DB_CENTRAL_HOST'] || 'localhost',
    port: parseInt(process.env['DB_CENTRAL_PORT'] || '1433'),
    database: 'hotdog_central_001',
    username: process.env['DB_CENTRAL_USER'] || 'sa',
    password: process.env['DB_CENTRAL_PASSWORD'] || 'YourStrong@Passw0rd',
  },
  [REGIONS.SOUTHWEST]: {
    host: process.env['DB_SOUTHWEST_HOST'] || 'localhost',
    port: parseInt(process.env['DB_SOUTHWEST_PORT'] || '1433'),
    database: 'hotdog_southwest_001',
    username: process.env['DB_SOUTHWEST_USER'] || 'sa',
    password: process.env['DB_SOUTHWEST_PASSWORD'] || 'YourStrong@Passw0rd',
  },
  [REGIONS.NORTHWEST]: {
    host: process.env['DB_NORTHWEST_HOST'] || 'localhost',
    port: parseInt(process.env['DB_NORTHWEST_PORT'] || '1433'),
    database: 'hotdog_northwest_001',
    username: process.env['DB_NORTHWEST_USER'] || 'sa',
    password: process.env['DB_NORTHWEST_PASSWORD'] || 'YourStrong@Passw0rd',
  },
  [REGIONS.NORTHEAST]: {
    host: process.env['DB_NORTHEAST_HOST'] || 'localhost',
    port: parseInt(process.env['DB_NORTHEAST_PORT'] || '1433'),
    database: 'hotdog_northeast_001',
    username: process.env['DB_NORTHEAST_USER'] || 'sa',
    password: process.env['DB_NORTHEAST_PASSWORD'] || 'YourStrong@Passw0rd',
  },
};

// 省份到区域映射
export const PROVINCE_TO_REGION: Record<string, string> = {
  // 华北
  北京市: REGIONS.NORTH,
  天津市: REGIONS.NORTH,
  河北省: REGIONS.NORTH,
  山西省: REGIONS.NORTH,
  内蒙古自治区: REGIONS.NORTH,

  // 华东
  上海市: REGIONS.EAST,
  江苏省: REGIONS.EAST,
  浙江省: REGIONS.EAST,
  安徽省: REGIONS.EAST,
  福建省: REGIONS.EAST,
  江西省: REGIONS.EAST,
  山东省: REGIONS.EAST,

  // 华南
  广东省: REGIONS.SOUTH,
  广西壮族自治区: REGIONS.SOUTH,
  海南省: REGIONS.SOUTH,
  香港特别行政区: REGIONS.SOUTH,
  澳门特别行政区: REGIONS.SOUTH,
  台湾省: REGIONS.SOUTH,

  // 华中
  河南省: REGIONS.CENTRAL,
  湖北省: REGIONS.CENTRAL,
  湖南省: REGIONS.CENTRAL,

  // 西南
  重庆市: REGIONS.SOUTHWEST,
  四川省: REGIONS.SOUTHWEST,
  贵州省: REGIONS.SOUTHWEST,
  云南省: REGIONS.SOUTHWEST,
  西藏自治区: REGIONS.SOUTHWEST,

  // 西北
  陕西省: REGIONS.NORTHWEST,
  甘肃省: REGIONS.NORTHWEST,
  青海省: REGIONS.NORTHWEST,
  宁夏回族自治区: REGIONS.NORTHWEST,
  新疆维吾尔自治区: REGIONS.NORTHWEST,

  // 东北
  辽宁省: REGIONS.NORTHEAST,
  吉林省: REGIONS.NORTHEAST,
  黑龙江省: REGIONS.NORTHEAST,
};

// 数据库连接池
const connectionPools: Record<string, Sequelize> = {};

/**
 * 根据省份获取对应的区域
 */
export function getRegionByProvince(province: string): string {
  const region = PROVINCE_TO_REGION[province];
  if (!region) {
    logger.warn(`未找到省份 ${province} 对应的区域，使用默认区域 ${REGIONS.NORTH}`);
    return REGIONS.NORTH;
  }
  return region;
}

/**
 * 根据门店ID获取分片索引
 */
export function getShardIndex(storeId: number): number {
  return storeId % 100; // 100个分片
}

/**
 * 获取数据库名称
 */
export function getDatabaseName(region: string, shardIndex: number): string {
  return `hotdog_${region}_${String(shardIndex).padStart(3, '0')}`;
}

/**
 * 获取数据库连接
 */
export function getDatabaseConnection(region: string, shardIndex: number = 0): Sequelize {
  const dbName = getDatabaseName(region, shardIndex);
  const poolKey = `${region}_${shardIndex}`;

  if (connectionPools[poolKey]) {
    return connectionPools[poolKey];
  }

  const config = DATABASE_SHARDS[region];
  if (!config) {
    throw new Error(`未找到区域 ${region} 的数据库配置`);
  }

  const sequelize = new Sequelize({
    dialect: 'mssql',
    host: config.host,
    port: config.port,
    database: dbName,
    username: config.username,
    password: config.password,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    logging: msg => logger.debug(msg),
  });

  connectionPools[poolKey] = sequelize;
  return sequelize;
}

/**
 * 根据门店信息获取数据库连接
 */
export function getStoreDatabaseConnection(storeId: number, province: string): Sequelize {
  const region = getRegionByProvince(province);
  const shardIndex = getShardIndex(storeId);
  return getDatabaseConnection(region, shardIndex);
}

/**
 * 获取所有数据库连接
 */
export function getAllDatabaseConnections(): Sequelize[] {
  const connections: Sequelize[] = [];

  for (const region of Object.values(REGIONS)) {
    for (let shardIndex = 0; shardIndex < 100; shardIndex++) {
      try {
        const connection = getDatabaseConnection(region, shardIndex);
        connections.push(connection);
      } catch (error) {
        logger.warn(`无法连接到数据库 ${getDatabaseName(region, shardIndex)}: ${error}`);
      }
    }
  }

  return connections;
}

/**
 * 测试数据库连接
 */
export async function testDatabaseConnections(): Promise<void> {
  logger.info('开始测试数据库连接...');

  for (const region of Object.values(REGIONS)) {
    try {
      const connection = getDatabaseConnection(region, 0);
      await connection.authenticate();
      logger.info(`✅ 区域 ${region} 数据库连接成功`);
    } catch (error) {
      logger.error(`❌ 区域 ${region} 数据库连接失败: ${error}`);
    }
  }
}

/**
 * 关闭所有数据库连接
 */
export async function closeAllDatabaseConnections(): Promise<void> {
  logger.info('关闭所有数据库连接...');

  for (const connection of Object.values(connectionPools)) {
    try {
      await connection.close();
    } catch (error) {
      logger.warn(`关闭数据库连接失败: ${error}`);
    }
  }

  // 清空连接池
  Object.keys(connectionPools).forEach(key => delete connectionPools[key]);
}

/**
 * 数据迁移工具
 */
export class DataMigration {
  /**
   * 迁移门店数据到分片数据库
   */
  static async migrateStoreData(
    sourceConnection: Sequelize,
    storeId: number,
    province: string
  ): Promise<void> {
    const targetConnection = getStoreDatabaseConnection(storeId, province);

    try {
      // 开始事务
      const transaction = await targetConnection.transaction();

      try {
        // 迁移门店基础信息
        const storeData = await sourceConnection.query('SELECT * FROM stores WHERE id = :storeId', {
          replacements: { storeId },
          type: 'SELECT',
        });

        if (storeData[0].length > 0) {
          await targetConnection.query(
            'INSERT INTO stores (id, store_code, store_name, store_type, status, province, city, district, address, longitude, latitude, area_size, rent_amount, investment_amount, expected_revenue, created_at, updated_at) VALUES (:id, :store_code, :store_name, :store_type, :status, :province, :city, :district, :address, :longitude, :latitude, :area_size, :rent_amount, :investment_amount, :expected_revenue, :created_at, :updated_at)',
            {
              replacements: storeData[0][0] as { [key: string]: unknown },
              type: 'INSERT',
            }
          );
        }

        // 提交事务
        await transaction.commit();
        logger.info(`门店 ${storeId} 数据迁移成功`);
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error(`门店 ${storeId} 数据迁移失败: ${error}`);
      throw error;
    }
  }

  /**
   * 批量迁移数据
   */
  static async batchMigrateData(
    sourceConnection: Sequelize,
    batchSize: number = 1000
  ): Promise<void> {
    logger.info('开始批量数据迁移...');

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        // 获取一批门店数据
        const stores = await sourceConnection.query(
          'SELECT id, province FROM stores ORDER BY id LIMIT :limit OFFSET :offset',
          {
            replacements: { limit: batchSize, offset },
            type: 'SELECT',
          }
        );

        if (stores[0].length === 0) {
          hasMore = false;
          break;
        }

        // 并行迁移数据
        const migrationPromises = stores[0].map((store: any) =>
          this.migrateStoreData(sourceConnection, store.id, store.province)
        );

        await Promise.all(migrationPromises);

        offset += batchSize;
        logger.info(`已迁移 ${offset} 条门店数据`);
      } catch (error) {
        logger.error(`批量迁移失败，偏移量 ${offset}: ${error}`);
        throw error;
      }
    }

    logger.info('批量数据迁移完成');
  }
}

export default {
  REGIONS,
  DATABASE_SHARDS,
  PROVINCE_TO_REGION,
  getRegionByProvince,
  getShardIndex,
  getDatabaseName,
  getDatabaseConnection,
  getStoreDatabaseConnection,
  getAllDatabaseConnections,
  testDatabaseConnections,
  closeAllDatabaseConnections,
  DataMigration,
};
