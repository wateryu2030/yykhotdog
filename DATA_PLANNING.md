# 智能热狗管理平台数据规划文档

## 📊 数据架构概述

本平台采用前后端分离架构，前端使用React + Ant Design，后端使用Node.js + Express + TypeScript，数据库使用阿里云RDS SQL Server。

## 🏗️ 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React前端     │◄──►│   Node.js后端   │◄──►│   阿里云RDS     │
│   (Ant Design)  │    │   (Express)     │    │   (SQL Server)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   MaxCompute    │
                       │   (大数据平台)   │
                       └─────────────────┘
```

## 📋 API接口设计

### 1. 仪表板API (`/api/dashboard`)

#### 1.1 获取仪表板数据
```http
GET /api/dashboard?scope=national&city=全国&period=daily
```

**请求参数：**
- `scope`: 范围 (national | city)
- `city`: 城市名称
- `period`: 时间周期 (daily | weekly | monthly)

**响应数据：**
```json
{
  "kpis": {
    "storeCount": 856,
    "opened": 720,
    "planned": 80,
    "expanding": 56,
    "salesAmount": "¥1283.5 万",
    "salesGrowth": "12.5%",
    "salesGrowthDir": "up",
    "followerCount": "3.2M",
    "followerGrowth": "5.8%",
    "followerGrowthDir": "up",
    "satisfaction": "4.7",
    "satisfactionBase": "基于15万条评价"
  },
  "citySalesTrend": {
    "labels": ["7/1", "7/2", "7/3", "7/4", "7/5", "7/6", "7/7"],
    "data": [1200, 1250, 1230, 1280, 1300, 1290, 1320]
  },
  "productSalesTrend": {
    "labels": ["7/1", "7/2", "7/3", "7/4", "7/5", "7/6", "7/7"],
    "data": [500, 520, 510, 550, 560, 555, 580]
  },
  "eventReminders": [
    {
      "title": "全国新品上市：香辣芝士热狗",
      "date": "7月1日",
      "detail": "预计带动全国销售增长3%。",
      "icon": "fire",
      "color": "#ff4d4f"
    }
  ],
  "topProducts": {
    "labels": ["辣条爆浆热狗", "芝士双拼热狗", "经典原味热狗"],
    "data": [5842, 4256, 3128]
  },
  "newProducts": [
    {
      "name": "香辣芝士热狗",
      "date": "7月1日",
      "icon": "fire"
    }
  ],
  "followerGrowth": {
    "labels": ["1月", "2月", "3月", "4月", "5月", "6月", "7月"],
    "data": [280, 295, 305, 310, 315, 320, 325]
  },
  "hotTopics": [
    {
      "name": "#热狗挑战赛",
      "platform": "抖音",
      "views": "1.2M 播放",
      "icon": "hashtag",
      "color": "#1890ff"
    }
  ],
  "aiSuggestions": [
    {
      "title": "优化门店排班",
      "detail": "AI预测下周三下午客流高峰，建议增加2名兼职员工。",
      "icon": "bulb",
      "color": "#1890ff",
      "action": "排班建议已采纳！"
    }
  ],
  "liveMonitors": [
    {
      "store": "上海旗舰店",
      "area": "1号收银台"
    }
  ],
  "mapMarkers": [
    {
      "top": "30%",
      "left": "75%",
      "status": "opened",
      "title": "上海旗舰店"
    }
  ]
}
```

#### 1.2 获取KPI数据
```http
GET /api/dashboard/kpis?scope=national&city=全国&period=daily
```

#### 1.3 获取销售趋势数据
```http
GET /api/dashboard/sales-trend?scope=national&city=全国&period=daily
```

#### 1.4 获取门店地图数据
```http
GET /api/dashboard/store-map?scope=national&city=全国
```

#### 1.5 获取实时监控数据
```http
GET /api/dashboard/live-monitors?scope=national&city=全国
```

#### 1.6 获取事件提醒数据
```http
GET /api/dashboard/event-reminders?scope=national&city=全国&period=daily
```

#### 1.7 获取商品动态数据
```http
GET /api/dashboard/product-dynamics?scope=national&city=全国&period=daily
```

#### 1.8 获取新媒体动态数据
```http
GET /api/dashboard/new-media-dynamics?scope=national&city=全国&period=daily
```

#### 1.9 获取AI建议数据
```http
GET /api/dashboard/ai-suggestions?scope=national&city=全国&period=daily
```

### 2. 门店管理API (`/api/store-opening`)

#### 2.1 获取门店列表
```http
GET /api/store-opening/stores
```

#### 2.2 创建门店
```http
POST /api/store-opening/stores
```

**请求体：**
```json
{
  "name": "上海旗舰店",
  "address": "上海市黄浦区南京东路123号",
  "status": "planned",
  "openingDate": "2024-02-01",
  "manager": "张三"
}
```

#### 2.3 更新门店信息
```http
PUT /api/store-opening/stores/:id
```

#### 2.4 删除门店
```http
DELETE /api/store-opening/stores/:id
```

### 3. 运营管理API (`/api/operations`)

#### 3.1 获取运营数据
```http
GET /api/operations/data
```

#### 3.2 创建运营记录
```http
POST /api/operations/records
```

**请求体：**
```json
{
  "storeName": "上海旗舰店",
  "date": "2024-01-15",
  "sales": 12500,
  "customerCount": 156,
  "satisfaction": 4.8,
  "notes": "今日运营正常"
}
```

### 4. 利润分配API (`/api/allocation`)

#### 4.1 获取分配数据
```http
GET /api/allocation/data
```

#### 4.2 创建分配记录
```http
POST /api/allocation/records
```

**请求体：**
```json
{
  "storeName": "上海旗舰店",
  "month": "2024-01",
  "monthlySales": 125000,
  "profit": 37500,
  "allocationRate": 30,
  "allocationAmount": 11250,
  "notes": "月度利润分配"
}
```

### 5. 选址管理API (`/api/site-selection`)

#### 5.1 获取选址数据
```http
GET /api/site-selection/sites
```

#### 5.2 创建选址记录
```http
POST /api/site-selection/sites
```

## 🗄️ 数据库设计

### 1. 门店表 (stores)
```sql
CREATE TABLE stores (
  id INT PRIMARY KEY IDENTITY(1,1),
  name NVARCHAR(100) NOT NULL,
  address NVARCHAR(500) NOT NULL,
  status NVARCHAR(20) NOT NULL, -- opened, planned, expanding
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  opening_date DATE,
  manager NVARCHAR(50),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE()
);
```

### 2. 运营记录表 (operations)
```sql
CREATE TABLE operations (
  id INT PRIMARY KEY IDENTITY(1,1),
  store_id INT NOT NULL,
  date DATE NOT NULL,
  sales DECIMAL(10,2),
  customer_count INT,
  satisfaction DECIMAL(2,1),
  notes NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);
