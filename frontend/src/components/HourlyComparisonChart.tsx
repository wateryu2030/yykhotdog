import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Button, Space, Typography, Tooltip, Progress } from 'antd';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const { Title: AntTitle, Text } = Typography;
const { Option } = Select;

interface HourlyComparisonData {
  hour: number;
  current: {
    orderCount: number;
    totalSales: number;
    avgOrderValue: number;
    uniqueCustomers: number;
  };
  compare: {
    orderCount: number;
    totalSales: number;
    avgOrderValue: number;
    uniqueCustomers: number;
  };
  comparison: {
    salesChange: number;
    salesChangePercent: number;
    ordersChange: number;
    ordersChangePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface HourlyComparisonProps {
  storeId: string;
  startDate: string;
  endDate: string;
  onDataChange?: (data: any) => void;
}

const HourlyComparisonChart: React.FC<HourlyComparisonProps> = ({
  storeId,
  startDate,
  endDate,
  onDataChange
}) => {
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [compareType, setCompareType] = useState<'previous' | 'same_period_last_year'>('previous');
  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'orders' | 'customers'>('sales');

  // 获取小时级对比数据
  const fetchHourlyComparison = async () => {
    if (!storeId || !startDate || !endDate) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/sales-prediction/hourly-comparison/${storeId}`, {
        params: {
          startDate,
          endDate,
          compareType
        }
      });

      if (response.data.success) {
        setComparisonData(response.data.data);
        onDataChange?.(response.data.data);
      }
    } catch (error) {
      console.error('获取小时级对比数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHourlyComparison();
  }, [storeId, startDate, endDate, compareType]);

  // 生成图表数据
  const generateChartData = () => {
    if (!comparisonData?.hourlyComparison) return null;

    const hours = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => 
      `${item.hour.toString().padStart(2, '0')}:00`
    );

    let currentData: number[];
    let compareData: number[];
    let label: string;

    switch (selectedMetric) {
      case 'sales':
        currentData = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => item.current.totalSales);
        compareData = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => item.compare.totalSales);
        label = '销售额 (元)';
        break;
      case 'orders':
        currentData = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => item.current.orderCount);
        compareData = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => item.compare.orderCount);
        label = '订单数';
        break;
      case 'customers':
        currentData = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => item.current.uniqueCustomers);
        compareData = comparisonData.hourlyComparison.map((item: HourlyComparisonData) => item.compare.uniqueCustomers);
        label = '客户数';
        break;
      default:
        return null;
    }

    return {
      labels: hours,
      datasets: [
        {
          label: `当前期间 (${comparisonData.currentPeriod.startDate} - ${comparisonData.currentPeriod.endDate})`,
          data: currentData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: `对比期间 (${comparisonData.comparePeriod.startDate} - ${comparisonData.comparePeriod.endDate})`,
          data: compareData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: true,
        }
      ]
    };
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `小时级${selectedMetric === 'sales' ? '销售额' : selectedMetric === 'orders' ? '订单数' : '客户数'}对比分析`,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const hour = context.label;
            
            if (selectedMetric === 'sales') {
              return `${label}: ¥${value.toFixed(2)}`;
            } else {
              return `${label}: ${value}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '时间 (小时)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: selectedMetric === 'sales' ? '销售额 (元)' : selectedMetric === 'orders' ? '订单数' : '客户数'
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // 获取趋势图标
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'down':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <MinusOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // 获取趋势颜色
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return '#52c41a';
      case 'down':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  const chartData = generateChartData();

  if (!comparisonData) {
    return (
      <Card loading={loading}>
        <AntTitle level={4}>小时级对比分析</AntTitle>
        <Text type="secondary">暂无数据</Text>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined />
          <span>小时级对比分析</span>
        </Space>
      }
      extra={
        <Space>
          <Select
            value={compareType}
            onChange={setCompareType}
            style={{ width: 150 }}
          >
            <Option value="previous">前一期对比</Option>
            <Option value="same_period_last_year">去年同期</Option>
          </Select>
          <Select
            value={selectedMetric}
            onChange={setSelectedMetric}
            style={{ width: 100 }}
          >
            <Option value="sales">销售额</Option>
            <Option value="orders">订单数</Option>
            <Option value="customers">客户数</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchHourlyComparison}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
    >
      {/* 汇总统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总销售额变化"
              value={comparisonData.summary.totalSalesChange}
              precision={2}
              prefix="¥"
              valueStyle={{ 
                color: comparisonData.summary.totalSalesChange >= 0 ? '#52c41a' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总订单数变化"
              value={comparisonData.summary.totalOrdersChange}
              valueStyle={{ 
                color: comparisonData.summary.totalOrdersChange >= 0 ? '#52c41a' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="平均变化率"
              value={comparisonData.summary.avgSalesChangePercent}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: comparisonData.summary.avgSalesChangePercent >= 0 ? '#52c41a' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="高峰时段"
              value={`${comparisonData.summary.peakHour.hour.toString().padStart(2, '0')}:00`}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表 */}
      <div style={{ marginBottom: 24 }}>
        {chartData && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* 详细对比表格 */}
      <Card title="详细对比数据" size="small">
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>时段</th>
                <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>当前期间</th>
                <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>对比期间</th>
                <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>变化</th>
                <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>趋势</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.hourlyComparison.map((item: HourlyComparisonData, index: number) => (
                <tr key={index}>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                    {item.hour.toString().padStart(2, '0')}:00
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', textAlign: 'right' }}>
                    {selectedMetric === 'sales' ? `¥${item.current.totalSales.toFixed(2)}` : 
                     selectedMetric === 'orders' ? item.current.orderCount : 
                     item.current.uniqueCustomers}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', textAlign: 'right' }}>
                    {selectedMetric === 'sales' ? `¥${item.compare.totalSales.toFixed(2)}` : 
                     selectedMetric === 'orders' ? item.compare.orderCount : 
                     item.compare.uniqueCustomers}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', textAlign: 'right' }}>
                    <Text style={{ color: getTrendColor(item.comparison.trend) }}>
                      {selectedMetric === 'sales' ? 
                        `${item.comparison.salesChange >= 0 ? '+' : ''}¥${item.comparison.salesChange.toFixed(2)}` :
                        selectedMetric === 'orders' ?
                        `${item.comparison.ordersChange >= 0 ? '+' : ''}${item.comparison.ordersChange}` :
                        `${item.comparison.ordersChange >= 0 ? '+' : ''}${item.comparison.ordersChange}`
                      }
                      <br />
                      <small>
                        ({item.comparison.salesChangePercent >= 0 ? '+' : ''}{item.comparison.salesChangePercent.toFixed(1)}%)
                      </small>
                    </Text>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                    <Tooltip title={item.comparison.trend === 'up' ? '上升' : item.comparison.trend === 'down' ? '下降' : '稳定'}>
                      {getTrendIcon(item.comparison.trend)}
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Card>
  );
};

export default HourlyComparisonChart;
