# MapWeather 组件使用说明

## 概述

MapWeather 组件是一个集成了高德地图API的位置和天气信息显示组件，用于在Dashboard页面右侧显示实时位置和天气信息。

## 功能特性

- ✅ **实时位置获取**: 使用浏览器地理定位API获取用户当前位置
- ✅ **高德地图逆地理编码**: 将GPS坐标转换为城市名称
- ✅ **高德地图天气API**: 获取实时天气信息
- ✅ **备用模拟数据**: 当API不可用时使用模拟数据
- ✅ **响应式设计**: 适配不同屏幕尺寸
- ✅ **实时刷新**: 支持手动刷新数据

## API配置

### 高德地图API密钥

组件已配置使用以下高德地图API密钥：
- **API密钥**: `94726e955daa3fa24f48d0b42a17d02d`
- **备用密钥**: `3a51e6e2bf985bab2a047fa4aaa23fe2`

### API端点

- **逆地理编码**: `https://restapi.amap.com/v3/geocode/regeo`
- **天气查询**: `https://restapi.amap.com/v3/weather/weatherInfo`

## 使用方法

### 1. 基本使用

```tsx
import MapWeather from '../components/MapWeather';

// 在Dashboard组件中使用
<MapWeather className="dashboard-weather-panel" />
```

### 2. 在Dashboard中的集成

组件已在 `frontend/src/pages/Dashboard.tsx` 中集成到右侧面板：

```tsx
// Dashboard.tsx 中的使用示例
<Col span={8}>
  <MapWeather className="dashboard-weather-panel" />
</Col>
```

## 组件结构

### 主要功能区域

1. **位置显示**: 显示当前城市名称
2. **当前天气**: 显示温度、天气状况、体感温度等
3. **地图占位符**: 预留的地图显示区域
4. **24小时预报**: 横向滚动的逐小时天气预报
5. **7天预报**: 垂直排列的每日天气预报

### 数据流程

```
用户位置 → 高德逆地理编码 → 获取城市名称 → 高德天气API → 显示天气信息
    ↓
备用模拟数据（当API失败时）
```

## 错误处理

组件包含完善的错误处理机制：

1. **地理定位失败**: 使用默认位置（北京市）
2. **逆地理编码失败**: 使用模拟位置数据
3. **天气API失败**: 使用模拟天气数据
4. **网络超时**: 显示友好的错误提示

## 样式定制

组件使用Ant Design的Card组件，可以通过以下方式定制样式：

```css
/* 自定义样式 */
.dashboard-weather-panel {
  height: 100%;
  overflow-y: auto;
}

.dashboard-weather-panel .ant-card-body {
  padding: 16px;
}
```

## 性能优化

1. **API调用优化**: 只在组件挂载时获取一次数据
2. **错误重试**: 网络错误时自动使用备用数据
3. **加载状态**: 显示友好的加载动画
4. **内存管理**: 正确清理定时器和事件监听器

## 未来扩展

### 计划功能

1. **真实地图集成**: 集成高德地图JavaScript API显示实际地图
2. **更多天气数据**: 添加空气质量、紫外线指数等
3. **位置历史**: 记录用户访问过的位置
4. **天气提醒**: 恶劣天气预警功能
5. **多语言支持**: 支持英文等其他语言

### 地图集成示例

```tsx
// 未来可以添加真实地图显示
import AMap from '@amap/amap-jsapi-loader';

// 在地图占位符区域加载真实地图
useEffect(() => {
  AMap.load({
    key: 'your_amap_js_key',
    version: '2.0'
  }).then((AMap) => {
    const map = new AMap.Map(mapRef.current, {
      zoom: 11,
      center: [longitude, latitude]
    });
  });
}, []);
```

## 注意事项

1. **API限制**: 高德地图API有调用频率限制，请合理使用
2. **HTTPS要求**: 地理定位API需要HTTPS环境
3. **用户权限**: 需要用户授权位置访问权限
4. **网络依赖**: 需要稳定的网络连接

## 故障排除

### 常见问题

1. **位置获取失败**
   - 检查浏览器是否支持地理定位
   - 确认用户已授权位置权限
   - 检查是否在HTTPS环境下

2. **天气数据获取失败**
   - 检查网络连接
   - 验证API密钥是否有效
   - 查看浏览器控制台错误信息

3. **组件不显示**
   - 检查组件是否正确导入
   - 确认CSS样式是否正确
   - 验证父组件是否正确渲染

### 调试方法

```javascript
// 在浏览器控制台中调试
console.log('当前位置:', currentLocation);
console.log('天气数据:', weatherData);
console.log('加载状态:', loading);
```

## 更新日志

- **v1.0.0**: 初始版本，集成高德地图API
- **v1.1.0**: 添加错误处理和备用数据
- **v1.2.0**: 优化UI设计和用户体验
- **v1.3.0**: 集成真实API密钥，完善文档

## 技术支持

如有问题，请检查：
1. 网络连接是否正常
2. API密钥是否有效
3. 浏览器控制台是否有错误信息
4. 组件是否正确导入和使用 