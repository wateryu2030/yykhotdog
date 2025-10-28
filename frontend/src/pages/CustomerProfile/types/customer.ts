// 客群画像模块类型定义

export interface OverviewData {
  totalCustomers: number;
  activeCustomers: number;
  avgOrderValue: number;
  customerLifetimeValue: number;
  growthRate: number;
  topSegments: SegmentSummary[];
  recentTrends: TrendData[];
}

export interface SegmentSummary {
  segment_name: string;
  customer_count: number;
  percentage: number;
  avg_spend: number;
  total_revenue: number;
  growth_rate: number;
}

export interface TrendData {
  date: string;
  customers: number;
  orders: number;
  revenue: number;
}

export interface SegmentationData {
  segments: CustomerSegment[];
  totalCustomers: number;
  summary: SegmentationSummary;
}

export interface CustomerSegment {
  segment_name: string;
  customer_count: number;
  avg_spend: number;
  avg_orders: number;
  total_revenue: number;
  lifetime_value_3y: number;
  growth_rate: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface SegmentationSummary {
  totalSegments: number;
  coreCustomers: number;
  activeCustomers: number;
  opportunityCustomers: number;
  dormantCustomers: number;
}

export interface BehaviorData {
  timeDistribution: TimeDistribution[];
  productPreferences: ProductPreference[];
  purchasePatterns: PurchasePattern[];
  customerJourney: CustomerJourney[];
}

export interface TimeDistribution {
  hour: string;
  customer_count: number;
  order_count: number;
  avg_order_value: number;
}

export interface ProductPreference {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  customer_count: number;
  preference_score: number;
}

export interface PurchasePattern {
  pattern_type: string;
  frequency: number;
  avg_amount: number;
  customer_count: number;
}

export interface CustomerJourney {
  stage: string;
  customer_count: number;
  conversion_rate: number;
  avg_duration: number;
}

export interface AIInsightsData {
  healthScore: number;
  customerValueAssessment: string;
  churnRiskPrediction: string;
  personalizedMarketingSuggestions: string[];
  priorityActions: PriorityAction[];
  productRecommendationStrategy: string;
  generatedAt: string;
}

export interface PriorityAction {
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

export interface FilterState {
  city?: string;
  storeId?: string;
  dateRange?: [string, string];
  segment?: string;
  customerType?: string;
}

export interface UIState {
  loading: boolean;
  error: string | null;
  activeTab: string;
  selectedSegment: string | null;
  showAdvancedFilters: boolean;
}

export interface CustomerProfileContextType {
  // 核心数据
  overviewData: OverviewData | null;
  segmentationData: SegmentationData | null;
  behaviorData: BehaviorData | null;
  aiInsightsData: AIInsightsData | null;
  
  // 筛选条件
  filters: FilterState;
  
  // UI状态
  ui: UIState;
  
  // 操作函数
  actions: {
    fetchOverview: (filters?: FilterState) => Promise<void>;
    fetchSegmentation: (filters: FilterState) => Promise<void>;
    fetchBehaviorAnalysis: (filters: FilterState) => Promise<void>;
    generateAIInsights: (filters: FilterState) => Promise<void>;
    updateFilters: (filters: Partial<FilterState>) => void;
    resetFilters: () => void;
  };
}
