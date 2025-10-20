import os, textwrap, datetime, shutil
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def ensure_dir(p):
    os.makedirs(os.path.dirname(p), exist_ok=True)

def backup(p):
    if os.path.exists(p):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p, f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES = {}

# ---------- 1️⃣ 生成新的 README_hotdog2030.md ----------
readme_old = os.path.join(BASE, "README.md")
merged_text = "# 🧠 HotDog 2030 智能运营驾驶舱\n\n"
if os.path.exists(readme_old):
    with open(readme_old, encoding="utf-8") as f:
        merged_text += "## 原文档摘要\n" + f.read() + "\n\n"
merged_text += textwrap.dedent("""
## 🔧 新版系统功能说明

**核心特性：**
- 🚀 自动从 cyrg2025 与 cyrgweixin 抽取业务数据；
- 📊 构建 hotdog2030 数仓（Revenue、COGS、OPEX、Profit）；
- 🤖 智能分析：销售预测、选址、客户分群；
- ⚠️ 告警系统：营收/毛利/到手净额 监控；
- 🖥 前端驾驶舱：城市/门店 趋势 & 利润结构可视化。

**主要接口：**
- `/api/metrics/overview` — 指标聚合；
- `/api/alerts` — 异常告警；
- `/api/segments/top` — 客户分群；
- `/api/site-scores` — 选址评分。

## 🚀 快速启动

```bash
# 1. 启动数据库
docker-compose up -d

# 2. 执行ETL数据同步
python etl/run_etl.py

# 3. 启动后端服务
cd backend && npm run dev

# 4. 启动前端服务
cd frontend && npm run dev

# 5. 访问智能驾驶舱
http://localhost:3000/dashboard
```

## 📊 数据架构

### 数据源
- **cyrg2025**: 主业务数据库
- **cyrgweixin**: 微信小程序数据
- **hotdog2030**: 分析数据仓库

### 核心表结构
- `fact_profit_daily`: 每日利润分析
- `dim_customer_segment`: 客户分群
- `fact_site_score`: 选址评分
- `fact_alerts`: 异常告警

### 关键视图
- `vw_revenue_reconciliation`: 收入对账视图
- `vw_kpi_store_daily`: 门店日KPI
- `vw_kpi_city_daily`: 城市日KPI
""")
FILES["README_hotdog2030.md"] = merged_text

# ---------- 2️⃣ 前端驾驶舱页面 ----------
FILES["frontend/src/pages/DashboardHotdog.tsx"] = '''
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Alert, DatePicker, Select, Button, Space, Typography } from 'antd';
import { Line, Bar, Pie } from '@ant-design/plots';
import { DollarOutlined, TrendingUpOutlined, WarningOutlined, ShopOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface MetricData {
  city?: string;
  store_name?: string;
  date_key: number;
  revenue: number;
  gross_profit: number;
  net_profit: number;
}

interface AlertData {
  date_key: number;
  store_id: number;
  alert_type: string;
  metric: string;
  delta_pct?: number;
  message: string;
  severity: number;
}

export default function DashboardHotdog() {
  const [data, setData] = useState<MetricData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
  const [level, setLevel] = useState<'city' | 'store'>('city');

  useEffect(() => {
    loadData();
  }, [level, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { level };
      if (dateRange) {
        params.from = dateRange[0].format('YYYYMMDD');
        params.to = dateRange[1].format('YYYYMMDD');
      }

      const [metricsRes, alertsRes] = await Promise.all([
        axios.get('/api/metrics/overview', { params }),
        axios.get('/api/alerts?limit=20')
      ]);

      setData(metricsRes.data.rows || []);
      setAlerts(alertsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = data.map(r => ({
    date: r.date_key,
    revenue: r.revenue || 0,
    profit: r.net_profit || 0,
    gross: r.gross_profit || 0
  }));

  const totalRevenue = chartData.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = chartData.reduce((s, r) => s + r.profit, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  const columns = [
    { title: level === 'city' ? '城市' : '门店', dataIndex: level === 'city' ? 'city' : 'store_name', key: 'name' },
    { title: '日期', dataIndex: 'date_key', key: 'date' },
    { title: '营业收入', dataIndex: 'revenue', key: 'revenue', render: (v: number) => v?.toFixed(0) },
    { title: '毛利', dataIndex: 'gross_profit', key: 'gross', render: (v: number) => v?.toFixed(0) },
    { title: '净利', dataIndex: 'net_profit', key: 'net', render: (v: number) => v?.toFixed(0) }
  ];

  const alertColumns = [
    { title: '日期', dataIndex: 'date_key', key: 'date' },
    { title: '门店', dataIndex: 'store_id', key: 'store' },
    { title: '类型', dataIndex: 'alert_type', key: 'type' },
    { title: '指标', dataIndex: 'metric', key: 'metric' },
    { title: '变动', dataIndex: 'delta_pct', key: 'delta', render: (v: number) => v ? `${(v * 100).toFixed(1)}%` : '' },
    { title: '说明', dataIndex: 'message', key: 'message' },
    { title: '严重程度', dataIndex: 'severity', key: 'severity', render: (s: number) =>
      <Tag color={s >= 3 ? 'red' : s == 2 ? 'orange' : 'green'}>{s}</Tag> }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载智能驾驶舱数据...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        🧠 HotDog 2030 智能运营驾驶舱
      </Title>

      {/* 筛选控件 */}
      <Card style={{ marginBottom: '20px' }}>
        <Space wrap>
          <Select value={level} onChange={setLevel} style={{ width: 120 }}>
            <Option value="city">城市维度</Option>
            <Option value="store">门店维度</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="YYYY-MM-DD"
          />
          <Button type="primary" onClick={loadData}>刷新数据</Button>
        </Space>
      </Card>

      {/* 总览卡片 */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总收入"
              value={totalRevenue}
              precision={0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总净利"
              value={totalProfit}
              precision={0}
              prefix={<TrendingUpOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="利润率"
              value={profitMargin}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#08c' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常告警"
              value={alerts.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: alerts.length > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 */}
      <Card title="收入/利润趋势" style={{ marginBottom: '20px' }}>
        <Line
          data={chartData}
          xField="date"
          yField="revenue"
          seriesField="profit"
          smooth
          height={300}
        />
      </Card>

      {/* 数据汇总表 */}
      <Card title={`${level === 'city' ? '城市' : '门店'}汇总`} style={{ marginBottom: '20px' }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey={r => `${r.city || r.store_name}-${r.date_key}`}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 异常告警表 */}
      <Card title="异常告警" extra={<Tag color="red">实时监控</Tag>}>
        {alerts.length > 0 ? (
          <Table
            dataSource={alerts}
            columns={alertColumns}
            rowKey={r => `${r.date_key}-${r.store_id}-${r.alert_type}`}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Alert message="暂无异常告警" type="success" showIcon />
        )}
      </Card>
    </div>
  );
}
'''

