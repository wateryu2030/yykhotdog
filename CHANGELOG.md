# 更新日志

## [v2.2] - 2025-10-12

### ✨ 新增功能

#### 商品数据导入功能
- **数据库表**: 完善 `products` 表结构，包含商品分类、价格、库存等完整信息
- **数据迁移**: 从 `cyrg2025.goods` 自动迁移商品数据（2,000+记录）
- **字段映射**: 完整映射商品表的所有字段（`categoryId`, `goodsName`, `salePrice`, `goodsStock` 等）
- **商品分类**: 支持商品分类分析，包含热销产品、推荐产品等标识

#### 会员数据导入功能
- **数据库表**: 完善 `customer_profiles` 表结构，基于 `cyrgweixin.VIP` 表
- **数据迁移**: 从 `cyrgweixin.VIP` 自动迁移会员数据（10,000+记录）
- **会员信息**: 包含充值金额、赠送金额、总余额等关键信息
- **门店关联**: 会员与门店的完整关联关系

#### 意向店铺数据导入功能
- **数据库表**: 新增 `rg_seek_shop` 表结构，基于 `cyrg2025.Rg_SeekShop` 表
- **数据迁移**: 从 `cyrg2025.Rg_SeekShop` 自动迁移意向店铺数据（100+记录）
- **审核流程**: 包含审核人、审核时间、审核状态、审核备注等完整审核信息
- **奖励机制**: 支持奖励金额管理，用于激励选址推荐

#### 数据一致性验证
- **验证脚本**: 新增 `verify-data-consistency.py` 脚本
- **ID映射检查**: 自动验证所有表间的ID映射关系
- **完整性检查**: 确保数据迁移的完整性和一致性
- **详细报告**: 生成完整的数据一致性验证报告

### 🔧 ID映射关系优化

#### 完整的ID映射体系
- **门店ID**: `stores.id` ↔ `orders.store_id` ↔ `products.shop_id` ↔ `customer_profiles.shop_id`
- **订单ID**: `orders.id` ↔ `order_items.order_id`
- **商品ID**: `products.id` ↔ `order_items.product_id`
- **会员ID**: `customer_profiles.id` (基于 `cyrgweixin.VIP.id`)
- **分类ID**: `products.category_id` (基于 `cyrg2025.goods.categoryId`)
- **意向店铺ID**: `rg_seek_shop.id` (基于 `cyrg2025.Rg_SeekShop.Id`)
- **审核人ID**: `rg_seek_shop.approval_id` (关联审核人员)
- **记录ID**: `rg_seek_shop.record_id` (关联原始记录)

#### 字段名称和大小写处理
- 自动处理不同表间的字段名称差异（如 `shopId` vs `store_id`）
- 统一处理大小写不一致问题（如 `orderId` vs `order_id`）
- 确保所有关联关系的数据一致性

## [v2.1] - 2025-10-12

### ✨ 新增功能

#### 订单商品明细下钻功能
- **数据库表**: 新增 `order_items` 表用于存储订单商品明细
- **数据迁移**: 从 `cyrg2025.OrderGoods` 自动迁移商品明细数据（63万+记录）
- **后端API**: 新增 `GET /api/operations/orders/:id/items` 接口
- **前端展示**: 在订单详情弹窗中新增"商品明细"卡片，展示商品列表

#### 完整数据下钻链路
实现了四级数据下钻：
1. **门店列表** → 点击门店
2. **门店详情** → 点击"查看订单明细"
3. **订单列表** → 点击"查看详情"  
4. **订单详情** → 显示**商品明细列表**（新增！）

### 🔧 优化改进

#### 数据初始化流程整合
- **更新**: `init-hotdog2030-complete-v2.py`
  - 新增 `step5_5_migrate_order_items()` 函数
  - 自动迁移订单商品明细数据
  - 增强数据验证，包含商品明细数量统计
  
- **更新**: `restore-and-init-complete.sh`
  - 增强输出信息，显示所有完成的迁移和修复
  - 新增功能说明部分
  - 更清晰的使用指引

#### 表结构优化
- `order_items.price`: 字段名从 `unit_price` 改为 `price`，与API一致
- `order_items.product_name`: 设置为 `NOT NULL`，确保数据完整性

### 📚 文档更新

#### 新增文档
- `DATABASE_INIT_GUIDE.md`: 完整的数据库初始化指南
  - 详细的使用说明
  - 表结构说明
  - 验证和测试方法
  - 故障排查指南

#### 更新文档
- `COMPLETE_SOLUTION_SUMMARY.md`: 添加订单商品明细功能说明
- `DATABASE_INIT_COMPLETE_GUIDE.md`: 补充商品明细迁移步骤

### 🐛 修复问题

- 修复 `order_items` 表字段映射问题（`goodsPrice` → `price`）
- 修复商品明细迁移时的 NULL 值处理
- 修复订单ID映射逻辑（使用 `set` 提高查询效率）

---

## [v2.0] - 2025-10-11

### ✨ 新增功能

#### 自动化数据初始化
- 创建 `restore-and-init-complete.sh` 自动化脚本
- 创建 `init-hotdog2030-complete-v2.py` 完整初始化脚本
- 支持从 `.bak` 文件自动恢复数据库
- 一键完成所有数据迁移和修复

#### 多城市支持
- 支持沈阳、滨州、辽阳、仙桃等多个城市
- 自动填充 `city` 表
- 创建地区层级数据

#### 运营模块增强
- 新增运营概览 API (`/api/operations/overview`)
- 支持城市和日期范围筛选
- 实时KPI统计（今日销售、平均客单价、总用户数）

### 🔧 数据修复

#### 收入计算修复
- 基于 `payMode` 的精确收入计算
- 支持多种支付方式（收银机、小程序、支付宝等）
- 优先使用 `orderValue` 字段
- 完整迁移所有支付字段（cash, vip_amount, card_amount 等）

#### 门店数据修复
- 自动更新门店营业状态
- 修复门店类型识别（`is_self` 字段）
- 正确区分直营店和加盟店（7-8家直营店）

#### 订单数据修复
- 修复 `created_at` 字段（从 `order_date` 复制）
- 修复 `store_id` 映射问题
- 只统计 `pay_state = 2` 的已支付订单

### 🎨 前端改进

#### 订单详情功能
- 新增订单列表弹窗
- 新增订单详情弹窗
- 支持订单列表字段排序
- 完善支付信息展示

#### 数据下钻
- 实现门店 → 订单列表 → 订单详情的完整链路
- 分页支持
- 日期范围筛选

---

## [v1.0] - 2025-09-09

### 初始版本
- 基础数据库结构
- 门店和订单数据
- 基本的前后端功能

