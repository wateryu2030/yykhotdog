// 客群画像模块服务层

import { api } from '../../../config/api';
import { 
  OverviewData, 
  SegmentationData, 
  BehaviorData, 
  AIInsightsData, 
  FilterState 
} from '../types/customer';

export class CustomerProfileService {
  // 获取概览数据
  static async getOverview(filters?: FilterState): Promise<OverviewData> {
    try {
      const params = new URLSearchParams();
      if (filters?.city) params.append('city', filters.city);
      if (filters?.storeId) params.append('storeId', filters.storeId);
      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }

      const response = await api.get(`/customer-profile/dashboard-summary?${params.toString()}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取概览数据失败');
      }

      return response.data.data;
    } catch (error) {
      console.error('获取概览数据失败:', error);
      throw error;
    }
  }

  // 获取客户分层数据
  static async getSegmentation(filters: FilterState): Promise<SegmentationData> {
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.storeId) params.append('storeId', filters.storeId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }

      const response = await api.get(`/customer-profile/dashboard?${params.toString()}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取客户分层数据失败');
      }

      const rawData = response.data.data;
      
      // 转换数据格式
      const segments = rawData.segments.map((segment: any) => ({
        ...segment,
        growth_rate: 0, // 需要计算增长率
        risk_level: this.calculateRiskLevel(segment)
      }));

      const summary = {
        totalSegments: segments.length,
        coreCustomers: segments.find((s: any) => s.segment_name === '核心客户')?.customer_count || 0,
        activeCustomers: segments.find((s: any) => s.segment_name === '活跃客户')?.customer_count || 0,
        opportunityCustomers: segments.find((s: any) => s.segment_name === '机会客户')?.customer_count || 0,
        dormantCustomers: segments.find((s: any) => s.segment_name === '沉睡/新客户')?.customer_count || 0,
      };

      return {
        segments,
        totalCustomers: rawData.totalCustomers,
        summary
      };
    } catch (error) {
      console.error('获取客户分层数据失败:', error);
      throw error;
    }
  }

  // 获取行为分析数据
  static async getBehaviorAnalysis(filters: FilterState): Promise<BehaviorData> {
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.storeId) params.append('storeId', filters.storeId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }

      const response = await api.get(`/customer-profile/dashboard?${params.toString()}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取行为分析数据失败');
      }

      const rawData = response.data.data;
      
      // 转换时间分布数据
      const timeDistribution = rawData.timeDistribution.map((item: any) => ({
        ...item,
        avg_order_value: 0 // 需要计算平均订单价值
      }));

      // 获取产品偏好数据
      const productPreferences = rawData.productPreferences || [];

      return {
        timeDistribution,
        productPreferences,
        purchasePatterns: [], // 需要实现
        customerJourney: [] // 需要实现
      };
    } catch (error) {
      console.error('获取行为分析数据失败:', error);
      throw error;
    }
  }

  // 生成AI洞察
  static async generateAIInsights(filters: FilterState): Promise<AIInsightsData> {
    try {
      const response = await api.post('/customer-profile/ai-insights', {
        filters
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || '生成AI洞察失败');
      }

      return response.data.data.insights;
    } catch (error) {
      console.error('生成AI洞察失败:', error);
      throw error;
    }
  }

  // 获取城市列表
  static async getCities(): Promise<Array<{id: string, name: string, province: string}>> {
    try {
      const response = await api.get('/customer-profile/cities');
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取城市列表失败');
      }

      return response.data.data;
    } catch (error) {
      console.error('获取城市列表失败:', error);
      throw error;
    }
  }

  // 获取门店列表
  static async getStores(cityName?: string): Promise<Array<{id: string, store_name: string, city: string}>> {
    try {
      const url = cityName 
        ? `/customer-profile/stores/by-city-name/${encodeURIComponent(cityName)}`
        : '/customer-profile/stores';
      
      const response = await api.get(url);
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取门店列表失败');
      }

      return response.data.data;
    } catch (error) {
      console.error('获取门店列表失败:', error);
      throw error;
    }
  }

  // 计算风险等级
  private static calculateRiskLevel(segment: any): 'low' | 'medium' | 'high' {
    const { customer_count, avg_spend, avg_orders } = segment;
    
    // 简单的风险计算逻辑
    if (customer_count < 100 || avg_spend < 50) {
      return 'high';
    } else if (customer_count < 500 || avg_spend < 100) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
