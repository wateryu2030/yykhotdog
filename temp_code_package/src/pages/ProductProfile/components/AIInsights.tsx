// AI洞察组件
import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Spin, Empty, Alert } from 'antd';
import { RobotOutlined, BulbOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface AIInsightsProps {
  filters: {
    city?: string;
    shopId?: string;
    dateRange?: [string, string] | null;
  };
}

const AIInsights: React.FC<AIInsightsProps> = ({ filters }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAIInsights();
  }, [filters]);

  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/product-profile/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('获取AI洞察数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!data) {
    return <Empty description="暂无数据" />;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'green';
    }
  };

  return (
    <div>
      {/* 推荐建议 */}
      <Card title="AI推荐建议" size="small" style={{ marginBottom: 24 }}>
        <List
          dataSource={data.insights.recommendations}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={<BulbOutlined style={{ color: '#1890ff' }} />}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.title}
                    <Tag color={getPriorityColor(item.priority)}>{item.priority}</Tag>
                  </div>
                }
                description={
                  <div>
                    <p>{item.description}</p>
                    {item.products && item.products.length > 0 && (
                      <div>
                        <strong>相关商品：</strong>
                        {item.products.map((product: string, index: number) => (
                          <Tag key={index} style={{ margin: '2px' }}>{product}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 预测分析 */}
      <Card title="AI预测分析" size="small" style={{ marginBottom: 24 }}>
        <List
          dataSource={data.insights.predictions}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={<RobotOutlined style={{ color: '#52c41a' }} />}
                title={item.title}
                description={
                  <div>
                    <p>{item.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>置信度：</span>
                      <Tag color={item.confidence > 80 ? 'green' : item.confidence > 60 ? 'orange' : 'red'}>
                        {item.confidence}%
                      </Tag>
                    </div>
                    <p style={{ color: '#666', fontSize: '12px' }}>{item.details}</p>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 预警信息 */}
      <Card title="AI预警信息" size="small">
        <List
          dataSource={data.insights.alerts}
          renderItem={(item: any) => (
            <List.Item>
              <Alert
                message={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.title}
                    <Tag color={getSeverityColor(item.severity)}>{item.severity}</Tag>
                  </div>
                }
                description={
                  <div>
                    <p>{item.description}</p>
                    {item.products && item.products.length > 0 && (
                      <div>
                        <strong>相关商品：</strong>
                        {item.products.map((product: string, index: number) => (
                          <Tag key={index} style={{ margin: '2px' }}>{product}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                }
                type={item.severity === 'critical' ? 'error' : item.severity === 'warning' ? 'warning' : 'info'}
                showIcon
              />
            </List.Item>
          )}
        />
      </Card>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button 
          type="primary" 
          icon={<RobotOutlined />}
          onClick={fetchAIInsights}
          loading={loading}
        >
          刷新AI洞察
        </Button>
      </div>
    </div>
  );
};

export default AIInsights;
