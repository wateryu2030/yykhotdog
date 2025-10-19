# 🚀 智能ETL数据同步框架

基于OpenAI分析的完美ETL框架，实现三库数据智能同步与深度分析。

## 📋 项目结构

```
etl/
├── lib/
│   └── mssql.py              # MSSQL数据库连接库
├── steps/
│   ├── 01_extract_orders.py          # 订单数据提取
│   ├── 02_extract_order_items.py     # 订单明细提取
│   ├── 03_extract_stores.py          # 门店信息提取
│   ├── 04_extract_products.py        # 商品信息提取
│   ├── 05_extract_customers.py       # 客户信息提取
│   ├── 06_profit_analysis.py         # 利润分析
│   ├── 07_customer_segmentation.py   # 客户细分分析
│   ├── 08_forecast_sales.py          # 销售预测
│   ├── 09_site_selection.py          # 智能选址分析
│   └── 10_dashboard_metrics.py       # 仪表板指标聚合
├── run_etl.py                # 主执行脚本
└── README.md                  # 说明文档
```

## 🎯 功能特性

### 数据提取层 (01-05)
- **智能数据清洗**: 自动过滤无效数据，处理缺失值
- **多源数据合并**: 统一cyrg2025和cyrgweixin数据格式
- **数据质量保证**: 去重、验证、标准化处理

### 智能分析层 (06-10)
- **利润分析**: 计算门店毛利、净利，生成利润报表
- **客户细分**: 基于RFM模型的客户画像分析
- **销售预测**: 机器学习预测未来销售趋势
- **智能选址**: 基于历史表现的选址评分系统
- **仪表板指标**: 多维度KPI聚合视图

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install pandas numpy pyodbc scikit-learn

# 设置环境变量
export MSSQL_HOST=localhost
export MSSQL_PORT=1433
export MSSQL_USER=sa
export MSSQL_PASS=Passw0rd
```

### 2. 执行ETL流程

```bash
# 执行完整ETL流程
python etl/run_etl.py

# 或单独执行某个步骤
python etl/steps/01_extract_orders.py
```

### 3. 验证结果

```sql
-- 查看数据统计
SELECT COUNT(*) as order_count FROM hotdog2030.orders;
SELECT COUNT(*) as store_count FROM hotdog2030.stores;
SELECT COUNT(*) as customer_count FROM hotdog2030.customers;

-- 查看分析结果
SELECT * FROM hotdog2030.v_city_kpi;
SELECT * FROM hotdog2030.v_store_kpi;
```

## 📊 数据映射关系

| 来源库 | 目标表 | 说明 |
|--------|--------|------|
| cyrg2025.Orders + cyrgweixin.Orders | hotdog2030.orders | 统一订单数据 |
| cyrg2025.OrderGoods + cyrgweixin.OrderGoods | hotdog2030.order_items | 订单明细数据 |
| cyrg2025.Shop + cyrgweixin.Rg_Shop | hotdog2030.stores | 门店基础信息 |
| cyrg2025.Goods | hotdog2030.products | 商品主数据 |
| cyrg2025.CardVip + cyrgweixin.XcxUser | hotdog2030.customers | 客户统一视图 |

## 🧠 智能分析模块

### 1. 利润分析 (06)
- 计算门店毛利率、净利率
- 分析租金占比、坪效表现
- 生成利润分析报表

### 2. 客户细分 (07)
- RFM模型客户分类
- 客户价值评分
- 流失客户预警

### 3. 销售预测 (08)
- 基于历史数据的趋势预测
- 机器学习模型训练
- 未来30天销售预测

### 4. 智能选址 (09)
- 基于历史门店表现评分
- 租金、面积、位置综合评估
- 选址推荐系统

### 5. 仪表板指标 (10)
- 城市/门店/产品/客户KPI
- 时间序列分析
- 实时指标聚合

## 📈 输出结果

### 数据表
- `orders`: 统一订单数据
- `order_items`: 订单明细
- `stores`: 门店信息
- `products`: 商品数据
- `customers`: 客户信息

### 分析表
- `store_profit_analysis`: 门店利润分析
- `customer_segmentation`: 客户细分结果
- `sales_forecast`: 销售预测
- `site_evaluation`: 选址评估

### 视图
- `v_city_kpi`: 城市KPI视图
- `v_store_kpi`: 门店KPI视图
- `v_product_kpi`: 产品KPI视图
- `v_customer_kpi`: 客户KPI视图
- `v_time_series_kpi`: 时间序列KPI视图

## 🔧 配置说明

### 数据库连接
在 `lib/mssql.py` 中配置数据库连接参数：

```python
MSSQL_HOST = 'localhost'      # 数据库主机
MSSQL_PORT = '1433'           # 数据库端口
MSSQL_USER = 'sa'             # 用户名
MSSQL_PASS = 'Passw0rd'       # 密码
```

### 数据过滤规则
- 订单金额: 0 < amount < 10000
- 商品数量: quantity > 0
- 时间范围: 最近12个月
- 数据质量: 自动去重、填充缺失值

## 📝 日志说明

每个ETL步骤都会生成详细日志：
- ✅ 成功操作
- ⚠️ 警告信息
- ❌ 错误信息
- 📊 统计信息

## 🎉 使用建议

1. **首次运行**: 建议按步骤单独执行，检查数据质量
2. **定期同步**: 可设置定时任务，每日/每周执行
3. **监控告警**: 关注失败步骤，及时处理异常
4. **数据验证**: 定期检查数据一致性

## 🤝 技术支持

如有问题，请检查：
1. 数据库连接是否正常
2. 数据源表是否存在
3. 权限是否充足
4. 日志错误信息

---

**🎊 完美配合OpenAI分析，实现智能数据同步与深度分析！**
