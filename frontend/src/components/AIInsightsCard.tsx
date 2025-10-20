import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Typography, Spin, Alert, Button, Space, Select } from 'antd';
import { getJSON } from '../utils/api';
import { BulbOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface Suggestion {
  dimension: string;
  revenue: number;
  gross_profit: number;
  net_profit: number;
  gross_margin: number;
  orders_avg: number;
  advice: string[];
}

interface AIInsightsCardProps {
  from?: string;
  to?: string;
  scope?: 'city' | 'store';
}

export default function AIInsightsCard({ from = '20251001', to = '20251020', scope = 'city' }: AIInsightsCardProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentScope, setCurrentScope] = useState<'city' | 'store'>(scope);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const data = await getJSON('/api/insights/suggestions', {
        scope: currentScope,
        from,
        to
      });
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [currentScope, from, to]);

  const getAdviceIcon = (advice: string) => {
    if (advice.includes('⚠️')) return <WarningOutlined style={{ color: '#faad14' }} />;
    if (advice.includes('✅')) return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    return <BulbOutlined style={{ color: '#1890ff' }} />;
  };

  const getAdviceColor = (advice: string) => {
    if (advice.includes('⚠️')) return 'warning';
    if (advice.includes('✅')) return 'success';
    if (advice.includes('🔻') || advice.includes('💸') || advice.includes('🧊')) return 'error';
    return 'default';
  };

  return (
    <Card 
      title={
        <Space>
          <BulbOutlined />
          AI 智能建议
          <Select 
            value={currentScope} 
            onChange={setCurrentScope}
            size="small"
            style={{ width: 100 }}
          >
            <Option value="city">城市</Option>
            <Option value="store">门店</Option>
          </Select>
        </Space>
      }
      extra={
        <Button size="small" onClick={loadSuggestions} loading={loading}>
          刷新
        </Button>
      }
      style={{ height: '100%' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : suggestions.length === 0 ? (
        <Alert message="暂无数据" type="info" />
      ) : (
        <List
          dataSource={suggestions}
          renderItem={(item) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ marginBottom: 8 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    {item.dimension}
                  </Title>
                  <Space size="small">
                    <Text type="secondary">营收: ¥{item.revenue.toFixed(0)}</Text>
                    <Text type="secondary">毛利率: {(item.gross_margin * 100).toFixed(1)}%</Text>
                    <Text type="secondary">订单: {item.orders_avg.toFixed(0)}</Text>
                  </Space>
                </div>
                
                {item.advice.length > 0 ? (
                  <div>
                    {item.advice.map((tip, index) => (
                      <Tag
                        key={index}
                        color={getAdviceColor(tip)}
                        icon={getAdviceIcon(tip)}
                        style={{ marginBottom: 4, display: 'block', textAlign: 'left' }}
                      >
                        {tip}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">暂无建议</Text>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
