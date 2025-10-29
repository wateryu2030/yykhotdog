// 行为分析组件
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Progress, 
  Space,
  Select,
  DatePicker,
  Button,
  message,
  Spin,
  Empty,
  Tooltip
} from 'antd';
import { 
  ClockCircleOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface BehaviorData {
  timeDistribution: {
    hour: number;
    customer_count: number;
    order_count: number;
    revenue: number;
  }[];
  productPreferences: {
    product_name: string;
    total_quantity: number;
    total_revenue: number;
    customer_count: number;
    preference_score: number;
  }[];
  purchasePatterns: {
    pattern_type: string;
    description: string;
    customer_count: number;
    avg_order_value: number;
  }[];
  summary: {
    totalCustomers: number;
    avgOrderFrequency: number;
    peakHours: string[];
    topProducts: string[];
    avgSessionDuration: number;
  };
}

interface BehaviorAnalysisProps {
  filters: {
    city?: string;
    store?: string;
    dateRange?: [string, string];
  };
  onDataLoad?: (data: BehaviorData) => void;
}

const BehaviorAnalysis: React.FC<BehaviorAnalysisProps> = ({ filters, onDataLoad }) => {
  const [loading, setLoading] = useState(false);
  const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const handleCustomDateRangeChange = (dates: any) => {
    setCustomDateRange(dates);
  };

  // 模拟数据获取
  const fetchBehaviorData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: BehaviorData = {
        timeDistribution: [
          { hour: 8, customer_count: 45, order_count: 52, revenue: 1250 },
          { hour: 9, customer_count: 78, order_count: 89, revenue: 2100 },
          { hour: 10, customer_count: 95, order_count: 108, revenue: 2580 },
          { hour: 11, customer_count: 120, order_count: 135, revenue: 3200 },
          { hour: 12, customer_count: 180, order_count: 205, revenue: 4800 },
          { hour: 13, customer_count: 165, order_count: 188, revenue: 4200 },
          { hour: 14, customer_count: 140, order_count: 158, revenue: 3600 },
          { hour: 15, customer_count: 125, order_count: 142, revenue: 3200 },
          { hour: 16, customer_count: 110, order_count: 125, revenue: 2800 },
          { hour: 17, customer_count: 135, order_count: 152, revenue: 3400 },
          { hour: 18, customer_count: 160, order_count: 180, revenue: 4000 },
          { hour: 19, customer_count: 145, order_count: 165, revenue: 3700 },
          { hour: 20, customer_count: 100, order_count: 115, revenue: 2600 },
          { hour: 21, customer_count: 75, order_count: 85, revenue: 1900 },
          { hour: 22, customer_count: 45, order_count: 52, revenue: 1200 }
        ],
        productPreferences: [
          { product_name: '经典热狗', total_quantity: 1250, total_revenue: 12500, customer_count: 450, preference_score: 95 },
          { product_name: '芝士热狗', total_quantity: 980, total_revenue: 11760, customer_count: 380, preference_score: 88 },
          { product_name: '辣味热狗', total_quantity: 750, total_revenue: 9000, customer_count: 320, preference_score: 82 },
          { product_name: '蔬菜热狗', total_quantity: 650, total_revenue: 7800, customer_count: 280, preference_score: 75 },
          { product_name: '培根热狗', total_quantity: 580, total_revenue: 8700, customer_count: 250, preference_score: 70 }
        ],
        purchasePatterns: [
          { pattern_type: '高频购买', description: '每周购买3次以上', customer_count: 120, avg_order_value: 35.5 },
          { pattern_type: '周末消费', description: '主要在周末购买', customer_count: 85, avg_order_value: 42.3 },
          { pattern_type: '午餐时段', description: '集中在午餐时间购买', customer_count: 200, avg_order_value: 28.7 },
          { pattern_type: '随机消费', description: '无固定购买时间', customer_count: 95, avg_order_value: 31.2 }
        ],
        summary: {
          totalCustomers: 500,
          avgOrderFrequency: 2.3,
          peakHours: ['12:00-13:00', '18:00-19:00'],
          topProducts: ['经典热狗', '芝士热狗', '辣味热狗'],
          avgSessionDuration: 8.5
        }
      };

      setBehaviorData(mockData);
      onDataLoad?.(mockData);
    } catch (error) {
      message.error('获取行为分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBehaviorData();
  }, [filters, timeRange, customDateRange]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>正在分析客户行为数据...</div>
      </div>
    );
  }

  if (!behaviorData) {
    return (
      <Empty 
        description="暂无行为分析数据" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const { timeDistribution, productPreferences, purchasePatterns, summary } = behaviorData;

  // 时间分布图表配置
  const timeDistributionConfig = {
    data: timeDistribution,
    xField: 'hour',
    yField: 'customer_count',
    color: '#1890ff',
    meta: {
      hour: {
        alias: '小时',
        formatter: (value: number) => `${value}:00`
      },
      customer_count: {
        alias: '客户数'
      }
    }
  };

  // 产品偏好饼图配置
  const productPreferenceConfig = {
    data: productPreferences.slice(0, 5),
    angleField: 'total_revenue',
    colorField: 'product_name',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}'
    },
    interactions: [{ type: 'element-active' }]
  };

  // 购买模式表格列定义
  const patternColumns = [
    {
      title: '模式类型',
      dataIndex: 'pattern_type',
      key: 'pattern_type',
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '客户数量',
      dataIndex: 'customer_count',
      key: 'customer_count',
      render: (value: number) => (
        <Statistic value={value} valueStyle={{ fontSize: '16px' }} />
      )
    },
    {
      title: '平均订单价值',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (value: number) => `¥${value.toFixed(2)}`
    }
  ];

  return (
    <div>
      {/* 筛选控件 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Space>
              <span>时间范围:</span>
              <Select 
                value={timeRange} 
                onChange={setTimeRange}
                style={{ width: 120 }}
              >
                <Option value="7d">最近7天</Option>
                <Option value="30d">最近30天</Option>
                <Option value="90d">最近90天</Option>
                <Option value="custom">自定义</Option>
              </Select>
            </Space>
          </Col>
          
          {timeRange === 'custom' && (
            <Col xs={24} sm={12} lg={8}>
              <RangePicker
                value={customDateRange}
                onChange={handleCustomDateRangeChange}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
          )}
          
          <Col xs={24} sm={12} lg={4}>
            <Button type="primary" onClick={fetchBehaviorData}>
              刷新数据
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 概览统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总客户数"
              value={summary.totalCustomers}
              prefix={<ShoppingCartOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均购买频次"
              value={summary.avgOrderFrequency}
              prefix={<ClockCircleOutlined />}
              suffix="次/月"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均会话时长"
              value={summary.avgSessionDuration}
              prefix={<CalendarOutlined />}
              suffix="分钟"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                高峰时段
              </div>
              <div>
                {summary.peakHours.map((hour, index) => (
                  <Tag key={index} color="green">{hour}</Tag>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 时间分布分析 */}
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            客户活跃时间分布
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Column {...timeDistributionConfig} height={300} />
          </Col>
          <Col xs={24} lg={8}>
            <div style={{ padding: '16px' }}>
              <h4>高峰时段分析</h4>
              {timeDistribution
                .sort((a, b) => b.customer_count - a.customer_count)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.hour} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>{item.hour}:00</span>
                      <span>{item.customer_count}人</span>
                    </div>
                    <Progress 
                      percent={(item.customer_count / Math.max(...timeDistribution.map(t => t.customer_count))) * 100}
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                  </div>
                ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 产品偏好分析 */}
      <Card 
        title={
          <Space>
            <PieChartOutlined />
            产品偏好分析
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Pie {...productPreferenceConfig} height={300} />
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ padding: '16px' }}>
              <h4>热门产品排行</h4>
              {productPreferences.map((product, index) => (
                <div key={product.product_name} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        #{index + 1} {product.product_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {product.customer_count}人购买
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                        ¥{product.total_revenue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        偏好度: {product.preference_score}%
                      </div>
                    </div>
                  </div>
                  <Progress 
                    percent={product.preference_score}
                    showInfo={false}
                    strokeColor="#52c41a"
                    style={{ marginTop: '8px' }}
                  />
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 购买模式分析 */}
      <Card 
        title={
          <Space>
            <LineChartOutlined />
            购买模式分析
          </Space>
        }
      >
        <Table
          columns={patternColumns}
          dataSource={purchasePatterns}
          rowKey="pattern_type"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default BehaviorAnalysis;
