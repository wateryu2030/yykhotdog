// 客户分层组件

import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Progress, Tooltip } from 'antd';
import { 
  UserOutlined, 
  DollarOutlined, 
  ShoppingCartOutlined,
  TrophyOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Pie } from '@ant-design/plots';
import { useCustomerProfile } from '../hooks/useCustomerProfile';

const CustomerSegmentation: React.FC = () => {
  const { segmentationData, ui, actions, filters } = useCustomerProfile();

  useEffect(() => {
    actions.fetchSegmentation(filters);
  }, [actions, filters]);

  if (ui.loading && !segmentationData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>加载客户分层数据中...</div>
      </div>
    );
  }

  if (ui.error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>数据加载失败: {ui.error}</div>
        <Button onClick={() => actions.fetchSegmentation(filters)}>重试</Button>
      </div>
    );
  }

  if (!segmentationData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>暂无数据</div>
      </div>
    );
  }

  const { segments, totalCustomers, summary } = segmentationData;

  // 准备饼图数据
  const pieData = segments.map((segment: any) => ({
    type: segment.segment_name,
    value: segment.customer_count,
    percentage: ((segment.customer_count / totalCustomers) * 100).toFixed(1)
  }));

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}%',
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
    color: ['#52c41a', '#1890ff', '#fa8c16', '#f5222d'],
  };

  // 表格列定义
  const columns = [
    {
      title: '客户分层',
      dataIndex: 'segment_name',
      key: 'segment_name',
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          '核心客户': 'green',
          '活跃客户': 'blue',
          '机会客户': 'orange',
          '沉睡/新客户': 'red'
        };
        return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
      }
    },
    {
      title: '客户数量',
      dataIndex: 'customer_count',
      key: 'customer_count',
      render: (value: number) => value?.toLocaleString() || '0',
      sorter: (a: any, b: any) => a.customer_count - b.customer_count,
    },
    {
      title: '占比',
      key: 'percentage',
      render: (_: any, record: any) => {
        const percentage = ((record.customer_count / totalCustomers) * 100).toFixed(1);
        return (
          <div>
            <div>{percentage}%</div>
            <Progress 
              percent={parseFloat(percentage)} 
              size="small" 
              showInfo={false}
              strokeColor={record.segment_name === '核心客户' ? '#52c41a' : '#1890ff'}
            />
          </div>
        );
      },
    },
    {
      title: '平均消费',
      dataIndex: 'avg_spend',
      key: 'avg_spend',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: (a: any, b: any) => a.avg_spend - b.avg_spend,
    },
    {
      title: '平均订单数',
      dataIndex: 'avg_orders',
      key: 'avg_orders',
      render: (value: number) => value?.toFixed(1) || '0.0',
      sorter: (a: any, b: any) => a.avg_orders - b.avg_orders,
    },
    {
      title: '总消费',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (value: number) => `¥${value?.toLocaleString() || '0'}`,
      sorter: (a: any, b: any) => a.total_revenue - b.total_revenue,
    },
    {
      title: '3年生命周期价值',
      dataIndex: 'lifetime_value_3y',
      key: 'lifetime_value_3y',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: (a: any, b: any) => a.lifetime_value_3y - b.lifetime_value_3y,
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      render: (level: string) => {
        const config = {
          low: { color: 'green', icon: <CheckCircleOutlined />, text: '低风险' },
          medium: { color: 'orange', icon: <ExclamationCircleOutlined />, text: '中风险' },
          high: { color: 'red', icon: <WarningOutlined />, text: '高风险' }
        };
        const { color, icon, text } = config[level as keyof typeof config] || config.low;
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              // 查看分层详情
              console.log('查看分层详情:', record.segment_name);
            }}
          >
            查看详情
          </Button>
          <Button 
            type="link" 
            size="small"
            onClick={() => {
              // 生成AI分析
              actions.generateAIInsights({ ...filters, segment: record.segment_name });
            }}
          >
            AI分析
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 分层概览统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="核心客户"
              value={summary.coreCustomers}
              prefix={<UserOutlined />}
              suffix="人"
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              占比 {((summary.coreCustomers / totalCustomers) * 100).toFixed(1)}%
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃客户"
              value={summary.activeCustomers}
              prefix={<ShoppingCartOutlined />}
              suffix="人"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              占比 {((summary.activeCustomers / totalCustomers) * 100).toFixed(1)}%
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="机会客户"
              value={summary.opportunityCustomers}
              prefix={<DollarOutlined />}
              suffix="人"
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              占比 {((summary.opportunityCustomers / totalCustomers) * 100).toFixed(1)}%
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="沉睡/新客户"
              value={summary.dormantCustomers}
              prefix={<TrophyOutlined />}
              suffix="人"
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              占比 {((summary.dormantCustomers / totalCustomers) * 100).toFixed(1)}%
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分层分布图表和详细表格 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="客户分层分布" extra={
            <Tooltip title="点击扇形查看详情">
              <Button type="link" size="small">交互式图表</Button>
            </Tooltip>
          }>
            <Pie {...pieConfig} height={300} />
          </Card>
        </Col>
        
        <Col xs={24} lg={16}>
          <Card title="客户分层详情" extra={
            <Space>
              <Button size="small">导出数据</Button>
              <Button type="primary" size="small">批量操作</Button>
            </Space>
          }>
            <Table
              columns={columns}
              dataSource={segments}
              rowKey="segment_name"
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CustomerSegmentation;
