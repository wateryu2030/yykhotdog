// 城市画像模块 - 分析不同城市的特点和市场机会
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Spin,
  Alert,
  Progress,
  Tabs,
  Select,
  Button,
  Space,
  Typography,
  Empty
} from 'antd';
import {
  EnvironmentOutlined,
  ShopOutlined,
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  FireOutlined,
  TrophyOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/plots';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface CityData {
  city: string;
  totalRevenue: number;
  totalQuantity: number;
  totalProducts: number;
  totalOrders: number;
  avgOrderValue: number;
  profitMargin: number;
}

interface StoreData {
  store_name: string;
  city: string;
  totalRevenue: number;
  totalQuantity: number;
  totalOrders: number;
  profitMargin: number;
}

interface TimeTrend {
  date: string;
  city: string;
  dailyRevenue: number;
  dailyQuantity: number;
  dailyOrders: number;
}

const CityProfile: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [allCities, setAllCities] = useState<CityData[]>([]);
  const [currentCity, setCurrentCity] = useState<CityData | null>(null);
  const [cityStores, setCityStores] = useState<StoreData[]>([]);
  const [timeTrend, setTimeTrend] = useState<TimeTrend[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [cityFeatures, setCityFeatures] = useState<any[]>([]);

  // 获取所有城市数据
  useEffect(() => {
    fetchCityData();
  }, []);

  // 当选择城市时，加载该城市的详细信息
  useEffect(() => {
    if (selectedCity) {
      loadCityDetail(selectedCity);
    }
  }, [selectedCity]);

  const fetchCityData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/product-profile/comparison/cities');
      const result = await response.json();
      
      if (result.success) {
        // 字段映射
        const mappedData = result.data.map((city: any) => ({
          city: city.city,
          totalRevenue: city.total_revenue,
          totalQuantity: city.total_quantity,
          totalProducts: city.total_products,
          totalOrders: city.total_orders,
          avgOrderValue: city.avg_order_value,
          profitMargin: city.profit_margin
        }));
        setAllCities(mappedData);
        
        // 生成城市特征
        generateCityFeatures(mappedData);
        
        // 默认选择第一个城市
        if (mappedData.length > 0) {
          setSelectedCity(mappedData[0].city);
          setCurrentCity(mappedData[0]);
        }
      }
    } catch (error) {
      console.error('获取城市数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成城市特征分析
  const generateCityFeatures = (cities: CityData[]) => {
    if (cities.length === 0) return;

    const totalRevenue = cities.reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgProfitMargin = cities.reduce((sum, c) => sum + c.profitMargin, 0) / cities.length;
    const avgOrderValue = cities.reduce((sum, c) => sum + c.avgOrderValue, 0) / cities.length;

    const features = cities.map(city => {
      const featuresList = [];
      
      // 1. 市场规模
      const marketShare = (city.totalRevenue / totalRevenue) * 100;
      if (marketShare > 50) {
        featuresList.push({ type: 'primary', label: '核心市场', desc: '销售额占比最大，是业务基石' });
      } else if (marketShare > 20) {
        featuresList.push({ type: 'primary', label: '重点市场', desc: '销售额占比较高，增长潜力大' });
      } else if (marketShare > 5) {
        featuresList.push({ type: 'default', label: '新兴市场', desc: '销售额占比适中，需持续培育' });
      } else {
        featuresList.push({ type: 'default', label: '培育市场', desc: '市场份额小，需要重点开拓' });
      }

      // 2. 客单价水平
      const orderValueRatio = city.avgOrderValue / avgOrderValue;
      if (orderValueRatio > 1.15) {
        featuresList.push({ type: 'success', label: '高端消费', desc: `客单价¥${city.avgOrderValue.toFixed(2)}，远高于平均水平` });
      } else if (orderValueRatio > 0.85) {
        featuresList.push({ type: 'info', label: '中等消费', desc: `客单价¥${city.avgOrderValue.toFixed(2)}，接近平均水平` });
      } else {
        featuresList.push({ type: 'warning', label: '低端消费', desc: `客单价¥${city.avgOrderValue.toFixed(2)}，低于平均水平` });
      }

      // 3. 毛利率水平
      if (city.profitMargin > avgProfitMargin + 5) {
        featuresList.push({ type: 'success', label: '高利润', desc: `毛利率${city.profitMargin.toFixed(1)}%，盈利能力突出` });
      } else if (city.profitMargin < avgProfitMargin - 5) {
        featuresList.push({ type: 'warning', label: '低利润', desc: `毛利率${city.profitMargin.toFixed(1)}%，需要优化定价` });
      } else {
        featuresList.push({ type: 'info', label: '正常利润', desc: `毛利率${city.profitMargin.toFixed(1)}%，处于合理区间` });
      }

      // 4. 商品丰富度
      const avgProducts = cities.reduce((sum, c) => sum + c.totalProducts, 0) / cities.length;
      if (city.totalProducts > avgProducts * 1.2) {
        featuresList.push({ type: 'success', label: '商品丰富', desc: `${city.totalProducts}种商品，品种齐全` });
      } else if (city.totalProducts < avgProducts * 0.8) {
        featuresList.push({ type: 'warning', label: '商品较少', desc: `${city.totalProducts}种商品，建议扩充` });
      }

      // 5. 订单活跃度
      const avgOrdersPerProduct = city.totalOrders / city.totalProducts;
      const avgOrdersRatio = avgOrdersPerProduct / (cities.reduce((sum, c) => sum + c.totalOrders, 0) / cities.reduce((sum, c) => sum + c.totalProducts, 0));
      if (avgOrdersRatio > 1.1) {
        featuresList.push({ type: 'success', label: '高活跃度', desc: '订单频次高，用户粘性强' });
      } else if (avgOrdersRatio < 0.9) {
        featuresList.push({ type: 'warning', label: '低活跃度', desc: '订单频次低，需要营销激活' });
      }

      return {
        city: city.city,
        features: featuresList,
        summary: getCitySummary(city, marketShare)
      };
    });

    setCityFeatures(features);
  };

  // 生成城市总结
  const getCitySummary = (city: CityData, marketShare: number) => {
    let summary = `${city.city}是一个`;
    
    if (marketShare > 50) {
      summary += '核心市场，占据主导地位。';
    } else if (marketShare > 20) {
      summary += '重点发展市场，具备良好基础。';
    } else {
      summary += '新兴市场，具有增长潜力。';
    }

    const orderValueRatio = city.avgOrderValue / allCities.reduce((sum, c) => sum + c.avgOrderValue, 0) / allCities.length;
    if (orderValueRatio > 1.15) {
      summary += '消费水平较高，适宜高端产品定位。';
    } else if (orderValueRatio < 0.85) {
      summary += '消费水平适中，更关注性价比。';
    }

    if (city.profitMargin > 40) {
      summary += '盈利能力优秀，可以加大投入。';
    } else if (city.profitMargin < 35) {
      summary += '盈利空间有限，需要优化运营。';
    }

    return summary;
  };

  const loadCityDetail = async (cityName: string) => {
    setLoading(true);
    try {
      // 获取该城市的店铺数据
      const storesResponse = await fetch('http://localhost:3001/api/product-profile/comparison/stores');
      const storesResult = await storesResponse.json();
      
      if (storesResult.success) {
        const mappedStores = storesResult.data
          .filter((store: any) => store.city === cityName)
          .map((store: any) => ({
            store_name: store.store_name,
            city: store.city,
            totalRevenue: store.total_revenue,
            totalQuantity: store.total_quantity,
            totalOrders: store.total_orders,
            profitMargin: store.profit_margin
          }));
        setCityStores(mappedStores);
      }

      // 获取该城市的销售趋势
      const trendResponse = await fetch('http://localhost:3001/api/product-profile/comparison/trends?days=30');
      const trendResult = await trendResponse.json();
      
      if (trendResult.success) {
        const cityTrend = trendResult.data
          .filter((t: any) => t.city === cityName)
          .map((t: any) => ({
            date: t.date,
            city: t.city,
            dailyRevenue: t.daily_revenue,
            dailyQuantity: t.daily_quantity,
            dailyOrders: t.daily_orders
          }));
        setTimeTrend(cityTrend);
      }

      // 生成AI洞察
      generateInsights(cityName);
    } catch (error) {
      console.error('获取城市详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (cityName: string) => {
    const cityData = allCities.find(c => c.city === cityName);
    if (!cityData) return;

    const insightsArr = [];

    // 1. 市场规模分析
    const marketSizePercent = (cityData.totalRevenue / allCities.reduce((sum, c) => sum + c.totalRevenue, 0)) * 100;
    if (marketSizePercent > 50) {
      insightsArr.push({
        type: 'success',
        title: '市场主导地位',
        content: `该城市销售额占总体${marketSizePercent.toFixed(1)}%，是核心市场`,
        icon: <TrophyOutlined />
      });
    }

    // 2. 客单价分析
    const avgOrderValueRank = allCities
      .sort((a, b) => b.avgOrderValue - a.avgOrderValue)
      .findIndex(c => c.city === cityName) + 1;
    insightsArr.push({
      type: avgOrderValueRank <= 2 ? 'success' : 'info',
      title: '客单价水平',
      content: `客单价¥${cityData.avgOrderValue.toFixed(2)}，在${allCities.length}个城市中排名第${avgOrderValueRank}位`,
      icon: <DollarOutlined />
    });

    // 3. 毛利率分析
    if (cityData.profitMargin > 40) {
      insightsArr.push({
        type: 'success',
        title: '高盈利水平',
        content: `平均毛利率${cityData.profitMargin.toFixed(1)}%，盈利能力强`,
        icon: <FireOutlined />
      });
    } else if (cityData.profitMargin < 35) {
      insightsArr.push({
        type: 'warning',
        title: '盈利待优化',
        content: `平均毛利率${cityData.profitMargin.toFixed(1)}%，建议关注定价策略`,
        icon: <FallOutlined />
      });
    }

    // 4. 商品丰富度
    const productVariety = (cityData.totalProducts / allCities.reduce((sum, c) => sum + c.totalProducts, 0) / allCities.length) * 100;
    if (productVariety > 120) {
      insightsArr.push({
        type: 'info',
        title: '商品丰富',
        content: `商品种类${cityData.totalProducts}种，高于平均水平`,
        icon: <ShoppingOutlined />
      });
    }

    setInsights(insightsArr);
  };

  // 门店表格列定义
  const storeColumns = [
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '销售额',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.totalRevenue - b.totalRevenue,
    },
    {
      title: '销量',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      sorter: (a: any, b: any) => a.totalQuantity - b.totalQuantity,
    },
    {
      title: '订单数',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      sorter: (a: any, b: any) => a.totalOrders - b.totalOrders,
    },
    {
      title: '毛利率',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (val: number) => `${(val || 0).toFixed(1)}%`,
      sorter: (a: any, b: any) => a.profitMargin - b.profitMargin,
    },
  ];

  // 销售趋势图配置
  const trendChartConfig = {
    data: timeTrend,
    height: 300,
    xField: 'date',
    yField: 'dailyRevenue',
    point: { size: 4, shape: 'circle' },
    label: { style: { fill: '#aaa' } },
    state: { active: { style: { lineWidth: 2 } } },
    interactions: [{ type: 'marker-active' }],
    meta: {
      date: { alias: '日期' },
      dailyRevenue: { alias: '日销售额' },
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: '销售额', value: `¥${Number(datum.dailyRevenue || 0).toFixed(2)}` };
      },
    },
  };

  // 城市柱状图配置
  const cityChartConfig = {
    data: allCities.map(city => ({
      name: city.city,
      value: city.totalRevenue,
    })),
    height: 300,
    xField: 'name',
    yField: 'value',
    columnStyle: {
      radius: [8, 8, 0, 0],
    },
    meta: {
      name: { alias: '城市' },
      value: { alias: '销售额' },
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: '销售额', value: `¥${Number(datum.value || 0).toFixed(2)}` };
      },
    },
  };

  // 门店销售额饼图配置
  const storePieConfig = {
    data: cityStores.map(store => ({
      type: store.store_name,
      value: store.totalRevenue,
    })),
    height: 300,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer' as const,
      formatter: (datum: any) => `${datum.type}: ¥${Number(datum.value).toFixed(2)}`,
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.type, value: `¥${Number(datum.value).toFixed(2)}` };
      },
    },
  };

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
        {/* 页面头部 */}
        <Card style={{ marginBottom: 16 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <EnvironmentOutlined /> 城市画像分析
              </Title>
              <Text type="secondary">深度分析各城市市场特征，为城市拓展提供数据支持</Text>
            </Col>
            <Col>
              <Select
                value={selectedCity}
                onChange={setSelectedCity}
                style={{ width: 200 }}
                placeholder="选择城市"
              >
                {allCities.map(city => (
                  <Option key={city.city} value={city.city}>
                    {city.city}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* AI洞察 */}
        {insights.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Title level={4}>
              <FireOutlined /> 智能洞察
            </Title>
            <Row gutter={16}>
              {insights.map((insight, index) => (
                <Col span={8} key={index}>
                  <Alert
                    message={insight.title}
                    description={insight.content}
                    type={insight.type as any}
                    showIcon
                    icon={insight.icon}
                    style={{ marginBottom: 8 }}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* 城市特征总览 */}
        {cityFeatures.length > 0 && (
          <Card title={<><BarChartOutlined /> 城市特征总览</>} style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              {cityFeatures.map((city, index) => (
                <Col span={24} key={index}>
                  <Card 
                    size="small" 
                    title={
                      <Space>
                        <EnvironmentOutlined />
                        <span style={{ fontSize: 16, fontWeight: 'bold' }}>{city.city}</span>
                      </Space>
                    }
                    style={{ 
                      borderLeft: '3px solid',
                      borderLeftColor: index === 0 ? '#52c41a' : index === 1 ? '#1890ff' : '#faad14'
                    }}
                  >
                    <Paragraph style={{ marginBottom: 12 }}>
                      <Text strong>{city.summary}</Text>
                    </Paragraph>
                    <Space wrap>
                      {city.features.map((feature: any, fIndex: number) => (
                        <Tag key={fIndex} color={feature.type}>
                          {feature.label}: {feature.desc}
                        </Tag>
                      ))}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* 城市对比概览 */}
        {currentCity && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总销售额"
                  value={currentCity.totalRevenue}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `¥${Number(value || 0).toFixed(2)}`}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总销量"
                  value={currentCity.totalQuantity}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="客单价"
                  value={currentCity.avgOrderValue}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `¥${Number(value || 0).toFixed(2)}`}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="毛利率"
                  value={currentCity.profitMargin}
                  formatter={(value) => `${Number(value || 0).toFixed(1)}%`}
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: currentCity.profitMargin > 40 ? '#52c41a' : '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 销售趋势 */}
        {timeTrend.length > 0 && (
          <Card title="近30天销售趋势" style={{ marginBottom: 16 }}>
            <Line {...trendChartConfig} />
          </Card>
        )}

        {/* 门店列表和销售额分布 */}
        {cityStores.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="门店销售额分布" style={{ marginBottom: 16 }}>
                <Pie {...storePieConfig} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="门店排行榜" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={cityStores.sort((a, b) => b.totalRevenue - a.totalRevenue)}
                  columns={storeColumns}
                  rowKey="store_name"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 全城市对比 */}
        <Card title="全城市对比">
          <Row gutter={16}>
            <Col span={16}>
              <Column {...cityChartConfig} />
            </Col>
            <Col span={8}>
              <Card title="城市排名" bordered={false}>
                <Table
                  dataSource={allCities
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .map((city, index) => ({ ...city, rank: index + 1 }))}
                  columns={[
                    { title: '排名', dataIndex: 'rank', key: 'rank', width: 60 },
                    { title: '城市', dataIndex: 'city', key: 'city' },
                    {
                      title: '销售额',
                      dataIndex: 'totalRevenue',
                      key: 'totalRevenue',
                      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
                    },
                  ]}
                  rowKey="city"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </Card>
      </div>
    </Spin>
  );
};

export default CityProfile;

