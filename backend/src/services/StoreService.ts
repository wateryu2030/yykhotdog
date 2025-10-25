import { Store, StoreStatus, StoreType } from '../models/Store';
import { SiteSelection } from '../models/SiteSelection';
import { StoreCacheService } from '../config/redis';
import { getStoreDatabaseConnection } from '../config/database-sharding';
import { logger } from '../utils/logger';
import { StoreAttributes } from '../models/Store';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * 门店服务类
 */
export class StoreService {
  /**
   * 创建门店
   */
  static async createStore(storeData: {
    store_code: string;
    store_name: string;
    store_type: StoreType;
    province: string;
    city: string;
    district: string;
    address: string;
    longitude?: number;
    latitude?: number;
    area_size?: number;
    rent_amount?: number;
    investment_amount?: number;
    expected_revenue?: number;
  }): Promise<Store> {
    try {
      // 验证门店编码唯一性
      const existingStore = await Store.findOne({
        where: { store_code: storeData.store_code }
      });
      
      if (existingStore) {
        throw new Error(`门店编码 ${storeData.store_code} 已存在`);
      }
      
      // 创建门店
      const store = await Store.create({
        ...storeData,
        status: StoreStatus.PLANNING
      });
      
      // 清除相关缓存
      await StoreCacheService.clearStoreCache(store.id, storeData.province);
      
      logger.info(`门店创建成功: ${store.store_code}`);
      return store;
      
    } catch (error) {
      logger.error('创建门店失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取门店信息
   */
  static async getStore(storeId: number): Promise<Store | null> {
    try {
      // 先尝试从缓存获取
      const cachedStore = await StoreCacheService.getStore(storeId);
      if (cachedStore) {
        return cachedStore;
      }
      
      // 从数据库获取
      const store = await Store.findByPk(storeId);
      if (store) {
        // 更新缓存
        await StoreCacheService.setStore(storeId, store.toJSON());
      }
      
      return store;
      
    } catch (error) {
      logger.error(`获取门店信息失败 ${storeId}:`, error);
      throw error;
    }
  }
  
  /**
   * 更新门店信息
   */
  static async updateStore(storeId: number, updateData: Partial<Store>): Promise<Store> {
    try {
      const store = await Store.findByPk(storeId);
      if (!store) {
        throw new Error(`门店 ${storeId} 不存在`);
      }
      
      // 更新门店信息
      await store.update(updateData);
      
      // 清除相关缓存
      await StoreCacheService.clearStoreCache(storeId, store.province);
      
      logger.info(`门店更新成功: ${store.store_code}`);
      return store;
      
    } catch (error) {
      logger.error(`更新门店失败 ${storeId}:`, error);
      throw error;
    }
  }
  
  /**
   * 删除门店
   */
  static async deleteStore(storeId: number): Promise<void> {
    try {
      const store = await Store.findByPk(storeId);
      if (!store) {
        throw new Error(`门店 ${storeId} 不存在`);
      }
      
      // 软删除 - 更新状态为已关闭
      await store.update({ status: StoreStatus.CLOSED });
      
      // 清除相关缓存
      await StoreCacheService.clearStoreCache(storeId, store.province);
      
      logger.info(`门店删除成功: ${store.store_code}`);
      
    } catch (error) {
      logger.error(`删除门店失败 ${storeId}:`, error);
      throw error;
    }
  }
  
  /**
   * 获取门店列表
   */
  static async getStoreList(params: {
    region?: string;
    status?: StoreStatus;
    store_type?: StoreType;
    page?: number;
    pageSize?: number;
  }): Promise<{
    stores: Store[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const { region, status, store_type, page = 1, pageSize = 20 } = params;
      
      // 构建查询条件
      const where: any = {};
      if (status) where.status = status;
      if (store_type) where.store_type = store_type;
      
      // 如果是按区域查询，先尝试从缓存获取
      if (region) {
        const cachedStores = await StoreCacheService.getStoreList(region);
        if (cachedStores) {
          const filteredStores = cachedStores.filter((store: any) => {
            if (status && store.status !== status) return false;
            if (store_type && store.store_type !== store_type) return false;
            return true;
          });
          
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          
          return {
            stores: filteredStores.slice(start, end),
            total: filteredStores.length,
            page,
            pageSize
          };
        }
      }
      
      // 从数据库查询
      const { count, rows } = await Store.findAndCountAll({
        where,
        offset: (page - 1) * pageSize,
        limit: pageSize,
        order: [['created_at', 'DESC']]
      });
      
      // 如果是按区域查询，更新缓存
      if (region) {
        const allStores = await Store.findAll({ where: { province: region } });
        await StoreCacheService.setStoreList(region, allStores.map(s => s.toJSON()));
      }
      
      return {
        stores: rows,
        total: count,
        page,
        pageSize
      };
      
    } catch (error) {
      logger.error('获取门店列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取门店统计信息
   */
  static async getStoreStats(region?: string): Promise<{
    total: number;
    operating: number;
    planning: number;
    construction: number;
    closed: number;
    byType: Record<StoreType, number>;
  }> {
    try {
      // 如果是按区域查询，先尝试从缓存获取
      if (region) {
        const cachedStats = await StoreCacheService.getStoreStats(region);
        if (cachedStats) {
          return cachedStats;
        }
      }
      
      // 构建查询条件
      const where: any = {};
      if (region) where.province = region;
      
      // 获取各状态门店数量
      const [total, operating, planning, construction, closed] = await Promise.all([
        Store.count({ where }),
        Store.count({ where: { ...where, status: StoreStatus.OPERATING } }),
        Store.count({ where: { ...where, status: StoreStatus.PLANNING } }),
        Store.count({ where: { ...where, status: StoreStatus.CONSTRUCTION } }),
        Store.count({ where: { ...where, status: StoreStatus.CLOSED } })
      ]);
      
      // 获取各类型门店数量
      const [direct, franchise, partner] = await Promise.all([
        Store.count({ where: { ...where, store_type: StoreType.DIRECT } }),
        Store.count({ where: { ...where, store_type: StoreType.FRANCHISE } }),
        Store.count({ where: { ...where, store_type: StoreType.PARTNER } })
      ]);
      
      const stats = {
        total,
        operating,
        planning,
        construction,
        closed,
        byType: {
          [StoreType.DIRECT]: direct,
          [StoreType.FRANCHISE]: franchise,
          [StoreType.PARTNER]: partner
        }
      };
      
      // 如果是按区域查询，更新缓存
      if (region) {
        await StoreCacheService.setStoreStats(region, stats);
      }
      
      return stats;
      
    } catch (error) {
      logger.error('获取门店统计失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量导入门店
   */
  static async batchImportStores(storesData: Array<{
    store_code: string;
    store_name: string;
    store_type: StoreType;
    province: string;
    city: string;
    district: string;
    address: string;
    longitude?: number;
    latitude?: number;
    area_size?: number;
    rent_amount?: number;
    investment_amount?: number;
    expected_revenue?: number;
  }>): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < storesData.length; i++) {
      try {
        await this.createStore(storesData[i]);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    logger.info(`批量导入门店完成: 成功 ${result.success}, 失败 ${result.failed}`);
    return result;
  }
  
  /**
   * 门店状态变更
   */
  static async changeStoreStatus(storeId: number, newStatus: StoreStatus): Promise<Store> {
    try {
      const store = await Store.findByPk(storeId);
      if (!store) {
        throw new Error(`门店 ${storeId} 不存在`);
      }
      
      // 验证状态变更的合法性
      const validTransitions: Record<StoreStatus, StoreStatus[]> = {
        [StoreStatus.PLANNING]: [StoreStatus.CONSTRUCTION, StoreStatus.CLOSED],
        [StoreStatus.CONSTRUCTION]: [StoreStatus.OPERATING, StoreStatus.CLOSED],
        [StoreStatus.OPERATING]: [StoreStatus.CLOSED],
        [StoreStatus.CLOSED]: []
      };
      
      if (!validTransitions[store.status].includes(newStatus)) {
        throw new Error(`不允许从状态 ${store.status} 变更为 ${newStatus}`);
      }
      
      // 更新状态
      await store.update({ status: newStatus });
      
      // 清除相关缓存
      await StoreCacheService.clearStoreCache(storeId, store.province);
      
      logger.info(`门店状态变更成功: ${store.store_code} ${store.status} -> ${newStatus}`);
      return store;
      
    } catch (error) {
      logger.error(`门店状态变更失败 ${storeId}:`, error);
      throw error;
    }
  }
  
  /**
   * 获取门店选址建议
   */
  static async getLocationSuggestions(params: {
    province: string;
    city: string;
    district?: string;
    limit?: number;
  }): Promise<SiteSelection[]> {
    try {
      const { province, city, district, limit = 10 } = params;
      
      const where: any = {
        province,
        city,
        status: 'approved'
      };
      
      if (district) {
        where.district = district;
      }
      
      const suggestions = await SiteSelection.findAll({
        where,
        order: [['score', 'DESC']],
        limit
      });
      
      return suggestions;
      
    } catch (error) {
      logger.error('获取选址建议失败:', error);
      throw error;
    }
  }
  
  /**
   * 门店数据同步到分片数据库
   */
  static async syncToShard(storeId: number): Promise<void> {
    try {
      const store = await Store.findByPk(storeId);
      if (!store) {
        throw new Error(`门店 ${storeId} 不存在`);
      }
      
      // 获取分片数据库连接
      const shardConnection = getStoreDatabaseConnection(storeId, store.province);
      
      // 同步门店数据到分片数据库
      await shardConnection.query(
        `INSERT INTO stores (id, store_code, store_name, store_type, status, province, city, district, address, longitude, latitude, area_size, rent_amount, investment_amount, expected_revenue, created_at, updated_at) 
         VALUES (:id, :store_code, :store_name, :store_type, :status, :province, :city, :district, :address, :longitude, :latitude, :area_size, :rent_amount, :investment_amount, :expected_revenue, :created_at, :updated_at)
         ON DUPLICATE KEY UPDATE
         store_name = VALUES(store_name),
         store_type = VALUES(store_type),
         status = VALUES(status),
         province = VALUES(province),
         city = VALUES(city),
         district = VALUES(district),
         address = VALUES(address),
         longitude = VALUES(longitude),
         latitude = VALUES(latitude),
         area_size = VALUES(area_size),
         rent_amount = VALUES(rent_amount),
         investment_amount = VALUES(investment_amount),
         expected_revenue = VALUES(expected_revenue),
         updated_at = VALUES(updated_at)`,
        {
          replacements: { ...store.toJSON() },
          type: 'INSERT'
        }
      );
      
      logger.info(`门店 ${storeId} 数据同步到分片数据库成功`);
      
    } catch (error) {
      logger.error(`门店数据同步失败 ${storeId}:`, error);
      throw error;
    }
  }

  static async createStores(storesData: StoreAttributes[]): Promise<{ success: number; errors: Array<{ index: number; error: string; }> }> {
    const result = { success: 0, errors: [] as Array<{ index: number; error: string; }> };
    
    for (let i = 0; i < storesData.length; i++) {
      try {
        if (storesData[i]) {
          await this.createStore(storesData[i]);
          result.success++;
        }
      } catch (error) {
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    return result;
  }

  static async exportStoreData(storeId: number): Promise<string> {
    try {
      const store = await Store.findByPk(storeId);
      if (!store) {
        throw new Error('门店不存在');
      }

      const sql = `
        SELECT 
          s.store_code,
          s.store_name,
          s.store_type,
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
          s.created_at,
          s.updated_at
        FROM stores s
        WHERE s.id = :storeId
      `;

      const [results] = await sequelize.query(sql, {
        replacements: store.toJSON() as any,
        type: QueryTypes.SELECT
      });

      return JSON.stringify(results, null, 2);
    } catch (error) {
      logger.error('导出门店数据失败:', error);
      throw error;
    }
  }
}

export default StoreService; 