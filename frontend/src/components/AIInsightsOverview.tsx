import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Spin,
  Alert,
  Typography,
  Progress,
  Tag
} from 'antd';
import {
  RobotOutlined,
  DollarOutlined,
  UserOutlined,
  LineChartOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  TrendingUpOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

interface AIInsightsOverviewProps {
  onViewDetails?: () => void;
}

interface QuickMetrics {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  unique_stores: number;
}

interface AIInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const AIInsightsOverview: React.FC<AIInsightsOverviewProps> = ({ onViewDetails }) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 加载快速洞察数据
  const loadQuickInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [metricsResponse, insightsResponse] = await Promise.all([
        api.get('/ai-insights/dashboard-metrics'),
        api.get('/ai-insights/insights')
      ]);
      
      setMetrics(metricsResponse.data.data);
      setInsights(insightsResponse.data.data || []);
    } catch (error) {
      console.error('加载AI洞察数据失败:', error);
      setError('加载AI洞察数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuickInsights();
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'info': return <TrendingUpOutlined style={{ color: '#1890ff' }} />;
      default: return <RobotOutlined />;
    }
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  if (loading) {
    return (
      <Card title="AI智能洞察概览" size="small">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>加载AI洞察数据中...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="AI智能洞察概览" size="small">
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadQuickInsights}>
              重试
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          AI智能洞察概览
        </Space>
      }
      size="small"
      extra={
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={onViewDetails}
        >
          查看详情
        </Button>
      }
    >
      {/* 核心指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Statistic
            title="总营收"
            value={metrics?.total_revenue || 0}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#3f8600', fontSize: '16px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="总订单"
            value={metrics?.total_orders || 0}
            valueStyle={{ color: '#1890ff', fontSize: '16px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="客单价"
            value={metrics?.avg_order_value || 0}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#722ed1', fontSize: '16px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="门店数"
            value={metrics?.unique_stores || 0}
            valueStyle={{ color: '#eb2f96', fontSize: '16px' }}
          />
        </Col>
      </Row>

      {/* AI洞察建议 */}
      {insights.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Text strong style={{ marginBottom: '8px', display: 'block' }}>
            <ThunderboltOutlined style={{ marginRight: '4px' }} />
            AI洞察建议
          </Text>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {insights.slice(0, 3).map((insight, index) => (
              <div key={index} style={{ 
                padding: '8px 12px', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}>
                <Space>
                  {getInsightIcon(insight.type)}
                  <Text strong>{insight.title}</Text>
                  <Tag color={getInsightColor(insight.priority)} size="small">
                    {insight.priority}
                  </Tag>
                </Space>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {insight.description}
                  </Text>
                </div>
              </div>
            ))}
          </Space>
        </div>
      )}

      {/* 数据质量指示器 */}
      <div style={{ marginTop: '16px' }}>
        <Text strong style={{ marginBottom: '8px', display: 'block' }}>
          数据质量状态
        </Text>
        <Row gutter={8}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '12px' }}>利润分析</Text>
              <Progress 
                percent={100} 
                size="small" 
                status="success"
                showInfo={false}
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '12px' }}>客户分群</Text>
              <Progress 
                percent={100} 
                size="small" 
                status="success"
                showInfo={false}
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '12px' }}>销售预测</Text>
              <Progress 
                percent={100} 
                size="small" 
                status="success"
                showInfo={false}
              />
            </div>
          </Col>
        </Row>
      </div>

      {/* 快速操作按钮 */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <Space>
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={onViewDetails}
            size="small"
          >
            深度分析
          </Button>
          <Button 
            icon={<ThunderboltOutlined />}
            onClick={loadQuickInsights}
            size="small"
          >
            刷新数据
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default AIInsightsOverview;
