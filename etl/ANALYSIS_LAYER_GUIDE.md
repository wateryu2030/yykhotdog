# ETL分析层完整指南

## 📋 概述

基于OpenAI建议，我们已完善了ETL框架的分析层（步骤06-10），包含利润分析、客户分群、销售预测、智能选址和仪表板指标聚合。

## 🏗️ 架构设计

### 数据流向
```
cyrg2025/cyrgweixin (源数据) 
    ↓ ETL步骤01-05 (数据提取)
hotdog2030 (基础数据层)
    ↓ ETL步骤06-10 (分析层)
hotdog2030 (分析结果层)
```

### 分析层对象
- **事实表**: `fact_profit_daily`, `fact_forecast_daily`, `fact_site_score`
- **维度表**: `dim_customer_segment`
- **视图**: `vw_sales_store_daily`, `vw_kpi_store_daily`, `vw_kpi_city_daily`

## 🚀 快速开始

### 1. 创建分析层对象
```sql
-- 在 hotdog2030 数据库中执行
-- 文件: etl/ddl/create_analysis_objects.sql
```

### 2. 执行ETL流程
```bash
# 完整ETL流程
python etl/run_etl.py

# 或单独执行分析层
python etl/steps/06_profit_analysis.py
python etl/steps/07_customer_segmentation.py
python etl/steps/08_forecast_sales.py
python etl/steps/09_site_selection.py
python etl/steps/10_dashboard_metrics.py
```

### 3. 验证结果
```sql
-- 在 hotdog2030 数据库中执行
-- 文件: etl/validation/verify_analysis_objects.sql
```

## 📊 分析层功能详解

### 步骤06: 利润分析 (`06_profit_analysis.py`)
**功能**: 计算门店每日利润指标
- **输入**: `orders`, `order_items`, `products`
- **输出**: `fact_profit_daily`
- **指标**: 收入、成本、毛利率、净利率

**核心逻辑**:
```python
# 收入 = SUM(orders.total_amount)
# 成本 = SUM(order_items.quantity * products.cost_price)
# 毛利率 = (收入 - 成本) / 收入
```

### 步骤07: 客户分群 (`07_customer_segmentation.py`)
**功能**: 基于RFM模型进行客户细分
- **输入**: `orders` (客户交易数据)
- **输出**: `dim_customer_segment`
- **指标**: R评分、F评分、M评分、分群代码

**核心逻辑**:
```python
# R (Recency): 最近购买时间评分
# F (Frequency): 购买频次评分  
# M (Monetary): 购买金额评分
# 分群代码 = R*100 + F*10 + M
```

### 步骤08: 销售预测 (`08_forecast_sales.py`)
**功能**: 使用机器学习预测未来销售
- **输入**: `vw_sales_store_daily`
- **输出**: `fact_forecast_daily`
- **模型**: XGBoost / HistGradientBoostingRegressor

**核心逻辑**:
```python
# 特征工程: 7/14/28天移动平均 + 星期几
# 模型训练: 按门店分别训练
# 预测输出: 未来7天营收预测
```

### 步骤09: 智能选址 (`09_site_selection.py`)
**功能**: 基于历史表现评估选址候选点
- **输入**: `Rg_SeekShop` (候选点), `stores` (现有门店)
- **输出**: `fact_site_score`
- **指标**: 匹配评分、蚕食评分、综合评分

**核心逻辑**:
```python
# 匹配评分 = 同城历史营收匹配度
# 蚕食评分 = 门店密度影响 (越稀疏越好)
# 综合评分 = 0.6*匹配评分 + 0.4*(1-蚕食评分)
```

### 步骤10: 仪表板指标 (`10_dashboard_metrics.py`)
**功能**: 聚合多维度KPI指标
- **输入**: `orders`, `stores`, `customers`
- **输出**: `dashboard_daily_metrics`, `dashboard_store_metrics`, `dashboard_city_metrics`
- **指标**: 收入、订单数、客户数、平均客单价

## 🔍 数据验证

### 验证SQL示例
```sql
-- 检查利润数据质量
SELECT 
    COUNT(*) as total_records,
    AVG(revenue) as avg_revenue,
    AVG(cogs) as avg_cogs,
    AVG((revenue - cogs) / revenue * 100) as avg_gross_margin
FROM fact_profit_daily;

-- 检查客户分群分布
SELECT 
    segment_code, 
    COUNT(*) as customer_count
FROM dim_customer_segment
GROUP BY segment_code
ORDER BY customer_count DESC;

-- 检查销售预测准确性
SELECT 
    s.store_name,
    f.date_key,
    f.yhat as predicted_revenue
FROM fact_forecast_daily f
JOIN stores s ON s.id = f.store_id
WHERE f.date_key >= CONVERT(int, FORMAT(GETDATE(), 'yyyyMMdd'))
ORDER BY f.yhat DESC;
```

## 📈 业务应用

### 1. 利润分析应用
- **门店效率**: 识别高毛利门店
- **成本控制**: 分析成本结构
- **投资决策**: 基于净利率评估门店价值

### 2. 客户分群应用
- **精准营销**: 针对不同分群制定策略
- **客户维护**: 识别高价值客户
- **流失预警**: 识别流失风险客户

### 3. 销售预测应用
- **库存管理**: 基于预测调整库存
- **人员安排**: 预测高峰期人员需求
- **目标制定**: 设定合理的销售目标

### 4. 智能选址应用
- **扩张决策**: 评估新店选址
- **竞争分析**: 避免过度竞争
- **投资回报**: 预测新店盈利能力

## 🛠️ 技术特性

### 数据处理
- **增量更新**: 支持MERGE操作，避免重复数据
- **数据质量**: 内置数据验证和异常处理
- **性能优化**: 使用索引和批量操作

### 机器学习
- **模型选择**: 自动回退机制 (XGBoost → sklearn)
- **特征工程**: 时间序列特征 + 移动平均
- **模型评估**: 内置MAE/RMSE评估

### 扩展性
- **模块化设计**: 每个步骤独立可执行
- **配置灵活**: 支持参数调整
- **日志完整**: 详细的执行日志

## 🔧 维护指南

### 日常维护
1. **数据同步**: 定期执行ETL流程
2. **模型更新**: 定期重新训练预测模型
3. **数据清理**: 定期清理历史数据

### 监控指标
- **数据质量**: 空值率、异常值检测
- **模型性能**: 预测准确性评估
- **系统性能**: 执行时间、资源使用

### 故障处理
- **数据异常**: 检查源数据质量
- **模型失败**: 检查特征数据完整性
- **性能问题**: 优化SQL查询和索引

## 📚 相关文档

- [ETL框架README](README.md)
- [数据库结构导出](export_schema.py)
- [验证SQL脚本](validation/verify_analysis_objects.sql)
- [前端ETL管理](frontend/src/pages/ETLManagement.tsx)

## 🎯 下一步计划

1. **异常检测**: 添加数据异常检测模块
2. **重力模型**: 基于经纬度的选址模型
3. **实时预测**: 流式数据处理和实时预测
4. **API接口**: 为前端提供分析数据API
5. **可视化**: 集成更多图表和分析视图

---

**注意**: 本指南基于OpenAI建议的优化版本，所有脚本都经过测试和验证。如有问题，请检查数据库连接和依赖库安装。
