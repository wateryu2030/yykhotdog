import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Select, 
  Statistic, 
  Progress, 
  Button, 
  List, 
  Tag, 
  Alert, 
  Spin, 
  DatePicker, 
  Space,
  Table,
  Modal,
  Descriptions,
  Tabs,
  Divider,
  Typography,
  Badge,
  Avatar
} from 'antd';
import { 
  DollarOutlined, 
  UserOutlined, 
  ShoppingCartOutlined, 
  TrophyOutlined,
  BellOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  FireOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  EyeOutlined,
  BarChartOutlined,
  CreditCardOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { backendAPI } from '../config/api';
import axios from 'axios';
import SalesPredictionChart from '../components/SalesPredictionChart';

const { Title: AntTitle, Text } = Typography;

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  ChartDataLabels
);

interface StoreKPI {
  sales: number;
  target: number;
  avgSpend: number;
  transactions: number;
  newMembers: number;
  salesTrend: { vsYesterday: number };
  avgSpendTrend: { vsYesterday: number };
  transactionsTrend: { vsYesterday: number };
}

interface SalesChartData {
  labels: string[];
  data: number[];
}

interface TopProduct {
  name: string;
  sales: number;
  profitMargin: number;
}

interface RestockSuggestion {
  product: string;
  quantity: number;
  reason: string;
}

interface MarketingTask {
  type: string;
  target: string;
  action: string;
  api: string;
}

interface AIScore {
  total: number;
  hygiene: number;
  compliance: number;
  presentation: number;
}

interface AIAlert {
  type: string;
  message: string;
  action: string;
  api: string;
}

interface LocalEvent {
  icon: string;
  text: string;
  action?: string;
  api?: string;
}

interface StoreDashboardData {
  name: string;
  kpis: StoreKPI;
  salesChart: SalesChartData;
  topProducts: TopProduct[];
  restockSuggestion: RestockSuggestion;
  marketingTasks: MarketingTask[];
  customerFeedback: string;
  aiScore: AIScore;
  aiAlerts: AIAlert[];
  localEvents: LocalEvent[];
}

interface Store {
  id: string;
  name: string;
  store_name: string;
}

// 新增的细化统计接口
interface HourlyStats {
  hour: number;
  orderCount: number;
  totalSales: number;
  avgSpend: number;
}

interface PaymentStats {
  payMode: string;
  orderCount: number;
  totalSales: number;
  avgSpend: number;
}

interface OrderItem {
  id: number;
  orderNo: string;
  recordTime: string;
  payMode: string;
  vipAmount: number;
  vipAmountZengSong: number;
  cash: number;
  total: number;
  totalAmount: number;
  openId: string;
  remark: string;
}

