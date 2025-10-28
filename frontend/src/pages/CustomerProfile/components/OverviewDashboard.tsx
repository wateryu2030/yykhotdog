// 概览仪表板组件

import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Space, Spin, Alert } from 'antd';
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useCustomerProfile } from '../hooks/useCustomerProfile';

const OverviewDashboard: React.FC = () => {
  const { overviewData, ui, actions } = useCustomerProfile();

  useEffect(() => {
    actions.fetchOverview();
  }, [actions]);

  if (ui.loading && !overviewData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载概览数据中...</div>
      </div>
    );
  }

  if (ui.error) {
    return (
      <Alert
        message="数据加载失败"
        description={ui.error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => actions.fetchOverview()}>
            重试
          </Button>
        }
      />
    );
  }

  if (!overviewData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>暂无数据</div>
      </div>
    );
  }

  const { totalCustomers, activeCustomers, avgOrderValue, customerLifetimeValue, growthRate, topSegments } = overviewData;

  // 准备趋势图表数据
  const trendData = overviewData.recentTrends?.map((trend: any) => ({
    date: trend.date,
    customers: trend.customers,
    orders: trend.orders,
    revenue: trend.revenue
  })) || [];

  const trendConfig = {
    data: trendData,
    xField: 'date',
    yField: 'customers',
    smooth: true,
    color: '#1890ff',
    point: {
      size: 4,
      shape: 'circle',
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: '客户数',
        value: `${datum.customers.toLocaleString()}人`,
      }),
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总客户数"
              value={totalCustomers}
              prefix={<UserOutlined />}
              suffix="人"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Button 
                type="link" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => actions.fetchSegmentation({})}
              >
                查看详情
              </Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃客户数"
              value={activeCustomers}
              prefix={<ShoppingCartOutlined />}
              suffix="人"
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Button 
                type="link" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => actions.fetchSegmentation({})}
              >
                查看详情
              </Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均客单价"
              value={avgOrderValue}
              prefix={<DollarOutlined />}
              suffix="元"
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: 8 }}>
              <Button 
                type="link" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => actions.fetchBehaviorAnalysis({})}
              >
                查看详情
              </Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="客户生命周期价值"
              value={customerLifetimeValue}
              prefix={<TrophyOutlined />}
              suffix="元"
              precision={2}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              <Button 
                type="link" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => actions.generateAIInsights({})}
              >
                查看详情
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 增长趋势和AI洞察 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="客户增长趋势" extra={
            <Space>
              <Button size="small" icon={<ArrowUpOutlined />}>
                7天
              </Button>
              <Button size="small" icon={<ArrowDownOutlined />}>
                30天
              </Button>
            </Space>
          }>
            {trendData.length > 0 ? (
              <Line {...trendConfig} height={300} />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                暂无趋势数据
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title="AI智能洞察" 
            extra={
              <Button 
                type="primary" 
                size="small" 
                icon={<RobotOutlined />}
                onClick={() => actions.generateAIInsights({})}
                loading={ui.loading}
              >
                生成洞察
              </Button>
            }
          >
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <RobotOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <div style={{ color: '#666', marginBottom: 16 }}>
                点击生成AI智能洞察，获取个性化建议
              </div>
              <Button type="primary" icon={<RobotOutlined />}>
                立即分析
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 客户分层概览 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="客户分层概览" extra={
            <Button 
              type="link" 
              onClick={() => actions.fetchSegmentation({})}
            >
              查看全部分层
            </Button>
          }>
            <Row gutter={[16, 16]}>
              {topSegments?.map((segment: any, index: number) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card size="small" hoverable>
                    <Statistic
                      title={segment.segment_name}
                      value={segment.customer_count}
                      suffix="人"
                      valueStyle={{ 
                        color: index === 0 ? '#52c41a' : index === 1 ? '#1890ff' : '#fa8c16' 
                      }}
                    />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      占比 {segment.percentage.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      平均消费 ¥{segment.avg_spend.toFixed(2)}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OverviewDashboard;
