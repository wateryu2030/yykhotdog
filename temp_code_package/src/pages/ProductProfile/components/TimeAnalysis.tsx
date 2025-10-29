import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Table,
  Statistic,
  Alert,
  Spin,
  Tabs,
  Button,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface TimeAnalysisData {
  product_name: string;
  city: string;
  store_name: string;
  month: number;
  year: number;
  monthly_revenue: number;
  monthly_quantity: number;
  monthly_orders: number;
  monthly_customers: number;
  avg_order_value: number;
}

interface MarketShareData {
  product_name: string;
  city: string;
  store_name: string;
  month: number;
  product_revenue: number;
  product_quantity: number;
  product_orders: number;
  total_revenue: number;
  total_quantity: number;
  total_orders: number;
  revenue_share_percent: number;
  quantity_share_percent: number;
  order_share_percent: number;
}

interface SeasonalData {
  product_name: string;
  city: string;
  store_name: string;
  season: string;
  seasonal_revenue: number;
  seasonal_quantity: number;
  seasonal_orders: number;
  seasonal_customers: number;
  avg_order_value: number;
}

interface ComparisonData {
  product_name: string;
  city: string;
  store_name: string;
  month: number;
  current_revenue: number;
  current_quantity: number;
  current_orders: number;
  previous_revenue: number;
  previous_quantity: number;
  previous_orders: number;
  last_month_revenue: number;
  last_month_quantity: number;
  last_month_orders: number;
  yoy_revenue_growth: number;
  mom_revenue_growth: number;
}

const TimeAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly');
  
  // 筛选条件
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  
  // 数据状态
  const [monthlyData, setMonthlyData] = useState<TimeAnalysisData[]>([]);
  const [marketShareData, setMarketShareData] = useState<MarketShareData[]>([]);
  const [seasonalData, setSeasonalData] = useState<SeasonalData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  
  // 选项数据
  const [products, setProducts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [stores, setStores] = useState<string[]>([]);

  // 获取选项数据
  useEffect(() => {
    fetchOptions();
  }, []);

  // 获取数据
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyData();
    } else if (activeTab === 'market-share') {
      fetchMarketShareData();
    } else if (activeTab === 'seasonal') {
      fetchSeasonalData();
    } else if (activeTab === 'comparison') {
      fetchComparisonData();
    }
  }, [activeTab, selectedProduct, selectedCity, selectedStore, selectedYear, selectedMonth]);

  const fetchOptions = async () => {
    try {
      // 获取商品列表 - 从销售分析API获取
      const productResponse = await fetch('/api/product-profile/sales-analysis');
      const productData = await productResponse.json();
      if (productData.success && productData.data && productData.data.salesRanking) {
        const productNames = productData.data.salesRanking.map((item: any) => item.product_name);
        setProducts(Array.from(new Set(productNames)));
      }

      // 获取城市列表
      const cityResponse = await fetch('/api/customer-profile/cities');
      const cityData = await cityResponse.json();
      if (cityData.success) {
        const cityNames = cityData.data.map((item: any) => item.name);
        setCities(cityNames);
      }

      // 获取门店列表
      const storeResponse = await fetch('/api/customer-profile/stores');
      const storeData = await storeResponse.json();
      if (storeData.success) {
        const storeNames = storeData.data.map((item: any) => item.store_name);
        setStores(storeNames);
      }
    } catch (error) {
      console.error('获取选项数据失败:', error);
    }
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
      });
      
      if (selectedProduct) params.append('productName', selectedProduct);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStore) params.append('shopId', selectedStore);

      const response = await fetch(`/api/product-profile/time-analysis/monthly?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMonthlyData(data.data);
      }
    } catch (error) {
      console.error('获取月度数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketShareData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
      });
      
      if (selectedProduct) params.append('productName', selectedProduct);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStore) params.append('shopId', selectedStore);
      if (selectedMonth) params.append('month', selectedMonth.toString());

      const response = await fetch(`/api/product-profile/time-analysis/market-share?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMarketShareData(data.data);
      }
    } catch (error) {
      console.error('获取市场占比数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonalData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
      });
      
      if (selectedProduct) params.append('productName', selectedProduct);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStore) params.append('shopId', selectedStore);

      const response = await fetch(`/api/product-profile/time-analysis/seasonal?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setSeasonalData(data.data);
      }
    } catch (error) {
      console.error('获取季节性数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
      });
      
      if (selectedProduct) params.append('productName', selectedProduct);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStore) params.append('shopId', selectedStore);

      const response = await fetch(`/api/product-profile/time-analysis/comparison?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setComparisonData(data.data);
      }
    } catch (error) {
      console.error('获取对比数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'monthly') {
      fetchMonthlyData();
    } else if (activeTab === 'market-share') {
      fetchMarketShareData();
    } else if (activeTab === 'seasonal') {
      fetchSeasonalData();
    } else if (activeTab === 'comparison') {
      fetchComparisonData();
    }
  };

  // 月度趋势图表配置
  const monthlyChartConfig = {
    data: monthlyData.map(item => ({
      month: `${item.year}年${item.month}月`,
      revenue: item.monthly_revenue,
      quantity: item.monthly_quantity,
      orders: item.monthly_orders,
    })),
    xField: 'month',
    yField: 'revenue',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
  };

  // 市场占比饼图配置
  const marketShareChartConfig = {
    data: marketShareData.slice(0, 10).map(item => ({
      type: item.product_name,
      value: item.revenue_share_percent,
    })),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  // 季节性分析柱状图配置
  const seasonalChartConfig = {
    data: seasonalData.map(item => ({
      season: item.season,
      revenue: item.seasonal_revenue,
      quantity: item.seasonal_quantity,
    })),
    xField: 'season',
    yField: 'revenue',
    seriesField: 'season',
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d'],
  };

  // 同比环比对比图配置
  const comparisonChartConfig = {
    data: comparisonData.map(item => ({
      month: `${item.month}月`,
      current: item.current_revenue,
      previous: item.previous_revenue,
      lastMonth: item.last_month_revenue,
    })),
    xField: 'month',
    yField: 'current',
    seriesField: 'type',
    isGroup: true,
  };

  const monthlyColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      render: (month: number) => `${selectedYear}年${month}月`,
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '月销售额',
      dataIndex: 'monthly_revenue',
      key: 'monthly_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
    {
      title: '月销量',
      dataIndex: 'monthly_quantity',
      key: 'monthly_quantity',
      render: (value: number) => value || 0,
    },
    {
      title: '月订单数',
      dataIndex: 'monthly_orders',
      key: 'monthly_orders',
      render: (value: number) => value || 0,
    },
    {
      title: '月客户数',
      dataIndex: 'monthly_customers',
      key: 'monthly_customers',
      render: (value: number) => value || 0,
    },
    {
      title: '平均客单价',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
  ];

  const marketShareColumns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      render: (month: number) => `${month}月`,
    },
    {
      title: '销售额占比',
      dataIndex: 'revenue_share_percent',
      key: 'revenue_share_percent',
      render: (value: number) => (
        <Tag color={value > 5 ? 'green' : value > 2 ? 'orange' : 'red'}>
          {value?.toFixed(2) || '0.00'}%
        </Tag>
      ),
    },
    {
      title: '销量占比',
      dataIndex: 'quantity_share_percent',
      key: 'quantity_share_percent',
      render: (value: number) => `${value?.toFixed(2) || '0.00'}%`,
    },
    {
      title: '订单占比',
      dataIndex: 'order_share_percent',
      key: 'order_share_percent',
      render: (value: number) => `${value?.toFixed(2) || '0.00'}%`,
    },
    {
      title: '商品销售额',
      dataIndex: 'product_revenue',
      key: 'product_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
    {
      title: '总销售额',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
  ];

  const seasonalColumns = [
    {
      title: '季节',
      dataIndex: 'season',
      key: 'season',
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '季节销售额',
      dataIndex: 'seasonal_revenue',
      key: 'seasonal_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
    {
      title: '季节销量',
      dataIndex: 'seasonal_quantity',
      key: 'seasonal_quantity',
      render: (value: number) => value || 0,
    },
    {
      title: '季节订单数',
      dataIndex: 'seasonal_orders',
      key: 'seasonal_orders',
      render: (value: number) => value || 0,
    },
    {
      title: '季节客户数',
      dataIndex: 'seasonal_customers',
      key: 'seasonal_customers',
      render: (value: number) => value || 0,
    },
  ];

  const comparisonColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      render: (month: number) => `${month}月`,
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '当期销售额',
      dataIndex: 'current_revenue',
      key: 'current_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
    {
      title: '去年同期',
      dataIndex: 'previous_revenue',
      key: 'previous_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
    {
      title: '上月',
      dataIndex: 'last_month_revenue',
      key: 'last_month_revenue',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
    },
    {
      title: '同比增长率',
      dataIndex: 'yoy_revenue_growth',
      key: 'yoy_revenue_growth',
      render: (value: number) => (
        <Tag color={value > 0 ? 'green' : value < 0 ? 'red' : 'default'}>
          {value?.toFixed(2) || '0.00'}%
        </Tag>
      ),
    },
    {
      title: '环比增长率',
      dataIndex: 'mom_revenue_growth',
      key: 'mom_revenue_growth',
      render: (value: number) => (
        <Tag color={value > 0 ? 'green' : value < 0 ? 'red' : 'default'}>
          {value?.toFixed(2) || '0.00'}%
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <CalendarOutlined />
            商品时间分析
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        }
      >
        {/* 筛选条件 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Select
              placeholder="选择商品"
              style={{ width: '100%' }}
              value={selectedProduct}
              onChange={setSelectedProduct}
              allowClear
            >
              {products.map(product => (
                <Option key={product} value={product}>
                  {product}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择城市"
              style={{ width: '100%' }}
              value={selectedCity}
              onChange={setSelectedCity}
              allowClear
            >
              {cities.map(city => (
                <Option key={city} value={city}>
                  {city}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择门店"
              style={{ width: '100%' }}
              value={selectedStore}
              onChange={setSelectedStore}
              allowClear
            >
              {stores.map(store => (
                <Option key={store} value={store}>
                  {store}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择年份"
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={setSelectedYear}
            >
              <Option value={2024}>2024年</Option>
              <Option value={2025}>2025年</Option>
            </Select>
          </Col>
        </Row>

        <Spin spinning={loading}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="月度趋势" key="monthly">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="月度销售趋势图" size="small">
                    <Line {...monthlyChartConfig} height={300} />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="月度详细数据" size="small">
                    <Table
                      dataSource={monthlyData}
                      columns={monthlyColumns}
                      rowKey={(record) => `${record.month}-${record.product_name}-${record.city}-${record.store_name}`}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1000 }}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="市场占比" key="market-share">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card title="销售额占比分布" size="small">
                    <Pie {...marketShareChartConfig} height={300} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="占比统计" size="small">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Statistic
                          title="总商品数"
                          value={marketShareData.length}
                          prefix={<BarChartOutlined />}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="平均占比"
                          value={marketShareData.length > 0 ? 
                            (marketShareData.reduce((sum, item) => sum + item.revenue_share_percent, 0) / marketShareData.length).toFixed(2) : 0
                          }
                          suffix="%"
                          prefix={<PieChartOutlined />}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="市场占比详细数据" size="small">
                    <Table
                      dataSource={marketShareData}
                      columns={marketShareColumns}
                      rowKey={(record) => `${record.product_name}-${record.city}-${record.store_name}-${record.month}`}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1200 }}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="季节性分析" key="seasonal">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="季节性销售趋势" size="small">
                    <Column {...seasonalChartConfig} height={300} />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="季节性详细数据" size="small">
                    <Table
                      dataSource={seasonalData}
                      columns={seasonalColumns}
                      rowKey={(record) => `${record.season}-${record.product_name}-${record.city}-${record.store_name}`}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1000 }}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="同比环比" key="comparison">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="同比环比对比图" size="small">
                    <Column {...comparisonChartConfig} height={300} />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="对比详细数据" size="small">
                    <Table
                      dataSource={comparisonData}
                      columns={comparisonColumns}
                      rowKey={(record) => `${record.month}-${record.product_name}-${record.city}-${record.store_name}`}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1200 }}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Spin>

        <Alert
          message="数据说明"
          description="时间分析功能提供多维度的商品销售时间特征分析，包括月度趋势、市场占比、季节性变化和同比环比对比。支持按商品、城市、门店等维度进行筛选分析。"
          type="info"
          showIcon
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
};

export default TimeAnalysis;
