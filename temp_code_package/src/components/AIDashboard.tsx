// AI智能仪表盘组件

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Alert, List, Tag, Button, Spin, Empty, Space, Tooltip } from 'antd';
import { 
  DashboardOutlined, 
  BulbOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  RobotOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/plots';

interface AIDashboardProps {
  userId?: string;
  role?: string;
}

interface PersonalizedMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIInsight {
  type: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
  confidence: number;
}

interface PredictiveAlert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  predictedValue: number;
  confidence: number;
  recommendedAction: string;
}

interface ContextualRecommendation {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actions: string[];
}

const AIDashboard: React.FC<AIDashboardProps> = ({ userId = 'default', role = 'analyst' }) => {
  const [loading, setLoading] = useState(false);
  const [personalizedMetrics, setPersonalizedMetrics] = useState<PersonalizedMetric[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [recommendations, setRecommendations] = useState<ContextualRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAIDashboardData();
  }, [userId, role]);

  const loadAIDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 并行加载所有AI数据
      const [metricsRes, insightsRes, alertsRes, recommendationsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/ai-dashboard/personalized-metrics?userId=${userId}&role=${role}`),
        fetch(`http://localhost:3001/api/ai-dashboard/intelligent-insights?timeRange=7`),
        fetch(`http://localhost:3001/api/ai-dashboard/predictive-alerts?timeRange=30`),
        fetch(`http://localhost:3001/api/ai-dashboard/contextual-recommendations?context=morning&currentMetrics={}`)
      ]);

      const [metricsData, insightsData, alertsData, recommendationsData] = await Promise.all([
        metricsRes.json(),
        insightsRes.json(),
        alertsRes.json(),
        recommendationsRes.json()
      ]);

      if (metricsData.success) setPersonalizedMetrics(metricsData.data.metrics || []);
      if (insightsData.success) setInsights(insightsData.data.insights || []);
      if (alertsData.success) setAlerts(alertsData.data.alerts || []);
      if (recommendationsData.success) setRecommendations(recommendationsData.data.recommendations || []);

    } catch (err) {
      console.error('加载AI仪表盘数据失败:', err);
      setError('加载AI仪表盘数据失败');
      
      // 设置默认数据以避免渲染错误
      setPersonalizedMetrics([]);
      setInsights([]);
      setAlerts([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <span style={{ color: '#52c41a' }}>↗</span>;
      case 'down': return <span style={{ color: '#f5222d' }}>↘</span>;
      default: return <span style={{ color: '#1890ff' }}>→</span>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f5222d';
      case 'medium': return '#fa8c16';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f5222d';
      case 'warning': return '#fa8c16';
      case 'info': return '#1890ff';
      default: return '#52c41a';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return '#52c41a';
      case 'negative': return '#f5222d';
      case 'neutral': return '#1890ff';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>AI正在分析数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert message="AI仪表盘加载失败" description={error} type="error" />
        <Button onClick={loadAIDashboardData} style={{ marginTop: 16 }}>重试</Button>
      </div>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '20px 24px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '12px', 
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <RobotOutlined style={{ fontSize: 32, color: '#fff', marginRight: 12 }} />
          <span style={{ fontWeight: 'bold', fontSize: 28, color: '#fff' }}>AI智能仪表盘</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Tag color="blue" style={{ color: '#fff', borderColor: '#fff' }}>
            {role === 'admin' ? '管理员' : role === 'manager' ? '经理' : role === 'analyst' ? '分析师' : '操作员'}
          </Tag>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={loadAIDashboardData}
            loading={loading}
          >
            刷新AI分析
          </Button>
        </div>
      </div>

      {/* 个性化指标 */}
      <Card title="个性化关键指标" size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {personalizedMetrics.map((metric, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card size="small" hoverable>
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{metric.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getTrendIcon(metric.trend)}
                        <Tag color={getPriorityColor(metric.priority)}>
                          {metric.priority}
                        </Tag>
                      </div>
                    </div>
                  }
                  value={metric.value}
                  suffix={
                    <span style={{ 
                      color: metric.trend === 'up' ? '#52c41a' : metric.trend === 'down' ? '#f5222d' : '#1890ff',
                      fontSize: '12px'
                    }}>
                      {metric.change}
                    </span>
                  }
                  valueStyle={{ 
                    color: getPriorityColor(metric.priority),
                    fontSize: '20px'
                  }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* AI洞察和建议 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="AI智能洞察" size="small">
            <List
              dataSource={insights}
              renderItem={(insight) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<BulbOutlined style={{ color: getImpactColor(insight.impact) }} />}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {insight.title}
                        <Tag color={getImpactColor(insight.impact)}>
                          {insight.impact}
                        </Tag>
                        <Tag color="blue">
                          {insight.confidence}% 置信度
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <p>{insight.description}</p>
                        <p style={{ color: '#666', fontSize: '12px' }}>
                          <strong>建议：</strong>{insight.recommendation}
                        </p>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="上下文建议" size="small">
            <List
              dataSource={recommendations}
              renderItem={(recommendation) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<CheckCircleOutlined style={{ color: getPriorityColor(recommendation.priority) }} />}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {recommendation.title}
                        <Tag color={getPriorityColor(recommendation.priority)}>
                          {recommendation.priority}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <p>{recommendation.description}</p>
                        <div>
                          <strong>行动建议：</strong>
                          {recommendation.actions.map((action, index) => (
                            <Tag key={index} style={{ margin: '2px' }}>{action}</Tag>
                          ))}
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

      {/* 预测性预警 */}
      <Card title="预测性预警" size="small">
        <List
          dataSource={alerts}
          renderItem={(alert) => (
            <List.Item>
              <Alert
                message={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {alert.title}
                    <Tag color={getSeverityColor(alert.severity)}>{alert.severity}</Tag>
                    <Tag color="blue">{alert.confidence}% 置信度</Tag>
                  </div>
                }
                description={
                  <div>
                    <p>{alert.description}</p>
                    <p style={{ color: '#666', fontSize: '12px' }}>
                      <strong>预测值：</strong>{alert.predictedValue.toLocaleString()}
                    </p>
                    <p style={{ color: '#666', fontSize: '12px' }}>
                      <strong>建议行动：</strong>{alert.recommendedAction}
                    </p>
                  </div>
                }
                type={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                showIcon
                icon={alert.severity === 'critical' ? <WarningOutlined /> : <EyeOutlined />}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 底部操作 */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Space>
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={() => console.log('AI深度分析')}
          >
            AI深度分析
          </Button>
          <Button 
            icon={<DashboardOutlined />}
            onClick={() => console.log('自定义仪表盘')}
          >
            自定义仪表盘
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={loadAIDashboardData}
            loading={loading}
          >
            刷新数据
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default AIDashboard;
