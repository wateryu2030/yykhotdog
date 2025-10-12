import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Space, Select, DatePicker, message, Typography, Badge, Avatar } from 'antd';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  ReloadOutlined,
  CalendarOutlined,
  BarChartOutlined,
  RiseOutlined,
  LineChartOutlined,
  BellOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../config/api';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const { Title: AntTitle, Text } = Typography;
const { Option } = Select;
const now = new Date();
const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

interface ComparisonData {
  predictions: any;
  actualData: any;
  accuracyData: any;
  currentDate: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface Store {
  Id: string;
  ShopName: string;
}

const SalesComparison: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs().add(6, 'day')]);

  // 获取门店列表
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await api.get('/operations/stores');
        if (response.data.success) {
          setStores(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedStore(response.data.data[0].Id);
          }
        }
      } catch (error) {
        console.error('获取门店列表失败:', error);
        message.error('获取门店列表失败');
      }
    };

    fetchStores();
  }, []);

  // 获取对比数据
  const fetchComparisonData = async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      console.log('获取对比数据:', { selectedStore, startDate, endDate });

      const response = await api.get(`/sales-prediction/comparison/${selectedStore}`, {
        params: { startDate, endDate }
      });

      console.log('对比数据响应:', response.data);

      if (response.data.success) {
        setComparisonData(response.data.data);
      } else {
        console.log('对比数据响应失败:', response.data);
        message.error('获取对比数据失败');
      }
    } catch (error) {
      console.error('获取对比数据失败:', error);
      message.error('获取对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 当门店或日期范围改变时获取数据
  useEffect(() => {
    if (selectedStore) {
      fetchComparisonData();
    }
  }, [selectedStore, dateRange]);

  // 生成对比图表数据
  const generateComparisonChartData = () => {
    if (!comparisonData) return null;

    const dates = Object.keys(comparisonData.predictions).sort();
    const currentDate = new Date().toISOString().split('T')[0];
    
    const labels = dates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const actualData = dates.map(date => {
      const actual = comparisonData.actualData[date];
      return actual ? actual.totalSales : 0;
    });

    const predictedData = dates.map(date => {
      const predicted = comparisonData.predictions[date];
      if (!predicted || predicted.length === 0) return 0;
      // 计算日总预测销售额（而不是日平均）
      const totalPredictedSales = predicted.reduce((sum: number, p: any) => sum + p.predictedSales, 0);
      return Math.round(totalPredictedSales * 100) / 100;
    });

    // 区分实际数据和预测数据
    const actualOnlyData = dates.map((date, index) => {
      if (date <= currentDate && comparisonData.actualData[date]?.totalSales > 0) {
        return actualData[index];
      }
      return null;
    });

    const futurePredictedData = dates.map((date, index) => {
      if (date > currentDate) {
        return predictedData[index];
      }
      return null;
    });

    return {
      labels,
      datasets: [
        {
          label: '实际销售额',
          data: actualOnlyData,
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: '预测销售额',
          data: predictedData,
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
          pointRadius: 3,
        },
        {
          label: '未来预测',
          data: futurePredictedData,
          borderColor: '#faad14',
          backgroundColor: 'rgba(250, 173, 20, 0.1)',
          fill: false,
          tension: 0.4,
          borderDash: [10, 5],
          pointRadius: 2,
        }
      ]
    };
  };

  const chartData = generateComparisonChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `销售预测对比分析 (${dateRange[0].format('MM/DD')} - ${dateRange[1].format('MM/DD')})`,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ¥${value != null ? value.toFixed(2) : '0.00'}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '销售额 (¥)',
        },
      },
      x: {
        title: {
          display: true,
          text: '日期',
        },
      },
    },
  };

  // 计算准确率
  const calculateAccuracy = () => {
    if (!comparisonData) return { salesAccuracy: 0, ordersAccuracy: 0 };
    
    const dates = Object.keys(comparisonData.accuracyData);
    let totalSalesAccuracy = 0;
    let totalOrdersAccuracy = 0;
    let count = 0;

    dates.forEach(date => {
      const accuracy = comparisonData.accuracyData[date];
      if (accuracy && accuracy.salesAccuracy !== undefined) {
        totalSalesAccuracy += accuracy.salesAccuracy;
        totalOrdersAccuracy += accuracy.ordersAccuracy;
        count++;
      }
    });

    return {
      salesAccuracy: count > 0 ? Math.round((totalSalesAccuracy / count) * 100) / 100 : 0,
      ordersAccuracy: count > 0 ? Math.round((totalOrdersAccuracy / count) * 100) / 100 : 0
    };
  };

  const accuracy = calculateAccuracy();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0 24px', background: '#fff', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LineChartOutlined style={{ fontSize: 28, color: '#faad14', marginRight: 8 }} />
            <span style={{ fontWeight: 'bold', fontSize: 24 }}>销售对比分析</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 18, marginRight: 16 }}>{timeStr} {dateStr}</span>
            <Badge count={1} size="small" style={{ marginRight: 16 }}><BellOutlined style={{ fontSize: 22, color: '#666' }} /></Badge>
            <Avatar style={{ backgroundColor: '#87d068', marginRight: 8 }} icon={<UserOutlined />} />
            <span>管理员</span>
          </div>
        </div>

        {/* 控制面板 */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong>选择门店:</Text>
                <Select
                  value={selectedStore}
                  onChange={setSelectedStore}
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="选择门店"
                >
                  {stores.map(store => (
                    <Option key={store.Id} value={store.Id}>
                      {store.ShopName}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div>
                <Text strong>日期范围:</Text>
                <DatePicker.RangePicker
                  value={dateRange}
                  onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
                  format="YYYY-MM-DD"
                  placeholder={['开始日期', '结束日期']}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchComparisonData}
                loading={loading}
                style={{ width: '100%' }}
              >
                刷新数据
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 准确率概览 */}
        {comparisonData && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="预测准确率"
                  value={accuracy.salesAccuracy}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: accuracy.salesAccuracy >= 80 ? '#52c41a' : accuracy.salesAccuracy >= 60 ? '#faad14' : '#ff4d4f' }}
                />
                <Progress
                  percent={Math.min(accuracy.salesAccuracy, 100)}
                  strokeColor={accuracy.salesAccuracy >= 80 ? '#52c41a' : accuracy.salesAccuracy >= 60 ? '#faad14' : '#ff4d4f'}
                  showInfo={false}
                  style={{ marginTop: '8px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="订单准确率"
                  value={accuracy.ordersAccuracy}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: accuracy.ordersAccuracy >= 80 ? '#52c41a' : accuracy.ordersAccuracy >= 60 ? '#faad14' : '#ff4d4f' }}
                />
                <Progress
                  percent={Math.min(accuracy.ordersAccuracy, 100)}
                  strokeColor={accuracy.ordersAccuracy >= 80 ? '#52c41a' : accuracy.ordersAccuracy >= 60 ? '#faad14' : '#ff4d4f'}
                  showInfo={false}
                  style={{ marginTop: '8px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="分析天数"
                  value={Object.keys(comparisonData.predictions).length}
                  suffix="天"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="数据完整性"
                  value={Object.keys(comparisonData.actualData).length > 0 ? '完整' : '部分'}
                  valueStyle={{ color: Object.keys(comparisonData.actualData).length > 0 ? '#52c41a' : '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 对比图表 */}
        <Card title={
          <Space>
            <BarChartOutlined />
            销售预测对比图表
          </Space>
        }>
          <div style={{ height: '500px' }}>
            {chartData ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#999',
                flexDirection: 'column'
              }}>
                {loading ? (
                  <>
                    <div>加载中...</div>
                  </>
                ) : (
                  <>
                    <div>暂无对比数据</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      请选择门店和日期范围
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 图例说明 */}
        <Card style={{ marginTop: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text strong>图例说明:</Text>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li><Text style={{ color: '#52c41a' }}>实际销售额</Text> - 绿色实线，显示已发生的实际销售数据</li>
                <li><Text style={{ color: '#1890ff' }}>预测销售额</Text> - 蓝色虚线，显示所有日期的预测数据</li>
                <li><Text style={{ color: '#faad14' }}>未来预测</Text> - 橙色点划线，显示未来日期的预测数据</li>
              </ul>
            </Col>
          </Row>
        </Card>
      </Card>
    </div>
  );
};

export default SalesComparison; 