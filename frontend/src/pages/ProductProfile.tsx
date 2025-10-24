import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Spin, Alert, Button, Space, Tag, Statistic, Tabs } from 'antd';
import { ShoppingOutlined, LineChartOutlined, EnvironmentOutlined, RobotOutlined } from '@ant-design/icons';
import axios from 'axios';
import SparkLine from '../components/SparkLine';

const { TabPane } = Tabs;

interface ProductSalesData {
  product_id: number;
  product_name: string;
  total_sales: number;
  total_qty: number;
  avg_price: number;
  profit_margin: number;
  city: string;
  store_name: string;
}

interface ProductLifecycleData {
  product_id: number;
  product_name: string;
  first_sold: string;
  last_sold: string;
  active_days: number;
  total_qty: number;
  total_sales: number;
  avg_daily_qty: number;
  qty_last30: number;
  decline_flag: number;
}

interface ProductPreferenceData {
  city: string;
  product_id: number;
  qty_city: number;
  total_city_qty: number;
  total_product_qty: number;
  share_city: number;
  share_product: number;
  preference_label: string;
}

interface AIInsightData {
  summary: string;
  recommendations: string[];
  riskLevel: string;
}

interface ForecastData {
  product_id: number;
  product_name: string;
  forecast_data: number[];
  confidence: number;
}

const ProductProfile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<ProductSalesData[]>([]);
  const [lifecycleData, setLifecycleData] = useState<ProductLifecycleData[]>([]);
  const [preferenceData, setPreferenceData] = useState<ProductPreferenceData[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsightData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 并行获取所有数据
      const [salesRes, lifecycleRes, preferenceRes, aiRes, forecastRes] = await Promise.all([
        axios.get('/api/product/profile'),
        axios.get('/api/product/lifecycle'),
        axios.get('/api/product/preference'),
        axios.get('/api/ai-insights/insight/product'),
        axios.get('/api/ai/forecast/product/latest')
      ]);

      if (salesRes.data.rows) setSalesData(salesRes.data.rows);
      if (lifecycleRes.data.rows) setLifecycleData(lifecycleRes.data.rows);
      if (preferenceRes.data.rows) setPreferenceData(preferenceRes.data.rows);
      if (aiRes.data.success) setAiInsights(aiRes.data.data);
      if (forecastRes.data.success) setForecastData(forecastRes.data.data || []);
      
    } catch (err: any) {
      console.error('获取商品画像数据失败:', err);
      setError(err.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  const runForecast = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai/forecast/product/run');
      if (response.data.success) {
        // 重新获取预测数据
        const forecastRes = await axios.get('/api/ai/forecast/product/latest');
        if (forecastRes.data.success) {
          setForecastData(forecastRes.data.data || []);
        }
      }
    } catch (err: any) {
      console.error('运行预测失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const salesColumns = [
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
    },
    {
      title: '总销量',
      dataIndex: 'total_qty',
      key: 'total_qty',
      sorter: (a: ProductSalesData, b: ProductSalesData) => a.total_qty - b.total_qty,
    },
    {
      title: '总销售额',
      dataIndex: 'total_sales',
      key: 'total_sales',
      render: (value: number) => `¥${value.toFixed(2)}`,
      sorter: (a: ProductSalesData, b: ProductSalesData) => a.total_sales - b.total_sales,
    },
    {
      title: '平均价格',
      dataIndex: 'avg_price',
      key: 'avg_price',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '利润率',
      dataIndex: 'profit_margin',
      key: 'profit_margin',
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: '主要城市',
      dataIndex: 'city',
      key: 'city',
    },
  ];

  const lifecycleColumns = [
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
    },
    {
      title: '首次销售',
      dataIndex: 'first_sold',
      key: 'first_sold',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: '最后销售',
      dataIndex: 'last_sold',
      key: 'last_sold',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: '活跃天数',
      dataIndex: 'active_days',
      key: 'active_days',
    },
    {
      title: '总销量',
      dataIndex: 'total_qty',
      key: 'total_qty',
    },
    {
      title: '近30天销量',
      dataIndex: 'qty_last30',
      key: 'qty_last30',
    },
    {
      title: '状态',
      dataIndex: 'decline_flag',
      key: 'decline_flag',
      render: (value: number) => (
        <Tag color={value === 1 ? 'red' : 'green'}>
          {value === 1 ? '下降' : '正常'}
        </Tag>
      ),
    },
  ];

  const preferenceColumns = [
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '产品ID',
      dataIndex: 'product_id',
      key: 'product_id',
    },
    {
      title: '城市销量',
      dataIndex: 'qty_city',
      key: 'qty_city',
    },
    {
      title: '城市占比',
      dataIndex: 'share_city',
      key: 'share_city',
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
    {
      title: '产品占比',
      dataIndex: 'share_product',
      key: 'share_product',
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
    {
      title: '偏好标签',
      dataIndex: 'preference_label',
      key: 'preference_label',
      render: (value: string) => value === '????' ? '未分类' : value,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载商品画像数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchData}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card>
            <Statistic
              title="商品总数"
              value={salesData.length}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="sales">
        <TabPane tab="销售结构" key="sales">
          <Card title="产品销售结构分析" extra={<Button onClick={fetchData}>刷新数据</Button>}>
            <Table
              columns={salesColumns}
              dataSource={salesData}
              rowKey="product_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="生命周期" key="lifecycle">
          <Card title="产品生命周期分析">
            <Table
              columns={lifecycleColumns}
              dataSource={lifecycleData}
              rowKey="product_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="城市偏好" key="preference">
          <Card title="产品城市偏好分析">
            <Table
              columns={preferenceColumns}
              dataSource={preferenceData}
              rowKey={(record) => `${record.city}-${record.product_id}`}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="AI洞察" key="ai">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title={<Space><RobotOutlined />智能经营洞察</Space>}
                extra={<Button onClick={fetchData}>刷新洞察</Button>}
              >
                {aiInsights ? (
                  <div>
                    <Alert
                      message={`风险等级: ${aiInsights.riskLevel}`}
                      description={aiInsights.summary}
                      type={aiInsights.riskLevel === '高' ? 'error' : aiInsights.riskLevel === '中' ? 'warning' : 'info'}
                      showIcon
                    />
                    {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <h4>建议措施:</h4>
                        <ul>
                          {aiInsights.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert
                    message="暂无AI洞察数据"
                    description="系统尚未生成AI洞察，请稍后重试。"
                    type="info"
                    showIcon
                  />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="销售预测" key="forecast">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title={<Space><LineChartOutlined />销售趋势预测（未来30天）</Space>}
                extra={
                  <Button type="primary" onClick={runForecast} loading={loading}>
                    运行预测
                  </Button>
                }
              >
                {forecastData.length > 0 ? (
                  <div>
                    {forecastData.map((item, index) => (
                      <Card key={index} size="small" style={{ marginBottom: 16 }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <h4>{item.product_name}</h4>
                            <p>置信度: {(item.confidence * 100).toFixed(1)}%</p>
                          </Col>
                          <Col span={12}>
                            <SparkLine data={item.forecast_data} />
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert
                    message="暂无预测数据"
                    description="点击'运行预测'按钮生成AI销售预测。"
                    type="info"
                    showIcon
                  />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProductProfile;
