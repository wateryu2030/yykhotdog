import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Modal, message, Space, Tag, Tooltip, Avatar, Badge } from 'antd';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from 'chart.js';
import { 
  EyeOutlined, 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  TrophyOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  BellOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import AIInsightsOverview from '../components/AIInsightsOverview';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const { RangePicker } = DatePicker;
const { Option } = Select;
const now = new Date();
const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

interface CustomerProfileData {
  total_stores: number;
  operating_stores: number;
  total_sales: number;
  total_orders: number;
  totalCustomers: number;
  activeCustomers: number;
  avgOrderValue: number;
  segments: Array<{
    segment_name: string;
    customer_count: number;
    avg_spend: number;
    avg_orders: number;
    total_revenue: number;
    lifetime_value_3y: number;
  }>;
  timeDistribution: Array<{
    hour: string;
    customer_count: number;
    order_count: number;
  }>;
  productPreferences: any[];
  aiSuggestions: any[];
}

interface City {
  name: string;
}

interface Store {
  id: number;
  store_name: string;
  store_code: string;
  city: string;
  district: string;
  province: string;
  status: string;
  store_type: string;
}

const CustomerProfile: React.FC = () => {
  const [data, setData] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [segmentDetailVisible, setSegmentDetailVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  
  // AI分析相关状态
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  // 1. 新增订单详情和订单详细信息的弹窗状态
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [customerOrdersVisible, setCustomerOrdersVisible] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersPagination, setOrdersPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  

  // 2. 获取客户订单
  const fetchCustomerOrders = async (customerId: string, page = 1, pageSize = 10) => {
    setCustomerOrders([]);
    setOrdersPagination(p => ({ ...p, current: page, pageSize }));
    try {
      const res = await api.get(`/customer-profile/customers/${customerId}/orders?page=${page}&pageSize=${pageSize}`);
      if (res.data.success) {
        setCustomerOrders(res.data.data.orders); // Fixed: access the orders array
        setOrdersPagination(p => ({ ...p, total: res.data.data.total }));
      }
    } catch (e) {
      message.error('获取客户订单失败');
    }
  };

  // 3. 获取订单详细信息
  const fetchOrderDetail = async (orderId: string) => {
    setOrderDetailLoading(true);
    try {
      const res = await api.get(`/customer-profile/orders/${orderId}`);
      if (res.data.success) {
        setOrderDetail(res.data.data);
        setOrderDetailVisible(true);
      }
    } catch (e) {
      message.error('获取订单详情失败');
    } finally {
      setOrderDetailLoading(false);
    }
  };

  // 4. 修改fetchSegmentCustomers支持分页
  const fetchSegmentCustomers = async (segment: string, page = 1, pageSize = 10, sortField?: string, sortOrder?: string) => {
    setSegmentLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('segment', segment);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('shop', selectedShopId);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      const response = await api.get(`/customer-profile/customers?${params.toString()}`);
      if (response.data.success) {
        setSegmentCustomers(response.data.data);
        setSegmentPagination({ current: page, pageSize, total: response.data.total });
      }
    } catch (error) {
      message.error('获取客户列表失败');
    } finally {
      setSegmentLoading(false);
    }
  };

  // 5. 客户详情分页状态
  const [segmentPagination, setSegmentPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  
  // 6. 排序状态
  const [sortState, setSortState] = useState<{ field?: string; order?: string }>({});

  // 7. 查看分层详情
  const handleViewSegmentDetail = (segment: string) => {
    setSelectedSegment(segment);
    setSegmentDetailVisible(true);
    fetchSegmentCustomers(segment, 1, segmentPagination.pageSize, sortState.field, sortState.order);
  };

  // 8. 处理表格排序变化
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const { field, order } = sorter;
    const sortField = field;
    const sortOrder = order === 'ascend' ? 'asc' : order === 'descend' ? 'desc' : undefined;
    setSortState({ field: sortField, order: sortOrder });
    fetchSegmentCustomers(selectedSegment, 1, segmentPagination.pageSize, sortField, sortOrder);
  };

  // 9. 获取AI分析
  const fetchAIAnalysis = async (segment: string) => {
    setAiAnalysisLoading(true);
    try {
      const response = await api.get(`/customer-profile/ai-segment-analysis?segment=${encodeURIComponent(segment)}`);
      if (response.data.success) {
        setAiAnalysisData(response.data.data);
        setAiAnalysisVisible(true);
      } else {
        message.error('获取AI分析失败');
      }
    } catch (error) {
      message.error('获取AI分析失败');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // 9. 客户详情表格列定义，客户ID可点击
  const customerColumns = [
    {
      title: '客户ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => text ? <a onClick={() => {
        setSelectedCustomerId(text);
        setCustomerOrdersVisible(true);
        fetchCustomerOrders(text, 1, 10);
      }}>{text}</a> : '-'
    },
    {
      title: '客户姓名',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text: string) => text || '-',
      sorter: true
    },
    {
      title: '手机号',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (text: string) => text || '-'
    },
    {
      title: '客户分群',
      dataIndex: 'segment_name',
      key: 'segment_name',
      render: (text: string) => text || '-'
    },
    {
      title: '订单数量',
      dataIndex: 'order_count',
      key: 'order_count',
      sorter: true
    },
    {
      title: '总消费',
      dataIndex: 'total_spent',
      key: 'total_spent',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: true
    },
    {
      title: '平均客单价',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: true
    },
    {
      title: '首次购买',
      dataIndex: 'first_order_date',
      key: 'first_order_date',
      render: (text: string) => text ? new Date(text).toLocaleDateString() : '-',
      sorter: true
    },
    {
      title: '最后购买',
      dataIndex: 'last_order_date',
      key: 'last_order_date',
      render: (text: string) => text ? new Date(text).toLocaleDateString() : '-',
      sorter: true
    }
  ];

  // 8. 订单表格列定义，订单号可点击
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_id', // Changed from 'order_no' to 'order_id'
      key: 'order_id',
      render: (text: string) => <a onClick={() => fetchOrderDetail(text)}>{text}</a>
    },
    { 
      title: '下单时间', 
      dataIndex: 'order_date', 
      key: 'order_date',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: '金额', 
      dataIndex: 'total_amount', 
      key: 'total_amount', 
      render: (v: number) => `¥${v != null ? v.toFixed(2) : '0.00'}` 
    },
    { 
      title: '支付状态', 
      dataIndex: 'pay_state', 
      key: 'pay_state',
      render: (state: number) => {
        if (state === 1 || state === 2 || state === 3) {
          return <span style={{ color: '#52c41a' }}>已支付</span>;
        } else {
          return <span style={{ color: '#ff4d4f' }}>未支付</span>;
        }
      }
    },
    { 
      title: '门店名称', 
      dataIndex: 'shop_name', 
      key: 'shop_name',
      render: (text: string) => text || '未知门店'
    }
  ];

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

  // 获取指定城市下的门店列表
  const fetchStoresByCity = async (city: string) => {
    try {
      const response = await api.get(`/customer-profile/stores/by-city-name/${encodeURIComponent(city)}`);
      if (response.data.success) {
        setStores(response.data.data);
      }
    } catch (error) {
      console.error('获取门店列表失败:', error);
    }
  };

  // 获取所有门店列表（用于订单列表显示门店名称）
  const fetchAllStores = async () => {
    try {
      const response = await api.get('/customer-profile/stores');
      if (response.data.success) {
        setStores(response.data.data);
      }
    } catch (error) {
      console.error('获取所有门店列表失败:', error);
    }
  };

  // 获取客户画像数据
  const fetchCustomerProfileData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('shopId', selectedShopId);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }

      const response = await api.get(`/customer-profile/dashboard?${params.toString()}`);
      if (response.data.success) {
        setData(response.data.data);
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      console.error('获取客户画像数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 城市选择变化
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedShopId(''); // 清空门店选择
    setStores([]); // 清空门店列表
    if (city) {
      fetchStoresByCity(city);
    }
    // 自动刷新数据，应用城市筛选
    setTimeout(() => {
      fetchCustomerProfileData();
    }, 100);
  };

  // 门店选择变化
  const handleStoreChange = (shopId: string) => {
    setSelectedShopId(shopId);
    setCustomerOrdersVisible(false); // 关闭订单弹窗
    setSelectedCustomerId(''); // 清空客户ID
    setCustomerOrders([]); // 清空订单列表
    setOrdersPagination({ current: 1, pageSize: 10, total: 0 }); // 重置订单分页
    setOrderDetail(null); // 清空订单详情
    setOrderDetailVisible(false); // 关闭订单详情弹窗
    setOrderDetailLoading(false); // 重置订单详情加载状态
    // 自动刷新数据，应用门店筛选
    setTimeout(() => {
      fetchCustomerProfileData();
    }, 100);
  };

  // 查询按钮点击
  const handleQuery = () => {
    fetchCustomerProfileData();
  };

  // 重置按钮点击
  const handleReset = () => {
    setSelectedCity('');
    setSelectedShopId('');
    setDateRange(null);
    setStores([]);
    fetchCustomerProfileData();
  };

  useEffect(() => {
    fetchCities();
    fetchAllStores(); // 获取所有门店列表
    fetchCustomerProfileData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  if (!data || !data.totalCustomers) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>暂无数据</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '20px 24px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '12px', 
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TeamOutlined style={{ fontSize: 32, color: '#fff', marginRight: 12 }} />
          <span style={{ fontWeight: 'bold', fontSize: 28, color: '#fff' }}>客群画像</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={() => setAiAnalysisVisible(true)}
            style={{ marginRight: 16 }}
          >
            AI洞察
          </Button>
          <span style={{ fontSize: 16, color: '#fff', marginRight: 16 }}>{timeStr} {dateStr}</span>
          <Badge count={1} size="small" style={{ marginRight: 16 }}>
            <BellOutlined style={{ fontSize: 20, color: '#fff' }} />
          </Badge>
          <Avatar style={{ backgroundColor: '#87d068', marginRight: 8 }} icon={<UserOutlined />} />
          <span style={{ color: '#fff' }}>管理员</span>
        </div>
      </div>

      {/* 过滤条件 */}
      <Card 
        style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        styles={{
          body: { padding: '24px' }
        }}
      >
        <Row gutter={24} align="middle">
          <Col span={6}>
            <div style={{ marginBottom: '8px', fontWeight: '500', color: '#333' }}>城市:</div>
            <Select
              placeholder="选择城市"
              value={selectedCity}
              onChange={handleCityChange}
              style={{ width: '100%' }}
              allowClear
              size="large"
            >
              {cities.map(city => (
                <Option key={city.name} value={city.name}>
                  {city.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: '8px', fontWeight: '500', color: '#333' }}>门店:</div>
            <Select
              placeholder="选择门店"
              value={selectedShopId}
              onChange={handleStoreChange}
              style={{ width: '100%' }}
              allowClear
              disabled={!selectedCity}
              size="large"
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id.toString()}>
                  {store.store_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: '8px', fontWeight: '500', color: '#333' }}>时间范围:</div>
            <RangePicker
              style={{ width: '100%' }}
              size="large"
              onChange={(dates) => {
                if (dates) {
                  setDateRange([
                    dates[0]?.format('YYYY-MM-DD') || '',
                    dates[1]?.format('YYYY-MM-DD') || ''
                  ]);
                  // 自动刷新数据，应用时间筛选
                  setTimeout(() => {
                    fetchCustomerProfileData();
                  }, 100);
                } else {
                  setDateRange(null);
                  // 自动刷新数据，清除时间筛选
                  setTimeout(() => {
                    fetchCustomerProfileData();
                  }, 100);
                }
              }}
            />
          </Col>
          <Col span={4}>
            <Button type="primary" onClick={handleQuery} size="large" style={{ marginRight: '8px', width: '100%', marginBottom: '8px' }}>
              查询
            </Button>
            <Button onClick={handleReset} size="large" style={{ marginRight: '8px', width: '100%', marginBottom: '8px' }}>
              重置
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={async () => {
                console.log('点击了数据同步按钮');
                try {
                  message.loading({ content: '正在同步数据...', key: 'sync' });
                  console.log('即将发起POST /customer-profile/sync');
                  const res = await api.post('/customer-profile/sync');
                  console.log('POST /customer-profile/sync响应:', res);
                  if (res.data.success) {
                    message.success({ content: '数据同步成功', key: 'sync' });
                    fetchCustomerProfileData();
                  } else {
                    message.error({ content: res.data.message || '同步失败', key: 'sync' });
                  }
                } catch (err) {
                  console.log('POST /customer-profile/sync异常:', err);
                  message.error({ content: '同步失败', key: 'sync' });
                }
              }}
              style={{ width: '100%' }}
            >
              数据同步
            </Button>
          </Col>
        </Row>
        
        {/* 显示当前过滤条件 */}
        {(selectedCity || selectedShopId || dateRange) && (
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            backgroundColor: '#f0f8ff', 
            borderRadius: '8px',
            border: '1px solid #d6e4ff'
          }}>
            <strong style={{ color: '#1890ff' }}>当前过滤条件:</strong>
            {selectedCity && <Tag color="blue" style={{ marginLeft: '8px', borderRadius: '4px' }}>城市: {selectedCity}</Tag>}
            {selectedShopId && <Tag color="green" style={{ marginLeft: '8px', borderRadius: '4px' }}>门店: {(() => {
              const foundStore = stores?.find(s => s.id.toString() === selectedShopId);
              return foundStore ? foundStore.store_name : selectedShopId;
            })()}</Tag>}
            {dateRange && (
              <Tag color="orange" style={{ marginLeft: '8px', borderRadius: '4px' }}>
                时间: {dateRange[0]} 至 {dateRange[1]}
              </Tag>
            )}
          </div>
        )}
      </Card>

      {/* KPI卡片 */}
      <Row gutter={20} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={
                <span style={{ fontSize: '16px', fontWeight: '500' }}>
                  总客户数
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<EyeOutlined />}
                    onClick={() => handleViewSegmentDetail('all')}
                    style={{ marginLeft: '8px' }}
                  >
                    查看详情
                  </Button>
                </span>
              }
              value={data.totalCustomers}
              prefix={<UserOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={<span style={{ fontSize: '16px', fontWeight: '500' }}>活跃客户数</span>}
              value={data.totalCustomers}
              prefix={<ShoppingCartOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={
                <Space>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>平均客单价</span>
                  <Tooltip title="计算公式：总消费金额 ÷ 总订单数 = 仪表盘显示的总消费金额 ÷ 总订单数，统计口径为所有订单（含匿名）">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
              value={data.avgOrderValue}
              precision={2}
              suffix="元"
              prefix={<DollarOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={
                <Space>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>客户生命周期价值</span>
                  <Tooltip title={`客户生命周期价值（CLV）衡量客户在整个合作周期内为企业带来的总价值。\n\n计算方法：\nCLV = 平均每次购买金额 × 年购买频率 × 3年\n\n年购买频率 = 总订单数 ÷ 客户活跃天数 × 365天\n\n本系统基于各类客户的实际购买行为计算3年生命周期价值，\n核心客户：${(data.segments?.find(s => s.segment_name === '核心客户')?.lifetime_value_3y || 0).toFixed(2)}元\n活跃客户：${(data.segments?.find(s => s.segment_name === '活跃客户')?.lifetime_value_3y || 0).toFixed(2)}元\n机会客户：${(data.segments?.find(s => s.segment_name === '机会客户')?.lifetime_value_3y || 0).toFixed(2)}元\n沉睡/新客户：${(data.segments?.find(s => s.segment_name === '沉睡/新客户')?.lifetime_value_3y || 0).toFixed(2)}元`}> 
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
              value={(() => {
                // 计算加权平均的生命周期价值
                const totalCustomers = data.totalCustomers || 0;
                const weightedCLV = data.segments?.reduce((sum, segment) => {
                  return sum + (segment.lifetime_value_3y || 0) * (segment.customer_count / totalCustomers);
                }, 0) || 0;
                return weightedCLV || data.avgOrderValue;
              })()}
              precision={2}
              suffix="元"
              prefix={<TrophyOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* AI洞察快速概览 */}
      <Row gutter={20} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <AIInsightsOverview onViewDetails={() => setAiAnalysisVisible(true)} />
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={20}>
        <Col span={12}>
          <Card 
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                客户分层分布
                {(selectedCity || selectedShopId || dateRange) && (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    已过滤
                  </Tag>
                )}
              </span>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <Table
                dataSource={data.segments?.map((item, idx) => ({ ...item, key: item.segment_name || idx })) || []}
                columns={[
                  {
                    title: '客户分层',
                    dataIndex: 'segment_name',
                    key: 'segment_name',
                    render: (text: string) => {
                      const colorMap: { [key: string]: string } = {
                        '核心客户': '#52c41a',
                        '活跃客户': '#1890ff',
                        '机会客户': '#faad14',
                        '沉睡/新客户': '#ff4d4f'
                      };
                      return <Tag color={colorMap[text] || '#d9d9d9'} style={{ borderRadius: '4px', fontWeight: '500' }}>{text}</Tag>;
                    }
                  },
                  {
                    title: '客户数量',
                    dataIndex: 'customer_count',
                    key: 'customer_count',
                    render: (value: number) => value?.toLocaleString() || '0'
                  },
                  {
                    title: '占比',
                    key: 'percentage',
                    render: (_, record) => `${((record.customer_count / data.totalCustomers) * 100).toFixed(1)}%`
                  },
                  {
                    title: '平均消费',
                    dataIndex: 'avg_spend',
                    key: 'avg_spend',
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '平均订单数',
                    dataIndex: 'avg_orders',
                    key: 'avg_orders',
                    render: (value: number) => value?.toFixed(1) || '0'
                  },
                  {
                    title: '总消费',
                    dataIndex: 'total_revenue',
                    key: 'total_revenue',
                    render: (value: number) => `¥${value?.toLocaleString() || '0'}`
                  },
                  {
                    title: '3年生命周期价值',
                    dataIndex: 'lifetime_value_3y',
                    key: 'lifetime_value_3y',
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_, record) => (
                      <Space>
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={() => handleViewSegmentDetail(record.segment_name)}
                          style={{ padding: '4px 8px' }}
                        >
                          查看详情
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<BellOutlined />}
                          onClick={() => fetchAIAnalysis(record.segment_name)}
                          loading={aiAnalysisLoading}
                          style={{ padding: '4px 8px' }}
                        >
                          AI分析
                        </Button>
                      </Space>
                    )
                  }
                ]}
                pagination={false}
                size="small"
                style={{ borderRadius: '8px' }}
              />
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                客户购买时间分布
                {(selectedCity || selectedShopId || dateRange) && (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    已过滤
                  </Tag>
                )}
              </span>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Bar
              data={{
                labels: data.timeDistribution?.map(item => `${item.hour}:00`) || [],
                datasets: [
                  {
                    label: '订单数量',
                    data: data.timeDistribution?.map(item => item.order_count) || [],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    yAxisID: 'y'
                  },
                  {
                    label: '客户数量',
                    data: data.timeDistribution?.map(item => item.customer_count) || [],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index' as const,
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 12,
                        weight: 'bold'
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    display: true,
                    title: {
                      display: true,
                      text: '时间',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    grid: {
                      color: 'rgba(0,0,0,0.1)'
                    }
                  },
                  y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: {
                      display: true,
                      text: '订单数量',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    grid: {
                      color: 'rgba(0,0,0,0.1)'
                    }
                  },
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: {
                      display: true,
                      text: '客户数量',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  }
                }
              }}
              style={{ height: '300px' }}
            />
          </Card>
        </Col>
      </Row>


      {/* 客户分层详情模态框 */}
      <Modal
        title={`${selectedSegment}客户详情`}
        open={segmentDetailVisible}
        onCancel={() => setSegmentDetailVisible(false)}
        width={1200}
        footer={null}
      >
        <Table
          columns={customerColumns}
          dataSource={segmentCustomers}
          loading={segmentLoading}
          rowKey="id"
          pagination={{
            current: segmentPagination.current,
            pageSize: segmentPagination.pageSize,
            total: segmentPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => fetchSegmentCustomers(selectedSegment, page, pageSize, sortState.field, sortState.order),
            onShowSizeChange: (current, size) => fetchSegmentCustomers(selectedSegment, current, size, sortState.field, sortState.order),
          }}
          onChange={handleTableChange}
        />
      </Modal>

      {/* 客户订单弹窗 */}
      <Modal
        title={`客户 ${selectedCustomerId} 的订单`}
        open={customerOrdersVisible}
        onCancel={() => setCustomerOrdersVisible(false)}
        width={900}
        footer={null}
      >
        <Table
          columns={orderColumns}
          dataSource={customerOrders}
          rowKey="order_id"
          pagination={{
            current: ordersPagination.current,
            pageSize: ordersPagination.pageSize,
            total: ordersPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条订单`,
            onChange: (page, pageSize) => fetchCustomerOrders(selectedCustomerId, page, pageSize)
          }}
        />
      </Modal>

      {/* AI分析弹窗 */}
      <Modal
        title={`${aiAnalysisData?.segment_data?.segment || '客户'}AI分析报告`}
        open={aiAnalysisVisible}
        onCancel={() => setAiAnalysisVisible(false)}
        width={1000}
        footer={null}
      >
        {aiAnalysisLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>AI分析生成中，请稍候...</div>
          </div>
        ) : aiAnalysisData ? (
          <div>
            {/* 客户分层数据概览 */}
            <Card title="客户分层数据概览" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="客户数量"
                    value={aiAnalysisData.segment_data.customer_count}
                    suffix="人"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均消费"
                    value={aiAnalysisData.segment_data.avg_spend}
                    precision={2}
                    prefix="¥"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均订单数"
                    value={aiAnalysisData.segment_data.avg_orders}
                    precision={1}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总消费"
                    value={aiAnalysisData.segment_data.total_revenue}
                    precision={0}
                    prefix="¥"
                  />
                </Col>
              </Row>
            </Card>

            {/* AI分析结果 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="客户特征分析" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData.ai_analysis.characteristics.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>{item}</li>
                    ))}
                  </ul>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="营销建议" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData.ai_analysis.marketing_suggestions.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Tag color="blue">{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card title="风险因素" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData.ai_analysis.risk_factors.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Tag color="red">{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="发展机会" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData.ai_analysis.opportunities.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Tag color="green">{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Col>
            </Row>

            {/* 产品偏好分析 */}
            {aiAnalysisData.segment_data.product_preferences && aiAnalysisData.segment_data.product_preferences.length > 0 && (
              <Card title="产品偏好分析">
                <Table
                  dataSource={aiAnalysisData.segment_data.product_preferences}
                  rowKey="goods_name"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '商品名称',
                      dataIndex: 'goods_name',
                      key: 'goods_name',
                    },
                    {
                      title: '购买次数',
                      dataIndex: 'purchase_count',
                      key: 'purchase_count',
                    },
                    {
                      title: '总金额',
                      dataIndex: 'total_amount',
                      key: 'total_amount',
                      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                    },
                    {
                      title: '平均价格',
                      dataIndex: 'avg_price',
                      key: 'avg_price',
                      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                    }
                  ]}
                />
              </Card>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无AI分析数据
          </div>
        )}
      </Modal>

      {/* 订单详细信息弹窗 */}
      <Modal
        title={`订单详情`}
        open={orderDetailVisible}
        onCancel={() => setOrderDetailVisible(false)}
        width={1000}
        footer={null}
      >
        {orderDetailLoading ? <div>加载中...</div> : orderDetail ? (
          <div>
            <h4>订单基本信息</h4>
            <div style={{ marginBottom: 20 }}>
              <p><strong>订单号：</strong>{orderDetail.order_id}</p>
              <p><strong>订单编号：</strong>{orderDetail.order_no}</p>
              <p><strong>下单时间：</strong>{orderDetail.order_date ? new Date(orderDetail.order_date).toLocaleString() : '-'}</p>
              <p><strong>金额：</strong>¥{orderDetail.total_amount?.toFixed(2) || '0.00'}</p>
              <p><strong>支付状态：</strong>{orderDetail.pay_state}</p>
              <p><strong>门店名称：</strong>{orderDetail.shop_name || '未知门店'}</p>
              <p><strong>客户ID：</strong>{orderDetail.customer_id}</p>
              <p><strong>客户名：</strong>{orderDetail.customer_name || '-'}</p>
              <p><strong>手机号：</strong>{orderDetail.phone || '-'}</p>
              <p><strong>创建时间：</strong>{orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleString() : '-'}</p>
            </div>
            
            <h4>商品明细 ({orderDetail.goods ? orderDetail.goods.length : 0} 件商品)</h4>
            {orderDetail.goods && orderDetail.goods.length > 0 ? (
              <Table
                dataSource={orderDetail.goods}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '商品名称',
                    dataIndex: 'goods_name',
                    key: 'goods_name',
                    width: 200,
                    render: (text: any) => text || '-'
                  },
                  {
                    title: '数量',
                    dataIndex: 'goods_number',
                    key: 'goods_number',
                    width: 80,
                    render: (value: number) => value || 0
                  },
                  {
                    title: '单价',
                    dataIndex: 'goods_price',
                    key: 'goods_price',
                    width: 100,
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '小计',
                    dataIndex: 'total_price',
                    key: 'total_price',
                    width: 100,
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '分类',
                    dataIndex: 'category',
                    key: 'category',
                    width: 120,
                    render: (text: any) => text || '-'
                  },
                  {
                    title: '优惠金额',
                    dataIndex: 'discount_amount',
                    key: 'discount_amount',
                    width: 100,
                    render: (value: number) => value ? `¥${value.toFixed(2)}` : '-'
                  },
                  {
                    title: '退款金额',
                    dataIndex: 'refund_amount',
                    key: 'refund_amount',
                    width: 100,
                    render: (value: number) => value ? `¥${value.toFixed(2)}` : '-'
                  }
                ]}
                scroll={{ x: 800 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                该订单暂无商品明细数据
              </div>
            )}
          </div>
        ) : <div>暂无数据</div>}
      </Modal>
    </div>
  );
};

export default CustomerProfile; 