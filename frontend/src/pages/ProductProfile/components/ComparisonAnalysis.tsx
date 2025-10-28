// 总体对比分析组件 - 增强版
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Alert, Row, Col, Statistic, Spin, Empty } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  FireOutlined
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/plots';

// 数据接口定义
interface CityData {
  city: string;
  totalRevenue: number;
  totalQuantity: number;
  totalProducts: number;
  totalOrders: number;
  avgOrderValue: number;
  profitMargin: number;
  topProducts?: ProductData[];
}

interface StoreData {
  store_name: string;
  city: string;
  totalRevenue: number;
  totalQuantity: number;
  totalOrders: number;
  profitMargin: number;
}

interface ProductData {
  product_name: string;
  product_revenue: number;
  product_quantity: number;
  order_count: number;
  avg_price: number;
  profit_margin: number;
}

interface TrendData {
  date: string;
  city: string;
  daily_revenue: number;
  daily_quantity: number;
  daily_orders: number;
}

const ComparisonAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [storeData, setStoreData] = useState<StoreData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 并行获取所有数据
      const [cityResponse, storeResponse, trendResponse] = await Promise.all([
        fetch('http://localhost:3001/api/product-profile/comparison/cities'),
        fetch('http://localhost:3001/api/product-profile/comparison/stores'),
        fetch('http://localhost:3001/api/product-profile/comparison/trends?days=30')
      ]);

      const cityResult = await cityResponse.json();
      if (cityResult.success) {
        // 字段名映射：后端返回snake_case，前端使用camelCase
        const mappedCityData = cityResult.data.map((city: any) => ({
          city: city.city,
          totalRevenue: city.total_revenue,
          totalQuantity: city.total_quantity,
          totalProducts: city.total_products,
          totalOrders: city.total_orders,
          avgOrderValue: city.avg_order_value,
          profitMargin: city.profit_margin
        }));
        setCityData(mappedCityData);
      }

      const storeResult = await storeResponse.json();
      if (storeResult.success) {
        // 字段名映射
        const mappedStoreData = storeResult.data.map((store: any) => ({
          store_name: store.store_name,
          city: store.city,
          totalRevenue: store.total_revenue,
          totalQuantity: store.total_quantity,
          totalOrders: store.total_orders,
          profitMargin: store.profit_margin
        }));
        setStoreData(mappedStoreData);
      }

      const trendResult = await trendResponse.json();
      if (trendResult.success) {
        setTrendData(trendResult.data);
      }
    } catch (err: any) {
      setError(err.message || '获取对比数据失败');
      console.error('Failed to fetch comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 计算销售趋势变化率
  const calculateTrend = (data: TrendData[], city: string) => {
    const cityData = data
      .filter(d => d.city === city)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (cityData.length < 7) return { trend: 'stable', rate: 0 };
    
    const recent7Days = cityData.slice(-7);
    const previous7Days = cityData.slice(-14, -7);
    
    const recentAvg = recent7Days.reduce((sum, d) => sum + (d.daily_revenue || 0), 0) / recent7Days.length;
    const previousAvg = previous7Days.reduce((sum, d) => sum + (d.daily_revenue || 0), 0) / previous7Days.length;
    
    if (previousAvg === 0) return { trend: 'stable', rate: 0 };
    
    const rate = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    if (rate > 5) return { trend: 'up', rate: rate.toFixed(1) };
    if (rate < -5) return { trend: 'down', rate: Math.abs(rate).toFixed(1) };
    return { trend: 'stable', rate: rate.toFixed(1) };
  };

  // 生成智能洞察
  const generateInsights = () => {
    if (cityData.length === 0) return null;

    const topCity = cityData[0];
    const avgMargin = cityData.reduce((sum, c) => sum + (c.profitMargin || 0), 0) / cityData.length;
    
    const insights = [];

    // 最高销售额城市
    insights.push({
      type: 'success',
      title: '销售冠军',
      content: `${topCity.city}销售额最高，达到¥${Number(topCity.totalRevenue || 0).toFixed(2).toLocaleString()}`
    });

    // 毛利率分析
    if (avgMargin > 40) {
      insights.push({
        type: 'success',
        title: '盈利优势',
        content: `整体毛利率${(avgMargin || 0).toFixed(1)}%，高于行业平均水平`
      });
    } else if (avgMargin < 30) {
      insights.push({
        type: 'warning',
        title: '盈利预警',
        content: `整体毛利率${(avgMargin || 0).toFixed(1)}%，建议关注低毛利商品优化`
      });
    }

    // 市场分布
    const cityCount = cityData.length;
    if (cityCount <= 3) {
      insights.push({
        type: 'info',
        title: '市场集中度',
        content: `当前运营集中在${cityCount}个城市，建议扩大市场覆盖`
      });
    } else {
      insights.push({
        type: 'info',
        title: '市场覆盖',
        content: `业务覆盖${cityCount}个城市，市场布局较为均衡`
      });
    }

    return insights;
  };

  const insights = generateInsights();

  // 城市柱状图配置
  const cityChartConfig = {
    height: 300,
    data: cityData.map(city => ({
      city: city.city || '未命名城市',
      value: city.totalRevenue || 0,
    })),
    xField: 'city',
    yField: 'value',
    color: '#1890ff',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
      formatter: (datum: any) => `¥${Number(datum.value || 0).toFixed(0)}`,
    },
  };

  // 趋势图配置
  const trendChartConfig = {
    height: 300,
    data: trendData.map(t => ({
      date: t.date,
      city: t.city,
      value: t.daily_revenue || 0,
    })),
    xField: 'date',
    yField: 'value',
    seriesField: 'city',
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d'],
    smooth: true,
    point: { size: 3 },
  };

  const cityColumns = [
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      sorter: (a: CityData, b: CityData) => (a.city || '').localeCompare(b.city || ''),
    },
    {
      title: '总销售额',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (val: number) => val ? `¥${Number(val).toFixed(2)}` : '¥0.00',
      sorter: (a: CityData, b: CityData) => (a.totalRevenue || 0) - (b.totalRevenue || 0),
    },
    {
      title: '总销量',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      sorter: (a: CityData, b: CityData) => (a.totalQuantity || 0) - (b.totalQuantity || 0),
    },
    {
      title: '商品总数',
      dataIndex: 'totalProducts',
      key: 'totalProducts',
    },
    {
      title: '订单总数',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
    },
    {
      title: '客单价',
      dataIndex: 'avgOrderValue',
      key: 'avgOrderValue',
      render: (val: number) => val ? `¥${Number(val).toFixed(2)}` : '¥0.00',
    },
    {
      title: '毛利率',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (val: number) => {
        const numVal = Number(val) || 0;
        return (
          <Tag color={numVal > 40 ? 'green' : numVal > 30 ? 'orange' : 'red'}>
            {numVal.toFixed(1)}%
          </Tag>
        );
      },
    },
    {
      title: '趋势',
      key: 'trend',
      render: (_: any, record: CityData) => {
        const trend = calculateTrend(trendData, record.city);
        if (trend.trend === 'up') {
          return <Tag color="green" icon={<RiseOutlined />}>上升{trend.rate}%</Tag>;
        } else if (trend.trend === 'down') {
          return <Tag color="red" icon={<FallOutlined />}>下降{trend.rate}%</Tag>;
        }
        return <Tag icon={<BarChartOutlined />}>稳定</Tag>;
      },
    },
  ];

  const storeColumns = [
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
      title: '总销售额',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (val: number) => val ? `¥${Number(val).toFixed(2)}` : '¥0.00',
      sorter: (a: StoreData, b: StoreData) => (a.totalRevenue || 0) - (b.totalRevenue || 0),
    },
    {
      title: '总销量',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      sorter: (a: StoreData, b: StoreData) => (a.totalQuantity || 0) - (b.totalQuantity || 0),
    },
    {
      title: '订单数',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
    },
    {
      title: '毛利率',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (val: number) => {
        const numVal = Number(val) || 0;
        return (
          <Tag color={numVal > 40 ? 'green' : numVal > 30 ? 'orange' : 'red'}>
            {numVal.toFixed(1)}%
          </Tag>
        );
      },
    },
  ];

  // 计算统计值
  const totalStats = cityData.reduce((acc, city) => {
    acc.totalRevenue += city.totalRevenue || 0;
    acc.totalQuantity += city.totalQuantity || 0;
    acc.totalOrders += city.totalOrders || 0;
    return acc;
  }, { totalRevenue: 0, totalQuantity: 0, totalOrders: 0 });

  return (
    <Spin spinning={loading}>
      {error && (
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 数据说明 */}
      <Alert
        message="总体对比说明"
        description="本页面展示不同城市和门店的商品销售情况对比，帮助您快速发现业务差异和优化机会"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 智能洞察 */}
      {insights && insights.length > 0 && (
        <Card 
          title={<><FireOutlined /> 智能洞察</>} 
          style={{ marginBottom: 16 }}
          styles={{ header: { background: '#fafafa' } }}
        >
          <Row gutter={16}>
            {insights.map((insight: any, index: number) => (
              <Col span={8} key={index}>
                <Alert
                  message={insight.title}
                  description={insight.content}
                  type={insight.type}
                  showIcon
                  style={{ marginBottom: 8 }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 总体统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总销售额"
              value={totalStats.totalRevenue}
              prefix={<DollarOutlined />}
              formatter={(value) => `¥${Number(value || 0).toFixed(2)}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总销量"
              value={totalStats.totalQuantity}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={totalStats.totalOrders}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="覆盖城市"
              value={cityData.length}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 销售趋势 */}
      {trendData.length > 0 && (
        <Card title="销售趋势" style={{ marginBottom: 16 }}>
          <Line {...trendChartConfig} />
        </Card>
      )}

      {/* 城市对比 */}
      <Card title="城市对比分析" style={{ marginBottom: 16 }}>
        {cityData.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            {/* Top4城市卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {cityData.slice(0, 4).map((city, index) => (
                <Col span={6} key={city.city || index}>
                  <Card>
                    <Statistic
                      title={city.city || '未命名城市'}
                      value={city.totalRevenue}
                      prefix={<DollarOutlined />}
                      valueStyle={{ color: index === 0 ? '#52c41a' : '#1890ff' }}
                      formatter={(value) => `¥${Number(value || 0).toFixed(2)}`}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                      毛利率: {(city.profitMargin || 0).toFixed(1)}%
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
            
            {/* 柱状图 */}
            <Column {...cityChartConfig} style={{ marginBottom: 16 }} />
            
            {/* 详细表格 */}
            <Table
              columns={cityColumns}
              dataSource={cityData}
              rowKey="city"
              pagination={false}
              size="small"
            />
          </>
        )}
      </Card>

      {/* 门店对比 */}
      <Card title="门店对比分析">
        <Table
          columns={storeColumns}
          dataSource={storeData}
          rowKey={(record) => `${record.store_name}-${record.city}`}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </Spin>
  );
};

export default ComparisonAnalysis;
