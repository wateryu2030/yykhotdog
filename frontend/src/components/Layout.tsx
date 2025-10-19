import React, { useState } from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  BarChartOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  LineChartOutlined,
  TeamOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
  RobotOutlined
} from '@ant-design/icons';

  const { Sider, Content } = AntLayout;

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/site-selection',
      icon: <EnvironmentOutlined />,
      label: '选店模块',
    },
    {
      key: '/new-site-selection',
      icon: <EnvironmentOutlined />,
      label: '智能选店',
    },
    {
      key: '/store-opening',
      icon: <ShopOutlined />,
      label: '开店模块',
    },
    {
      key: '/operations',
      icon: <BarChartOutlined />,
      label: '运营模块',
    },
    {
      key: '/sales-comparison',
      icon: <LineChartOutlined />,
      label: '销售对比分析',
    },
    {
      key: '/allocation',
      icon: <DollarOutlined />,
      label: '分配模块',
    },
    {
      key: '/customer-profile',
      icon: <TeamOutlined />,
      label: '客群画像',
    },
    {
      key: '/product-profile',
      icon: <ShoppingOutlined />,
      label: '商品画像',
    },
    {
      key: '/city-profile',
      icon: <EnvironmentOutlined />,
      label: '城市画像',
    },
    {
      key: '/customer-compare',
      icon: <TeamOutlined />,
      label: '客户对比分析',
    },
    {
      key: '/etl-management',
      icon: <DatabaseOutlined />,
      label: 'ETL数据同步',
    },
    {
      key: '/ai-insights',
      icon: <RobotOutlined />,
      label: 'AI智能洞察',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {collapsed ? '咬' : '咬一口纯佑'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Content style={{ 
          margin: '24px 16px',
          padding: 24,
          background: '#fff',
          borderRadius: 6,
          minHeight: 280
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout; 