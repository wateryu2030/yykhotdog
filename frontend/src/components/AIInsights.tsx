import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  List,
  Tag,
  Alert,
  Spin,
  Space,
  Table,
  Modal,
  Descriptions,
  Tabs,
  Divider,
  Typography,
  Badge,
  Avatar,
  Timeline,
  Tooltip,
  Empty
} from 'antd';
import {
  RobotOutlined,
  BarChartOutlined,
  DollarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  FireOutlined,
  EnvironmentOutlined,
  RiseOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import axios from 'axios';

const { Title: AntTitle, Text } = Typography;
const { TabPane } = Tabs;

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
  ChartDataLabels
);

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
});

interface ProfitAnalysis {
  store_id: number;
  store_name: string;
  city: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  gross_profit_margin: number;
  net_profit: number;
  net_profit_margin: number;
  analysis_date: string;
}

interface CustomerSegment {
  customer_id: string;
  r_score: number;
  f_score: number;
  m_score: number;
  segment_code: number;
  updated_at: string;
}

interface SalesForecast {
  store_name: string;
  date_key: number;
  yhat: number;
  model_name: string;
}

interface SiteScore {
  candidate_id: number;
  city: string;
  match_score: number;
  cannibal_score: number;
  total_score: number;
  rationale: string;
}

interface DashboardMetrics {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  unique_customers: number;
}

