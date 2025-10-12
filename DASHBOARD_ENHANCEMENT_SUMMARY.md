# 仪表盘功能增强 - 运营详情查看

## 功能概述

为仪表盘的"实际运营情况"模块添加了点击查看详细信息的功能，用户可以通过点击"已运营城市"和"已运营店铺"来查看详细的运营数据。

## 新增功能

### 1. 已运营城市详情

**触发方式**: 点击"已运营城市"数字卡片（带有眼睛图标 👁）

**显示内容**:
- 城市列表（按城市分组）
- 每个城市的统计信息：
  - 省份
  - 城市名称
  - 门店数量（标签形式显示）
  - 总订单数
  - 总营收
- **二级钻取**: 点击"查看门店"按钮，可以查看该城市下所有门店的详细列表
  - 门店名称
  - 地址
  - 订单数
  - 营收

**数据来源**: `/api/operations/stores` API，前端按城市分组聚合

### 2. 已运营店铺详情

**触发方式**: 点击"已运营店铺"数字卡片（带有眼睛图标 👁）

**显示内容**:
- 完整的门店列表表格
- 列信息：
  - 门店编号
  - 门店名称
  - 省份
  - 城市
  - 地址（支持省略显示）
  - 状态（标签形式：营业中/其他）
  - 总订单（支持排序）
  - 总营收（支持排序）
  - 平均客单价
  - 操作按钮
- **详情查看**: 点击"详情"按钮，显示门店完整信息
  - 门店编号、状态
  - 省份、城市、区域
  - 详细地址
  - 店长姓名、联系电话
  - 总订单数、总营收
  - 平均客单价、门店面积

**数据来源**: `/api/operations/stores?status=营业中` API

## 技术实现

### 前端实现 (Dashboard.tsx)

1. **新增状态管理**:
   ```typescript
   const [operatingCitiesModalVisible, setOperatingCitiesModalVisible] = useState(false);
   const [operatingStoresModalVisible, setOperatingStoresModalVisible] = useState(false);
   const [operatingCitiesData, setOperatingCitiesData] = useState<any[]>([]);
   const [operatingStoresData, setOperatingStoresData] = useState<any[]>([]);
   ```

2. **数据获取函数**:
   - `fetchOperatingCities()`: 获取并按城市分组门店数据
   - `fetchOperatingStores()`: 获取所有营业中的门店

3. **UI组件**:
   - 可点击的Statistic卡片（添加cursor: pointer样式）
   - 两个Modal组件（城市详情、店铺详情）
   - 使用Ant Design的Table、Tag、Descriptions、Button等组件

### 后端API

使用现有API：
- `GET /api/operations/stores` - 获取所有门店列表
- `GET /api/operations/stores?status=营业中` - 获取营业中的门店

## 用户体验优化

1. **视觉提示**: 
   - 添加眼睛图标（EyeOutlined）提示可点击
   - 鼠标悬停时显示手型指针

2. **数据展示**:
   - 使用Tag标签突出显示重要信息
   - 数字格式化（千位分隔符）
   - 支持表格排序功能

3. **层级钻取**:
   - 城市 → 门店列表
   - 门店 → 门店详情
   - 使用Modal嵌套实现多级查看

## 数据统计

当前系统数据：
- **运营城市**: 4个（辽宁沈阳、湖北仙桃、山东滨州、辽宁辽阳）
- **运营店铺**: 22家
- **总订单数**: 154,293个
- **订单商品明细**: 213,239条

## 界面截图功能说明

### 已运营城市详情Modal
- 表格显示所有运营城市
- 可查看每个城市的门店统计
- 支持二级钻取查看城市下的门店列表

### 已运营店铺详情Modal
- 完整门店列表，支持横向滚动
- 可按订单数、营收排序
- 点击详情查看门店完整信息

## 未来改进建议

1. **数据可视化**: 添加城市分布地图
2. **导出功能**: 支持导出Excel报表
3. **筛选功能**: 按省份、营收范围筛选
4. **对比分析**: 城市间、门店间的对比分析
5. **实时更新**: 添加数据刷新按钮和自动刷新功能

## 相关文件

- `frontend/src/pages/Dashboard.tsx` - 主要实现文件
- `backend/src/routes/operations.ts` - API路由文件
