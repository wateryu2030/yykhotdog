// 客群画像模块状态管理

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { message } from 'antd';
import { 
  CustomerProfileContextType, 
  OverviewData, 
  SegmentationData, 
  BehaviorData, 
  AIInsightsData, 
  FilterState, 
  UIState 
} from '../types/customer';
import { CustomerProfileService } from '../services/customerService';

// 初始状态
const initialState = {
  overviewData: null as OverviewData | null,
  segmentationData: null as SegmentationData | null,
  behaviorData: null as BehaviorData | null,
  aiInsightsData: null as AIInsightsData | null,
  filters: {} as FilterState,
  ui: {
    loading: false,
    error: null,
    activeTab: 'overview',
    selectedSegment: null,
    showAdvancedFilters: false
  } as UIState
};

// Action类型
type Action = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OVERVIEW_DATA'; payload: OverviewData | null }
  | { type: 'SET_SEGMENTATION_DATA'; payload: SegmentationData | null }
  | { type: 'SET_BEHAVIOR_DATA'; payload: BehaviorData | null }
  | { type: 'SET_AI_INSIGHTS_DATA'; payload: AIInsightsData | null }
  | { type: 'UPDATE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_SELECTED_SEGMENT'; payload: string | null }
  | { type: 'TOGGLE_ADVANCED_FILTERS' };

// Reducer
function customerProfileReducer(state: typeof initialState, action: Action): typeof initialState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, loading: action.payload }
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        ui: { ...state.ui, error: action.payload }
      };
    
    case 'SET_OVERVIEW_DATA':
      return {
        ...state,
        overviewData: action.payload
      };
    
    case 'SET_SEGMENTATION_DATA':
      return {
        ...state,
        segmentationData: action.payload
      };
    
    case 'SET_BEHAVIOR_DATA':
      return {
        ...state,
        behaviorData: action.payload
      };
    
    case 'SET_AI_INSIGHTS_DATA':
      return {
        ...state,
        aiInsightsData: action.payload
      };
    
    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {}
      };
    
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: { ...state.ui, activeTab: action.payload }
      };
    
    case 'SET_SELECTED_SEGMENT':
      return {
        ...state,
        ui: { ...state.ui, selectedSegment: action.payload }
      };
    
    case 'TOGGLE_ADVANCED_FILTERS':
      return {
        ...state,
        ui: { ...state.ui, showAdvancedFilters: !state.ui.showAdvancedFilters }
      };
    
    default:
      return state;
  }
}

// Context
const CustomerProfileContext = createContext<CustomerProfileContextType | null>(null);

// Provider组件
export const CustomerProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(customerProfileReducer, initialState);

  // 获取概览数据
  const fetchOverview = useCallback(async (filters?: FilterState) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const data = await CustomerProfileService.getOverview(filters);
      dispatch({ type: 'SET_OVERVIEW_DATA', payload: data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取概览数据失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 获取客户分层数据
  const fetchSegmentation = useCallback(async (filters: FilterState) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const data = await CustomerProfileService.getSegmentation(filters);
      dispatch({ type: 'SET_SEGMENTATION_DATA', payload: data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取客户分层数据失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 获取行为分析数据
  const fetchBehaviorAnalysis = useCallback(async (filters: FilterState) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const data = await CustomerProfileService.getBehaviorAnalysis(filters);
      dispatch({ type: 'SET_BEHAVIOR_DATA', payload: data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取行为分析数据失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 生成AI洞察
  const generateAIInsights = useCallback(async (filters: FilterState) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const data = await CustomerProfileService.generateAIInsights(filters);
      dispatch({ type: 'SET_AI_INSIGHTS_DATA', payload: data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成AI洞察失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 更新筛选条件
  const updateFilters = useCallback((filters: Partial<FilterState>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  // 重置筛选条件
  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  // Context值
  const contextValue: CustomerProfileContextType = {
    overviewData: state.overviewData,
    segmentationData: state.segmentationData,
    behaviorData: state.behaviorData,
    aiInsightsData: state.aiInsightsData,
    filters: state.filters,
    ui: state.ui,
    actions: {
      fetchOverview,
      fetchSegmentation,
      fetchBehaviorAnalysis,
      generateAIInsights,
      updateFilters,
      resetFilters
    }
  };

  return (
    <CustomerProfileContext.Provider value={contextValue}>
      {children}
    </CustomerProfileContext.Provider>
  );
};

// Hook
export const useCustomerProfile = (): CustomerProfileContextType => {
  const context = useContext(CustomerProfileContext);
  if (!context) {
    throw new Error('useCustomerProfile must be used within a CustomerProfileProvider');
  }
  return context;
};
