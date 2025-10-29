import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

interface ProductCostData {
  product_name: string;
  cost_price: number;
  profit_price: number;
  sale_price: number;
  category: string;
  profit_margin: number;
}

interface CategoryMarginConfig {
  category: string;
  default_margin: number;
  min_margin: number;
  max_margin: number;
  sample_size: number;
  avg_margin: number;
}

interface DynamicMarginData {
  product_name: string;
  historical_margin: number;
  recent_margin: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  recommended_margin: number;
}

class ProfitAnalysisService {
  private categoryMarginConfigs: CategoryMarginConfig[] = [
    { category: '热狗类', default_margin: 0.39, min_margin: 0.35, max_margin: 0.45, sample_size: 0, avg_margin: 0 },
    { category: '套餐类', default_margin: 0.50, min_margin: 0.40, max_margin: 0.60, sample_size: 0, avg_margin: 0 },
    { category: '饮品类', default_margin: 0.14, min_margin: 0.10, max_margin: 0.20, sample_size: 0, avg_margin: 0 },
    { category: '小食类', default_margin: 0.45, min_margin: 0.35, max_margin: 0.55, sample_size: 0, avg_margin: 0 },
    { category: '其他', default_margin: 0.35, min_margin: 0.30, max_margin: 0.40, sample_size: 0, avg_margin: 0 }
  ];

  /**
   * 从cyrg2025.OrderGoods表获取真实成本数据
   * 使用分批查询避免超时
   */
  async getRealCostData(productNames: string[]): Promise<ProductCostData[]> {
    try {
      logger.info(`开始获取 ${productNames.length} 个商品的真实成本数据`);
      
      const batchSize = 50; // 分批处理，避免查询过大
      const results: ProductCostData[] = [];
      
      for (let i = 0; i < productNames.length; i += batchSize) {
        const batch = productNames.slice(i, i + batchSize);
        const batchResults = await this.getBatchCostData(batch);
        results.push(...batchResults);
        
        // 添加延迟避免数据库压力
        if (i + batchSize < productNames.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      logger.info(`成功获取 ${results.length} 个商品的成本数据`);
      return results;
    } catch (error) {
      logger.error('获取真实成本数据失败:', error);
      return [];
    }
  }

  /**
   * 分批获取成本数据
   */
  private async getBatchCostData(productNames: string[]): Promise<ProductCostData[]> {
    const placeholders = productNames.map(() => '?').join(',');
    
    const query = `
      SELECT 
        og.goodsName as product_name,
        AVG(ISNULL(og.costPrice, 0)) as cost_price,
        AVG(ISNULL(og.profitPrice, 0)) as profit_price,
        AVG(ISNULL(og.goodsPrice, 0)) as sale_price,
        CASE 
          WHEN og.goodsName LIKE '%热狗%' THEN '热狗类'
          WHEN og.goodsName LIKE '%套餐%' THEN '套餐类'
          WHEN og.goodsName LIKE '%饮料%' OR og.goodsName LIKE '%饮品%' THEN '饮品类'
          WHEN og.goodsName LIKE '%小食%' OR og.goodsName LIKE '%配菜%' THEN '小食类'
          ELSE '其他'
        END as category
      FROM cyrg2025.dbo.OrderGoods og
      WHERE og.goodsName IN (${placeholders})
        AND og.delflag = 0
        AND og.costPrice > 0
      GROUP BY og.goodsName
    `;

    try {
      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: productNames,
      }) as any[];

      return results.map(item => ({
        product_name: item.product_name,
        cost_price: item.cost_price || 0,
        profit_price: item.profit_price || 0,
        sale_price: item.sale_price || 0,
        category: item.category,
        profit_margin: item.sale_price > 0 ? 
          ((item.sale_price - item.cost_price) / item.sale_price) : 0
      }));
    } catch (error) {
      logger.error('分批获取成本数据失败:', error);
      return [];
    }
  }

