import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Drawer, List, Avatar, Badge, Space, Typography, Divider } from 'antd';
import { 
  MobileOutlined, 
  DesktopOutlined, 
  TabletOutlined,
  MenuOutlined,
  BellOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { Title: AntTitle, Text } = Typography;

interface ResponsiveDashboardProps {
  isMobile?: boolean;
  isTablet?: boolean;
}

const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({ 
  isMobile = false, 
  isTablet = false 
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: '新订单', content: '客户C001下单热狗套餐', time: '2分钟前', type: 'order' },
    { id: 2, title: '库存预警', content: '热狗面包库存不足', time: '5分钟前', type: 'warning' },
    { id: 3, title: '销售报告', content: '今日销售额突破1000元', time: '10分钟前', type: 'success' },
  ]);

  // 响应式布局配置
  const getResponsiveConfig = () => {
    if (isMobile) {
      return {
        span: 24,
        gutter: [8, 8],
        chartHeight: 200,
        cardPadding: 12,
        fontSize: '14px'
      };
    } else if (isTablet) {
      return {
        span: 12,
        gutter: [16, 16],
        chartHeight: 250,
        cardPadding: 16,
        fontSize: '16px'
      };
    } else {
      return {
        span: 6,
        gutter: [24, 24],
        chartHeight: 300,
        cardPadding: 24,
        fontSize: '18px'
      };
    }
  };

  const config = getResponsiveConfig();

  // 模拟数据
  const salesData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: '销售额',
        data: [120, 190, 300, 500, 200, 300],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  const productData = {
    labels: ['热狗', '套餐', '饮料', '小食'],
    datasets: [
      {
        label: '销量',
        data: [65, 59, 80, 81],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'top',
        labels: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'right',
        labels: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      }
    }
  };

  return (
    <div style={{ padding: isMobile ? 8 : 24 }}>
      {/* 移动端顶部导航 */}
      {isMobile && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 16,
          padding: '8px 0'
        }}>
          <Button 
            type="text" 
            icon={<MenuOutlined />} 
            onClick={() => setDrawerVisible(true)}
            style={{ fontSize: '18px' }}
          />
          <AntTitle level={4} style={{ margin: 0, fontSize: '18px' }}>
            热狗管理平台
          </AntTitle>
          <Badge count={notifications.length}>
            <Button 
              type="text" 
              icon={<BellOutlined />} 
              style={{ fontSize: '18px' }}
            />
          </Badge>
        </div>
      )}

      {/* 核心指标卡片 */}
      <Row gutter={config.gutter as [number, number]}>
        <Col span={config.span}>
          <Card 
            size={isMobile ? 'small' : 'default'}
            style={{ textAlign: 'center' }}
          >
            <Statistic
              title="今日销售额"
              value={1128}
              prefix={<DollarOutlined />}
              valueStyle={{ 
                color: '#3f8600', 
                fontSize: isMobile ? '20px' : '24px' 
              }}
            />
          </Card>
        </Col>
        <Col span={config.span}>
          <Card 
            size={isMobile ? 'small' : 'default'}
            style={{ textAlign: 'center' }}
          >
            <Statistic
              title="订单数量"
              value={93}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ 
                color: '#1890ff', 
                fontSize: isMobile ? '20px' : '24px' 
              }}
            />
          </Card>
        </Col>
        <Col span={config.span}>
          <Card 
            size={isMobile ? 'small' : 'default'}
            style={{ textAlign: 'center' }}
          >
            <Statistic
              title="活跃客户"
              value={45}
              prefix={<UserOutlined />}
              valueStyle={{ 
                color: '#722ed1', 
                fontSize: isMobile ? '20px' : '24px' 
              }}
            />
          </Card>
        </Col>
        <Col span={config.span}>
          <Card 
            size={isMobile ? 'small' : 'default'}
            style={{ textAlign: 'center' }}
          >
            <Statistic
              title="浏览量"
              value={1128}
              prefix={<EyeOutlined />}
              valueStyle={{ 
                color: '#eb2f96', 
                fontSize: isMobile ? '20px' : '24px' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={config.gutter as [number, number]} style={{ marginTop: 16 }}>
        <Col span={isMobile ? 24 : 12}>
          <Card 
            title="销售趋势" 
            size={isMobile ? 'small' : 'default'}
            style={{ height: config.chartHeight + 100 }}
          >
            <div style={{ height: config.chartHeight }}>
              {/* 图表暂时禁用，避免类型错误 */}
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <Text type="secondary">图表功能开发中...</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={isMobile ? 24 : 12}>
          <Card 
            title="产品销量" 
            size={isMobile ? 'small' : 'default'}
            style={{ height: config.chartHeight + 100 }}
          >
            <div style={{ height: config.chartHeight }}>
              {/* 图表暂时禁用，避免类型错误 */}
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <Text type="secondary">图表功能开发中...</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
      >
        <List
          dataSource={[
            { key: 'dashboard', title: '仪表盘', icon: <DesktopOutlined /> },
            { key: 'orders', title: '订单管理', icon: <ShoppingCartOutlined /> },
            { key: 'customers', title: '客户管理', icon: <UserOutlined /> },
            { key: 'products', title: '产品管理', icon: <ShoppingCartOutlined /> },
            { key: 'analytics', title: '数据分析', icon: <EyeOutlined /> },
          ]}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={item.icon} />}
                title={item.title}
              />
            </List.Item>
          )}
        />
        
        <Divider />
        
        <AntTitle level={5}>通知</AntTitle>
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Badge 
                    color={
                      item.type === 'order' ? 'blue' : 
                      item.type === 'warning' ? 'orange' : 'green'
                    } 
                    dot 
                  />
                }
                title={item.title}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {item.content}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {item.time}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
};

export default ResponsiveDashboard;
