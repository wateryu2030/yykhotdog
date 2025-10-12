// 高德地图服务
export const amapPOIService = {
  // 搜索POI点
  searchPOI: async (keyword: string, city: string) => {
    // 模拟API调用
    return {
      status: '1',
      count: '10',
      pois: [
        {
          id: '1',
          name: '示例学校',
          address: '示例地址',
          location: '116.397428,39.90923',
          type: '教育',
          tel: '010-12345678'
        }
      ]
    };
  },

  // 获取POI详情
  getPOIDetail: async (poiId: string) => {
    return {
      id: poiId,
      name: '示例学校详情',
      address: '详细地址',
      location: '116.397428,39.90923',
      type: '教育',
      tel: '010-12345678',
      business_area: '示例商圈'
    };
  }
};
