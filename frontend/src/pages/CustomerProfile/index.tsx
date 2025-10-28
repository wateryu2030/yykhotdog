// 客群画像模块主入口

import React, { useState, useEffect } from 'react';
import { Card, Tabs, Select, DatePicker, Button, Space, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import { 
  TeamOutlined, 
  BarChartOutlined, 
  LineChartOutlined, 
  RobotOutlined,
  SettingOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { CustomerProfileProvider, useCustomerProfile } from './hooks/useCustomerProfile';
import OverviewDashboard from './components/OverviewDashboard';
import CustomerSegmentation from './components/CustomerSegmentation';
import BehaviorAnalysis from './components/BehaviorAnalysis';
import AIInsights from './components/AIInsights';
import SettingsManagement from './components/SettingsManagement';
import { CustomerProfileService } from './services/customerService';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 筛选条件组件
const FilterPanel: React.FC = () => {
  const { filters, actions } = useCustomerProfile();
  const [cities, setCities] = useState<Array<{id: string, name: string}>>([]);
  const [stores, setStores] = useState<Array<{id: string, store_name: string}>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (filters.city) {
      loadStores(filters.city);
    }
  }, [filters.city]);

  const loadCities = async () => {
    try {
      const data = await CustomerProfileService.getCities();
      setCities(data);
    } catch (error) {
      message.error('获取城市列表失败');
    }
  };

  const loadStores = async (cityName: string) => {
    try {
      setLoading(true);
      const data = await CustomerProfileService.getStores(cityName);
      setStores(data);
    } catch (error) {
      message.error('获取门店列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    actions.updateFilters({ [key]: value });
  };

  const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
    actions.updateFilters({ dateRange: dateStrings });
  };

  const handleReset = () => {
    actions.resetFilters();
    setStores([]);
  };

  return (
    <Card 
      title={
        <Space>
          <FilterOutlined />
          筛选条件
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} lg={6}>
          <Select
            placeholder="选择城市"
            value={filters.city}
            onChange={(value) => handleFilterChange('city', value)}
            style={{ width: '100%' }}
            allowClear
          >
            {cities.map(city => (
              <Option key={city.id} value={city.name}>
                {city.name}
              </Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Select
            placeholder="选择门店"
            value={filters.storeId}
            onChange={(value) => handleFilterChange('storeId', value)}
            style={{ width: '100%' }}
            loading={loading}
            disabled={!filters.city}
            allowClear
          >
            {stores.map(store => (
              <Option key={store.id} value={store.id}>
                {store.store_name}
              </Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            value={filters.dateRange ? [
              dayjs(filters.dateRange[0]),
              dayjs(filters.dateRange[1])
            ] : null}
            onChange={handleDateRangeChange}
            style={{ width: '100%' }}
          />
        </Col>
        
        <Col xs={24} sm={12} lg={4}>
          <Space>
            <Button onClick={handleReset}>重置</Button>
            <Button type="primary">应用筛选</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

// 主内容组件
const CustomerProfileContent: React.FC = () => {
  const { filters, ui, actions } = useCustomerProfile();
  const [activeTab, setActiveTab] = useState('overview');

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <TeamOutlined />
          概览仪表板
        </span>
      ),
      children: <OverviewDashboard />
    },
    {
      key: 'segmentation',
      label: (
        <span>
          <BarChartOutlined />
          客户分层
        </span>
      ),
      children: <CustomerSegmentation />
    },
    {
      key: 'behavior',
      label: (
        <span>
          <LineChartOutlined />
          行为分析
        </span>
      ),
      children: <BehaviorAnalysis filters={filters} />
    },
    {
      key: 'ai-insights',
      label: (
        <span>
          <RobotOutlined />
          AI洞察
        </span>
      ),
      children: <AIInsights filters={filters} />
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          设置管理
        </span>
      ),
      children: <SettingsManagement />
    }
  ];

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
        <div style={{ color: '#fff', fontSize: 16 }}>
          {new Date().toLocaleString('zh-CN')}
        </div>
      </div>

      {/* 筛选条件 */}
      <FilterPanel />

      {/* 主要内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

// 主组件
const CustomerProfile: React.FC = () => {
  return (
    <CustomerProfileProvider>
      <CustomerProfileContent />
    </CustomerProfileProvider>
  );
};

export default CustomerProfile;
