// 商品画像模块主入口

import React, { useState, useEffect } from 'react';
import { Card, Tabs, Select, DatePicker, Button, Space, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import { 
  ShoppingOutlined, 
  BarChartOutlined, 
  LineChartOutlined, 
  RobotOutlined,
  SettingOutlined,
  FilterOutlined,
  DollarOutlined,
  PieChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import ProductOverview from './components/ProductOverview';
import ProductCategories from './components/ProductCategories';
import SalesAnalysis from './components/SalesAnalysis';
import ProfitAnalysis from './components/ProfitAnalysis';
import AIInsights from './components/AIInsights';
import ComparisonAnalysis from './components/ComparisonAnalysis';
import SettingsManagement from './components/SettingsManagement';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 筛选条件组件
const FilterPanel: React.FC<{
  filters: any;
  onFiltersChange: (filters: any) => void;
}> = ({ filters, onFiltersChange }) => {
  const [cities, setCities] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    // 获取城市列表
    fetch('http://localhost:3001/api/customer-profile/cities')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCities(data.data || []);
        }
      })
      .catch(err => console.error('获取城市列表失败:', err));

    // 获取门店列表
    fetch('http://localhost:3001/api/customer-profile/stores')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStores(data.data || []);
        }
      })
      .catch(err => console.error('获取门店列表失败:', err));
  }, []);

  const handleCityChange = (value: string) => {
    // 切换城市时清除门店选择
    onFiltersChange({ ...filters, city: value, shopId: '' });
  };

  const handleStoreChange = (value: string) => {
    onFiltersChange({ ...filters, shopId: value });
  };

  // 根据选择的城市过滤门店列表
  const filteredStores = stores.filter(store => {
    if (!filters.city) return true;
    return store.city === filters.city;
  });

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      onFiltersChange({
        ...filters,
        dateRange: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
      });
    } else {
      onFiltersChange({ ...filters, dateRange: null });
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={16} align="middle">
        <Col xs={24} sm={8} md={6}>
          <Select
            placeholder="选择城市"
            value={filters.city}
            onChange={handleCityChange}
            style={{ width: '100%' }}
            allowClear
          >
            {cities.map(city => (
              <Option key={city.name} value={city.name}>
                {city.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Select
            placeholder="选择门店"
            value={filters.shopId}
            onChange={handleStoreChange}
            style={{ width: '100%' }}
            allowClear
            disabled={!filters.city}
          >
            {filteredStores.map(store => (
              <Option key={store.id} value={store.id}>
                {store.store_name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={8} md={6}>
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
        <Col xs={24} sm={24} md={6}>
          <Space>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => message.info('高级筛选功能开发中...')}
            >
              高级筛选
            </Button>
            <Button 
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => message.info('AI分析功能开发中...')}
            >
              AI分析
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

// 主内容组件
const ProductProfileContent: React.FC = () => {
  const [filters, setFilters] = useState({
    city: '',
    shopId: '',
    dateRange: null as [string, string] | null
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [filterVisible, setFilterVisible] = useState(false);

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          商品概览
        </span>
      ),
      children: <ProductOverview filters={filters} />
    },
    {
      key: 'categories',
      label: (
        <span>
          <PieChartOutlined />
          商品分类
        </span>
      ),
      children: <ProductCategories filters={filters} />
    },
    {
      key: 'sales',
      label: (
        <span>
          <LineChartOutlined />
          销售分析
        </span>
      ),
      children: <SalesAnalysis filters={filters} />
    },
    {
      key: 'profit',
      label: (
        <span>
          <DollarOutlined />
          利润分析
        </span>
      ),
      children: <ProfitAnalysis filters={filters} />
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
      {/* 页面头部 - 紧凑设计 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '12px 20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '8px', 
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ShoppingOutlined style={{ fontSize: 24, color: '#fff' }} />
          <span style={{ fontWeight: 'bold', fontSize: 20, color: '#fff' }}>商品画像</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            {new Date().toLocaleString('zh-CN')}
          </span>
        </div>
        <Space>
          <Button 
            icon={<FilterOutlined />}
            onClick={() => setFilterVisible(!filterVisible)}
            type={filterVisible ? 'primary' : 'default'}
          >
            {filterVisible ? '收起筛选' : '展开筛选'}
          </Button>
        </Space>
      </div>

      {/* 可折叠的筛选条件 */}
      {filterVisible && (
        <Card style={{ marginBottom: 16 }} size="small">
          <FilterPanel filters={filters} onFiltersChange={setFilters} />
        </Card>
      )}

      {/* 核心内容区 - 默认显示全局对比 */}
      <Row gutter={16}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                <span>城市与门店对比</span>
                <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal' }}>
                  (全局数据，不受筛选影响)
                </span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <ComparisonAnalysis />
          </Card>
        </Col>
      </Row>

      {/* 详细信息选项卡 */}
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
const ProductProfile: React.FC = () => {
  return <ProductProfileContent />;
};

export default ProductProfile;