  /**
   * 计算商品差异化毛利率
   */
  async calculateDifferentiatedMargins(products: any[]): Promise<any[]> {
    try {
      logger.info('开始计算差异化毛利率');
      
      // 获取真实成本数据
      const productNames = products.map(p => p.product_name);
      const costData = await this.getRealCostData(productNames);
      
      // 创建成本数据映射
      const costMap = new Map<string, ProductCostData>();
      costData.forEach(item => {
        costMap.set(item.product_name, item);
      });

      // 计算各类别的平均毛利率
      await this.updateCategoryMargins(costData);

      // 为每个商品计算差异化毛利率
      const results = products.map(product => {
        const costInfo = costMap.get(product.product_name);
        const categoryConfig = this.categoryMarginConfigs.find(c => c.category === costInfo?.category);
        
        let profitMargin = 0.5; // 默认50%
        let totalProfit = product.total_revenue * 0.5;
        let totalCost = product.total_revenue * 0.5;
        let costSource = 'fallback'; // 数据来源

        if (costInfo && costInfo.cost_price > 0) {
          // 优先使用真实成本数据
          profitMargin = costInfo.profit_margin;
          totalCost = product.total_revenue * (1 - profitMargin);
          totalProfit = product.total_revenue * profitMargin;
          costSource = 'real_data';
        } else if (categoryConfig && categoryConfig.avg_margin > 0) {
          // 如果有类别历史平均毛利率，使用它
          profitMargin = categoryConfig.avg_margin;
          totalCost = product.total_revenue * (1 - profitMargin);
          totalProfit = product.total_revenue * profitMargin;
          costSource = 'category_historical';
        } else if (categoryConfig) {
          // 使用类别默认毛利率
          profitMargin = categoryConfig.default_margin;
          totalCost = product.total_revenue * (1 - profitMargin);
          totalProfit = product.total_revenue * profitMargin;
          costSource = 'category_default';
        }

        return {
          ...product,
          total_profit: totalProfit,
          total_cost: totalCost,
          profit_margin: profitMargin * 100,
          cost_source: costSource,
          category: costInfo?.category || '其他'
        };
      });

      logger.info('差异化毛利率计算完成');
      return results;
    } catch (error) {
      logger.error('计算差异化毛利率失败:', error);
      return products.map(product => ({
        ...product,
        total_profit: product.total_revenue * 0.5,
        total_cost: product.total_revenue * 0.5,
        profit_margin: 50,
        cost_source: 'fallback',
        category: '其他'
      }));
    }
  }

  /**
   * 更新各类别的平均毛利率
   */
  private async updateCategoryMargins(costData: ProductCostData[]): Promise<void> {
    const categoryStats = new Map<string, { total: number, count: number }>();
    
    costData.forEach(item => {
      if (item.profit_margin > 0) {
        const existing = categoryStats.get(item.category) || { total: 0, count: 0 };
        existing.total += item.profit_margin;
        existing.count += 1;
        categoryStats.set(item.category, existing);
      }
    });

    // 更新配置
    this.categoryMarginConfigs.forEach(config => {
      const stats = categoryStats.get(config.category);
      if (stats && stats.count > 0) {
        config.avg_margin = stats.total / stats.count;
        config.sample_size = stats.count;
        logger.info(`${config.category} 平均毛利率: ${(config.avg_margin * 100).toFixed(2)}% (样本数: ${stats.count})`);
      }
    });
  }