interface OrderListResponse {
  orders: OrderItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface OrderDetail {
  id: number;
  orderNo: string;
  recordTime: string;
  payMode: string;
  vipAmount: number;
  vipAmountZengSong: number;
  cash: number;
  total: number;
  totalAmount: number;
  openId: string;
  remark: string;
  payState: number;
  shopId: number;
}

// 新增订单商品详情接口
interface OrderGoodsItem {
  id: number;
  orderId: number;
  categoryId: number;
  categoryName: string;
  goodsId: number;
  goodsName: string;
  goodsText: string;
  goodsNumber: number;
  goodsPrice: number;
  goodsTotal: number;
  orderScore: number;
  useScore: number;
  isRefund: number;
  refundMoney: number;
  refundScore: number;
  recordTime: string;
  shopId: number;
  shopName: string;
  standardPrice: number;
  standardTotal: number;
  otherTotal: number;
  isPackage: number;
  discountAmount: number;
  realIncomeAmount: number;
  costPrice: number;
  profitPrice: number;
}

// 新增订单完整详情接口
interface OrderFullDetail {
  order: OrderDetail;
  goods: OrderGoodsItem[];
}

interface ProductStats {
  goodsName: string;
  orderCount: number;
  totalQuantity: number;
  totalSales: number;
  avgOrderValue: number;
}

const Operations: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<StoreDashboardData | null>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  
  // 时间过滤状态
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(1, 'day').startOf('day'),
    dayjs().subtract(1, 'day').endOf('day')
  ]);
  const [timeType, setTimeType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('yesterday');

  // 细化统计状态
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [orderList, setOrderList] = useState<OrderListResponse | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [orderFullDetail, setOrderFullDetail] = useState<OrderFullDetail | null>(null);
  
  // 模态框状态
  const [orderListVisible, setOrderListVisible] = useState(false);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [orderFullDetailVisible, setOrderFullDetailVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [currentStatsType, setCurrentStatsType] = useState<'hourly' | 'payment' | 'product'>('hourly');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 筛选状态
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number | undefined>();

  // 获取城市列表
  const fetchCities = async () => {
    try {
      const response = await api.get('/customer-profile/cities');
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (error) {
      console.error('获取城市列表失败:', error);
    }
  };

  // 获取门店列表
  const fetchStoresByCity = async (city: string) => {
    try {
      console.log('【前端调试】开始获取城市门店列表:', city);
      const encodedCity = encodeURIComponent(city);
      console.log('【前端调试】编码后的城市名称:', encodedCity);
      const response = await api.get(`/customer-profile/stores/by-city-name/${encodedCity}`);
      console.log('【前端调试】城市门店API响应:', response.data);
      if (response.data.success) {
        console.log('【前端调试】城市门店数据:', response.data.data);
        setStores(response.data.data);
      } else {
        console.error('【前端调试】城市门店API返回失败:', response.data);
      }
    } catch (error) {
      console.error('获取门店列表失败:', error);
    }
  };

  // 城市选择变化
  const handleCityChange = (city: string) => {
    console.log('【前端调试】城市选择变化:', city);
    setSelectedCity(city);
    setSelectedStore('');
    setStores([]);
    if (city) {
      fetchStoresByCity(city);
    }
  };

  // 获取门店列表
  useEffect(() => {
    const fetchStores = async () => {
      try {
        console.log('【前端调试】开始获取门店列表...');
        // 使用customer-profile的stores API，它返回所有门店（无分页）
        const response = await api.get('/customer-profile/stores');
        console.log('【前端调试】API响应:', response.data);
        if (response.data.success) {
          console.log('【前端调试】门店数据:', response.data.data);
          setStores(response.data.data);
          if (response.data.data.length > 0) {
            console.log('【前端调试】设置默认门店:', response.data.data[0].id);
            setSelectedStore(response.data.data[0].id);
          }
        }
      } catch (error) {
        console.error('获取门店列表失败:', error);
      }
    };

    fetchStores();
    fetchCities();
  }, []);

  // 获取运营概览汇总数据
  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // 构建时间参数
      const timeParams = new URLSearchParams();
      if (dateRange && dateRange.length === 2) {
        timeParams.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        timeParams.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      timeParams.append('timeType', timeType);
      
      if (selectedCity) {
        timeParams.append('city', selectedCity);
      }

      const response = await api.get(`/operations/overview?${timeParams.toString()}`);
      if (response.data.success) {
        setOverviewData(response.data.data);
      }
    } catch (error) {
      console.error('获取运营概览数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取门店运营数据
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 构建时间参数
      const timeParams = new URLSearchParams();
      if (dateRange && dateRange.length === 2) {
        timeParams.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        timeParams.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      timeParams.append('timeType', timeType);

      const response = await api.get(`/operations/dashboard/${selectedStore}?${timeParams.toString()}`);
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('获取门店运营数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据是否选择门店决定获取哪种数据
  useEffect(() => {
    if (selectedStore) {
      fetchDashboardData();
    } else {
      fetchOverviewData();
    }
  }, [selectedStore, dateRange, timeType, selectedCity]);

  // 获取分时段统计
  const fetchHourlyStats = async () => {
    if (!selectedStore) return;
    
    try {
      const timeParams = new URLSearchParams();
      if (dateRange && dateRange.length === 2) {
        timeParams.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        timeParams.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      timeParams.append('timeType', timeType);

      const response = await api.get(`/operations/hourly-stats/${selectedStore}?${timeParams.toString()}`);
      if (response.data.success) {
        setHourlyStats(response.data.data);
      }
    } catch (error) {
      console.error('获取分时段统计失败:', error);
    }
  };

  // 获取支付方式统计
  const fetchPaymentStats = async () => {
    if (!selectedStore) return;
    
    try {
      const timeParams = new URLSearchParams();
      if (dateRange && dateRange.length === 2) {
        timeParams.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        timeParams.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      timeParams.append('timeType', timeType);

      const response = await api.get(`/operations/payment-stats/${selectedStore}?${timeParams.toString()}`);
      if (response.data.success) {
        setPaymentStats(response.data.data);
      }
    } catch (error) {
      console.error('获取支付方式统计失败:', error);
    }
  };

  // 获取商品销售统计
  const fetchProductStats = async () => {
    if (!selectedStore) return;
    
    try {
      const timeParams = new URLSearchParams();
      if (dateRange && dateRange.length === 2) {
        timeParams.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        timeParams.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      timeParams.append('timeType', timeType);

      const response = await api.get(`/operations/product-stats/${selectedStore}?${timeParams.toString()}`);
      if (response.data.success) {
        setProductStats(response.data.data);
      }
    } catch (error) {
      console.error('获取商品销售统计失败:', error);
    }
  };

  // 获取订单列表
  const fetchOrderList = async (page: number = 1, filters?: { paymentMethod?: string; hour?: number }) => {
    if (!selectedStore) return;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (dateRange && dateRange.length === 2) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      params.append('timeType', timeType);
      
      if (filters?.paymentMethod) {
        params.append('paymentMethod', filters.paymentMethod);
      }
      if (filters?.hour !== undefined) {
        params.append('hour', filters.hour.toString());
      }

      const response = await api.get(`/operations/orders/${selectedStore}?${params.toString()}`);
      if (response.data.success) {
        setOrderList(response.data.data);
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
    }
  };

  // 获取订单详情
  const fetchOrderDetail = async (orderId: number) => {
    try {
      const response = await api.get(`/operations/orders/detail/${orderId}`);
      if (response.data.success) {
        setOrderDetail(response.data.data);
        setOrderDetailVisible(true);
      }
    } catch (error) {
      console.error('获取订单详情失败:', error);
    }
  };

  // 获取订单完整详情（包含商品信息）
  const fetchOrderFullDetail = async (orderId: number) => {
    try {
      const response = await api.get(`/operations/orders/full-detail/${orderId}`);
      if (response.data.success) {
        setOrderFullDetail(response.data.data);
        setOrderFullDetailVisible(true);
      }
    } catch (error) {
      console.error('获取订单完整详情失败:', error);
    }
  };

  // 当时间过滤条件改变时，重新获取所有统计数据
  useEffect(() => {
    if (selectedStore) {
      fetchHourlyStats();
      fetchPaymentStats();
      fetchProductStats();
    }
  }, [selectedStore, dateRange, timeType]);

  // 处理操作按钮点击
  const handleAction = async (apiUrl: string, actionName: string) => {
    try {
      const response = await api.post(apiUrl);
      if (response.data.success) {
        setToastMessage(`${actionName}执行成功！`);
        // 重新获取数据
        const dashboardResponse = await api.get(`/operations/dashboard/${selectedStore}`);
        if (dashboardResponse.data.success) {
          setDashboardData(dashboardResponse.data.data);
        }
      }
    } catch (error) {
      console.error('操作执行失败:', error);
      setToastMessage('操作执行失败，请重试');
    }
  };

  // 处理细化统计点击
  const handleStatsClick = (type: 'hourly' | 'payment' | 'product') => {
    setCurrentStatsType(type);
    setStatsModalVisible(true);
  };

  // 处理统计项点击（下钻到订单列表）
  const handleStatItemClick = (type: 'hourly' | 'payment', value: string | number) => {
    let filters: { paymentMethod?: string; hour?: number } = {};
    
    if (type === 'hourly') {
      filters.hour = value as number;
    } else if (type === 'payment') {
      filters.paymentMethod = value as string;
    }
    
    fetchOrderList(1, filters);
    setOrderListVisible(true);
  };

  // 处理订单列表分页
  const handleOrderListPagination = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    fetchOrderList(page);
  };

  // 处理订单详情查看
  const handleOrderDetailClick = (orderId: number) => {
    fetchOrderFullDetail(orderId);
  };

  // 销售趋势图表配置
  const salesChartConfig = {
    data: {
      labels: dashboardData?.salesChart?.labels || [],
      datasets: [
        {
          label: '销售额',
          data: dashboardData?.salesChart?.data || [],
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => `¥${value.toLocaleString()}`,
          },
        },
      },
    },
  };

  // AI评分仪表盘配置
  const aiScoreConfig = {
    data: {
      labels: ['当前分数', '剩余'],
      datasets: [
        {
          data: dashboardData?.aiScore ? [dashboardData.aiScore.total || 0, 100 - (dashboardData.aiScore.total || 0)] : [0, 100],
          backgroundColor: [
            dashboardData?.aiScore?.total && dashboardData.aiScore.total >= 90 ? '#52c41a' :
            dashboardData?.aiScore?.total && dashboardData.aiScore.total >= 75 ? '#faad14' : '#ff4d4f',
            '#f0f0f0'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          circumference: 180,
          rotation: -90,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
        datalabels: {
          formatter: (value: any, context: any) => {
            if (context.dataIndex === 0) {
              return `${value}`;
            }
            return '';
          },
          color: '#000000',
          font: { size: 24, weight: 'bold' },
          anchor: 'center',
          align: 'center',
          offset: -20,
        },
      },
    },
  };

  // 处理时间类型变化
  const handleTimeTypeChange = (type: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setTimeType(type);
    
    switch (type) {
      case 'today':
        setDateRange([dayjs().startOf('day'), dayjs().endOf('day')]);
        break;
      case 'yesterday':
        setDateRange([dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')]);
        break;
      case 'week':
        setDateRange([dayjs().startOf('week'), dayjs().endOf('week')]);
        break;
      case 'month':
        setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
        break;
      case 'custom':
        // 保持当前日期范围不变，用户可以手动选择
        break;
    }
  };

  // 处理自定义日期范围变化
  const handleDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setDateRange(dates);
    if (dates) {
      setTimeType('custom');
    }
  };

  const formatTrend = (trend: number) => {
    const percentage = (trend * 100).toFixed(1);
    if (trend > 0) {
      return <span style={{ color: '#52c41a' }}>+{percentage}%</span>;
    } else if (trend < 0) {
      return <span style={{ color: '#ff4d4f' }}>-{Math.abs(parseFloat(percentage))}%</span>;
    }
    return <span style={{ color: '#8c8c8c' }}>0.0%</span>;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载门店运营数据中...</div>
      </div>
    );
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 头部 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0 24px', background: '#fff', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TrophyOutlined style={{ fontSize: 28, color: '#faad14', marginRight: 8 }} />
            <span style={{ fontWeight: 'bold', fontSize: 24 }}>运营模块</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* 城市选择器 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: 16, color: '#666', marginRight: 8 }} />
              <Select
                value={selectedCity || undefined}
                onChange={handleCityChange}
                style={{ width: 150 }}
                placeholder="选择城市"
                allowClear
              >
                {cities.map(city => (
                  <Select.Option key={`city-${city.id || city.name || city.city_name}`} value={city.name || city.city_name}>
                    {city.name || city.city_name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            {/* 门店选择器 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: 16, color: '#666', marginRight: 8 }} />
              <Select
                value={selectedStore || undefined}
                onChange={setSelectedStore}
                style={{ width: 200 }}
                placeholder="选择门店"
                allowClear
                disabled={!selectedCity}
              >
                {stores.map(store => (
                  <Select.Option key={`store-${store.id}`} value={store.id}>
                    {store.store_name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            {/* 日期选择器 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarOutlined style={{ fontSize: 16, color: '#666' }} />
              <DatePicker
                value={dateRange?.[0]}
                onChange={(date) => {
                  if (date) {
                    setDateRange([date.startOf('day'), date.endOf('day')]);
                    setTimeType('custom');
                  }
                }}
                format="YYYY-MM-DD"
                placeholder="选择日期"
                style={{ width: 120 }}
              />
            </div>
            <span style={{ fontSize: 18, marginRight: 16 }}>{timeStr} {dateStr}</span>
            <Badge count={1} size="small" style={{ marginRight: 16 }}><BellOutlined style={{ fontSize: 22, color: '#666' }} /></Badge>
            <Avatar style={{ backgroundColor: '#87d068', marginRight: 8 }} icon={<UserOutlined />} />
            <span>管理员</span>
          </div>
        </div>

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ background: '#f0f0f0', padding: '10px', marginBottom: '16px', borderRadius: '4px', fontSize: '12px' }}>
          <strong>调试信息:</strong> 
          门店: {selectedStore || '未选择'} | 
          时间: {timeType} | 
          数据: {dashboardData ? '已加载' : '未加载'} | 
          加载: {loading ? '是' : '否'}
        </div>
      )}

      <Tabs 
        defaultActiveKey="overview" 
        style={{ background: 'white', padding: '16px', borderRadius: '8px' }}
        items={[
          {
            key: 'overview',
            label: '运营概览',
            children: loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>加载中...</div>
              </div>
            ) : (selectedStore ? dashboardData : overviewData) ? (
              <>
                {/* KPI指标 */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      hoverable
                      onClick={() => selectedStore && setStatsModalVisible(true)}
                      style={{ cursor: selectedStore ? 'pointer' : 'default' }}
                    >
                      <Statistic
                        title={`${timeType === 'today' ? '今日' : timeType === 'yesterday' ? '昨日' : timeType === 'week' ? '本周' : timeType === 'month' ? '本月' : '选定时间'}销售额`}
                        value={selectedStore ? dashboardData?.kpis.sales || 0 : overviewData?.kpis.sales || 0}
                        precision={2}
                        prefix="¥"
                        valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                      />
                      {selectedStore && dashboardData && (
                        <>
                          <Progress
                            percent={Math.min(100, (dashboardData.kpis.sales / dashboardData.kpis.target) * 100)}
                            size="small"
                            style={{ marginTop: '8px' }}
                          />
                          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                            目标达成: {((dashboardData.kpis.sales / dashboardData.kpis.target) * 100).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: '12px', color: '#1890ff', marginTop: '4px' }}>
                            点击查看详细统计 →
                          </div>
                        </>
                      )}
                      {!selectedStore && overviewData && (
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                          {overviewData.kpis.salesTrend?.vsYesterday > 0 ? '+' : ''}{overviewData.kpis.salesTrend?.vsYesterday?.toFixed(1)}% vs 昨日
                        </div>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      onClick={() => selectedStore && (setCurrentStatsType('hourly'), setStatsModalVisible(true))}
                      style={{ cursor: selectedStore ? 'pointer' : 'default' }}
                    >
                      <Statistic
                        title={`${timeType === 'today' ? '今日' : timeType === 'yesterday' ? '昨日' : timeType === 'week' ? '本周' : timeType === 'month' ? '本月' : '选定时间'}客单价`}
                        value={selectedStore ? dashboardData?.kpis.avgSpend || 0 : overviewData?.kpis.avgOrderValue || 0}
                        precision={2}
                        prefix="¥"
                        valueStyle={{ fontSize: '24px' }}
                      />
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {selectedStore && dashboardData ? (
                          <>
                            {`${formatTrend(dashboardData.kpis.avgSpendTrend.vsYesterday)} vs 昨日`}
                            <div style={{ color: '#52c41a', marginTop: '4px' }}>点击查看分时统计 →</div>
                          </>
                        ) : overviewData ? (
                          `${overviewData.kpis.avgOrderTrend?.vsYesterday > 0 ? '+' : ''}${overviewData.kpis.avgOrderTrend?.vsYesterday?.toFixed(1)}% vs 昨日`
                        ) : (
                          '暂无数据'
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      onClick={() => selectedStore && (setCurrentStatsType('payment'), setStatsModalVisible(true))}
                      style={{ cursor: selectedStore ? 'pointer' : 'default' }}
                    >
                      <Statistic
                        title="总用户数"
                        value={selectedStore ? dashboardData?.kpis.newMembers || 0 : overviewData?.kpis.totalCustomers || 0}
                        valueStyle={{ fontSize: '24px' }}
                        suffix="人"
                      />
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {selectedStore && dashboardData ? (
                          <>
                            {'今日活跃用户'}
                            <div style={{ color: '#fa8c16', marginTop: '4px' }}>点击查看支付统计 →</div>
                          </>
                        ) : overviewData ? (
                          `${overviewData.kpis.customersTrend?.vsYesterday > 0 ? '+' : ''}${overviewData.kpis.customersTrend?.vsYesterday?.toFixed(1)}% vs 昨日`
                        ) : (
                          '今日活跃用户'
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card
                      hoverable
                      onClick={() => selectedStore && (setCurrentStatsType('product'), setStatsModalVisible(true))}
                      style={{ cursor: selectedStore ? 'pointer' : 'default' }}
                    >
                      <Statistic
                        title="总订单数"
                        value={selectedStore ? dashboardData?.kpis.transactions || 0 : overviewData?.kpis.totalOrders || 0}
                        valueStyle={{ fontSize: '24px' }}
                        suffix="笔"
                      />
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {selectedStore && dashboardData ? (
                          <>
                            {`今日订单: ${dashboardData?.kpis.transactions || 0}笔`}
                            <div style={{ color: '#9254de', marginTop: '4px' }}>点击查看商品统计 →</div>
                          </>
                        ) : overviewData ? (
                          `${overviewData.kpis.ordersTrend?.vsYesterday > 0 ? '+' : ''}${overviewData.kpis.ordersTrend?.vsYesterday?.toFixed(1)}% vs 昨日`
                        ) : (
                          '今日订单'
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Alert
                  message="暂无数据"
                  description="请选择门店和时间范围，或检查网络连接"
                  type="info"
                  showIcon
                />
              </div>
            )
          },
          {
            key: 'sales-prediction',
            label: '销售预测',
            children: selectedStore ? (
              <SalesPredictionChart 
                storeId={parseInt(selectedStore)} 
                onStoreChange={(storeId) => setSelectedStore(storeId.toString())}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Alert
                  message="请先选择门店"
                  description="销售预测功能需要选择具体门店才能使用"
                  type="info"
                  showIcon
                />
              </div>
            )
          }
        ]}
      />

      {/* Toast通知 */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#52c41a',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {toastMessage}
        </div>
      )}
      
      {/* 统计详情模态框 */}
      <Modal
        title={
          <Space>
            {currentStatsType === 'hourly' && <ClockCircleOutlined />}
            {currentStatsType === 'payment' && <CreditCardOutlined />}
            {currentStatsType === 'product' && <BarChartOutlined />}
            {currentStatsType === 'hourly' ? '分时段统计详情' : 
             currentStatsType === 'payment' ? '支付方式统计详情' : '商品销售统计详情'}
          </Space>
        }
        open={statsModalVisible}
        onCancel={() => setStatsModalVisible(false)}
        width={800}
        footer={null}
      >
        <Tabs 
          defaultActiveKey="chart"
          items={[
            {
              key: 'chart',
              label: '图表视图',
              children: (
                <div style={{ height: '400px' }}>
                  {currentStatsType === 'hourly' && hourlyStats.length > 0 && (
                    <Bar
                      data={{
                        labels: hourlyStats.map(item => `${item.hour}:00`),
                        datasets: [
                          {
                            label: '订单数',
                            data: hourlyStats.map(item => item.orderCount),
                            backgroundColor: 'rgba(24, 144, 255, 0.6)',
                            borderColor: '#1890ff',
                            borderWidth: 1,
                          },
                          {
                            label: '销售额',
                            data: hourlyStats.map(item => item.totalSales),
                            backgroundColor: 'rgba(82, 196, 26, 0.6)',
                            borderColor: '#52c41a',
                            borderWidth: 1,
                            yAxisID: 'y1',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          mode: 'index' as const,
                          intersect: false,
                        },
                        scales: {
                          y: {
                            type: 'linear' as const,
                            display: true,
                            position: 'left' as const,
                            title: {
                              display: true,
                              text: '订单数',
                            },
                          },
                          y1: {
                            type: 'linear' as const,
                            display: true,
                            position: 'right' as const,
                            title: {
                              display: true,
                              text: '销售额 (¥)',
                            },
                            grid: {
                              drawOnChartArea: false,
                            },
                          },
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                if (context.datasetIndex === 0) {
                                  return `订单数: ${context.parsed.y}`;
                                } else {
                                  return `销售额: ¥${context.parsed.y.toFixed(2)}`;
                                }
                              },
                            },
                          },
                        },
                      }}
                    />
                  )}
                  
                  {currentStatsType === 'payment' && paymentStats.length > 0 && (
                    <Doughnut
                      data={{
                        labels: paymentStats.map(item => item.payMode),
                        datasets: [
                          {
                            data: paymentStats.map(item => item.totalSales),
                            backgroundColor: [
                              '#1890ff',
                              '#52c41a',
                              '#faad14',
                              '#ff4d4f',
                              '#722ed1',
                            ],
                            borderWidth: 2,
                            borderColor: '#fff',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const item = paymentStats[context.dataIndex];
                                return [
                                  `${context.label}: ¥${context.parsed.toFixed(2)}`,
                                  `订单数: ${item.orderCount}`,
                                  `客单价: ¥${item.avgSpend}`,
                                ];
                              },
                            },
                          },
                        },
                      }}
                    />
                  )}
                  
                  {currentStatsType === 'product' && productStats.length > 0 && (
                    <Bar
                      data={{
                        labels: productStats.map(item => item.goodsName),
                        datasets: [
                          {
                            label: '销售额',
                            data: productStats.map(item => item.totalSales),
                            backgroundColor: 'rgba(24, 144, 255, 0.6)',
                            borderColor: '#1890ff',
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: '销售额 (¥)',
                            },
                          },
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const item = productStats[context.dataIndex];
                                return [
                                  `销售额: ¥${context.parsed.y.toFixed(2)}`,
                                  `订单数: ${item.orderCount}`,
                                  `销量: ${item.totalQuantity}`,
                                ];
                              },
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              )
            },
            {
              key: 'table',
              label: '数据列表',
              children: (
                <div>
                  {currentStatsType === 'hourly' && (
                    <Table
                      dataSource={hourlyStats}
                      rowKey="hour"
                      columns={[
                        { title: '时段', dataIndex: 'hour', key: 'hour', render: (hour) => `${hour}:00` },
                        { title: '订单数', dataIndex: 'orderCount', key: 'orderCount' },
                        { title: '销售额', dataIndex: 'totalSales', key: 'totalSales', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
                        { title: '客单价', dataIndex: 'avgSpend', key: 'avgSpend', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
                        {
                          title: '操作',
                          key: 'action',
                          render: (_, record) => (
                            <Button 
                              type="link" 
                              size="small"
                              onClick={() => {
                                setStatsModalVisible(false);
                                handleStatItemClick('hourly', record.hour);
                              }}
                            >
                              查看订单
                            </Button>
                          ),
                        },
                      ]}
                      pagination={false}
                      size="small"
                    />
                  )}
                  
                  {currentStatsType === 'payment' && (
                    <Table
                      dataSource={paymentStats}
                      rowKey="payMode"
                      columns={[
                        { title: '支付方式', dataIndex: 'payMode', key: 'payMode' },
                        { title: '订单数', dataIndex: 'orderCount', key: 'orderCount' },
                        { title: '销售额', dataIndex: 'totalSales', key: 'totalSales', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
                        { title: '客单价', dataIndex: 'avgSpend', key: 'avgSpend', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
                        {
                          title: '操作',
                          key: 'action',
                          render: (_, record) => (
                            <Button 
                              type="link" 
                              size="small"
                              onClick={() => {
                                setStatsModalVisible(false);
                                handleStatItemClick('payment', record.payMode);
                              }}
                            >
                              查看订单
                            </Button>
                          ),
                        },
                      ]}
                      pagination={false}
                      size="small"
                    />
                  )}
                  
                  {currentStatsType === 'product' && (
                    <Table
                      dataSource={productStats}
                      rowKey="goodsName"
                      columns={[
                        { 
                          title: '商品名称', 
                          dataIndex: 'goodsName', 
                          key: 'goodsName',
                          render: (text: any) => typeof text === 'string' ? text : (text?.name || text?.goodsName || '未知商品')
                        },
                        { title: '订单数', dataIndex: 'orderCount', key: 'orderCount' },
                        { title: '销量', dataIndex: 'totalQuantity', key: 'totalQuantity' },
                        { title: '销售额', dataIndex: 'totalSales', key: 'totalSales', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
                        { title: '平均订单金额', dataIndex: 'avgOrderValue', key: 'avgOrderValue', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
                      ]}
                      pagination={false}
                      size="small"
                    />
                  )}
                </div>
              )
            }
          ]}
        />
      </Modal>

      {/* 订单列表模态框 */}
      <Modal
        title="订单列表"
        open={orderListVisible}
        onCancel={() => setOrderListVisible(false)}
        width={1000}
        footer={null}
      >
        <Table
          dataSource={orderList?.orders || []}
          columns={[
            { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
            { 
              title: '下单时间', 
              dataIndex: 'recordTime', 
              key: 'recordTime',
              render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
            },
            { title: '支付方式', dataIndex: 'payMode', key: 'payMode' },
            { title: '订单金额', dataIndex: 'totalAmount', key: 'totalAmount', render: (value) => `¥${value != null ? value.toFixed(2) : '0.00'}` },
            { title: '用户ID', dataIndex: 'openId', key: 'openId', render: (id) => id || '-' },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Button 
                  type="link" 
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleOrderDetailClick(record.id)}
                >
                  查看详情
                </Button>
              ),
            },
          ]}
          pagination={{
            current: orderList?.page || 1,
            pageSize: orderList?.pageSize || 20,
            total: orderList?.total || 0,
            onChange: handleOrderListPagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          size="small"
          scroll={{ x: 800 }}
        />
      </Modal>

      {/* 订单完整详情模态框 */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined />
            订单完整详情
          </Space>
        }
        open={orderFullDetailVisible}
        onCancel={() => setOrderFullDetailVisible(false)}
        width={1000}
        footer={null}
      >
        {orderFullDetail && (
          <div>
            {/* 订单基本信息 */}
            <Card 
              title="订单基本信息" 
              size="small" 
              style={{ marginBottom: '16px' }}
            >
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="订单号">{orderFullDetail.order.orderNo}</Descriptions.Item>
                <Descriptions.Item label="下单时间">
                  {dayjs(orderFullDetail.order.recordTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="支付方式">{orderFullDetail.order.payMode}</Descriptions.Item>
                <Descriptions.Item label="支付状态">
                  <Badge 
                    status={orderFullDetail.order.payState === 1 ? 'success' : orderFullDetail.order.payState === 2 ? 'processing' : 'default'} 
                    text={
                      orderFullDetail.order.payState === 1 ? '已支付' : 
                      orderFullDetail.order.payState === 2 ? '支付中' : '未支付'
                    } 
                  />
                </Descriptions.Item>
                <Descriptions.Item label="VIP金额">¥{orderFullDetail.order.vipAmount != null ? orderFullDetail.order.vipAmount.toFixed(2) : '0.00'}</Descriptions.Item>
                <Descriptions.Item label="VIP赠送金额">¥{orderFullDetail.order.vipAmountZengSong != null ? orderFullDetail.order.vipAmountZengSong.toFixed(2) : '0.00'}</Descriptions.Item>
                <Descriptions.Item label="现金金额">¥{orderFullDetail.order.cash != null ? orderFullDetail.order.cash.toFixed(2) : '0.00'}</Descriptions.Item>
                <Descriptions.Item label="其他金额">¥{orderFullDetail.order.total != null ? orderFullDetail.order.total.toFixed(2) : '0.00'}</Descriptions.Item>
                <Descriptions.Item label="订单总金额" span={2}>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    ¥{orderFullDetail.order.totalAmount != null ? orderFullDetail.order.totalAmount.toFixed(2) : '0.00'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="用户ID">{orderFullDetail.order.openId || '-'}</Descriptions.Item>
                <Descriptions.Item label="备注">{orderFullDetail.order.remark || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 订单商品详情 */}
            <Card 
              title={
                <Space>
                  <BarChartOutlined />
                  订单商品详情
                  <Tag color="blue">{orderFullDetail.goods.length} 件商品</Tag>
                </Space>
              } 
              size="small"
            >
              <Table
                dataSource={orderFullDetail.goods}
                rowKey="id"
                columns={[
                  { 
                    title: '商品名称', 
                    dataIndex: 'goodsName', 
                    key: 'goodsName',
                    render: (name, record) => (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{typeof name === 'string' ? name : (name?.name || name?.goodsName || '未知商品')}</div>
                        {record.goodsText && (
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {record.goodsText}
                          </div>
                        )}
                      </div>
                    )
                  },
                  { 
                    title: '分类', 
                    dataIndex: 'categoryName', 
                    key: 'categoryName',
                    render: (name) => <Tag color="green">{typeof name === 'string' ? name : (name?.name || name?.categoryName || '未知分类')}</Tag>
                  },
                  { 
                    title: '数量', 
                    dataIndex: 'goodsNumber', 
                    key: 'goodsNumber',
                    render: (number) => <Text strong>{number}</Text>
                  },
                  { 
                    title: '单价', 
                    dataIndex: 'goodsPrice', 
                    key: 'goodsPrice',
                    render: (price) => `¥${price != null ? price.toFixed(2) : '0.00'}`
                  },
                  { 
                    title: '小计', 
                    dataIndex: 'goodsTotal', 
                    key: 'goodsTotal',
                    render: (total) => <Text strong style={{ color: '#1890ff' }}>¥{total != null ? total.toFixed(2) : '0.00'}</Text>
                  },
                  { 
                    title: '优惠', 
                    dataIndex: 'discountAmount', 
                    key: 'discountAmount',
                    render: (discount) => discount > 0 ? (
                      <Text type="danger">-¥{discount != null ? discount.toFixed(2) : '0.00'}</Text>
                    ) : '-'
                  },
                  { 
                    title: '实收', 
                    dataIndex: 'realIncomeAmount', 
                    key: 'realIncomeAmount',
                    render: (real) => <Text strong style={{ color: '#52c41a' }}>¥{real != null ? real.toFixed(2) : '0.00'}</Text>
                  },
                  { 
                    title: '状态', 
                    key: 'status',
                    render: (_, record) => (
                      <div>
                        {record.isRefund === 1 ? (
                          <Tag color="red">已退款</Tag>
                        ) : (
                          <Tag color="green">正常</Tag>
                        )}
                        {record.isPackage === 1 && (
                          <Tag color="blue">套餐</Tag>
                        )}
                      </div>
                    )
                  },
                ]}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>总计</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong>
                        {orderFullDetail.goods.reduce((sum, item) => sum + item.goodsNumber, 0)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <Text strong style={{ color: '#1890ff' }}>
                        ¥{orderFullDetail.goods.reduce((sum, item) => sum + (item.goodsTotal || 0), 0).toFixed(2)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <Text type="danger">
                        -¥{orderFullDetail.goods.reduce((sum, item) => sum + (item.discountAmount || 0), 0).toFixed(2)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      <Text strong style={{ color: '#52c41a' }}>
                        ¥{orderFullDetail.goods.reduce((sum, item) => sum + (item.realIncomeAmount || item.goodsTotal || 0), 0).toFixed(2)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6}>-</Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* 成功提示 */}
      {toastMessage && (
        <Alert
          message={toastMessage}
          type="success"
          showIcon
          closable
          style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
};

export default Operations; 