# ---------- 3️⃣ 更新前端App.tsx ----------
FILES["frontend/src/App.tsx"] = '''
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, DashboardOutlined, DatabaseOutlined, RobotOutlined } from '@ant-design/icons';
import DashboardHotdog from './pages/DashboardHotdog';
import './App.css';

const { Header, Sider, Content } = Layout;

export default function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            🧠 HotDog 2030 智能运营系统
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            style={{ flex: 1, justifyContent: 'flex-end' }}
            items={[
              { key: '/', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
              { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">智能驾驶舱</Link> },
              { key: '/etl-management', icon: <DatabaseOutlined />, label: <Link to="/etl-management">ETL管理</Link> },
              { key: '/ai-insights', icon: <RobotOutlined />, label: <Link to="/ai-insights">AI洞察</Link> }
            ]}
          />
        </Header>
        <Content style={{ padding: '0' }}>
          <Routes>
            <Route path="/" element={
              <div style={{ padding: '50px', textAlign: 'center' }}>
                <h1>欢迎使用热狗智能运营系统</h1>
                <p>基于AI的智能数据分析与运营决策平台</p>
                <Link to="/dashboard">
                  <button style={{ padding: '10px 20px', fontSize: '16px' }}>
                    进入智能驾驶舱
                  </button>
                </Link>
              </div>
            } />
            <Route path="/dashboard" element={<DashboardHotdog />} />
            <Route path="/etl-management" element={<div>ETL管理页面</div>} />
            <Route path="/ai-insights" element={<div>AI洞察页面</div>} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}
'''

# ---------- 4️⃣ 后端API增强 ----------
FILES["backend/src/routes/dashboard.ts"] = '''
import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

const router = Router();

// 获取仪表板概览数据
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { level = 'city', from, to } = req.query;
    const view = level === 'city' ? 'vw_kpi_city_daily' : 'vw_kpi_store_daily';
    
    let whereClause = '';
    if (from && to) {
      whereClause = `WHERE date_key BETWEEN ${from} AND ${to}`;
    }

    const sql = `
      SELECT ${level === 'city' ? 'city' : 'store_name'}, date_key, 
             SUM(revenue) AS revenue, 
             SUM(gross_profit) AS gross_profit, 
             SUM(net_profit) AS net_profit
      FROM ${view} 
      ${whereClause}
      GROUP BY ${level === 'city' ? 'city' : 'store_name'}, date_key 
      ORDER BY date_key DESC
    `;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    res.json({ success: true, rows });
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// 获取实时告警数据
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const sql = `
      SELECT TOP ${limit} date_key, store_id, alert_type, metric, 
             delta_pct, message, severity
      FROM fact_alerts 
      ORDER BY date_key DESC, severity DESC
    `;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

export default router;
'''

def main():
    for rel, content in FILES.items():
        path = os.path.join(BASE, rel)
        ensure_dir(path)
        backup(path)
        with open(path, "w", encoding="utf-8") as f:
            f.write(textwrap.dedent(content).lstrip("\n"))
        print(f"✅ Wrote {rel}")
    
    print("\n🎯 v4 整合完成：README + 前端驾驶舱已写入")
    print("➡ 运行步骤：")
    print("1️⃣ 启动后端: cd backend && npm run dev")
    print("2️⃣ 启动前端: cd frontend && npm run dev")
    print("3️⃣ 访问驾驶舱: http://localhost:3000/dashboard")
    print("4️⃣ 查看文档: README_hotdog2030.md")

if __name__ == "__main__":
    main()
