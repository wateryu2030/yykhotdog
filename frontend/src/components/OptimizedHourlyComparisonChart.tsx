import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Row, Col, Statistic, Select, Button, Space, Typography, Tooltip, Progress, Spin, Alert } from 'antd';
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
  ClockCircleOutlined,
  DatabaseOutlined
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

// 数据缓存接口
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
}

// 数据缓存管理器
class DataCache {
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 默认5分钟缓存

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 全局缓存实例
const dataCache = new DataCache();

// 定期清理过期缓存
setInterval(() => {
  dataCache.cleanup();
}, 60000); // 每分钟清理一次

interface OptimizedHourlyComparisonProps {
  storeId: string;
  startDate: string;
  endDate: string;
  onDataChange?: (data: any) => void;
  enableCache?: boolean;
  cacheTTL?: number;
}

const OptimizedHourlyComparisonChart: React.FC<OptimizedHourlyComparisonProps> = ({
  storeId,
  startDate,
  endDate,
  onDataChange,
  enableCache = true,
  cacheTTL = 5 * 60 * 1000 // 5分钟
}) => {
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [compareType, setCompareType] = useState<'previous' | 'same_period_last_year'>('previous');
  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'orders' | 'customers'>('sales');
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // 生成缓存键
  const cacheKey = useMemo(() => {
    return `hourly_comparison_${storeId}_${startDate}_${endDate}_${compareType}`;
  }, [storeId, startDate, endDate, compareType]);

  // 获取小时级对比数据（带缓存）
  const fetchHourlyComparison = useCallback(async (forceRefresh = false) => {
    if (!storeId || !startDate || !endDate) return;
    
    // 检查缓存
    if (enableCache && !forceRefresh) {
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        setComparisonData(cachedData);
        onDataChange?.(cachedData);
        setLastFetchTime(Date.now());
        return;
      }
    }
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的请求控制器
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/sales-prediction/hourly-comparison/${storeId}`, {
        params: {
          startDate,
          endDate,
          compareType
        },
        signal: abortControllerRef.current.signal
      });

      if (response.data.success) {
        const data = response.data.data;
        setComparisonData(data);
        onDataChange?.(data);
        setLastFetchTime(Date.now());
        
        // 缓存数据
        if (enableCache) {
          dataCache.set(cacheKey, data, cacheTTL);
        }
      } else {
        setError(response.data.error || '获取数据失败');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('获取小时级对比数据失败:', error);
        setError(error.message || '网络请求失败');
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, startDate, endDate, compareType, enableCache, cacheTTL, cacheKey, onDataChange]);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchHourlyComparison();
    
    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHourlyComparison]);

  // 生成图表数据（使用useMemo优化）
  const chartData = useMemo(() => {
    if (!comparisonData?.hourlyComparison) return null;

    const hours = comparisonData.hourlyComparison.map((item: any) => 
      `${item.hour.toString().padStart(2, '0')}:00`
    );

    let currentData: number[];
    let compareData: number[];
    let label: string;

    switch (selectedMetric) {
      case 'sales':
        currentData = comparisonData.hourlyComparison.map((item: any) => item.current.totalSales);
        compareData = comparisonData.hourlyComparison.map((item: any) => item.compare.totalSales);
        label = '销售额 (元)';
        break;
      case 'orders':
        currentData = comparisonData.hourlyComparison.map((item: any) => item.current.orderCount);
        compareData = comparisonData.hourlyComparison.map((item: any) => item.compare.orderCount);
        label = '订单数';
        break;
      case 'customers':
        currentData = comparisonData.hourlyComparison.map((item: any) => item.current.uniqueCustomers);
        compareData = comparisonData.hourlyComparison.map((item: any) => item.compare.uniqueCustomers);
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
  }, [comparisonData, selectedMetric]);

  // 图表配置（使用useMemo优化）
  const chartOptions = useMemo(() => ({
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
  }), [selectedMetric]);

  // 获取趋势图标
  const getTrendIcon = useCallback((trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'down':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <MinusOutlined style={{ color: '#1890ff' }} />;
    }
  }, []);

  // 获取趋势颜色
  const getTrendColor = useCallback((trend: string) => {
    switch (trend) {
      case 'up':
        return '#52c41a';
      case 'down':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  }, []);

  // 处理强制刷新
  const handleForceRefresh = useCallback(() => {
    fetchHourlyComparison(true);
  }, [fetchHourlyComparison]);

  if (error) {
    return (
      <Card>
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleForceRefresh}>
              重试
            </Button>
          }
        />
      </Card>
    );
  }

  if (!comparisonData && !loading) {
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
          {enableCache && (
            <Tooltip title="数据已缓存，点击刷新按钮强制更新">
              <DatabaseOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
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
            onClick={handleForceRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
    >
      {/* 数据状态指示器 */}
      {lastFetchTime && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            数据更新时间: {dayjs(lastFetchTime).format('HH:mm:ss')}
            {enableCache && ' (已缓存)'}
          </Text>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在加载数据...</Text>
          </div>
        </div>
      )}

      {/* 主要内容 */}
      {!loading && comparisonData && (
        <>
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
                  {comparisonData.hourlyComparison.map((item: any, index: number) => (
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
        </>
      )}
    </Card>
  );
};

export default OptimizedHourlyComparisonChart;
