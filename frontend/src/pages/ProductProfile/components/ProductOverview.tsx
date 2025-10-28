// 商品概览组件

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Progress, Spin, Empty } from 'antd';
import { 
  ShoppingOutlined, 
  DollarOutlined, 
  BarChartOutlined,
  TrophyOutlined,
  EyeOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/plots';

interface ProductOverviewProps {
  filters: {
    city?: string;
    shopId?: string;
    dateRange?: [string, string] | null;
  };
}

interface ProductOverviewData {
  totalProducts: number;
  activeProducts: number;
  totalRevenue: number;
  totalQuantity: number;
  avgOrderValue: number;
  categories: Array<{
    name: string;
    productCount: number;
    revenue: number;
    quantity: number;
    revenueShare: string;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    customerCount: number;
    avgPrice: number;
  }>;
  salesTrend: Array<{
    date: string;
    productCount: number;
    revenue: number;
    quantity: number;
  }>;
}

const ProductOverview: React.FC<ProductOverviewProps> = ({ filters }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProductOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
  }, [filters]);

  const fetchOverviewData = async () => {
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

      const response = await fetch(`http://localhost:3001/api/product-profile/dashboard?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(typeof result.error === 'string' ? result.error : '数据加载失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络请求失败';
      setError(errorMessage);
      console.error('获取商品概览数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载商品概览数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>数据加载失败: {error}</div>
        <Button onClick={fetchOverviewData} style={{ marginTop: 16 }}>重试</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="暂无数据" />
      </div>
    );
  }

  // 准备图表数据
  const categoryChartData = data.categories.map(cat => ({
    category: cat.name,
    value: cat.revenue,
    count: cat.productCount
  }));

  const salesTrendData = data.salesTrend.map(trend => ({
    date: trend.date,
    revenue: trend.revenue,
    quantity: trend.quantity,
    products: trend.productCount
  }));

  const categoryConfig = {
    data: categoryChartData,
    xField: 'category',
    yField: 'value',
    color: '#1890ff',
    label: {
      position: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      value: {
        alias: '销售额',
      },
    },
  };

  const trendConfig = {
    data: salesTrendData,
    xField: 'date',
    yField: 'revenue',
    smooth: true,
    color: '#52c41a',
    point: {
      size: 4,
      shape: 'circle',
    },
    meta: {
      revenue: {
        alias: '销售额',
      },
    },
  };

  // 表格列定义
  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '销量',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a: any, b: any) => a.quantity - b.quantity,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '销售额',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a: any, b: any) => a.revenue - b.revenue,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '客户数',
      dataIndex: 'customerCount',
      key: 'customerCount',
      sorter: (a: any, b: any) => a.customerCount - b.customerCount,
    },
    {
      title: '平均价格',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (text: any, record: any) => (
        <Space size="middle">
          <Button type="link" size="small" icon={<EyeOutlined />}>
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总商品数"
              value={data.totalProducts}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在售商品"
              value={data.activeProducts}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总销售额"
              value={data.totalRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总销量"
              value={data.totalQuantity}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="商品分类销售分布" size="small">
            <Column {...categoryConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="销售趋势" size="small">
            <Line {...trendConfig} height={300} />
          </Card>
        </Col>
      </Row>

      {/* 分类统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="商品分类统计" size="small">
            <Row gutter={[16, 16]}>
              {data.categories.map((category, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card size="small" hoverable>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {category.productCount}
                      </div>
                      <div style={{ color: '#666', marginBottom: 8 }}>{category.name}</div>
                      <div style={{ fontSize: 14, color: '#52c41a' }}>
                        销售额: ¥{category.revenue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        占比: {category.revenueShare}%
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 热销商品排行 */}
      <Card title="热销商品TOP10" size="small">
        <Table
          columns={columns}
          dataSource={data.topProducts.map((product, index) => ({
            ...product,
            key: index,
            rank: index + 1
          }))}
          pagination={false}
          size="middle"
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
};

export default ProductOverview;
