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
  Tooltip as AntTooltip,
  Empty,
  Select,
  DatePicker,
  Switch
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
  PieChartOutlined,
  SettingOutlined,
  FilterOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Line, Doughnut, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
  ScatterController,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
  ScatterController,
  ChartDataLabels
);

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

interface EnhancedMetrics {
  // 基础指标
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  unique_stores: number;
  
  // 扩展指标
  growth_rate: number;
  customer_retention: number;
  market_share: number;
  profitability: number;
}

interface AdvancedInsight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  category: 'financial' | 'operational' | 'customer' | 'market';
  recommendations: string[];
  data_sources: string[];
  created_at: string;
}

interface TrendAnalysis {
  period: string;
  revenue_trend: number[];
  order_trend: number[];
  customer_trend: number[];
  labels: string[];
}

interface CorrelationAnalysis {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: number;
  interpretation: string;
}

const EnhancedAIInsights: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // 数据状态
  const [metrics, setMetrics] = useState<EnhancedMetrics | null>(null);
  const [insights, setInsights] = useState<AdvancedInsight[]>([]);
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationAnalysis[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  // 加载增强洞察数据
  const loadEnhancedInsights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('start_date', dateRange[0].format('YYYY-MM-DD'));
        params.append('end_date', dateRange[1].format('YYYY-MM-DD'));
      }
      if (selectedStore) {
        params.append('store_id', selectedStore);
      }

      const [
        metricsResponse,
        insightsResponse,
        trendsResponse,
        correlationsResponse,
        storesResponse
      ] = await Promise.all([
        api.get(`/ai-insights/enhanced-metrics?${params}`),
        api.get(`/ai-insights/advanced-insights?${params}`),
        api.get(`/ai-insights/trend-analysis?${params}`),
        api.get(`/ai-insights/correlation-analysis?${params}`),
        api.get('/ai-insights/stores')
      ]);
      
      setMetrics(metricsResponse.data.data);
      setInsights(insightsResponse.data.data || []);
      setTrends(trendsResponse.data.data);
      setCorrelations(correlationsResponse.data.data || []);
      setStores(storesResponse.data.data || []);
      
    } catch (error) {
      console.error('加载增强洞察数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnhancedInsights();
  }, [dateRange, selectedStore]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadEnhancedInsights, 30000); // 30秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 趋势分析图表数据
  const trendChartData = trends ? {
    labels: trends.labels,
    datasets: [
      {
        label: '营收趋势',
        data: trends.revenue_trend,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: '订单趋势',
        data: trends.order_trend,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      },
      {
        label: '客户趋势',
        data: trends.customer_trend,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1
      }
    ]
  } : null;

  // 相关性分析散点图数据
  const correlationChartData = correlations.length > 0 ? {
    datasets: correlations.map((corr, index) => ({
      label: `${corr.metric1} vs ${corr.metric2}`,
      data: [{
        x: Math.random() * 100, // 模拟数据
        y: Math.random() * 100
      }],
      backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
      borderColor: `hsl(${index * 60}, 70%, 50%)`
    }))
  } : null;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'info': return <RiseOutlined style={{ color: '#1890ff' }} />;
      case 'error': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      default: return <RobotOutlined />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'green';
      case 'operational': return 'blue';
      case 'customer': return 'purple';
      case 'market': return 'orange';
      default: return 'default';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2}>
                <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                增强AI智能洞察
              </Title>
              <Text type="secondary">深度数据分析与智能业务洞察</Text>
            </Col>
            <Col>
              <Space>
                <Switch
                  checkedChildren="自动刷新"
                  unCheckedChildren="手动刷新"
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                />
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadEnhancedInsights}
                  loading={loading}
                >
                  刷新数据
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  type="primary"
                >
                  导出报告
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 筛选器 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>时间范围:</Text>
            </Col>
            <Col>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                format="YYYY-MM-DD"
              />
            </Col>
            <Col>
              <Text strong>门店筛选:</Text>
            </Col>
            <Col>
              <Select
                value={selectedStore}
                onChange={setSelectedStore}
                style={{ width: 200 }}
                placeholder="选择门店"
                allowClear
              >
                {stores.map(store => (
                  <Select.Option key={store.id} value={store.id}>
                    {store.store_name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 总览 */}
          <TabPane tab="智能总览" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="核心业务指标" size="small">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="总营收"
                        value={metrics?.total_revenue || 0}
                        precision={2}
                        prefix="¥"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="增长率"
                        value={metrics?.growth_rate || 0}
                        precision={2}
                        suffix="%"
                        valueStyle={{ color: (metrics?.growth_rate || 0) > 0 ? '#3f8600' : '#cf1322' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="客户留存率"
                        value={metrics?.customer_retention || 0}
                        precision={2}
                        suffix="%"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="盈利能力"
                        value={metrics?.profitability || 0}
                        precision={2}
                        suffix="%"
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <Card title="AI洞察建议" size="small">
                  {insights.length > 0 ? (
                    <Timeline>
                      {insights.slice(0, 5).map((insight) => (
                        <Timeline.Item
                          key={insight.id}
                          dot={getInsightIcon(insight.type)}
                          color={insight.type === 'success' ? 'green' : insight.type === 'warning' ? 'red' : 'blue'}
                        >
                          <div>
                            <Space>
                              <Text strong>{insight.title}</Text>
                              <Tag color={getImpactColor(insight.impact)}>
                                {insight.impact}
                              </Tag>
                              <Tag color={getCategoryColor(insight.category)}>
                                {insight.category}
                              </Tag>
                            </Space>
                            <br />
                            <Text type="secondary">{insight.description}</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Text style={{ fontSize: '12px' }}>
                                置信度: {insight.confidence}% | 
                                数据源: {insight.data_sources.join(', ')}
                              </Text>
                            </div>
                          </div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <Empty description="暂无洞察数据" />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="数据质量监控" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text>利润分析数据</Text>
                      <Progress percent={95} status="success" size="small" />
                    </div>
                    <div>
                      <Text>客户分群数据</Text>
                      <Progress percent={88} status="success" size="small" />
                    </div>
                    <div>
                      <Text>销售预测模型</Text>
                      <Progress percent={92} status="success" size="small" />
                    </div>
                    <div>
                      <Text>选址评分数据</Text>
                      <Progress percent={85} status="active" size="small" />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 趋势分析 */}
          <TabPane tab="趋势分析" key="trends">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="多维度趋势分析" size="small">
                  {trendChartData ? (
                    <Line data={trendChartData} options={{ responsive: true }} />
                  ) : (
                    <Empty description="暂无趋势数据" />
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 相关性分析 */}
          <TabPane tab="相关性分析" key="correlations">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="指标相关性散点图" size="small">
                  {correlationChartData ? (
                    <Scatter data={correlationChartData} options={{ responsive: true }} />
                  ) : (
                    <Empty description="暂无相关性数据" />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="相关性分析表" size="small">
                  <Table
                    dataSource={correlations}
                    columns={[
                      {
                        title: '指标1',
                        dataIndex: 'metric1',
                        key: 'metric1',
                      },
                      {
                        title: '指标2',
                        dataIndex: 'metric2',
                        key: 'metric2',
                      },
                      {
                        title: '相关系数',
                        dataIndex: 'correlation',
                        key: 'correlation',
                        render: (value) => value.toFixed(3),
                      },
                      {
                        title: '显著性',
                        dataIndex: 'significance',
                        key: 'significance',
                        render: (value) => value.toFixed(3),
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 高级洞察 */}
          <TabPane tab="高级洞察" key="advanced">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="深度业务洞察" size="small">
                  <List
                    dataSource={insights}
                    renderItem={(insight) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={getInsightIcon(insight.type)}
                          title={
                            <Space>
                              <Text strong>{insight.title}</Text>
                              <Tag color={getImpactColor(insight.impact)}>
                                {insight.impact}
                              </Tag>
                              <Tag color={getCategoryColor(insight.category)}>
                                {insight.category}
                              </Tag>
                            </Space>
                          }
                          description={
                            <div>
                              <Text>{insight.description}</Text>
                              <div style={{ marginTop: '8px' }}>
                                <Text strong>建议措施:</Text>
                                <ul style={{ marginTop: '4px' }}>
                                  {insight.recommendations.map((rec, index) => (
                                    <li key={index} style={{ fontSize: '12px' }}>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div style={{ marginTop: '8px' }}>
                                <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                  置信度: {insight.confidence}% | 
                                  数据源: {insight.data_sources.join(', ')} |
                                  创建时间: {insight.created_at}
                                </Text>
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
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

export default EnhancedAIInsights;