```

### 3. 利润分配表 (allocations)
```sql
CREATE TABLE allocations (
  id INT PRIMARY KEY IDENTITY(1,1),
  store_id INT NOT NULL,
  month NVARCHAR(7) NOT NULL, -- YYYY-MM
  monthly_sales DECIMAL(10,2),
  profit DECIMAL(10,2),
  allocation_rate DECIMAL(5,2),
  allocation_amount DECIMAL(10,2),
  status NVARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
  notes NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);
```

### 4. 选址记录表 (site_selections)
```sql
CREATE TABLE site_selections (
  id INT PRIMARY KEY IDENTITY(1,1),
  location_name NVARCHAR(100) NOT NULL,
  address NVARCHAR(500) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  poi_score DECIMAL(5,2),
  traffic_score DECIMAL(5,2),
  competition_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  status NVARCHAR(20) DEFAULT 'evaluating', -- evaluating, approved, rejected
  notes NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETDATE()
);
```

### 5. POI数据表 (poi_data)
```sql
CREATE TABLE poi_data (
  id INT PRIMARY KEY IDENTITY(1,1),
  name NVARCHAR(100) NOT NULL,
  category NVARCHAR(50),
  address NVARCHAR(500),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  distance DECIMAL(8,2),
  created_at DATETIME2 DEFAULT GETDATE()
);
```

## 🔄 数据流设计

### 1. 实时数据流
```
门店POS系统 → 阿里云RDS → 后端API → 前端展示
```

### 2. 批量数据处理
```
门店数据 → MaxCompute → 数据分析 → 后端API → 前端展示
```

### 3. 数据同步策略
- **实时同步**: 关键业务数据（销售额、客流量）
- **定时同步**: 统计数据（日/周/月报表）
- **手动同步**: 配置数据（门店信息、员工信息）

## 📈 数据可视化

### 1. 图表类型
- **折线图**: 销售趋势、粉丝增长趋势
- **柱状图**: 商品销量排行
- **饼图**: 门店状态分布
- **地图**: 门店分布图
- **仪表盘**: KPI指标

### 2. 交互功能
- **时间筛选**: 日/周/月数据切换
- **地域筛选**: 全国/城市数据切换
- **数据钻取**: 从概览到详情的数据探索

## 🔒 数据安全

### 1. 访问控制
- **身份认证**: JWT Token
- **权限管理**: 基于角色的访问控制
- **API限流**: 防止恶意请求

### 2. 数据保护
- **数据加密**: 敏感数据加密存储
- **传输安全**: HTTPS协议
- **备份策略**: 定期数据备份

## 📊 性能优化

### 1. 数据库优化
- **索引优化**: 为常用查询字段建立索引
- **查询优化**: 使用存储过程优化复杂查询
- **连接池**: 数据库连接池管理

### 2. API优化
- **缓存策略**: Redis缓存热点数据
- **分页查询**: 大数据量分页处理
- **压缩传输**: Gzip压缩响应数据

### 3. 前端优化
- **懒加载**: 按需加载组件和数据
- **虚拟滚动**: 大数据列表优化
- **图片优化**: 图片压缩和CDN加速

## 🚀 部署配置

### 1. 环境变量
```bash
# 数据库配置
DB_HOST=rm-bp1234567890abcd.sqlserver.rds.aliyuncs.com
DB_PORT=1433
DB_USERNAME=hotdog
DB_PASSWORD=your_password_here
DB_NAME=cyrg2025

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_REGION=cn-hangzhou

# JWT配置
JWT_SECRET=your_jwt_secret_key
```

### 2. 代理配置
```javascript
// frontend/package.json
{
  "proxy": "http://localhost:3001"
}
```

## 📝 开发规范

### 1. API命名规范
- 使用RESTful风格
- 使用kebab-case命名
- 版本控制: `/api/v1/`

### 2. 数据格式规范
- 统一使用JSON格式
- 时间格式: ISO 8601
- 金额格式: 保留2位小数

### 3. 错误处理规范
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": {
      "field": "username",
      "message": "用户名不能为空"
    }
  }
}
```

## 🔧 测试策略

### 1. 单元测试
- 后端API测试
- 前端组件测试
- 数据库查询测试

### 2. 集成测试
- API接口测试
- 前后端联调测试
- 数据库集成测试

### 3. 性能测试
- 并发访问测试
- 大数据量测试
- 响应时间测试

## 📞 技术支持

如有数据相关问题，请联系：
- 数据库管理员: DBA@company.com
- 后端开发: Backend@company.com
- 前端开发: Frontend@company.com 