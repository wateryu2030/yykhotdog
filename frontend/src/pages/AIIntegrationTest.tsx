import React, { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Alert, Typography, Row, Col, Statistic, Tag } from 'antd';
import { RobotOutlined, BellOutlined, TrophyOutlined } from '@ant-design/icons';
import { api } from '../config/api';

const { Title, Text } = Typography;

const AIIntegrationTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [aiInsightsData, setAiInsightsData] = useState<any>(null);
  const [churnAlertData, setChurnAlertData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 测试AI深度洞察
  const testAIInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/customer-profile/ai-insights', {
        city: '沈阳市',
        shopId: '',
        startDate: '',
        endDate: ''
      });

      if (response.data.success) {
        setAiInsightsData(response.data.data);
        message.success('AI深度洞察获取成功！');
      } else {
        setError('AI洞察获取失败');
        message.error('AI洞察获取失败');
      }
    } catch (error) {
      console.error('AI洞察测试失败:', error);
      setError('AI洞察测试失败');
      message.error('AI洞察测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试客户流失预警
  const testChurnAlert = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/customer-profile/churn-alert?city=沈阳市');
      
      if (response.data.success) {
        setChurnAlertData(response.data.data);
        message.success('客户流失预警获取成功！');
      } else {
        setError('流失预警获取失败');
        message.error('流失预警获取失败');
      }
    } catch (error) {
      console.error('流失预警测试失败:', error);
      setError('流失预警测试失败');
      message.error('流失预警测试失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card title="AI功能集成测试" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Button 
              type="primary" 
              icon={<RobotOutlined />}
              onClick={testAIInsights}
              loading={loading}
              block
            >
              测试AI深度洞察
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              icon={<BellOutlined />}
              onClick={testChurnAlert}
              loading={loading}
              block
            >
              测试流失预警
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              icon={<TrophyOutlined />}
              onClick={() => message.info('生命周期预测功能开发中...')}
              block
            >
              生命周期预测
            </Button>
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {aiInsightsData && (
        <Card title="AI深度洞察结果" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="健康度评分"
                value={aiInsightsData.insights?.healthScore || 0}
                suffix="/ 100"
                valueStyle={{ 
                  color: (aiInsightsData.insights?.healthScore || 0) > 70 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="客户分群数"
                value={aiInsightsData.rawData?.segments?.length || 0}
                suffix="个"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="总客户数"
                value={aiInsightsData.rawData?.segments?.reduce((sum: number, seg: any) => sum + seg.customer_count, 0) || 0}
                suffix="人"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="总营收"
                value={aiInsightsData.rawData?.segments?.reduce((sum: number, seg: any) => sum + seg.total_revenue, 0) || 0}
                prefix="¥"
                precision={2}
              />
            </Col>
          </Row>

          {aiInsightsData.insights?.personalizedMarketingSuggestions && (
            <div style={{ marginTop: '16px' }}>
              <Title level={5}>个性化营销建议：</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {aiInsightsData.insights.personalizedMarketingSuggestions.map((suggestion: string, index: number) => (
                  <Tag key={index} color="blue">{suggestion}</Tag>
                ))}
              </div>
            </div>
          )}

          {aiInsightsData.insights?.priorityActions && (
            <div style={{ marginTop: '16px' }}>
              <Title level={5}>优先行动建议：</Title>
              {aiInsightsData.insights.priorityActions.map((action: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <Tag color={action.priority === 'high' ? 'red' : action.priority === 'medium' ? 'orange' : 'green'}>
                    {action.priority === 'high' ? '高优先级' : action.priority === 'medium' ? '中优先级' : '低优先级'}
                  </Tag>
                  <Text strong>{action.title}</Text>
                  <br />
                  <Text type="secondary">{action.description}</Text>
                  <br />
                  <Text>建议行动：{action.action}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {churnAlertData && (
        <Card title="客户流失预警结果">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="高风险客户"
                value={churnAlertData.riskStats?.high || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="中风险客户"
                value={churnAlertData.riskStats?.medium || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="低风险客户"
                value={churnAlertData.riskStats?.low || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="总预警客户"
                value={churnAlertData.riskStats?.total || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>

          {churnAlertData.alerts && churnAlertData.alerts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Title level={5}>预警客户详情（前5个）：</Title>
              {churnAlertData.alerts.slice(0, 5).map((alert: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <Text strong>客户ID: {alert.customer_id}</Text>
                  <br />
                  <Tag color={alert.churn_risk_level === '高风险' ? 'red' : alert.churn_risk_level === '中风险' ? 'orange' : 'green'}>
                    {alert.churn_risk_level}
                  </Tag>
                  <Text> | 距今天数: {alert.days_since_last_order}天</Text>
                  <br />
                  <Text type="secondary">历史消费: ¥{alert.total_spent?.toFixed(2) || '0.00'} | 订单数: {alert.total_orders}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AIIntegrationTest;
