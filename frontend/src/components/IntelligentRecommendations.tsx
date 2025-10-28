import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Progress, 
  Statistic, 
  Alert, 
  Space, 
  Typography, 
  Modal,
  List,
  Avatar,
  Tooltip,
  Badge
} from 'antd';
import { 
  RobotOutlined, 
  RiseOutlined, 
  ShoppingCartOutlined, 
  UserOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  StarOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  ChartTooltip,
  Legend
);

const { Title, Text } = Typography;

interface SalesForecast {
  date: string;
  predicted_sales: number;
  confidence_level: number;
  factors: {
    seasonality: number;
    trend: number;
    weather_impact: number;
    promotion_impact: number;
  };
}

interface CustomerPrediction {
  customer_id: string;
  predicted_next_order_date: string;
  predicted_order_value: number;
  churn_probability: number;
  lifetime_value: number;
  recommended_actions: string[];
}

interface ProductRecommendation {
  customer_id: string;
  recommended_products: Array<{
    product_name: string;
    confidence_score: number;
    reason: string;
  }>;
}

const IntelligentRecommendations: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [salesForecast, setSalesForecast] = useState<SalesForecast[]>([]);
  const [customerPredictions, setCustomerPredictions] = useState<CustomerPrediction[]>([]);
  const [productRecommendations, setProductRecommendations] = useState<ProductRecommendation[]>([]);
  const [selectedStore, setSelectedStore] = useState('31');
  const [selectedCustomer, setSelectedCustomer] = useState('C001');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);

  // 模拟数据
  const mockSalesForecast: SalesForecast[] = [
    {
      date: '2025-10-27',
      predicted_sales: 1250,
      confidence_level: 0.85,
      factors: { seasonality: 50, trend: 20, weather_impact: -10, promotion_impact: 30 }
    },
    {
      date: '2025-10-28',
      predicted_sales: 1180,
      confidence_level: 0.82,
      factors: { seasonality: 40, trend: 15, weather_impact: 5, promotion_impact: 25 }
    },
    {
      date: '2025-10-29',
      predicted_sales: 1320,
      confidence_level: 0.88,
      factors: { seasonality: 60, trend: 25, weather_impact: -5, promotion_impact: 40 }
    },
    {
      date: '2025-10-30',
      predicted_sales: 1400,
      confidence_level: 0.90,
      factors: { seasonality: 70, trend: 30, weather_impact: 10, promotion_impact: 50 }
    },
    {
      date: '2025-10-31',
      predicted_sales: 1150,
      confidence_level: 0.80,
      factors: { seasonality: 30, trend: 10, weather_impact: -15, promotion_impact: 20 }
    }
  ];

  const mockCustomerPredictions: CustomerPrediction[] = [
    {
      customer_id: 'C001',
      predicted_next_order_date: '2025-11-02',
      predicted_order_value: 58,
      churn_probability: 0.15,
      lifetime_value: 1250,
      recommended_actions: ['发送专属优惠券', '推荐新品', '邀请参与会员计划']
    },
    {
      customer_id: 'C002',
      predicted_next_order_date: '2025-11-05',
      predicted_order_value: 45,
      churn_probability: 0.25,
      lifetime_value: 890,
      recommended_actions: ['推荐套餐', '发送生日优惠']
    },
    {
      customer_id: 'C003',
      predicted_next_order_date: '2025-11-01',
      predicted_order_value: 72,
      churn_probability: 0.05,
      lifetime_value: 2100,
      recommended_actions: ['VIP专属服务', '推荐高端产品']
    }
  ];

  const mockProductRecommendations: ProductRecommendation[] = [
    {
      customer_id: 'C001',
      recommended_products: [
        { product_name: '热狗套餐', confidence_score: 0.92, reason: '您经常购买单品，推荐套餐更优惠' },
        { product_name: '可乐', confidence_score: 0.85, reason: '与您常购买的产品搭配更佳' },
        { product_name: '薯条', confidence_score: 0.78, reason: '基于您的购买历史推荐' }
      ]
    }
  ];

  useEffect(() => {
    setSalesForecast(mockSalesForecast);
    setCustomerPredictions(mockCustomerPredictions);
    setProductRecommendations(mockProductRecommendations);
  }, []);

  // 销售预测图表数据
  const forecastChartData = {
    labels: salesForecast.map(f => f.date.split('-')[2]),
    datasets: [
      {
        label: '预测销售额',
        data: salesForecast.map(f => f.predicted_sales),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  const forecastChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '未来5天销售预测'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '销售额 (元)'
        }
      }
    }
  };

  // 客户预测表格列
  const customerColumns = [
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id',
      render: (text: string) => (
        <Button type="link" onClick={() => showCustomerDetail(text)}>
          {text}
        </Button>
      )
    },
    {
      title: '预测下次订单',
      dataIndex: 'predicted_next_order_date',
      key: 'predicted_next_order_date'
    },
    {
      title: '预测订单金额',
      dataIndex: 'predicted_order_value',
      key: 'predicted_order_value',
      render: (value: number) => `¥${value}`
    },
    {
      title: '流失风险',
      dataIndex: 'churn_probability',
      key: 'churn_probability',
      render: (value: number) => (
        <Progress 
          percent={value * 100} 
          size="small" 
          status={value > 0.5 ? 'exception' : value > 0.3 ? 'active' : 'success'}
        />
      )
    },
    {
      title: '生命周期价值',
      dataIndex: 'lifetime_value',
      key: 'lifetime_value',
      render: (value: number) => `¥${value}`
    },
    {
      title: '推荐行动',
      key: 'recommended_actions',
      render: (record: CustomerPrediction) => (
        <Space>
          {record.recommended_actions.slice(0, 2).map((action, index) => (
            <Tag key={index} color="blue">{action}</Tag>
          ))}
          {record.recommended_actions.length > 2 && (
            <Tag color="default">+{record.recommended_actions.length - 2}</Tag>
          )}
        </Space>
      )
    }
  ];

  // 产品推荐表格列
  const productColumns = [
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id'
    },
    {
      title: '推荐产品',
      key: 'recommended_products',
      render: (record: ProductRecommendation) => (
        <List
          size="small"
          dataSource={record.recommended_products}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<ShoppingCartOutlined />} />}
                title={item.product_name}
                description={
                  <Space>
                    <Tag color="green">{Math.round(item.confidence_score * 100)}%</Tag>
                    <Text type="secondary">{item.reason}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )
    }
  ];

  const showCustomerDetail = (customerId: string) => {
    const customer = customerPredictions.find(c => c.customer_id === customerId);
    if (customer) {
      setModalContent({
        title: `客户 ${customerId} 详细分析`,
        content: (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="预测下次订单日期" value={customer.predicted_next_order_date} />
              </Col>
              <Col span={12}>
                <Statistic title="预测订单金额" value={customer.predicted_order_value} prefix="¥" />
              </Col>
              <Col span={12}>
                <Statistic title="流失风险" value={customer.churn_probability * 100} suffix="%" />
              </Col>
              <Col span={12}>
                <Statistic title="生命周期价值" value={customer.lifetime_value} prefix="¥" />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Title level={5}>推荐行动</Title>
              <List
                dataSource={customer.recommended_actions}
                renderItem={(action) => (
                  <List.Item>
                    <Space>
                      <BulbOutlined style={{ color: '#1890ff' }} />
                      {action}
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </div>
        )
      });
      setModalVisible(true);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      // 这里可以调用实际的API
    } catch (error) {
      console.error('刷新数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <RobotOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          智能推荐系统
        </Title>
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={refreshData} loading={loading}>
          刷新预测
        </Button>
      </div>

      {/* 销售预测 */}
      <Card title="销售预测" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={16}>
            <div style={{ height: 300 }}>
              <Line data={forecastChartData} options={forecastChartOptions} />
            </div>
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic 
                title="总预测销售额" 
                value={salesForecast.reduce((sum, f) => sum + f.predicted_sales, 0)} 
                prefix="¥" 
              />
              <Statistic 
                title="平均置信度" 
                value={salesForecast.reduce((sum, f) => sum + f.confidence_level, 0) / salesForecast.length * 100} 
                suffix="%" 
              />
              <Alert
                message="预测说明"
                description="基于历史数据、季节性、趋势和促销活动等因素进行预测"
                type="info"
                showIcon
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 客户预测 */}
      <Card title="客户行为预测" style={{ marginBottom: 24 }}>
        <Table
          dataSource={customerPredictions}
          columns={customerColumns}
          rowKey="customer_id"
          pagination={false}
        />
      </Card>

      {/* 产品推荐 */}
      <Card title="产品推荐" style={{ marginBottom: 24 }}>
        <Table
          dataSource={productRecommendations}
          columns={productColumns}
          rowKey="customer_id"
          pagination={false}
        />
      </Card>

      {/* 智能决策建议 */}
      <Card title="智能决策建议">
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="库存预警"
                value={3}
                prefix={<Badge count={3}><ShoppingCartOutlined /></Badge>}
                suffix="个产品"
              />
              <Text type="secondary">建议及时补货</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="高价值客户"
                value={12}
                prefix={<StarOutlined />}
                suffix="位客户"
              />
              <Text type="secondary">建议提供VIP服务</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="促销机会"
                value={5}
                prefix={<GiftOutlined />}
                suffix="个产品"
              />
              <Text type="secondary">建议开展促销活动</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={modalContent?.title}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {modalContent?.content}
      </Modal>
    </div>
  );
};

export default IntelligentRecommendations;
