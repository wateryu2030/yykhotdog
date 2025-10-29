// 高德地图配置
export const AMAP_CONFIG = {
  // 使用有效的API密钥
  key: '6ca87ddc68113a085ad770fcd6a3d5d9', // 有效的Web API Key
  version: '2.0',
  plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.PlaceSearch']
};

// 地图默认配置
export const MAP_DEFAULT_CONFIG = {
  center: [121.6, 38.9], // 大连市中心
  zoom: 11,
  mapStyle: 'amap://styles/normal',
  features: ['bg', 'road', 'building', 'point']
};
