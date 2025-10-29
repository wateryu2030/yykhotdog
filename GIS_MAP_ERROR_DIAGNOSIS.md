# GIS地图错误诊断和解决方案

## 问题描述

用户报告了以下错误：
```
Uncaught runtime errors:
×
ERROR
Script error.
    at handleError (http://localhost:3000/static/js/bundle.js:286254:58)
    at http://localhost:3000/static/js/bundle.js:286273:7
```

## 问题分析

这个错误通常由以下原因引起：

1. **高德地图脚本加载失败**
2. **API密钥无效或过期**
3. **网络连接问题**
4. **浏览器安全策略限制**
5. **脚本执行环境问题**

## 解决方案

### 1. 后端服务端口冲突 ✅ 已解决

**问题**：后端服务启动时端口3001被占用
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
```

**解决方案**：
- 检查并杀死占用端口3001的进程
- 重启后端服务

### 2. 高德地图API密钥问题 ✅ 已解决

**问题**：API密钥无效导致地图无法加载
```
INVALID_USER_KEY
```

**解决方案**：
- 使用有效的API密钥：`6ca87ddc68113a085ad770fcd6a3d5d9`
- 更新前端和后端配置

### 3. 脚本错误处理 ✅ 已改进

**问题**：缺少错误处理导致运行时错误

**解决方案**：
- 添加完整的错误处理机制
- 增加脚本加载状态检查
- 提供用户友好的错误提示

## 改进措施

### 1. 错误处理增强

```typescript
// 脚本加载错误处理
script.onerror = (error) => {
  console.error('高德地图脚本加载失败:', error);
  setMapError('地图服务加载失败，请检查网络连接');
  message.error('地图服务加载失败，请检查网络连接');
};

// 地图初始化错误处理
try {
  const map = new window.AMap.Map(mapRef.current, {
    center: [mapCenter.longitude, mapCenter.latitude],
    zoom: MAP_DEFAULT_CONFIG.zoom,
    mapStyle: MAP_DEFAULT_CONFIG.mapStyle
  });
} catch (error) {
  console.error('高德地图初始化失败:', error);
  setMapError('地图初始化失败: ' + error.message);
  message.error('地图初始化失败，请刷新页面重试');
}
```

### 2. 状态管理改进

```typescript
const [mapError, setMapError] = useState<string>('');
const [mapLoaded, setMapLoaded] = useState<boolean>(false);
```

### 3. 用户界面优化

- 添加错误状态显示
- 提供刷新按钮
- 显示加载状态
- 友好的错误提示

### 4. 调试信息增强

```typescript
console.log('开始加载高德地图脚本');
console.log('高德地图脚本加载成功');
console.log('开始初始化高德地图');
console.log('高德地图初始化成功');
console.log('开始添加标记，数量:', filteredCandidates.length);
```

## 测试步骤

### 1. 检查服务状态

```bash
# 检查后端服务
curl -s "http://localhost:3001/api/site-selection/candidates?page=1&limit=3"

# 检查前端服务
curl -s http://localhost:3000 | head -3
```

### 2. 检查API密钥

```bash
# 测试API密钥有效性
curl -s "https://restapi.amap.com/v3/geocode/geo?address=北京市朝阳区&key=6ca87ddc68113a085ad770fcd6a3d5d9"
```

### 3. 浏览器控制台检查

1. 打开浏览器开发者工具
2. 查看Console标签页
3. 检查是否有错误信息
4. 查看Network标签页确认脚本加载状态

## 预防措施

### 1. 环境检查

- 确保网络连接正常
- 检查防火墙设置
- 验证API密钥有效性

### 2. 代码质量

- 添加完整的错误处理
- 使用TypeScript类型检查
- 添加单元测试

### 3. 监控和日志

- 添加详细的日志记录
- 监控API调用状态
- 设置错误告警

## 当前状态

✅ **后端服务**：正常运行在端口3001
✅ **前端服务**：正常运行在端口3000
✅ **API密钥**：已更新为有效密钥
✅ **错误处理**：已添加完整的错误处理机制
✅ **用户界面**：已优化错误显示和用户提示

## 下一步

1. 测试GIS地图功能是否正常工作
2. 验证所有交互功能
3. 检查性能优化
4. 添加更多错误恢复机制

## 联系支持

如果问题仍然存在，请提供：
1. 浏览器控制台完整错误信息
2. 网络请求状态
3. 具体的操作步骤
4. 浏览器版本和操作系统信息