const AIInsights: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 数据状态
  const [profitData, setProfitData] = useState<ProfitAnalysis[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [salesForecasts, setSalesForecasts] = useState<SalesForecast[]>([]);
  const [siteScores, setSiteScores] = useState<SiteScore[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  
  // 加载所有AI洞察数据
  const loadAIInsights = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [
        profitResponse,
        segmentsResponse,
        forecastsResponse,
        sitesResponse,
        metricsResponse
      ] = await Promise.all([
        api.get('/ai-insights/profit-analysis'),
        api.get('/ai-insights/customer-segments'),
        api.get('/ai-insights/sales-forecasts'),
        api.get('/ai-insights/site-scores'),
        api.get('/ai-insights/dashboard-metrics')
      ]);
      
      setProfitData(profitResponse.data.data || []);
      setCustomerSegments(segmentsResponse.data.data || []);
      setSalesForecasts(forecastsResponse.data.data || []);
      setSiteScores(sitesResponse.data.data || []);
      setDashboardMetrics(metricsResponse.data.data || null);
      
    } catch (error) {
      console.error('加载AI洞察数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAIInsights();
  }, []);

  // 利润分析图表数据
  const profitChartData = {
    labels: profitData.slice(0, 10).map(item => item.store_name),
    datasets: [
      {
        label: '总收入',
        data: profitData.slice(0, 10).map(item => item.total_revenue),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: '净利润',
        data: profitData.slice(0, 10).map(item => item.net_profit),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }
    ]
  };

  // 客户分群分布数据
  const segmentDistribution = customerSegments.reduce((acc, segment) => {
    const key = `${segment.r_score}${segment.f_score}${segment.m_score}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const segmentChartData = {
    labels: Object.keys(segmentDistribution),
    datasets: [{
      data: Object.values(segmentDistribution),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
      ]
    }]
  };

  // 销售预测图表数据
  const forecastChartData = {
    labels: salesForecasts.slice(0, 7).map(item => new Date(item.date_key.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toLocaleDateString()),
    datasets: [{
      label: '预测销售额',
      data: salesForecasts.slice(0, 7).map(item => item.yhat),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  };

  // 获取AI洞察建议
  const getAIInsights = () => {
    const insights = [];
    
    // 利润分析洞察
    if (profitData.length > 0) {
      const avgMargin = profitData.reduce((sum, item) => sum + item.gross_profit_margin, 0) / profitData.length;
      if (avgMargin < 30) {
        insights.push({
          type: 'warning',
          title: '毛利率偏低',
          description: `平均毛利率仅${avgMargin.toFixed(1)}%，建议优化成本结构`,
          icon: <WarningOutlined />
        });
      }
      
      const topStore = profitData.reduce((max, item) => item.net_profit > max.net_profit ? item : max);
      insights.push({
        type: 'success',
        title: '最佳盈利门店',
        description: `${topStore.store_name}净利润最高，达¥${topStore.net_profit.toFixed(2)}`,
        icon: <TrophyOutlined />
      });
    }
    
    // 客户分群洞察
    if (customerSegments.length > 0) {
      const vipCustomers = customerSegments.filter(c => c.segment_code >= 444).length;
      const totalCustomers = customerSegments.length;
      const vipRatio = (vipCustomers / totalCustomers * 100).toFixed(1);
      
      insights.push({
        type: 'info',
        title: 'VIP客户分析',
        description: `VIP客户占比${vipRatio}%，共${vipCustomers}人`,
        icon: <UserOutlined />
      });
    }
    
    // 选址洞察
    if (siteScores.length > 0) {
      const topSite = siteScores.reduce((max, item) => item.total_score > max.total_score ? item : max);
      insights.push({
        type: 'success',
        title: '推荐选址',
        description: `候选点${topSite.candidate_id}评分最高(${topSite.total_score.toFixed(2)})`,
        icon: <EnvironmentOutlined />
      });
    }
    
    return insights;
  };

  const insights = getAIInsights();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <AntTitle level={2}>
            <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            AI智能洞察
          </AntTitle>
          <Text type="secondary">基于ETL分析层的智能数据洞察和业务建议</Text>
        </div>

        <Button 
          type="primary" 
          icon={<ThunderboltOutlined />}
          onClick={loadAIInsights}
          loading={loading}
          style={{ marginBottom: '24px' }}
        >
          刷新洞察数据
        </Button>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 总览 */}
          <TabPane tab="总览" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="AI洞察建议" size="small">
                  {insights.length > 0 ? (
                    <Timeline>
                      {insights.map((insight, index) => (
                        <Timeline.Item
                          key={index}
                          dot={insight.icon}
                          color={insight.type === 'success' ? 'green' : insight.type === 'warning' ? 'red' : 'blue'}
                        >
                          <div>
                            <Text strong>{insight.title}</Text>
                            <br />
                            <Text type="secondary">{insight.description}</Text>
                          </div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <Empty description="暂无洞察数据" />
                  )}
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <Card title="核心指标" size="small">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title="分析门店数"
                        value={profitData.length}
                        prefix={<DatabaseOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="客户分群数"
                        value={customerSegments.length}
                        prefix={<UserOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="销售预测数"
                        value={salesForecasts.length}
                        prefix={<LineChartOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="选址候选点"
                        value={siteScores.length}
                        prefix={<EnvironmentOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="数据质量" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text>利润数据完整性</Text>
                      <Progress 
                        percent={profitData.length > 0 ? 100 : 0} 
                        status={profitData.length > 0 ? 'success' : 'exception'}
                        size="small"
                      />
                    </div>
                    <div>
                      <Text>客户分群覆盖率</Text>
                      <Progress 
                        percent={customerSegments.length > 0 ? 100 : 0} 
                        status={customerSegments.length > 0 ? 'success' : 'exception'}
                        size="small"
                      />
                    </div>
                    <div>
                      <Text>预测模型状态</Text>
                      <Progress 
                        percent={salesForecasts.length > 0 ? 100 : 0} 
                        status={salesForecasts.length > 0 ? 'success' : 'exception'}
                        size="small"
                      />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 利润分析 */}
          <TabPane tab="利润分析" key="profit">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="门店利润排行榜" size="small">
                  <Table
                    dataSource={profitData.slice(0, 10)}
                    columns={[
                      {
                        title: '门店名称',
                        dataIndex: 'store_name',
                        key: 'store_name',
                      },
                      {
                        title: '城市',
                        dataIndex: 'city',
                        key: 'city',
                      },
                      {
                        title: '总收入',
                        dataIndex: 'total_revenue',
                        key: 'total_revenue',
                        render: (value) => `¥${value.toFixed(2)}`,
                      },
                      {
                        title: '净利润',
                        dataIndex: 'net_profit',
                        key: 'net_profit',
                        render: (value) => `¥${value.toFixed(2)}`,
                      },
                      {
                        title: '净利率',
                        dataIndex: 'net_profit_margin',
                        key: 'net_profit_margin',
                        render: (value) => `${value.toFixed(1)}%`,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <Card title="利润分析图表" size="small">
                  <Bar data={profitChartData} options={{ responsive: true }} />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 客户分群 */}
          <TabPane tab="客户分群" key="segments">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="客户分群分布" size="small">
                  <Doughnut data={segmentChartData} options={{ responsive: true }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="分群统计" size="small">
                  <List
                    dataSource={Object.entries(segmentDistribution).slice(0, 5)}
                    renderItem={([segment, count]) => (
                      <List.Item>
                        <Space>
                          <Tag color="blue">RFM: {segment}</Tag>
                          <Text>{count} 人</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 销售预测 */}
          <TabPane tab="销售预测" key="forecast">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="未来7天销售预测" size="small">
                  <Line data={forecastChartData} options={{ responsive: true }} />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <Card title="预测详情" size="small">
                  <Table
                    dataSource={salesForecasts.slice(0, 10)}
                    columns={[
                      {
                        title: '门店名称',
                        dataIndex: 'store_name',
                        key: 'store_name',
                      },
                      {
                        title: '预测日期',
                        dataIndex: 'date_key',
                        key: 'date_key',
                        render: (value) => new Date(value.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toLocaleDateString(),
                      },
                      {
                        title: '预测金额',
                        dataIndex: 'yhat',
                        key: 'yhat',
                        render: (value) => `¥${value.toFixed(2)}`,
                      },
                      {
                        title: '模型',
                        dataIndex: 'model_name',
                        key: 'model_name',
                        render: (value) => <Tag color="green">{value}</Tag>,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 智能选址 */}
          <TabPane tab="智能选址" key="sites">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="选址评分排行榜" size="small">
                  <Table
                    dataSource={siteScores.slice(0, 10)}
                    columns={[
                      {
                        title: '候选点ID',
                        dataIndex: 'candidate_id',
                        key: 'candidate_id',
                      },
                      {
                        title: '城市',
                        dataIndex: 'city',
                        key: 'city',
                      },
                      {
                        title: '匹配评分',
                        dataIndex: 'match_score',
                        key: 'match_score',
                        render: (value) => `${(value * 100).toFixed(1)}%`,
                      },
                      {
                        title: '蚕食评分',
                        dataIndex: 'cannibal_score',
                        key: 'cannibal_score',
                        render: (value) => `${(value * 100).toFixed(1)}%`,
                      },
                      {
                        title: '综合评分',
                        dataIndex: 'total_score',
                        key: 'total_score',
                        render: (value) => (
                          <Badge 
                            count={`${(value * 100).toFixed(1)}%`} 
                            style={{ backgroundColor: value > 0.8 ? '#52c41a' : value > 0.6 ? '#faad14' : '#ff4d4f' }}
                          />
                        ),
                      },
                      {
                        title: '推荐理由',
                        dataIndex: 'rationale',
                        key: 'rationale',
                        ellipsis: true,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default AIInsights;
