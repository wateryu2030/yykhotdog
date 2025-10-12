import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Divider, Badge, Avatar, Select, Tabs, List, Cascader, Tag, DatePicker, Alert, Modal, Descriptions } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { 
  ShopOutlined, 
  BellOutlined, 
  EyeOutlined, 
  FireOutlined,
  StarOutlined,
  DollarOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { Line, Bar } from '@ant-design/plots';
import { useNavigate } from 'react-router-dom';
// import CityDetailModal from '../components/CityDetailModal';
// import HealthCheck from '../components/HealthCheck';


const { Option } = Select;

interface KPIData {
  storeCount: number;
  opened: number;
  planned: number;
  expanding: number;
  salesAmount: string;
  salesGrowth: string;
  salesGrowthDir: 'up' | 'down';
  followerCount: string;
  followerGrowth: string;
  followerGrowthDir: 'up' | 'down';
  satisfaction: string;
  satisfactionBase: string;
}

interface RegionStatistics {
  totalProvinces: number;
  totalCities: number;
  totalDistricts: number;
  operatingCities: number;
  operatingStores: number;
  potentialLocations: number;
}

interface ChartData {
  labels: string[];
  data: number[];
}

interface EventReminder {
  title: string;
  date: string;
  detail: string;
  icon: string;
  color: string;
}

interface Product {
  name: string;
  date: string;
  icon: string;
}

interface HotTopic {
  name: string;
  platform: string;
  views: string;
  icon: string;
  color: string;
}

interface AISuggestion {
  title: string;
  detail: string;
  icon: string;
  color: string;
  action: string;
}

interface LiveMonitor {
  store: string;
  area: string;
}

interface MapMarker {
  top: string;
  left: string;
  status: 'opened' | 'planned' | 'expanding';
  title: string;
}

interface DashboardData {
  kpis: KPIData;
  regionStats: RegionStatistics;
  citySalesTrend: ChartData;
  productSalesTrend: ChartData;
  eventReminders: EventReminder[];
  topProducts: {
    labels: string[];
    data: number[];
  };
  newProducts: Product[];
  followerGrowth: ChartData;
  hotTopics: HotTopic[];
  aiSuggestions: AISuggestion[];
  liveMonitors: LiveMonitor[];
  mapMarkers: MapMarker[];
}

// 已删除模拟数据函数 - 现在只使用真实数据

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScope, setCurrentScope] = useState<'national' | 'city'>('national');
  const [currentCity, setCurrentCity] = useState('全国');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [regionOptions, setRegionOptions] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string[]>([]);
  const [cityDetailModalVisible, setCityDetailModalVisible] = useState(false);
  const [dataError, setDataError] = useState<string>('');
  
  // 运营详情Modal状态
  const [operatingCitiesModalVisible, setOperatingCitiesModalVisible] = useState(false);
  const [operatingStoresModalVisible, setOperatingStoresModalVisible] = useState(false);
  const [operatingCitiesData, setOperatingCitiesData] = useState<any[]>([]);
  const [operatingStoresData, setOperatingStoresData] = useState<any[]>([]);
  
  // 趋势数据状态
  const [citySalesTrendData, setCitySalesTrendData] = useState<any[]>([]);
  const [productSalesTrendData, setProductSalesTrendData] = useState<any[]>([]);
  
  // 新增数据状态
  const [realTimeStats, setRealTimeStats] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [provinceAnalysis, setProvinceAnalysis] = useState<any[]>([]);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取仪表板数据
  useEffect(() => {
    fetchDashboardData();
    fetchCitySalesTrend();
    fetchProductSalesTrend();
    fetchRealTimeStats();
    fetchTopProducts();
    fetchProvinceAnalysis();
  }, [currentScope, currentCity, currentDate]);

  // 获取级联选择器数据
  useEffect(() => {
    fetchRegionOptions();
  }, []);

  // 添加调试信息
  useEffect(() => {
    console.log('Dashboard组件已加载');
    // console.log('MapWeather组件已集成到右侧面板');
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setDataError('');
      
      // 获取仪表盘摘要数据
      const selectedDate = currentDate.format('YYYY-MM-DD');
      const summaryResponse = await fetch(`http://localhost:3001/api/customer-profile/dashboard-summary?date=${selectedDate}`);
      const summaryData = await summaryResponse.json();
      
      // 获取运营概览数据（包含运营城市数量）
      const overviewResponse = await fetch('http://localhost:3001/api/operations/overview');
      const overviewData = await overviewResponse.json();
      
      // 获取城市列表
      const citiesResponse = await fetch('http://localhost:3001/api/customer-profile/cities');
      const citiesData = await citiesResponse.json();
      
      // 获取区域统计信息
      const regionStatsResponse = await fetch('http://localhost:3001/api/region/statistics');
      const regionStatsData = await regionStatsResponse.json();
      
      if (!summaryData.success || !overviewData.success || !citiesData.success || !regionStatsData.success) {
        setDataError('部分数据获取失败，请检查数据库连接');
        setLoading(false);
        return;
      }
      
        const summary = summaryData.data;
        const overview = overviewData.data;
        const cities = citiesData.data;
        const regionStats = regionStatsData.data;
        
      // 计算区域统计
      const totalProvinces = regionStats.find((s: any) => s.level === 1)?.count || 0;
      const totalCities = regionStats.find((s: any) => s.level === 2)?.count || 0;
      const totalDistricts = regionStats.find((s: any) => s.level === 3)?.count || 0;
      
      // 构建真实数据 - 只使用数据库中存在的数据
        const realData: DashboardData = {
          kpis: {
            storeCount: summary.total_stores || 0,
            opened: summary.operating_stores || 0,
            planned: summary.planned_stores || 0,
            expanding: summary.expanding_stores || 0,
            salesAmount: `¥${((summary.total_sales || 0) / 10000).toFixed(1)}万`,
          salesGrowth: "数据不全",
            salesGrowthDir: "up" as const,
          followerCount: summary.totalCustomers?.toLocaleString() || "数据不全",
          followerGrowth: "数据不全",
            followerGrowthDir: "up" as const,
          satisfaction: "数据不全",
          satisfactionBase: "暂无评价数据"
        },
        regionStats: {
          totalProvinces,
          totalCities,
          totalDistricts,
          operatingCities: overview.kpis?.operatingCities || 0,
          operatingStores: overview.kpis?.operatingStores || 0,
          potentialLocations: totalDistricts - (overview.kpis?.operatingStores || 0)
        },
          citySalesTrend: {
          labels: citySalesTrendData.map(city => city.city),
          data: citySalesTrendData.map(city => Math.round((city.total_revenue || 0) / 10000))
          },
          productSalesTrend: {
          labels: productSalesTrendData.slice(0, 10).map(product => product.product_name),
          data: productSalesTrendData.slice(0, 10).map(product => Math.round((product.total_revenue || 0) / 1000))
        },
        eventReminders: [],
          topProducts: {
          labels: ['数据不全'],
          data: [0]
        },
        newProducts: [],
          followerGrowth: {
          labels: ['数据不全'],
          data: [0]
        },
        hotTopics: [],
        aiSuggestions: [],
        liveMonitors: [],
          mapMarkers: cities.map((city: any, index: number) => ({
          top: `${30 + (index * 10)}%`,
          left: `${50 + (Math.random() * 20 - 10)}%`,
            status: 'opened' as const,
          title: city.city_name || city.name
          }))
        };
        
        setDashboardData(realData);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      setDataError('数据加载失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 已删除ensureDataStructure函数 - 不再使用模拟数据

  const handleScopeChange = (scope: 'national' | 'city') => {
    setCurrentScope(scope);
  };

  const handleCityChange = (city: string) => {
    setCurrentCity(city);
  };


  const showToast = (message: string) => {
    // 显示提示信息
  };

  const handleLocationSelect = (location: any) => {
    console.log('选择位置:', location);
  };

  // 获取运营城市详情
  const fetchOperatingCities = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/stores');
      const data = await response.json();
      if (data.success) {
        // 按城市分组统计
        const cityMap = new Map();
        data.data.forEach((store: any) => {
          const cityKey = `${store.province}-${store.city}`;
          if (!cityMap.has(cityKey)) {
            cityMap.set(cityKey, {
              province: store.province,
              city: store.city,
              storeCount: 0,
              totalOrders: 0,
              totalRevenue: 0,
              stores: []
            });
          }
          const cityData = cityMap.get(cityKey);
          cityData.storeCount += 1;
          cityData.totalOrders += store.total_orders || 0;
          cityData.totalRevenue += store.total_revenue || 0;
          cityData.stores.push(store);
        });
        setOperatingCitiesData(Array.from(cityMap.values()));
      }
    } catch (error) {
      console.error('获取运营城市详情失败:', error);
    }
  };

  // 获取运营店铺详情
  const fetchOperatingStores = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/stores?status=营业中');
      const data = await response.json();
      if (data.success) {
        setOperatingStoresData(data.data);
      }
    } catch (error) {
      console.error('获取运营店铺详情失败:', error);
    }
  };

  // 获取城市销售趋势数据
  const fetchCitySalesTrend = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/city-sales-trend');
      const data = await response.json();
      if (data.success) {
        setCitySalesTrendData(data.data);
      }
    } catch (error) {
      console.error('获取城市销售趋势失败:', error);
    }
  };

  // 获取商品销售趋势数据
  const fetchProductSalesTrend = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/product-sales-trend');
      const data = await response.json();
      if (data.success) {
        setProductSalesTrendData(data.data);
      }
    } catch (error) {
      console.error('获取商品销售趋势失败:', error);
    }
  };

  // 获取实时运营数据
  const fetchRealTimeStats = async () => {
    try {
      const selectedDate = currentDate.format('YYYY-MM-DD');
      const response = await fetch(`http://localhost:3001/api/operations/real-time-stats?date=${selectedDate}`);
      const data = await response.json();
      if (data.success) {
        setRealTimeStats(data.data);
      }
    } catch (error) {
      console.error('获取实时运营数据失败:', error);
    }
  };

  // 获取热门商品数据
  const fetchTopProducts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/top-products?limit=8');
      const data = await response.json();
      if (data.success) {
        setTopProducts(data.data);
      }
    } catch (error) {
      console.error('获取热门商品失败:', error);
    }
  };

  // 获取省份分析数据
  const fetchProvinceAnalysis = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/province-analysis');
      const data = await response.json();
      if (data.success) {
        setProvinceAnalysis(data.data);
      }
    } catch (error) {
      console.error('获取省份分析失败:', error);
    }
  };

  const fetchRegionOptions = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/region/cascade');
      if (response.data.success) {
        setRegionOptions(response.data.data);
      }
    } catch (error) {
      console.error('获取级联选择器数据失败:', error);
    }
  };

  const handleRegionChange = (value: any) => {
    setSelectedRegion(value);
    if (value && value.length > 0) {
      const cityName = value[value.length - 1];
      setCurrentCity(cityName);
      setCityDetailModalVisible(true);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: '#f0f2f5', minHeight: '100vh' }}>
        <Card>
          <div style={{ padding: '50px' }}>
            <div style={{ fontSize: '18px', marginBottom: '16px' }}>加载数据中...</div>
            <div style={{ color: '#999' }}>正在从hotdog2030数据库获取数据</div>
          </div>
        </Card>
      </div>
    );
  }

  if (dataError) {
    return (
      <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
        <Card>
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '16px', color: '#ff4d4f' }}>
              ❌ 数据加载失败
            </div>
            <div style={{ color: '#999', marginBottom: '24px' }}>{dataError}</div>
            <Button type="primary" onClick={fetchDashboardData}>重新加载</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
        <Card>
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '16px' }}>
              ⚠️ 暂无数据
            </div>
            <div style={{ color: '#999', marginBottom: '24px' }}>数据库中暂无可显示的数据</div>
            <Button type="primary" onClick={fetchDashboardData}>重新加载</Button>
          </div>
        </Card>
      </div>
    );
  }

  const data = dashboardData;

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>

      {/* 顶部信息栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        background: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            <ShopOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            运营仪表盘
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {currentTime.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })} {currentTime.toLocaleDateString('zh-CN', { 
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          <Badge count={1} size="small">
            <BellOutlined style={{ fontSize: '18px', color: '#666', cursor: 'pointer' }} />
          </Badge>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar size="small" icon={<UserOutlined />} />
            <span style={{ fontSize: '14px', color: '#666' }}>管理员</span>
          </div>
        </div>
      </div>

      {/* 数据范围选择 */}
      <div style={{ 
        background: 'white', 
        padding: '16px 24px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>数据范围:</span>
            <Space.Compact size="small">
              <Button 
                type={currentScope === 'national' ? 'primary' : 'default'}
                onClick={() => handleScopeChange('national')}
              >
                全国概览
              </Button>
              <Button 
                type={currentScope === 'city' ? 'primary' : 'default'}
                onClick={() => handleScopeChange('city')}
              >
                城市详情
              </Button>
            </Space.Compact>
          </div>
          
          {currentScope === 'city' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>选择地区:</span>
              <Cascader
                options={regionOptions}
                value={selectedRegion}
                onChange={handleRegionChange}
                placeholder="请选择省市区"
                style={{ width: 200 }}
                size="small"
                showSearch
                allowClear
              />
              <Button 
                type="link" 
                size="small" 
                onClick={() => window.location.href = '/region-statistics'}
              >
                区域统计 →
              </Button>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>选择时间:</span>
            <DatePicker
              value={currentDate}
              onChange={(date) => setCurrentDate(date || dayjs())}
              format="YYYY-MM-DD"
              placeholder="选择日期"
              style={{ width: 140 }}
              allowClear={false}
            />
          </div>
        </div>
      </div>

      {/* 主要KPI指标 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={6}>
          <Card style={{ height: '160px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', height: '100%', padding: '12px' }}>
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <Statistic
                    title="门店总数"
                    value={data.kpis.storeCount}
                    prefix={<ShopOutlined />}
                  />
                </div>
                <div>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate('/store-opening')}
                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  >
                    查看门店详情 →
                  </Button>
                </div>
              </div>
              <div style={{ flex: 1, paddingLeft: '16px', borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>{data.kpis.opened}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>开业中</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>{data.kpis.planned}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>计划中</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>{data.kpis.expanding}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>拓展中</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={8} lg={6}>
          <Card style={{ height: '160px' }}>
            <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Statistic
                title="预计营收"
                value={data.kpis.salesAmount}
                prefix={<DollarOutlined />}
                suffix={
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
                    {data.kpis.salesGrowth}% vs 上月
                  </div>
                }
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={8} lg={6}>
          <Card style={{ height: '160px' }}>
            <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Statistic
                  title="新媒体总粉丝"
                  value={data.kpis.followerCount}
                  prefix={<UserOutlined />}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                ↑{data.kpis.followerGrowth} 增长
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={8} lg={6}>
          <Card style={{ height: '160px' }}>
            <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Statistic
                title="平均顾客满意度"
                value={data.kpis.satisfaction}
                prefix={<StarOutlined />}
                suffix={
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
                    {data.kpis.satisfactionBase}
                  </div>
                }
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 区域发展概况 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col span={24}>
          <Card title="区域发展概况" extra={<EnvironmentOutlined />}>
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="全国省份"
                    value={data.regionStats.totalProvinces}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="全国城市"
                    value={data.regionStats.totalCities}
                    prefix={<EnvironmentOutlined style={{ color: '#1890ff' }} />}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="全国区县"
                    value={data.regionStats.totalDistricts}
                    prefix={<EnvironmentOutlined style={{ color: '#722ed1' }} />}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="潜在开店区域"
                    value={data.regionStats.potentialLocations}
                    prefix={<PlusOutlined style={{ color: '#fa8c16' }} />}
                    suffix="个"
                  />
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12}>
                <Card size="small" title="实际运营情况" style={{ background: '#f6ffed', height: '120px' }}>
                  <Row gutter={[16, 16]} style={{ height: '100%' }}>
                    <Col span={12}>
                      <div 
                        style={{ cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center' }} 
                        onClick={() => {
                          fetchOperatingCities();
                          setOperatingCitiesModalVisible(true);
                        }}
                      >
                        <Statistic
                          title={<span>已运营城市 <EyeOutlined style={{ fontSize: '12px', color: '#999' }} /></span>}
                          value={data.regionStats.operatingCities}
                          prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          suffix="个"
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div 
                        style={{ cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center' }} 
                        onClick={() => {
                          fetchOperatingStores();
                          setOperatingStoresModalVisible(true);
                        }}
                      >
                        <Statistic
                          title={<span>已运营店铺 <EyeOutlined style={{ fontSize: '12px', color: '#999' }} /></span>}
                          value={data.regionStats.operatingStores}
                          prefix={<ShopOutlined style={{ color: '#1890ff' }} />}
                          suffix="家"
                        />
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" title="发展潜力" style={{ background: '#fff7e6', height: '120px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '8px 0' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                        {((data.regionStats.operatingCities / data.regionStats.totalCities) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        城市覆盖率
                      </div>
                    </div>
                    <div 
                      style={{ 
                        flex: 1, 
                        textAlign: 'center', 
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        border: '1px solid #ffd591'
                      }}
                      onClick={() => {
                        // 显示待开发城市的Modal
                        Modal.info({
                          title: '待开发城市列表',
                          width: 1000,
                          content: (
                            <div>
                              <p style={{ marginBottom: '16px', fontSize: '16px', color: '#666' }}>
                                共有 <strong style={{ color: '#1890ff' }}>{data.regionStats.totalCities - data.regionStats.operatingCities}</strong> 个城市待开发
                              </p>
                              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                                <Table
                                  dataSource={regionOptions.map((region, index) => ({
                                    key: index,
                                    index: index + 1,
                                    province: region.label,
                                    cities: region.children?.length || 0,
                                    districts: region.children?.reduce((sum: number, city: any) => sum + (city.children?.length || 0), 0) || 0,
                                    cityList: region.children || []
                                  }))}
                                  columns={[
                                    { 
                                      title: '序号', 
                                      dataIndex: 'index', 
                                      key: 'index', 
                                      width: 80,
                                      align: 'center' as const,
                                      render: (index: number) => (
                                        <span style={{ 
                                          backgroundColor: '#f0f0f0', 
                                          padding: '4px 8px', 
                                          borderRadius: '4px',
                                          fontWeight: 'bold',
                                          color: '#1890ff'
                                        }}>
                                          {index}
                                        </span>
                                      )
                                    },
                                    { title: '省份', dataIndex: 'province', key: 'province', width: 120 },
                                    { 
                                      title: '城市数', 
                                      dataIndex: 'cities', 
                                      key: 'cities', 
                                      width: 100,
                                      align: 'center' as const,
                                      render: (cities: number, record: any) => (
                                        <span 
                                          style={{ 
                                            color: '#1890ff', 
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                          }}
                                          onClick={() => {
                                            // 显示该省份的城市列表
                                            Modal.info({
                                              title: `${record.province} - 城市列表`,
                                              width: 800,
                                              content: (
                                                <div>
                                                  <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                                                    {record.province} 共有 <strong style={{ color: '#1890ff' }}>{cities}</strong> 个城市
                                                  </p>
                                                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                                                    <Table
                                                      dataSource={record.cityList.map((city: any, cityIndex: number) => ({
                                                        key: cityIndex,
                                                        index: cityIndex + 1,
                                                        cityName: city.label,
                                                        districts: city.children?.length || 0,
                                                        districtList: city.children || []
                                                      }))}
                                                      columns={[
                                                        { 
                                                          title: '序号', 
                                                          dataIndex: 'index', 
                                                          key: 'index', 
                                                          width: 60,
                                                          align: 'center' as const,
                                                          render: (index: number) => (
                                                            <span style={{ 
                                                              backgroundColor: '#e6f7ff', 
                                                              padding: '2px 6px', 
                                                              borderRadius: '4px',
                                                              fontSize: '12px',
                                                              color: '#1890ff'
                                                            }}>
                                                              {index}
                                                            </span>
                                                          )
                                                        },
                                                        { title: '城市名称', dataIndex: 'cityName', key: 'cityName' },
                                                        { 
                                                          title: '区县数', 
                                                          dataIndex: 'districts', 
                                                          key: 'districts', 
                                                          width: 100,
                                                          align: 'center' as const,
                                                          render: (districts: number, cityRecord: any) => (
                                                            <span 
                                                              style={{ 
                                                                color: '#52c41a', 
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer'
                                                              }}
                                                              onClick={() => {
                                                                // 显示该城市的区县列表
                                                                Modal.info({
                                                                  title: `${cityRecord.cityName} - 区县列表`,
                                                                  width: 600,
                                                                  content: (
                                                                    <div>
                                                                      <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                                                                        {cityRecord.cityName} 共有 <strong style={{ color: '#52c41a' }}>{districts}</strong> 个区县
                                                                      </p>
                                                                      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                                                        <Table
                                                                          dataSource={cityRecord.districtList.map((district: any, districtIndex: number) => ({
                                                                            key: districtIndex,
                                                                            index: districtIndex + 1,
                                                                            districtName: district.label
                                                                          }))}
                                                                          columns={[
                                                                            { 
                                                                              title: '序号', 
                                                                              dataIndex: 'index', 
                                                                              key: 'index', 
                                                                              width: 60,
                                                                              align: 'center' as const,
                                                                              render: (index: number) => (
                                                                                <span style={{ 
                                                                                  backgroundColor: '#f6ffed', 
                                                                                  padding: '2px 6px', 
                                                                                  borderRadius: '4px',
                                                                                  fontSize: '12px',
                                                                                  color: '#52c41a'
                                                                                }}>
                                                                                  {index}
                                                                                </span>
                                                                              )
                                                                            },
                                                                            { title: '区县名称', dataIndex: 'districtName', key: 'districtName' }
                                                                          ]}
                                                                          pagination={{ pageSize: 15 }}
                                                                          size="small"
                                                                        />
                                                                      </div>
                                                                    </div>
                                                                  )
                                                                });
                                                              }}
                                                            >
                                                              {districts}
                                                            </span>
                                                          )
                                                        }
                                                      ]}
                                                      pagination={{ pageSize: 10 }}
                                                      size="small"
                                                    />
                                                  </div>
                                                </div>
                                              )
                                            });
                                          }}
                                        >
                                          {cities}
                                        </span>
                                      )
                                    },
                                    { 
                                      title: '区县数', 
                                      dataIndex: 'districts', 
                                      key: 'districts', 
                                      width: 100,
                                      align: 'center' as const,
                                      render: (districts: number) => (
                                        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{districts}</span>
                                      )
                                    }
                                  ]}
                                  pagination={{ pageSize: 15 }}
                                  size="small"
                                />
                              </div>
                            </div>
                          )
                        });
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d46b08' }}>
                        {data.regionStats.totalCities - data.regionStats.operatingCities}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        个城市待开发
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card 
            title="城市销售增长趋势"
            extra={<Tag color="green">实时数据</Tag>}
          >
            <div style={{ height: 200, overflow: 'auto' }}>
              {citySalesTrendData.length > 0 ? (
                <div>
                  {citySalesTrendData.slice(0, 5).map((city, index) => (
                    <div key={city.city} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {index + 1}. {city.city}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {city.store_count}家门店 | {city.total_orders?.toLocaleString()}单
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                          ¥{Math.round((city.total_revenue || 0) / 10000)}万
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: city.growth_trend === 'up' ? '#52c41a' : city.growth_trend === 'down' ? '#f5222d' : '#666'
                        }}>
                          {city.growth_trend === 'up' ? '↗' : city.growth_trend === 'down' ? '↘' : '→'} 
                          {city.growth_rate?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  height: 200, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div style={{ fontSize: 16, marginBottom: 8 }}>暂无数据</div>
                  <div style={{ fontSize: 12 }}>正在加载城市销售数据...</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="商品销售增长趋势"
            extra={<Tag color="green">实时数据</Tag>}
          >
            <div style={{ height: 200, overflow: 'auto' }}>
              {productSalesTrendData.length > 0 ? (
                <div>
                  {productSalesTrendData.slice(0, 5).map((product, index) => (
                    <div key={product.product_name} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <div style={{ flex: 1, marginRight: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', lineHeight: '1.3' }}>
                          {index + 1}. {product.product_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {product.category} | {product.order_count?.toLocaleString()}单 | ¥{product.avg_price?.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '80px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                          ¥{Math.round((product.total_revenue || 0) / 1000)}千
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: product.growth_trend === 'up' ? '#52c41a' : product.growth_trend === 'down' ? '#f5222d' : '#666'
                        }}>
                          {product.growth_trend === 'up' ? '↗' : product.growth_trend === 'down' ? '↘' : '→'} 
                          {product.growth_rate?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  height: 200, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div style={{ fontSize: 16, marginBottom: 8 }}>暂无数据</div>
                  <div style={{ fontSize: 12 }}>正在加载商品销售数据...</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 实时运营数据卡片 */}
      <Row gutter={[20, 20]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title={`${currentDate.format('MM-DD')}订单`}
              value={realTimeStats?.orders?.today || 0}
              prefix={<BellOutlined style={{ color: '#1890ff' }} />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title={`${currentDate.format('MM-DD')}营收`}
              value={realTimeStats?.revenue?.today || 0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="本周订单"
              value={realTimeStats?.orders?.week || 0}
              prefix={<FireOutlined style={{ color: '#fa8c16' }} />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="本月营收"
              value={realTimeStats?.revenue?.month || 0}
              prefix={<StarOutlined style={{ color: '#722ed1' }} />}
              formatter={(value) => `¥${Math.round(Number(value) / 10000)}万`}
            />
          </Card>
        </Col>
      </Row>

      {/* 热门商品排行榜 */}
      <Row gutter={[20, 20]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={12}>
          <Card 
            title="热门商品排行榜"
            extra={<Tag color="red">TOP {topProducts.length}</Tag>}
          >
            <div style={{ height: 300, overflow: 'auto' }}>
              {topProducts.length > 0 ? (
                <div>
                  {topProducts.map((product, index) => (
                    <div key={product.product_name} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: index < topProducts.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: index < 3 ? (index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32') : '#f0f0f0',
                          color: index < 3 ? '#fff' : '#666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginRight: '12px'
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                            {product.product_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {product.category} | {product.order_count?.toLocaleString()}单 | ¥{product.avg_price?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
                          ¥{Math.round((product.total_revenue || 0) / 1000)}千
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            backgroundColor: product.hot_score === 'hot' ? '#ff4d4f' : product.hot_score === 'normal' ? '#faad14' : '#d9d9d9',
                            color: product.hot_score === 'hot' ? '#fff' : '#000',
                            marginRight: '8px'
                          }}>
                            {product.hot_score === 'hot' ? '🔥' : product.hot_score === 'normal' ? '⚡' : '❄️'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {product.recent_vs_historical?.toFixed(1)}x
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  height: 300, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  <StarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div style={{ fontSize: 16, marginBottom: 8 }}>暂无数据</div>
                  <div style={{ fontSize: 12 }}>正在加载热门商品数据...</div>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 省份分析 */}
        <Col xs={24} lg={12}>
          <Card 
            title="省份运营分析"
            extra={<Tag color="blue">实时数据</Tag>}
          >
            <div style={{ height: 300, overflow: 'auto' }}>
              {provinceAnalysis.length > 0 ? (
                <div>
                  {provinceAnalysis.map((province, index) => (
                    <div key={province.province} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: index < provinceAnalysis.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                          {index + 1}. {province.province}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {province.store_count}家门店 | {province.city_count}个城市 | 密度: {province.store_density}/城
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
                          ¥{Math.round((province.total_revenue || 0) / 10000)}万
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: province.growth_trend === 'up' ? '#52c41a' : province.growth_trend === 'down' ? '#f5222d' : '#666'
                        }}>
                          {province.growth_trend === 'up' ? '↗' : province.growth_trend === 'down' ? '↘' : '→'} 
                          {province.growth_rate?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  height: 300, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  <EnvironmentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div style={{ fontSize: 16, marginBottom: 8 }}>暂无数据</div>
                  <div style={{ fontSize: 12 }}>正在加载省份分析数据...</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 右侧面板 */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'dashboard',
                label: '实时监控',
                children: (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Card title="实时监控" style={{ flex: 1, minWidth: '300px' }} extra={<Tag color="green">实时数据</Tag>}>
                      <div style={{ padding: '16px' }}>
                        <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
                          <Col span={12}>
                            <div style={{ textAlign: 'center', padding: '12px', background: '#f6ffed', borderRadius: '6px', border: '1px solid #b7eb8f' }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                                {realTimeStats?.stores?.operating || 0}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>营业中</div>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{ textAlign: 'center', padding: '12px', background: '#fff7e6', borderRadius: '6px', border: '1px solid #ffd591' }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16', marginBottom: '4px' }}>
                                {realTimeStats?.stores?.preparing || 0}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>筹备中</div>
                            </div>
                          </Col>
                        </Row>
                        <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #91d5ff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}>{currentDate.format('MM-DD')}运营</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              {currentTime.toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                                {realTimeStats?.orders?.today || 0}
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>{currentDate.format('MM-DD')}订单</div>
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                                ¥{Math.round((realTimeStats?.revenue?.today || 0) / 100)}百
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>{currentDate.format('MM-DD')}营收</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card title="热门话题" style={{ flex: 1, minWidth: '300px' }} extra={<Tag color="red">实时热度</Tag>}>
                      <div style={{ padding: '16px' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff', marginBottom: '8px' }}>
                            热门商品趋势
                          </div>
                          {topProducts.slice(0, 3).map((product, index) => (
                            <div key={product.product_name} style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '8px 0',
                              borderBottom: index < 2 ? '1px solid #f0f0f0' : 'none'
                            }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: index === 0 ? '#ff4d4f' : index === 1 ? '#fa8c16' : '#52c41a',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                marginRight: '8px'
                              }}>
                                {index === 0 ? '🔥' : index === 1 ? '⚡' : '📈'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
                                  {product.product_name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                  {product.category} | {product.recent_vs_historical?.toFixed(1)}x热度
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: '8px', background: '#fff2e8', borderRadius: '4px', border: '1px solid #ffd591' }}>
                          <div style={{ fontSize: '11px', color: '#d46b08', textAlign: 'center' }}>
                            热度基于近期vs历史销售对比
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              },
              {
                key: 'ai',
                label: 'AI建议',
                children: (
                  <Card extra={<Tag color="orange">数据不全</Tag>}>
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                      <RobotOutlined style={{ fontSize: '32px', marginBottom: '16px', color: '#d9d9d9' }} />
                      <div>暂无AI建议数据</div>
                      <div style={{ fontSize: '12px', marginTop: '8px' }}>需要启用AI分析功能</div>
                              </div>
                  </Card>
                )
              },
              {
                key: 'health',
                label: '系统状态',
                children: <div>系统状态检查功能暂未实现</div>
              }
            ]}
          />
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="区域统计" style={{ height: '300px' }}>
            <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1890ff' }}>
                  区域发展概况
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>总省份</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>{data.regionStats?.totalProvinces || 0}</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>总城市</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>{data.regionStats?.totalCities || 0}</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#fff7e6', borderRadius: '4px', border: '1px solid #ffd591' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>总区县</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>{data.regionStats?.totalDistricts || 0}</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#fff1f0', borderRadius: '4px', border: '1px solid #ffccc7' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>运营城市</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f5222d' }}>{data.regionStats?.operatingCities || 0}</div>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#666' }}>运营店铺:</span>
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{data.regionStats?.operatingStores || 0}家</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                  <span style={{ color: '#666' }}>潜在机会:</span>
                  <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>{data.regionStats?.potentialLocations || 0}个</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 城市详情模态框 - 暂未实现 */}
      {/* <CityDetailModal
        visible={cityDetailModalVisible}
        onClose={() => setCityDetailModalVisible(false)}
        selectedRegion={selectedRegion}
      /> */}
      
      {/* 数据不全提示 - 页面底部 */}
      {data.kpis.salesGrowth === "数据不全" && (
        <div style={{ marginTop: '24px' }}>
          <Alert
            message="数据提示"
            description="部分数据不全，仅显示hotdog2030数据库中已有的数据。趋势分析、热门话题、AI建议等功能需要补充历史数据。"
            type="warning"
            showIcon
            style={{ background: '#fff7e6', borderColor: '#ffa940' }}
          />
        </div>
      )}

      {/* 运营城市详情Modal */}
      <Modal
        title="已运营城市详情"
        open={operatingCitiesModalVisible}
        onCancel={() => setOperatingCitiesModalVisible(false)}
        footer={null}
        width={1200}
      >
        <Table
          dataSource={operatingCitiesData.map((item, index) => ({ ...item, index: index + 1 }))}
          rowKey={(record) => `${record.province}-${record.city}`}
          columns={[
            {
              title: '序号',
              dataIndex: 'index',
              key: 'index',
              width: 60,
              align: 'center' as const,
              render: (index) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{index}</span>
              )
            },
            {
              title: '省份',
              dataIndex: 'province',
              key: 'province',
              width: 120,
            },
            {
              title: '城市',
              dataIndex: 'city',
              key: 'city',
              width: 120,
            },
            {
              title: '门店数量',
              dataIndex: 'storeCount',
              key: 'storeCount',
              width: 100,
              render: (count) => (
                <Tag color="blue">{count}家</Tag>
              ),
              sorter: (a, b) => (a.storeCount || 0) - (b.storeCount || 0)
            },
            {
              title: '总订单数',
              dataIndex: 'totalOrders',
              key: 'totalOrders',
              width: 120,
              render: (orders) => orders?.toLocaleString() || 0,
              sorter: (a, b) => (a.totalOrders || 0) - (b.totalOrders || 0)
            },
            {
              title: '总营收',
              dataIndex: 'totalRevenue',
              key: 'totalRevenue',
              width: 150,
              render: (revenue) => `¥${(revenue || 0).toLocaleString()}`,
              sorter: (a, b) => (a.totalRevenue || 0) - (b.totalRevenue || 0)
            },
            {
              title: '平均客单价',
              key: 'avgOrderValue',
              width: 120,
              render: (_, record) => {
                const avg = record.totalOrders > 0 ? (record.totalRevenue || 0) / record.totalOrders : 0;
                return avg > 0 ? `¥${avg.toFixed(2)}` : '-';
              },
              sorter: (a, b) => {
                const avgA = a.totalOrders > 0 ? (a.totalRevenue || 0) / a.totalOrders : 0;
                const avgB = b.totalOrders > 0 ? (b.totalRevenue || 0) / b.totalOrders : 0;
                return avgA - avgB;
              }
            },
            {
              title: '门店平均订单',
              key: 'avgStoreOrders',
              width: 130,
              render: (_, record) => {
                const avg = record.storeCount > 0 ? Math.round((record.totalOrders || 0) / record.storeCount) : 0;
                return avg > 0 ? avg.toLocaleString() : '0';
              },
              sorter: (a, b) => {
                const avgA = a.storeCount > 0 ? (a.totalOrders || 0) / a.storeCount : 0;
                const avgB = b.storeCount > 0 ? (b.totalOrders || 0) / b.storeCount : 0;
                return avgA - avgB;
              }
            },
            {
              title: '操作',
              key: 'action',
              width: 100,
              render: (_, record) => (
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => {
                    Modal.info({
                      title: `${record.city}门店列表`,
                      width: 1000,
                      content: (
                        <Table
                          dataSource={record.stores.map((store: any, index: number) => ({ ...store, index: index + 1 }))}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          columns={[
                            {
                              title: '序号',
                              dataIndex: 'index',
                              key: 'index',
                              width: 60,
                              align: 'center' as const,
                              render: (index) => (
                                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{index}</span>
                              )
                            },
                            {
                              title: '门店名称',
                              dataIndex: 'store_name',
                              key: 'store_name',
                              width: 200,
                            },
                            {
                              title: '地址',
                              dataIndex: 'address',
                              key: 'address',
                              ellipsis: true,
                              width: 250,
                            },
                            {
                              title: '订单数',
                              dataIndex: 'total_orders',
                              key: 'total_orders',
                              width: 100,
                              render: (orders) => orders?.toLocaleString() || 0,
                              sorter: (a: any, b: any) => (a.total_orders || 0) - (b.total_orders || 0)
                            },
                            {
                              title: '营收',
                              dataIndex: 'total_revenue',
                              key: 'total_revenue',
                              width: 120,
                              render: (revenue) => `¥${(revenue || 0).toLocaleString()}`,
                              sorter: (a: any, b: any) => (a.total_revenue || 0) - (b.total_revenue || 0)
                            },
                            {
                              title: '平均客单价',
                              key: 'avg_order_value',
                              width: 120,
                              render: (_, record: any) => {
                                const avg = record.avg_order_value;
                                return avg ? `¥${avg.toFixed(2)}` : '-';
                              },
                              sorter: (a: any, b: any) => (a.avg_order_value || 0) - (b.avg_order_value || 0)
                            },
                            {
                              title: '营业天数',
                              dataIndex: 'operating_days',
                              key: 'operating_days',
                              width: 100,
                              render: (days) => days ? `${days}天` : '0天',
                              sorter: (a: any, b: any) => (a.operating_days || 0) - (b.operating_days || 0)
                            }
                          ]}
                          scroll={{ x: 800 }}
                        />
                      )
                    });
                  }}
                >
                  查看门店
                </Button>
              )
            }
          ]}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 个城市`
          }}
        />
      </Modal>

      {/* 运营店铺详情Modal */}
      <Modal
        title="已运营店铺详情"
        open={operatingStoresModalVisible}
        onCancel={() => setOperatingStoresModalVisible(false)}
        footer={null}
        width={1500}
      >
        <Table
          dataSource={operatingStoresData.map((item, index) => ({ ...item, index: index + 1 }))}
          rowKey="id"
          columns={[
            {
              title: '序号',
              dataIndex: 'index',
              key: 'index',
              width: 60,
              align: 'center' as const,
              render: (index) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{index}</span>
              )
            },
            {
              title: '门店编号',
              dataIndex: 'store_code',
              key: 'store_code',
              width: 120,
            },
            {
              title: '门店名称',
              dataIndex: 'store_name',
              key: 'store_name',
              width: 180,
            },
            {
              title: '省份',
              dataIndex: 'province',
              key: 'province',
              width: 100,
            },
            {
              title: '城市',
              dataIndex: 'city',
              key: 'city',
              width: 100,
            },
            {
              title: '地址',
              dataIndex: 'address',
              key: 'address',
              ellipsis: true,
              width: 200,
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              width: 80,
              render: (status) => (
                <Tag color={status === '营业中' ? 'green' : 'orange'}>
                  {status}
                </Tag>
              )
            },
            {
              title: '总订单',
              dataIndex: 'total_orders',
              key: 'total_orders',
              width: 100,
              render: (orders) => orders?.toLocaleString() || 0,
              sorter: (a, b) => (a.total_orders || 0) - (b.total_orders || 0)
            },
            {
              title: '总营收',
              dataIndex: 'total_revenue',
              key: 'total_revenue',
              width: 120,
              render: (revenue) => `¥${(revenue || 0).toLocaleString()}`,
              sorter: (a, b) => (a.total_revenue || 0) - (b.total_revenue || 0)
            },
            {
              title: '平均客单价',
              dataIndex: 'avg_order_value',
              key: 'avg_order_value',
              width: 100,
              render: (avg) => avg ? `¥${avg.toFixed(2)}` : '-',
              sorter: (a, b) => (a.avg_order_value || 0) - (b.avg_order_value || 0)
            },
            {
              title: '营业天数',
              dataIndex: 'operating_days',
              key: 'operating_days',
              width: 100,
              render: (days) => days ? `${days}天` : '0天',
              sorter: (a, b) => (a.operating_days || 0) - (b.operating_days || 0)
            },
            {
              title: '近30天订单',
              dataIndex: 'recent_orders_30d',
              key: 'recent_orders_30d',
              width: 110,
              render: (orders) => orders ? orders.toLocaleString() : '0'
            },
            {
              title: '近7天订单',
              dataIndex: 'recent_orders_7d',
              key: 'recent_orders_7d',
              width: 100,
              render: (orders) => orders ? orders.toLocaleString() : '0'
            },
            {
              title: '操作',
              key: 'action',
              width: 100,
              fixed: 'right' as const,
              render: (_, record) => (
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => {
                    Modal.info({
                      title: record.store_name,
                      width: 700,
                      content: (
                        <Descriptions bordered column={2} size="small">
                          <Descriptions.Item label="门店编号">{record.store_code}</Descriptions.Item>
                          <Descriptions.Item label="状态">
                            <Tag color={record.status === '营业中' ? 'green' : 'orange'}>
                              {record.status}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="省份">{record.province}</Descriptions.Item>
                          <Descriptions.Item label="城市">{record.city}</Descriptions.Item>
                          <Descriptions.Item label="区域">{record.district}</Descriptions.Item>
                          <Descriptions.Item label="地址" span={2}>{record.address}</Descriptions.Item>
                          <Descriptions.Item label="店长">{record.director || '-'}</Descriptions.Item>
                          <Descriptions.Item label="联系电话">{record.director_phone || '-'}</Descriptions.Item>
                          
                          {/* 运营数据部分 */}
                          <Descriptions.Item label="总订单数" span={2}>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                              {(record.total_orders || 0).toLocaleString()}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="总营收" span={2}>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                              ¥{(record.total_revenue || 0).toLocaleString()}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="平均客单价">
                            {record.avg_order_value ? `¥${record.avg_order_value.toFixed(2)}` : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="营业天数">{record.operating_days || 0}天</Descriptions.Item>
                          
                          {/* 近期数据 */}
                          <Descriptions.Item label="近30天订单">
                            <span style={{ color: '#fa8c16' }}>
                              {(record.recent_orders_30d || 0).toLocaleString()}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="近30天营收">
                            <span style={{ color: '#fa8c16' }}>
                              ¥{(record.recent_revenue_30d || 0).toLocaleString()}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="近7天订单">
                            <span style={{ color: '#f5222d' }}>
                              {(record.recent_orders_7d || 0).toLocaleString()}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="近7天营收">
                            <span style={{ color: '#f5222d' }}>
                              ¥{(record.recent_revenue_7d || 0).toLocaleString()}
                            </span>
                          </Descriptions.Item>
                          
                          {/* 时间信息 */}
                          <Descriptions.Item label="首单日期">
                            {record.first_order_date ? new Date(record.first_order_date).toLocaleDateString() : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="最近订单">
                            {record.last_order_date ? new Date(record.last_order_date).toLocaleDateString() : '-'}
                          </Descriptions.Item>
                          
                          {/* 门店信息 */}
                          <Descriptions.Item label="门店面积">{record.area_size || '-'}m²</Descriptions.Item>
                          <Descriptions.Item label="营业时间">
                            {record.morning_time && record.night_time 
                              ? `${record.morning_time} - ${record.night_time}` 
                              : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="门店类型">{record.store_type || '-'}</Descriptions.Item>
                          <Descriptions.Item label="是否自营">
                            <Tag color={record.is_self ? 'blue' : 'default'}>
                              {record.is_self ? '自营' : '加盟'}
                            </Tag>
                          </Descriptions.Item>
                        </Descriptions>
                      )
                    });
                  }}
                >
                  详情
                </Button>
              )
            }
          ]}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 家门店`
          }}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;