import { Cluster } from 'ioredis';
import { logger } from '../utils/logger';

// Redis集群配置
export const REDIS_CONFIG = {
  // 主集群 - 存储核心业务数据
  main: {
    nodes: [
      { host: process.env['REDIS_MAIN_HOST_1'] || 'localhost', port: parseInt(process.env['REDIS_MAIN_PORT_1'] || '6379') },
      { host: process.env['REDIS_MAIN_HOST_2'] || 'localhost', port: parseInt(process.env['REDIS_MAIN_PORT_2'] || '6380') },
      { host: process.env['REDIS_MAIN_HOST_3'] || 'localhost', port: parseInt(process.env['REDIS_MAIN_PORT_3'] || '6381') }
    ],
    options: {
      redisOptions: {
        password: process.env['REDIS_MAIN_PASSWORD'] || undefined,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
      clusterOptions: {
        scaleReads: 'slave',
        maxRedirections: 16,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
      }
    }
  },
  
  // 会话集群 - 存储用户会话
  session: {
    nodes: [
      { host: process.env['REDIS_SESSION_HOST_1'] || 'localhost', port: parseInt(process.env['REDIS_SESSION_PORT_1'] || '6382') },
      { host: process.env['REDIS_SESSION_HOST_2'] || 'localhost', port: parseInt(process.env['REDIS_SESSION_PORT_2'] || '6383') }
    ],
    options: {
      redisOptions: {
        password: process.env['REDIS_SESSION_PASSWORD'] || undefined,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
      clusterOptions: {
        scaleReads: 'slave',
        maxRedirections: 16,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
      }
    }
  },
  
  // 缓存集群 - 存储业务缓存
  cache: {
    nodes: [
      { host: process.env['REDIS_CACHE_HOST_1'] || 'localhost', port: parseInt(process.env['REDIS_CACHE_PORT_1'] || '6384') },
      { host: process.env['REDIS_CACHE_HOST_2'] || 'localhost', port: parseInt(process.env['REDIS_CACHE_PORT_2'] || '6385') },
      { host: process.env['REDIS_CACHE_HOST_3'] || 'localhost', port: parseInt(process.env['REDIS_CACHE_PORT_3'] || '6386') }
    ],
    options: {
      redisOptions: {
        password: process.env['REDIS_CACHE_PASSWORD'] || undefined,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
      clusterOptions: {
        scaleReads: 'slave',
        maxRedirections: 16,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
      }
    }
  }
};

// Redis连接实例
let mainCluster: Cluster | null = null;
let sessionCluster: Cluster | null = null;
let cacheCluster: Cluster | null = null;

// 本地缓存 (L1缓存)
const localCache = new Map<string, { value: any; expiry: number }>();

/**
 * 获取主集群连接
 */
export function getMainCluster(): Cluster {
  if (!mainCluster) {
    mainCluster = new Cluster(
      REDIS_CONFIG.main.nodes,
      REDIS_CONFIG.main.options
    );
    
    mainCluster.on('error', (error: any) => {
      logger.error('Redis主集群连接错误:', error);
    });
    
    mainCluster.on('connect', () => {
      logger.info('Redis主集群连接成功');
    });
  }
  return mainCluster;
}

/**
 * 获取会话集群连接
 */
export function getSessionCluster(): Cluster {
  if (!sessionCluster) {
    sessionCluster = new Cluster(
      REDIS_CONFIG.session.nodes,
      REDIS_CONFIG.session.options
    );
    
    sessionCluster.on('error', (error: any) => {
      logger.error('Redis会话集群连接错误:', error);
    });
    
    sessionCluster.on('connect', () => {
      logger.info('Redis会话集群连接成功');
    });
  }
  return sessionCluster;
}

/**
 * 获取缓存集群连接
 */
export function getCacheCluster(): Cluster {
  if (!cacheCluster) {
    cacheCluster = new Cluster(
      REDIS_CONFIG.cache.nodes,
      REDIS_CONFIG.cache.options
    );
    
    cacheCluster.on('error', (error: any) => {
      logger.error('Redis缓存集群连接错误:', error);
    });
    
    cacheCluster.on('connect', () => {
      logger.info('Redis缓存集群连接成功');
    });
  }
  return cacheCluster;
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  // 门店相关缓存键
  static store(storeId: number): string {
    return `stores:${storeId}`;
  }
  
  static storeList(region: string): string {
    return `stores:list:${region}`;
  }
  
  static storeStats(region: string): string {
    return `stores:stats:${region}`;
  }
  
  // 销售相关缓存键
  static salesDaily(storeId: number, date: string): string {
    return `sales:daily:${storeId}:${date}`;
  }
  
  static salesMonthly(storeId: number, yearMonth: string): string {
    return `sales:monthly:${storeId}:${yearMonth}`;
  }
  
  static salesRealtime(storeId: number): string {
    return `sales:realtime:${storeId}`;
  }
  
  // 用户相关缓存键
  static userSession(userId: number): string {
    return `session:${userId}`;
  }
  
  static userPermissions(userId: number): string {
    return `permissions:${userId}`;
  }
  
  // 系统相关缓存键
  static systemConfig(key: string): string {
    return `system:config:${key}`;
  }
  
  static apiRateLimit(ip: string): string {
    return `rate_limit:${ip}`;
  }
}

/**
 * 多级缓存管理器
 */
export class CacheManager {
  /**
   * 获取缓存值 (L1 -> L2 -> L3)
   */
  static async get<T>(key: string, cluster: Cluster = getCacheCluster()): Promise<T | null> {
    try {
      // L1缓存检查
      const localValue = localCache.get(key);
      if (localValue && localValue.expiry > Date.now()) {
        return localValue.value as T;
      }
      
      // L2缓存检查
      const value = await cluster.get(key);
      if (value) {
        const parsedValue = JSON.parse(value);
        
        // 更新L1缓存
        localCache.set(key, {
          value: parsedValue,
          expiry: Date.now() + 60000 // 1分钟本地缓存
        });
        
        return parsedValue as T;
      }
      
      return null;
    } catch (error) {
      logger.error(`获取缓存失败 ${key}:`, error);
      return null;
    }
  }
  
  /**
   * 设置缓存值
   */
  static async set<T>(
    key: string, 
    value: T, 
    ttl: number = 3600, 
    cluster: Cluster = getCacheCluster()
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      // 设置L2缓存
      await cluster.setex(key, ttl, serializedValue);
      
      // 更新L1缓存
      localCache.set(key, {
        value,
        expiry: Date.now() + Math.min(ttl * 1000, 60000) // 最多1分钟本地缓存
      });
    } catch (error) {
      logger.error(`设置缓存失败 ${key}:`, error);
    }
  }
  
  /**
   * 删除缓存
   */
  static async delete(key: string, cluster: Cluster = getCacheCluster()): Promise<void> {
    try {
      // 删除L2缓存
      await cluster.del(key);
      
      // 删除L1缓存
      localCache.delete(key);
    } catch (error) {
      logger.error(`删除缓存失败 ${key}:`, error);
    }
  }
  
  /**
   * 批量获取缓存
   */
  static async mget<T>(keys: string[], cluster: Cluster = getCacheCluster()): Promise<(T | null)[]> {
    try {
      const pipeline = cluster.pipeline();
      keys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      return results?.map(([err, result]: [any, any]) => {
        if (err) {
          logger.error('Redis管道执行错误:', err);
          return null;
        }
        return result;
      }).filter(Boolean);
    } catch (error) {
      logger.error('批量获取缓存失败:', error);
      return keys.map(() => null);
    }
  }
  
  /**
   * 批量设置缓存
   */
  static async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
    cluster: Cluster = getCacheCluster()
  ): Promise<void> {
    try {
      const pipeline = cluster.pipeline();
      
      keyValuePairs.forEach(({ key, value, ttl = 3600 }) => {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, ttl, serializedValue);
      });
      
      await pipeline.exec();
    } catch (error) {
      logger.error('批量设置缓存失败:', error);
    }
  }
  
  /**
   * 清理过期缓存
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, data] of localCache.entries()) {
      if (data.expiry <= now) {
        localCache.delete(key);
      }
    }
  }
}

/**
 * 门店缓存服务
 */
export class StoreCacheService {
  /**
   * 获取门店信息
   */
  static async getStore(storeId: number): Promise<any | null> {
    const key = CacheKeyGenerator.store(storeId);
    return await CacheManager.get(key);
  }
  
  /**
   * 设置门店信息
   */
  static async setStore(storeId: number, storeData: any): Promise<void> {
    const key = CacheKeyGenerator.store(storeId);
    await CacheManager.set(key, storeData, 3600); // 1小时缓存
  }
  
  /**
   * 获取区域门店列表
   */
  static async getStoreList(region: string): Promise<any[] | null> {
    const key = CacheKeyGenerator.storeList(region);
    return await CacheManager.get<any[]>(key);
  }
  
  /**
   * 设置区域门店列表
   */
  static async setStoreList(region: string, stores: any[]): Promise<void> {
    const key = CacheKeyGenerator.storeList(region);
    await CacheManager.set(key, stores, 1800); // 30分钟缓存
  }
  
  /**
   * 获取区域门店统计
   */
  static async getStoreStats(region: string): Promise<any | null> {
    const key = CacheKeyGenerator.storeStats(region);
    return await CacheManager.get(key);
  }
  
  /**
   * 设置区域门店统计
   */
  static async setStoreStats(region: string, stats: any): Promise<void> {
    const key = CacheKeyGenerator.storeStats(region);
    await CacheManager.set(key, stats, 300); // 5分钟缓存
  }
  
  /**
   * 清除门店相关缓存
   */
  static async clearStoreCache(storeId: number, region: string): Promise<void> {
    const keys = [
      CacheKeyGenerator.store(storeId),
      CacheKeyGenerator.storeList(region),
      CacheKeyGenerator.storeStats(region)
    ];
    
    await Promise.all(keys.map(key => CacheManager.delete(key)));
  }
}

/**
 * 销售缓存服务
 */
export class SalesCacheService {
  /**
   * 获取日销售数据
   */
  static async getDailySales(storeId: number, date: string): Promise<any | null> {
    const key = CacheKeyGenerator.salesDaily(storeId, date);
    return await CacheManager.get(key);
  }
  
  /**
   * 设置日销售数据
   */
  static async setDailySales(storeId: number, date: string, data: any): Promise<void> {
    const key = CacheKeyGenerator.salesDaily(storeId, date);
    await CacheManager.set(key, data, 600); // 10分钟缓存
  }
  
  /**
   * 获取月销售数据
   */
  static async getMonthlySales(storeId: number, yearMonth: string): Promise<any | null> {
    const key = CacheKeyGenerator.salesMonthly(storeId, yearMonth);
    return await CacheManager.get(key);
  }
  
  /**
   * 设置月销售数据
   */
  static async setMonthlySales(storeId: number, yearMonth: string, data: any): Promise<void> {
    const key = CacheKeyGenerator.salesMonthly(storeId, yearMonth);
    await CacheManager.set(key, data, 3600); // 1小时缓存
  }
  
  /**
   * 获取实时销售数据
   */
  static async getRealtimeSales(storeId: number): Promise<any | null> {
    const key = CacheKeyGenerator.salesRealtime(storeId);
    return await CacheManager.get(key);
  }
  
  /**
   * 设置实时销售数据
   */
  static async setRealtimeSales(storeId: number, data: any): Promise<void> {
    const key = CacheKeyGenerator.salesRealtime(storeId);
    await CacheManager.set(key, data, 60); // 1分钟缓存
  }
}

/**
 * 用户缓存服务
 */
export class UserCacheService {
  /**
   * 获取用户会话
   */
  static async getUserSession(userId: number): Promise<any | null> {
    const key = CacheKeyGenerator.userSession(userId);
    return await CacheManager.get(key, getSessionCluster());
  }
  
  /**
   * 设置用户会话
   */
  static async setUserSession(userId: number, sessionData: any): Promise<void> {
    const key = CacheKeyGenerator.userSession(userId);
    await CacheManager.set(key, sessionData, 7200, getSessionCluster()); // 2小时缓存
  }
  
  /**
   * 获取用户权限
   */
  static async getUserPermissions(userId: number): Promise<any | null> {
    const key = CacheKeyGenerator.userPermissions(userId);
    return await CacheManager.get(key, getSessionCluster());
  }
  
  /**
   * 设置用户权限
   */
  static async setUserPermissions(userId: number, permissions: any): Promise<void> {
    const key = CacheKeyGenerator.userPermissions(userId);
    await CacheManager.set(key, permissions, 3600, getSessionCluster()); // 1小时缓存
  }
  
  /**
   * 清除用户缓存
   */
  static async clearUserCache(userId: number): Promise<void> {
    const keys = [
      CacheKeyGenerator.userSession(userId),
      CacheKeyGenerator.userPermissions(userId)
    ];
    
    await Promise.all(keys.map(key => CacheManager.delete(key, getSessionCluster())));
  }
}

/**
 * 初始化Redis连接
 */
export async function initializeRedis(): Promise<void> {
  try {
    logger.info('初始化Redis连接...');
    
    // 测试连接
    await getMainCluster().ping();
    await getSessionCluster().ping();
    await getCacheCluster().ping();
    
    logger.info('Redis连接初始化成功');
    
    // 启动本地缓存清理任务
    setInterval(() => {
      CacheManager.cleanup();
    }, 60000); // 每分钟清理一次
    
  } catch (error) {
    logger.error('Redis连接初始化失败:', error);
    throw error;
  }
}

/**
 * 关闭Redis连接
 */
export async function closeRedis(): Promise<void> {
  try {
    logger.info('关闭Redis连接...');
    
    if (mainCluster) {
      await mainCluster.disconnect();
      mainCluster = null;
    }
    
    if (sessionCluster) {
      await sessionCluster.disconnect();
      sessionCluster = null;
    }
    
    if (cacheCluster) {
      await cacheCluster.disconnect();
      cacheCluster = null;
    }
    
    // 清空本地缓存
    localCache.clear();
    
    logger.info('Redis连接已关闭');
  } catch (error) {
    logger.error('关闭Redis连接失败:', error);
  }
}

export default {
  REDIS_CONFIG,
  getMainCluster,
  getSessionCluster,
  getCacheCluster,
  CacheKeyGenerator,
  CacheManager,
  StoreCacheService,
  SalesCacheService,
  UserCacheService,
  initializeRedis,
  closeRedis
}; 