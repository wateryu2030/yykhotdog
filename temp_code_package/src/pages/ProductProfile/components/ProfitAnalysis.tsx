import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Select, Button, Space, Statistic, Row, Col, Alert, Tooltip, message, Spin } from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  SyncOutlined
} from '@ant-design/icons';
// 使用fetch替代api服务
// import api from '../../../services/api';

const { Option } = Select;

interface ProfitData {
  name: string;
  revenue: number;
  quantity: number;
  avgPrice: number;
  totalProfit: number;
  totalCost: number;
  profitMargin: number;
  costSource: string;
  category: string;
  dynamicData?: any;
}

interface ProfitSummary {
  totalRevenue: number;
  totalProfit: number;
  totalCost: number;
  overallProfitMargin: number;
  analysisType: string;
  categoryConfigs: any[];
}

interface ProfitAnalysisProps {
  filters: any;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({ filters }) => {
  const [data, setData] = useState<ProfitData[]>([]);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('differentiated');
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);

  useEffect(() => {
    fetchProfitAnalysis();
    fetchCategoryConfigs();
  }, [filters, analysisType]);

  const fetchProfitAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.shopId) params.append('shopId', filters.shopId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }
      params.append('analysisType', analysisType);

      const response = await fetch(`http://localhost:3001/api/product-profile/profit-analysis?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data.products);
        setSummary(result.data.summary);
      } else {
        setError(result.message || '获取利润分析数据失败');
        message.error(result.message || '获取利润分析数据失败');
      }
    } catch (err: any) {
      setError(err.message || '网络请求失败');
      message.error(err.message || '网络请求失败');
      console.error('Failed to fetch profit analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryConfigs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/product-profile/margin-configs');
      const result = await response.json();
      if (result.success) {
        setCategoryConfigs(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch category configs:', err);
    }
  };

  const getCostSourceText = (source: string) => {
    switch (source) {
      case 'real_data': return '真实成本';
      case 'category_historical': return '类别历史';
      case 'category_default': return '类别默认';
      case 'dynamic': return '动态计算';
      case 'fallback': return '备用方案';
      default: return '未知';
    }
  };

  const getCostSourceColor = (source: string) => {
    switch (source) {
      case 'real_data': return 'green';
      case 'category_historical': return 'cyan';
      case 'category_default': return 'blue';
      case 'dynamic': return 'purple';
      case 'fallback': return 'orange';
      default: return 'default';
    }
  };

  const getMarginTrendIcon = (dynamicData: any) => {
    if (!dynamicData) return null;
    
    switch (dynamicData.trend) {
      case 'increasing':
        return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'decreasing':
        return <FallOutlined style={{ color: '#f5222d' }} />;
      default:
        return null;
    }
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '营收',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
      sorter: (a: ProfitData, b: ProfitData) => a.revenue - b.revenue,
    },
    {
      title: '销量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value: number) => value.toLocaleString(),
      sorter: (a: ProfitData, b: ProfitData) => a.quantity - b.quantity,
    },
    {
      title: '平均价格',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      width: 120,
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '总利润',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
      sorter: (a: ProfitData, b: ProfitData) => a.totalProfit - b.totalProfit,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '毛利率',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      width: 120,
      render: (value: number, record: ProfitData) => (
        <Space>
          <span style={{ 
            color: value > 50 ? '#52c41a' : value > 40 ? '#faad14' : '#f5222d',
            fontWeight: 'bold'
          }}>
            {value.toFixed(1)}%
          </span>
          {getMarginTrendIcon(record.dynamicData)}
        </Space>
      ),
      sorter: (a: ProfitData, b: ProfitData) => a.profitMargin - b.profitMargin,
    },
    {
      title: '数据来源',
      dataIndex: 'costSource',
      key: 'costSource',
      width: 120,
      render: (source: string, record: ProfitData) => (
        <Tooltip title={record.dynamicData ? `置信度: ${(record.dynamicData.confidence * 100).toFixed(1)}%` : ''}>
          <Tag color={getCostSourceColor(source)}>
            {getCostSourceText(source)}
          </Tag>
        </Tooltip>
      ),
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      {/* 分析类型选择和控制面板 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <span>分析类型:</span>
              <Select
                value={analysisType}
                onChange={setAnalysisType}
                style={{ width: 150 }}
              >
                <Option value="differentiated">差异化毛利率</Option>
                <Option value="real_cost">真实成本数据</Option>
                <Option value="dynamic">动态毛利率</Option>
              </Select>
              <Button 
                icon={<SyncOutlined />} 
                onClick={fetchProfitAnalysis}
                loading={loading}
              >
                刷新数据
              </Button>
            </Space>
          </Col>
          <Col>
            <Button 
              icon={<SettingOutlined />}
              onClick={() => message.info('毛利率配置功能开发中...')}
            >
              配置毛利率
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 总体统计 */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总营收"
                value={summary.totalRevenue}
                prefix={<DollarOutlined />}
                formatter={(value) => `¥${Number(value).toFixed(2).toLocaleString()}`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总利润"
                value={summary.totalProfit}
                prefix={<DollarOutlined />}
                formatter={(value) => `¥${Number(value).toFixed(2).toLocaleString()}`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总成本"
                value={summary.totalCost}
                prefix={<DollarOutlined />}
                formatter={(value) => `¥${Number(value).toFixed(2).toLocaleString()}`}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="整体毛利率"
                value={summary.overallProfitMargin}
                suffix="%"
                precision={2}
                valueStyle={{ 
                  color: summary.overallProfitMargin > 50 ? '#52c41a' : '#faad14' 
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 类别毛利率配置信息 */}
      {categoryConfigs.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <h4>类别毛利率配置</h4>
          <Row gutter={16}>
            {categoryConfigs.map((config: any) => (
              <Col span={4} key={config.category}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {config.category}
                    </div>
                    <div style={{ color: '#1890ff' }}>
                      {(config.default_margin * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      样本: {config.sample_size}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 利润分析表格 */}
      <Card title="商品利润分析">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="name"
          pagination={{ pageSize: 20 }}
          loading={loading}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 数据说明 */}
      <Alert
        message="数据说明"
        description={
          <div>
            <p><strong>真实成本:</strong> 从cyrg2025.OrderGoods表获取的实际成本价格（最准确）</p>
            <p><strong>类别历史:</strong> 基于类别实际历史平均毛利率（来自真实数据）</p>
            <p><strong>类别默认:</strong> 基于商品类别的预设毛利率（待数据完善）</p>
            <p><strong>动态计算:</strong> 基于历史数据趋势动态调整的毛利率</p>
            <p><strong>备用方案:</strong> 当无法获取真实数据时使用的默认毛利率</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default ProfitAnalysis;