  /**
   * 计算动态毛利率
   */
  async calculateDynamicMargins(products: any[]): Promise<any[]> {
    try {
      logger.info('开始计算动态毛利率');
      
      const results = [];
      
      for (const product of products) {
        const dynamicData = await this.getDynamicMarginData(product.product_name);
        
        let profitMargin = 0.5; // 默认50%
        let totalProfit = product.total_revenue * 0.5;
        let totalCost = product.total_revenue * 0.5;

        if (dynamicData && dynamicData.confidence > 0.7) {
          // 高置信度时使用动态毛利率
          profitMargin = dynamicData.recommended_margin;
          totalCost = product.total_revenue * (1 - profitMargin);
          totalProfit = product.total_revenue * profitMargin;
        }

        results.push({
          ...product,
          total_profit: totalProfit,
          total_cost: totalCost,
          profit_margin: profitMargin * 100,
          dynamic_data: dynamicData,
          margin_source: dynamicData && dynamicData.confidence > 0.7 ? 'dynamic' : 'static'
        });
      }

      logger.info('动态毛利率计算完成');
      return results;
    } catch (error) {
      logger.error('计算动态毛利率失败:', error);
      return products.map(product => ({
        ...product,
        total_profit: product.total_revenue * 0.5,
        total_cost: product.total_revenue * 0.5,
        profit_margin: 50,
        margin_source: 'fallback'
      }));
    }
  }

  /**
   * 获取单个商品的动态毛利率数据
   */
  private async getDynamicMarginData(productName: string): Promise<DynamicMarginData | null> {
    try {
      const query = `
        SELECT 
          AVG(CASE 
            WHEN og.goodsPrice > 0 AND og.costPrice > 0 
            THEN (og.goodsPrice - og.costPrice) / og.goodsPrice 
            ELSE NULL 
          END) as historical_margin,
          AVG(CASE 
            WHEN og.goodsPrice > 0 AND og.costPrice > 0 
            AND og.recordTime >= DATEADD(day, -30, GETDATE())
            THEN (og.goodsPrice - og.costPrice) / og.goodsPrice 
            ELSE NULL 
          END) as recent_margin,
          COUNT(*) as sample_count
        FROM cyrg2025.dbo.OrderGoods og
        WHERE og.goodsName = ?
          AND og.delflag = 0
          AND og.costPrice > 0
          AND og.goodsPrice > 0
      `;

      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: [productName],
      }) as any[];

      if (results.length === 0 || !results[0].historical_margin) {
        return null;
      }

      const data = results[0];
      const historicalMargin = data.historical_margin || 0;
      const recentMargin = data.recent_margin || historicalMargin;
      const sampleCount = data.sample_count || 0;

      // 计算趋势
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentMargin > historicalMargin * 1.05) {
        trend = 'increasing';
      } else if (recentMargin < historicalMargin * 0.95) {
        trend = 'decreasing';
      }

      // 计算置信度（基于样本数量）
      const confidence = Math.min(sampleCount / 100, 1); // 100个样本为满置信度

      // 推荐毛利率（考虑趋势）
      let recommendedMargin = recentMargin;
      if (trend === 'increasing' && confidence > 0.5) {
        recommendedMargin = recentMargin * 1.02; // 略微上调
      } else if (trend === 'decreasing' && confidence > 0.5) {
        recommendedMargin = recentMargin * 0.98; // 略微下调
      }

      return {
        product_name: productName,
        historical_margin: historicalMargin,
        recent_margin: recentMargin,
        trend,
        confidence,
        recommended_margin: Math.max(0.3, Math.min(0.7, recommendedMargin)) // 限制在30%-70%之间
      };
    } catch (error) {
      logger.error(`获取商品 ${productName} 动态毛利率失败:`, error);
      return null;
    }
  }

  /**
   * 获取类别毛利率配置
   */
  getCategoryMarginConfigs(): CategoryMarginConfig[] {
    return this.categoryMarginConfigs;
  }

  /**
   * 更新类别毛利率配置
   */
  updateCategoryMarginConfig(category: string, config: Partial<CategoryMarginConfig>): void {
    const index = this.categoryMarginConfigs.findIndex(c => c.category === category);
    if (index >= 0) {
      this.categoryMarginConfigs[index] = { ...this.categoryMarginConfigs[index], ...config };
      logger.info(`更新类别 ${category} 毛利率配置`);
    }
  }
}

export default ProfitAnalysisService;
