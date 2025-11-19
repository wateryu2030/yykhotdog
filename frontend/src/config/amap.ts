// 高德地图配置
export const AMAP_CONFIG = {
  // 使用有效的API密钥（Web端JS API Key）
  // 从高德地图控制台获取：应用 -> Key名称 -> Key列的值（不是安全密钥）
  key: '703f67ca1815ae0324022fcf7bc2afe9', // newstore的Web端Key
  version: '2.0',
  plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.MapType']
};

// 地图默认配置
export const MAP_DEFAULT_CONFIG = {
  center: [121.6, 38.9], // 大连市中心
  zoom: 11,
  mapStyle: 'amap://styles/normal',
  features: ['bg', 'road', 'building', 'point']
};
