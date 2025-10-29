// 客户对比分析模块 - 分析不同客户群体的特征和差异
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  DatePicker,
  Button,
  Tabs,
  Tag,
  Progress,
  Alert,
  Spin,
  Typography,
  Space,
  Empty
} from 'antd';
import {
  TeamOutlined,
  ShoppingOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  LineChartOutlined,
  RobotOutlined,
  FireOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface CustomerSegment {
  segment: string;
  customerCount: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgOrderFrequency: number;
  lastOrderDate: string;
}

interface CustomerCompare {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
  lastOrderDate: string;
  segment: string;
}

const CustomerCompare: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  
  // 客户群体数据
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomerCompareData();
  }, [dateRange]);

  const fetchCustomerCompareData = async () => {
    setLoading(true);
    try {
      if (!dateRange) return;
      const [startDate, endDate] = dateRange.map(d => d.format('YYYY-MM-DD'));
      
      // 获取客户列表并进行群体分析
      const customersResponse = await fetch(
        `http://localhost:3001/api/customer-profile/customers?startDate=${startDate}&endDate=${endDate}&pageSize=1000`
      );
      const customersResult = await customersResponse.json();
      
      if (customersResult.success && customersResult.data) {
        // 按segment分组统计
        const segmentMap = new Map<string, any>();
        
        customersResult.data.forEach((customer: any) => {
          const seg = customer.segment_name || '未分类';
          if (!segmentMap.has(seg)) {
            segmentMap.set(seg, {
              segment: seg,
              customerCount: 0,
              totalRevenue: 0,
              totalOrderCount: 0,
              maxLastOrderDate: ''
            });
          }
          
          const segData = segmentMap.get(seg)!;
          segData.customerCount++;
          segData.totalRevenue += customer.total_spent || 0;
          segData.totalOrderCount += customer.order_count || 0;
          
          if (customer.last_order_date > segData.maxLastOrderDate) {
            segData.maxLastOrderDate = customer.last_order_date;
          }
        });
        
        // 转换为数组并计算平均值
        const segArray = Array.from(segmentMap.values()).map(seg => ({
          segment: seg.segment,
          customerCount: seg.customerCount,
          totalRevenue: seg.totalRevenue,
          avgOrderValue: seg.totalRevenue / seg.customerCount,
          avgOrderFrequency: seg.totalOrderCount / seg.customerCount,
          lastOrderDate: seg.maxLastOrderDate
        }));
        
        setSegments(segArray);
        
        // 设置TOP客户
        const top50 = customersResult.data
          .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
          .slice(0, 50)
          .map((c: any, index: number) => ({
            customer_id: c.customer_id,
            customer_name: c.customer_name || '未命名客户',
            rank: index + 1,
            order_count: c.order_count,
            total_revenue: c.total_spent,
            avg_order_value: c.avg_order_value,
            last_order_date: c.last_order_date,
            segment: c.segment_name
          }));
        
        setTopCustomers(top50);
      }
    } catch (error) {
      console.error('获取客户对比数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 分段表格列定义
  const segmentColumns = [
    {
      title: '客户群体',
      dataIndex: 'segment',
      key: 'segment',
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          '高价值客户': '#52c41a',
          '中价值客户': '#1890ff',
          '低价值客户': '#faad14',
          '新客户': '#13c2c2',
          '沉睡客户': '#999'
        };
        return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
      }
    },
    {
      title: '客户数',
      dataIndex: 'customerCount',
      key: 'customerCount',
      sorter: (a: any, b: any) => a.customerCount - b.customerCount,
    },
    {
      title: '总销售额',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.totalRevenue - b.totalRevenue,
    },
    {
      title: '平均客单价',
      dataIndex: 'avgOrderValue',
      key: 'avgOrderValue',
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.avgOrderValue - b.avgOrderValue,
    },
    {
      title: '平均频次',
      dataIndex: 'avgOrderFrequency',
      key: 'avgOrderFrequency',
      render: (val: number) => `${(val || 0).toFixed(1)}次`,
      sorter: (a: any, b: any) => a.avgOrderFrequency - b.avgOrderFrequency,
    },
    {
      title: '最后下单日期',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-'
    }
  ];

  // TOP客户表格列定义
  const topCustomerColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
    },
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id',
    },
    {
      title: '订单数',
      dataIndex: 'order_count',
      key: 'order_count',
      sorter: (a: any, b: any) => a.order_count - b.order_count,
    },
    {
      title: '总消费',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.total_revenue - b.total_revenue,
    },
    {
      title: '平均客单价',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.avg_order_value - b.avg_order_value,
    },
    {
      title: '最后下单',
      dataIndex: 'last_order_date',
      key: 'last_order_date',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-'
    }
  ];

  // 分段销售额饼图配置
  const segmentPieConfig = {
    data: segments.map(s => ({
      type: s.segment,
      value: s.totalRevenue
    })),
    height: 300,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer' as const,
      formatter: (datum: any) => `${datum.type}: ¥${Number(datum.value).toFixed(2)}`,
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.type, value: `¥${Number(datum.value).toFixed(2)}` };
      },
    },
  };

  // 分段客户数柱状图配置
  const segmentColumnConfig = {
    data: segments.map(s => ({
      type: s.segment,
      value: s.customerCount
    })),
    height: 300,
    xField: 'type',
    yField: 'value',
    columnStyle: {
      radius: [8, 8, 0, 0],
    },
    meta: {
      type: { alias: '客户群体' },
      value: { alias: '客户数' }
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: '客户数', value: `${datum.value}人` };
      },
    },
  };

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
        {/* 页面头部 */}
        <Card style={{ marginBottom: 16 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <TeamOutlined /> 客户对比分析
              </Title>
              <Text type="secondary">深度分析不同客户群体的特征差异</Text>
            </Col>
            <Col>
              <Space>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as any)}
                />
                <Button type="primary" onClick={fetchCustomerCompareData}>
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 分段占比和数量 */}
        {segments.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="客户群体销售额占比" style={{ marginBottom: 16 }}>
                <Pie {...segmentPieConfig} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="客户群体人数分布" style={{ marginBottom: 16 }}>
                <Column {...segmentColumnConfig} />
              </Card>
            </Col>
          </Row>
        )}

        {/* 分段详细数据 */}
        {segments.length > 0 && (
          <Card title="客户群体对比表" style={{ marginBottom: 16 }}>
            <Table
              dataSource={segments}
              columns={segmentColumns}
              rowKey="segment"
              pagination={false}
            />
          </Card>
        )}

        {/* TOP客户 */}
        {topCustomers.length > 0 && (
          <Card title="TOP客户排行榜">
            <Table
              dataSource={topCustomers.map((customer, index) => ({
                ...customer,
                rank: index + 1
              }))}
              columns={topCustomerColumns}
              rowKey="customer_id"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        )}

        {/* 空状态 */}
        {segments.length === 0 && topCustomers.length === 0 && (
          <Card>
            <Empty description="暂无客户对比数据" />
          </Card>
        )}
      </div>
    </Spin>
  );
};

export default CustomerCompare;

