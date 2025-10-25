# MaxCompute数据处理

## 概述

本目录包含MaxCompute数据处理相关的脚本和配置，用于实现大数据分析和智能选址功能。

## 目录结构

```
maxcompute/
├── scripts/           # 数据处理脚本
├── sql/              # SQL查询文件
├── config/           # 配置文件
└── README.md         # 说明文档
```

## 主要功能

### 1. 数据同步
- RDS到MaxCompute的数据同步
- 外部数据源接入（POI、人口、交通数据）
- 实时数据流处理

### 2. 智能选址分析
- POI密度计算
- 交通便利性分析
- 竞争环境评估
- 综合评分模型

### 3. 销售数据分析
- 历史销售趋势分析
- 区域销售对比
- 客户行为分析
- 预测模型训练

### 4. 营销策略生成
- 城市特征分析
- 差异化营销建议
- 活动效果评估

## 配置说明

### 环境变量
```bash
# MaxCompute配置
MAXCOMPUTE_PROJECT=zhhotdog_project
MAXCOMPUTE_ENDPOINT=https://service.cn.maxcompute.aliyun.com/api
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_REGION=cn-hangzhou
```

### 数据表结构

#### ODS层（原始数据）
- `ods_sales_data`: 销售原始数据
- `ods_poi_data`: POI原始数据
- `ods_population_data`: 人口数据
- `ods_traffic_data`: 交通数据

#### DWD层（明细数据）
- `dwd_store_sales`: 门店销售明细
- `dwd_location_poi`: 位置POI明细
- `dwd_customer_behavior`: 客户行为明细

#### DWS层（汇总数据）
- `dws_store_daily`: 门店日汇总
- `dws_location_analysis`: 位置分析汇总
- `dws_marketing_effect`: 营销效果汇总

#### ADS层（应用数据）
- `ads_location_recommendation`: 选址推荐
- `ads_sales_forecast`: 销售预测
- `ads_marketing_strategy`: 营销策略

## 使用说明

### 1. 数据同步
```bash
# 执行数据同步脚本
python scripts/data_sync.py
```

### 2. 选址分析
```bash
# 执行选址分析
python scripts/location_analysis.py
```

### 3. 销售预测
```bash
# 执行销售预测
python scripts/sales_forecast.py
```

### 4. 营销策略
```bash
# 生成营销策略
python scripts/marketing_strategy.py
```

## 注意事项

1. 确保阿里云MaxCompute服务已开通
2. 配置正确的访问密钥和权限
3. 定期监控数据处理任务状态
4. 注意数据安全和隐私保护 