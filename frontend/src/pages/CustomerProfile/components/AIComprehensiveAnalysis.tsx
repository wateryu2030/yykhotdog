import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Statistic, Alert, Spin, Tabs, Tag, message } from 'antd';
import { Bar } from 'react-chartjs-2';
import { 
  DollarOutlined, 
  UserOutlined, 
  ShoppingCartOutlined,
  TrophyOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { api } from '../../../config/api';
import dayjs from 'dayjs';

interface AIComprehensiveAnalysisProps {
  selectedCity?: string;
  selectedShopId?: string;
  dateRange?: [string, string] | null;
}

const AIComprehensiveAnalysis: React.FC<AIComprehensiveAnalysisProps> = ({
  selectedCity,
  selectedShopId,
  dateRange,
}) => {
  const [loading, setLoading] = useState(false);
  const [cityComparison, setCityComparison] = useState<any[]>([]);
  const [storeComparison, setStoreComparison] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // 获取城市对比数据
  const fetchCityComparison = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      const response = await api.get(`/customer-profile/city-comparison?${params.toString()}`);
      if (response.data.success) {
        setCityComparison(response.data.data || []);
      }
    } catch (error) {
      message.error('获取城市对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取门店对比数据
  const fetchStoreComparison = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      const response = await api.get(`/customer-profile/store-comparison?${params.toString()}`);
      if (response.data.success) {
        setStoreComparison(response.data.data || []);
      }
    } catch (error) {
      message.error('获取门店对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取AI综合分析
  const fetchAIAnalysis = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('storeId', selectedShopId);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      const response = await api.get(`/customer-profile/ai-comprehensive-analysis?${params.toString()}`);
      if (response.data.success) {
        setAiAnalysis(response.data.data);
      }
    } catch (error) {
      message.error('获取AI分析失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCityComparison();
    fetchStoreComparison();
    fetchAIAnalysis();
  }, [selectedCity, selectedShopId, dateRange]);

  const cityColumns = [
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '客户数量',
      dataIndex: 'customer_count',
      key: 'customer_count',
      sorter: (a: any, b: any) => a.customer_count - b.customer_count,
    },
    {
      title: '复购率(%)',
      dataIndex: 'repeat_rate',
      key: 'repeat_rate',
      render: (value: number) => `${value?.toFixed(2) || 0}%`,
      sorter: (a: any, b: any) => a.repeat_rate - b.repeat_rate,
    },
    {
      title: '客单价(元)',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: (a: any, b: any) => a.avg_order_value - b.avg_order_value,
    },
    {
      title: '总销售额(元)',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (value: number) => `¥${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: any, b: any) => a.total_revenue - b.total_revenue,
    },
    {
      title: '总利润(元)',
      dataIndex: 'total_profit',
      key: 'total_profit',
      render: (value: number) => `¥${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: any, b: any) => a.total_profit - b.total_profit,
    },
    {
      title: '开业天数',
      dataIndex: 'days_since_first_store',
      key: 'days_since_first_store',
      render: (value: number) => value ? `${value}天` : '-',
    },
  ];

  const storeColumns = [
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '门店编号',
      dataIndex: 'store_code',
      key: 'store_code',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '开业日期',
      dataIndex: 'store_open_date',
      key: 'store_open_date',
      render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD') : '-',
    },
    {
      title: '开业天数',
      dataIndex: 'days_since_open',
      key: 'days_since_open',
      render: (value: number) => value ? `${value}天` : '-',
    },
    {
      title: '客户数量',
      dataIndex: 'customer_count',
      key: 'customer_count',
      sorter: (a: any, b: any) => a.customer_count - b.customer_count,
    },
    {
      title: '复购率(%)',
      dataIndex: 'repeat_rate',
      key: 'repeat_rate',
      render: (value: number) => `${value?.toFixed(2) || 0}%`,
      sorter: (a: any, b: any) => a.repeat_rate - b.repeat_rate,
    },
    {
      title: '客单价(元)',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: (a: any, b: any) => a.avg_order_value - b.avg_order_value,
    },
    {
      title: '总销售额(元)',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (value: number) => `¥${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: any, b: any) => a.total_revenue - b.total_revenue,
    },
    {
      title: '总利润(元)',
      dataIndex: 'total_profit',
      key: 'total_profit',
      render: (value: number) => `¥${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: any, b: any) => a.total_profit - b.total_profit,
    },
  ];

  const tabItems = [
    {
      key: 'summary',
      label: '综合分析',
      children: (
        <Spin spinning={loading}>
          {aiAnalysis && (
            <div>
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总客户数"
                      value={aiAnalysis.summary?.total_customers || 0}
                      prefix={<UserOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="复购率"
                      value={aiAnalysis.summary?.repeat_rate || 0}
                      suffix="%"
                      prefix={<ShoppingCartOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="平均客单价"
                      value={aiAnalysis.summary?.avg_order_value || 0}
                      prefix={<DollarOutlined />}
                      precision={2}
                      formatter={(value) => `¥${value}`}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="利润率"
                      value={aiAnalysis.summary?.profit_margin || 0}
                      suffix="%"
                      prefix={<TrophyOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              {aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  {aiAnalysis.insights.map((insight: any, index: number) => (
                    <Alert
                      key={index}
                      message={insight.title}
                      description={insight.content}
                      type={insight.type === 'error' ? 'error' : insight.type === 'warning' ? 'warning' : 'info'}
                      icon={insight.type === 'error' ? <WarningOutlined /> : <CheckCircleOutlined />}
                      style={{ marginBottom: 12 }}
                    />
                  ))}
                </div>
              )}

              {aiAnalysis.lifecycleSegments && (
                <Card title="客户生命周期分布" style={{ marginTop: 24 }}>
                  <Row gutter={16}>
                    {aiAnalysis.lifecycleSegments.map((segment: any) => (
                      <Col span={8} key={segment.segment}>
                        <Card>
                          <Statistic
                            title={segment.segment}
                            value={segment.count || 0}
                            suffix="人"
                          />
                          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                            平均消费: ¥{segment.avg_spent?.toFixed(2) || '0.00'}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            平均订单数: {segment.avg_orders?.toFixed(1) || '0'}
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}
            </div>
          )}
        </Spin>
      ),
    },
    {
      key: 'city',
      label: '城市对比',
      children: (
        <Spin spinning={loading}>
          <Table
            columns={cityColumns}
            dataSource={cityComparison}
            rowKey="city"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      ),
    },
    {
      key: 'store',
      label: selectedCity ? `${selectedCity} - 门店对比` : '门店对比',
      children: (
        <Spin spinning={loading}>
          <Table
            columns={storeColumns}
            dataSource={storeComparison}
            rowKey="store_id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      ),
    },
  ];

  return (
    <Card title="AI智能洞察 - 综合分析">
      <Tabs items={tabItems} />
    </Card>
  );
};

export default AIComprehensiveAnalysis;

