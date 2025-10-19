// API配置
export const API_CONFIG = {
  // 使用相对路径，通过Nginx代理
  BASE_URL: '',
  
  // 后端API端点
  BACKEND: {
    DASHBOARD: '/api/dashboard',
    SITE_SELECTION: '/api/site-selection',
    OPERATIONS: '/api/operations',
    ALLOCATION: '/api/allocation',
  },
  
  // 高德地图API端点
  AMAP: {
    REVERSE_GEOCODE_URL: '/api/amap/reverse-geocode',
    WEATHER_URL: '/api/amap/weather',
    POI_SEARCH_URL: '/api/amap/poi-search',
  },
  
  // 和风天气API端点
  QWEATHER: {
    NOW_URL: '/api/qweather/now',
    FORECAST_URL: '/api/qweather/forecast',
    HOURLY_URL: '/api/qweather/hourly',
  },
  
  // API端点
  ENDPOINTS: {
    // 地区相关
    REGION_CASCADE: '/api/region/cascade',
    
    // AI相关
    AI_SMART: '/api/ai/smart',
    AI_ANALYZE: '/api/ai/analyze',
    
    // 地图相关
    MAP_POI: '/api/map/poi',
    
    // 选址分析
    SITE_ANALYSIS: '/api/site-selection/analyze',
    
    // 其他API...
  }
};

// 获取完整的API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 检查是否为开发环境
export const isDevelopment = process.env.NODE_ENV === 'development';

// 检查是否为生产环境
export const isProduction = process.env.NODE_ENV === 'production';

// 通用API调用函数
export const api = {
  get: async (url: string, config?: any) => {
    try {
      const params = config?.params ? `?${new URLSearchParams(config.params)}` : '';
      // 使用完整URL
      const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}/api${url}`;
      
      const response = await fetch(`${fullUrl}${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers,
        },
      });

      // 检查响应状态
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        }
        if (response.status === 404) {
          throw new Error('请求的资源不存在');
        }
        if (response.status >= 500) {
          throw new Error('服务器内部错误，请稍后再试');
        }
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  },

  post: async (url: string, data?: any, config?: any) => {
    try {
      // 使用完整URL
      const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}/api${url}`;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      // 检查响应状态
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        }
        if (response.status === 404) {
          throw new Error('请求的资源不存在');
        }
        if (response.status >= 500) {
          throw new Error('服务器内部错误，请稍后再试');
        }
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }
};

// 后端API调用函数
export const backendAPI = {
  // 仪表板数据
  getDashboard: async (params?: any) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND.DASHBOARD}?${new URLSearchParams(params)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      throw error;
    }
  },

  // 站点选择
  getSiteSelection: async (params?: any) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND.SITE_SELECTION}?${new URLSearchParams(params)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取站点选择数据失败:', error);
      throw error;
    }
  },

  // 门店运营
  getOperations: async (params?: any) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND.OPERATIONS}?${new URLSearchParams(params)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取运营数据失败:', error);
      throw error;
    }
  },

  // 收益分配
  getAllocation: async (params?: any) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND.ALLOCATION}?${new URLSearchParams(params)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取分配数据失败:', error);
      throw error;
    }
  }
};

// 高德地图API调用函数（通过后端代理）
export const amapAPI = {
  // 逆地理编码
  reverseGeocode: async (longitude: number, latitude: number) => {
    try {
      const response = await fetch(
        `${API_CONFIG.AMAP.REVERSE_GEOCODE_URL}?longitude=${longitude}&latitude=${latitude}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('高德地图逆地理编码失败:', error);
      throw error;
    }
  },

  // 天气查询
  getWeather: async (city: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.AMAP.WEATHER_URL}?city=${encodeURIComponent(city)}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('高德地图天气查询失败:', error);
      throw error;
    }
  },

  // POI搜索
  searchPOI: async (keyword: string, city: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.AMAP.POI_SEARCH_URL}?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('POI搜索失败:', error);
      throw error;
    }
  }
};

// 和风天气API调用函数（通过后端代理）
export const qweatherAPI = {
  // 实时天气
  getNowWeather: async (location: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.QWEATHER.NOW_URL}?location=${encodeURIComponent(location)}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('和风天气实时天气查询失败:', error);
      throw error;
    }
  },

  // 7天预报
  getForecast: async (location: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.QWEATHER.FORECAST_URL}?location=${encodeURIComponent(location)}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('和风天气7天预报查询失败:', error);
      throw error;
    }
  },

  // 24小时预报
  getHourly: async (location: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.QWEATHER.HOURLY_URL}?location=${encodeURIComponent(location)}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('和风天气24小时预报查询失败:', error);
      throw error;
    }
  }
}; 