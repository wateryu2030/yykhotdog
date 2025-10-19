import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Space, Select, DatePicker, message, Typography, Badge, Avatar } from 'antd';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
  Filler,
  ArcElement,
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
  BarElement,
  ArcElement,
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
  // 支持两种数据格式
  // 格式1: 预测格式 (用于时间序列预测)
  predictions?: any;
  actualData?: any;
  accuracyData?: any;
  currentDate?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  
  // 格式2: 对比格式 (用于期间对比)
  current?: {
    period: string;
    sales: number;
    orders: number;
    customers: number;
    avgOrderValue: number;
  };
  previous?: {
    period: string;
    sales: number;
    orders: number;
    customers: number;
    avgOrderValue: number;
  };
  comparison?: {
    salesChange: number;
    salesChangePercent: number;
    ordersChange: number;
    ordersChangePercent: number;
    trend: string;
  };
}

interface Store {
  id: string;
  store_name: string;
  store_code: string;
}

interface StoreComparisonData {
  storeId: string;
  storeName: string;
  city: string;
  district: string;
  sales: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
  productCategories: {
    category: string;
    sales: number;
    orders: number;
  }[];
}

interface OverallComparisonData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  storeRankings: StoreComparisonData[];
  categoryDistribution: {
    category: string;
    sales: number;
    percentage: number;
  }[];
}

const SalesComparison: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs().subtract(1, 'day')]);
  
  // 新增城市相关状态
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  // 多选对比相关状态
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [cityComparisonData, setCityComparisonData] = useState<any[]>([]);
  const [storeComparisonData, setStoreComparisonData] = useState<any[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]);
  
  // 新增状态
  const [overallComparisonData, setOverallComparisonData] = useState<OverallComparisonData | null>(null);
  const [storeVsOthersData, setStoreVsOthersData] = useState<any>(null);
  const [comparisonType, setComparisonType] = useState<'overview' | 'city-comparison' | 'store-comparison'>('overview');

  // 获取城市列表
  const fetchCities = async () => {
    try {
      const response = await api.get('/customer-profile/cities');
      if (response.data.success) {
        setCities(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedCity(response.data.data[0].name);
        }
      }
    } catch (error) {
      console.error('获取城市列表失败:', error);
      message.error('获取城市列表失败');
    }
  };

  // 获取门店列表
  const fetchStores = async (cityName?: string) => {
    try {
      let url = '/operations/stores';
      if (cityName) {
        url = `/customer-profile/stores/by-city-name/${encodeURIComponent(cityName)}`;
      }
      
      const response = await api.get(url);
        if (response.data.success) {
          setStores(response.data.data);
          if (response.data.data.length > 0) {
          setSelectedStore(response.data.data[0].id);
        } else {
          setSelectedStore('');
          }
        }
      } catch (error) {
        console.error('获取门店列表失败:', error);
        message.error('获取门店列表失败');
      }
    };

  // 获取所有门店数据（用于门店对比）
  const fetchAllStores = async () => {
    try {
      const response = await api.get('/customer-profile/stores');
      if (response.data.success) {
        setAllStores(response.data.data);
      } else {
        message.error('获取所有门店列表失败');
      }
    } catch (error) {
      console.error('获取所有门店列表失败:', error);
      message.error('获取所有门店列表失败');
    }
  };

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      await fetchCities();
      await fetchAllStores();
    };
    initializeData();
  }, []);

  // 当城市改变时，重新获取门店列表
  useEffect(() => {
    if (selectedCity) {
      fetchStores(selectedCity);
    }
  }, [selectedCity]);

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

  // 获取门店对比数据
  const fetchStoreComparisonData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const response = await api.get('/sales-prediction/store-comparison', {
        params: { startDate, endDate }
      });

      if (response.data.success) {
        let allStoreData = response.data.data;
        
        // 如果选择了城市，先按城市过滤
        if (selectedCity) {
          allStoreData = allStoreData.filter((store: any) => store.city === selectedCity);
        }
        
        // 如果是门店对比模式，过滤出选中的门店
        if (comparisonType === 'store-comparison' && selectedStores.length >= 2) {
          const filteredData = allStoreData.filter((store: any) => 
            selectedStores.includes(store.storeId)
          );
          setStoreComparisonData(filteredData);
        } else {
          // 概览模式，显示过滤后的门店
          setStoreComparisonData(allStoreData);
        }
      } else {
        message.error('获取门店对比数据失败');
      }
    } catch (error) {
      console.error('获取门店对比数据失败:', error);
      message.error('获取门店对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取总体对比数据
  const fetchOverallComparisonData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const response = await api.get('/sales-prediction/overall-comparison', {
        params: { startDate, endDate }
      });

      if (response.data.success) {
        setOverallComparisonData(response.data.data);
      } else {
        message.error('获取总体对比数据失败');
      }
    } catch (error) {
      console.error('获取总体对比数据失败:', error);
      message.error('获取总体对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取门店与其他门店的对比数据
  const fetchStoreVsOthersData = async () => {
    if (!selectedStore) {
      message.warning('请先选择门店');
      return;
    }
    
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const response = await api.get(`/sales-prediction/store-vs-others/${selectedStore}`, {
        params: { startDate, endDate }
      });

      if (response.data.success) {
        setStoreVsOthersData(response.data.data);
      } else {
        message.error('获取门店对比数据失败');
      }
    } catch (error) {
      console.error('获取门店对比数据失败:', error);
      message.error('获取门店对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取城市对比数据
  const fetchCityComparisonData = async () => {
    if (selectedCities.length < 2) {
      message.warning('请至少选择2个城市进行对比');
      return;
    }
    
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      // 获取所有门店数据，然后按城市分组
      const response = await api.get('/sales-prediction/store-comparison', {
        params: { startDate, endDate }
      });

      if (response.data.success) {
        const allStoreData = response.data.data;
        
        // 按城市分组统计
        const cityData = allStoreData.reduce((acc: any, store: any) => {
          const city = store.storeName.split('店')[0] || '未知城市';
          if (selectedCities.includes(city)) {
            if (!acc[city]) {
              acc[city] = { 
                cityName: city, 
                sales: 0, 
                orders: 0, 
                customers: 0, 
                stores: 0,
                avgOrderValue: 0
              };
            }
            acc[city].sales += store.sales;
            acc[city].orders += store.orders;
            acc[city].customers += store.customers;
            acc[city].stores += 1;
          }
          return acc;
        }, {});

        // 计算平均订单价值
        Object.values(cityData).forEach((city: any) => {
          city.avgOrderValue = city.orders > 0 ? city.sales / city.orders : 0;
        });

        setCityComparisonData(Object.values(cityData));
      } else {
        message.error('获取城市对比数据失败');
      }
    } catch (error) {
      console.error('获取城市对比数据失败:', error);
      message.error('获取城市对比数据失败');
    } finally {
      setLoading(false);
    }
  };


  // 当选择或日期范围改变时获取数据
  useEffect(() => {
    if (comparisonType === 'overview') {
      // 概览：获取所有数据
      fetchStoreComparisonData();
      fetchOverallComparisonData();
    } else if (comparisonType === 'city-comparison') {
      // 城市对比：获取选中的城市数据
      if (selectedCities.length >= 2) {
        fetchCityComparisonData();
      }
    } else if (comparisonType === 'store-comparison') {
      // 门店对比：获取选中的门店数据
      if (selectedStores.length >= 2) {
        fetchStoreComparisonData();
      }
    }
  }, [selectedCities, selectedStores, selectedCity, dateRange, comparisonType]);

  // 生成对比图表数据
  const generateComparisonChartData = () => {
    if (!comparisonData) return null;

    // 类型断言，确保TypeScript理解数据结构
    const data = comparisonData as ComparisonData;
    
    // 检查数据结构，如果是current/previous格式，转换为简单对比图表
    if (data.current && data.previous && !data.predictions) {
      const labels = [data.previous.period || '对比期间', data.current.period || '当前期间'];
      
      return {
        labels,
        datasets: [
          {
            label: '销售额',
            data: [data.previous.sales || 0, data.current.sales || 0],
            borderColor: '#1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            fill: true,
          }
        ]
      };
    }

    // 如果没有predictions字段，返回null
    if (!data.predictions) return null;

    const dates = Object.keys(data.predictions).sort();
    const currentDate = new Date().toISOString().split('T')[0];
    
    const labels = dates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const actualData = dates.map(date => {
      const actual = data.actualData[date];
      return actual ? actual.totalSales : 0;
    });

    const predictedData = dates.map(date => {
      const predicted = data.predictions[date];
      if (!predicted || predicted.length === 0) return 0;
      // 计算日总预测销售额（而不是日平均）
      const totalPredictedSales = predicted.reduce((sum: number, p: any) => sum + p.predictedSales, 0);
      return Math.round(totalPredictedSales * 100) / 100;
    });

    // 区分实际数据和预测数据
    const actualOnlyData = dates.map((date, index) => {
      if (date <= currentDate && data.actualData[date]?.totalSales > 0) {
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
            return `${label}: ¥${(value || 0).toFixed(2)}`;
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
    
    // 类型断言
    const data = comparisonData as ComparisonData;
    
    // 如果是current/previous格式，使用comparison数据计算准确率
    if (data.comparison && !data.accuracyData) {
      // 基于变化百分比计算一个简化的准确率指标
      const changePercent = Math.abs(data.comparison.salesChangePercent || 0);
      const accuracy = Math.max(0, 100 - changePercent);
      
      return {
        salesAccuracy: Math.round(accuracy * 100) / 100,
        ordersAccuracy: Math.round(accuracy * 100) / 100
      };
    }
    
    if (!data.accuracyData) return { salesAccuracy: 0, ordersAccuracy: 0 };
    
    const dates = Object.keys(data.accuracyData);
    let totalSalesAccuracy = 0;
    let totalOrdersAccuracy = 0;
    let count = 0;

    dates.forEach(date => {
      const accuracy = data.accuracyData[date];
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

  // 生成门店对比图表数据
  const generateStoreComparisonChartData = () => {
    if (!storeComparisonData || storeComparisonData.length === 0) return null;
    
    const sortedStores = [...storeComparisonData].sort((a, b) => b.sales - a.sales);
    const top10Stores = sortedStores.slice(0, 10);
    
    return {
      labels: top10Stores.map(store => store.storeName),
      datasets: [
        {
          label: '销售额',
          data: top10Stores.map(store => store.sales),
          backgroundColor: 'rgba(24, 144, 255, 0.6)',
          borderColor: '#1890ff',
          borderWidth: 1,
        },
        {
          label: '订单数',
          data: top10Stores.map(store => store.orders),
          backgroundColor: 'rgba(82, 196, 26, 0.6)',
          borderColor: '#52c41a',
          borderWidth: 1,
        }
      ]
    };
  };

  // 生成总体对比图表数据
  const generateOverallComparisonChartData = () => {
    if (!overallComparisonData) return null;
    
    return {
      labels: ['总销售额', '总订单数', '总客户数', '平均订单价值'],
      datasets: [
        {
          label: '数值',
          data: [
            overallComparisonData.totalSales,
            overallComparisonData.totalOrders,
            overallComparisonData.totalCustomers,
            overallComparisonData.avgOrderValue
          ],
          backgroundColor: [
            'rgba(24, 144, 255, 0.6)',
            'rgba(82, 196, 26, 0.6)',
            'rgba(250, 173, 20, 0.6)',
            'rgba(245, 34, 45, 0.6)'
          ],
          borderColor: [
            '#1890ff',
            '#52c41a',
            '#faad14',
            '#f5222d'
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  // 生成商品品类对比图表数据
  const generateCategoryComparisonChartData = () => {
    if (!overallComparisonData || !overallComparisonData.categoryDistribution) return null;
    
    return {
      labels: overallComparisonData.categoryDistribution.map(item => item.category),
      datasets: [
        {
          label: '销售额占比',
          data: overallComparisonData.categoryDistribution.map(item => item.percentage),
          backgroundColor: [
            'rgba(24, 144, 255, 0.6)',
            'rgba(82, 196, 26, 0.6)',
            'rgba(250, 173, 20, 0.6)',
            'rgba(245, 34, 45, 0.6)',
            'rgba(114, 46, 209, 0.6)',
            'rgba(13, 202, 240, 0.6)',
            'rgba(255, 107, 107, 0.6)',
            'rgba(34, 197, 94, 0.6)'
          ],
          borderColor: [
            '#1890ff',
            '#52c41a',
            '#faad14',
            '#f5222d',
            '#722ed1',
            '#0dcaf0',
            '#ff6b6b',
            '#22c55e'
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  // 生成门店与其他门店对比图表数据
  const generateStoreVsOthersChartData = () => {
    if (!storeVsOthersData) return null;
    
    const { targetStore, otherStores } = storeVsOthersData;
    const allStores = [targetStore, ...otherStores.slice(0, 9)]; // 目标门店 + 前9个其他门店
    
    return {
      labels: allStores.map(store => store.storeName),
      datasets: [
        {
          label: '销售额',
          data: allStores.map(store => store.sales),
          backgroundColor: allStores.map((store, index) => 
            index === 0 ? 'rgba(245, 34, 45, 0.6)' : 'rgba(24, 144, 255, 0.6)'
          ),
          borderColor: allStores.map((store, index) => 
            index === 0 ? '#f5222d' : '#1890ff'
          ),
          borderWidth: 1,
        },
        {
          label: '订单数',
          data: allStores.map(store => store.orders),
          backgroundColor: allStores.map((store, index) => 
            index === 0 ? 'rgba(82, 196, 26, 0.6)' : 'rgba(250, 173, 20, 0.6)'
          ),
          borderColor: allStores.map((store, index) => 
            index === 0 ? '#52c41a' : '#faad14'
          ),
          borderWidth: 1,
        }
      ]
    };
  };

  // 生成城市运营概览图表数据
  const generateCityOverviewChartData = () => {
    if (!storeComparisonData || storeComparisonData.length === 0) return null;
    
    // 如果选择了城市，显示该城市的门店数据
    if (selectedCity) {
      const sortedStores = [...storeComparisonData].sort((a, b) => b.sales - a.sales);
      
      return {
        labels: sortedStores.map(store => store.storeName),
        datasets: [
          {
            label: '销售额 (万元)',
            data: sortedStores.map(store => store.sales / 10000),
            backgroundColor: 'rgba(24, 144, 255, 0.6)',
            borderColor: '#1890ff',
            borderWidth: 1,
          },
          {
            label: '订单数',
            data: sortedStores.map(store => store.orders),
            backgroundColor: 'rgba(82, 196, 26, 0.6)',
            borderColor: '#52c41a',
            borderWidth: 1,
          }
        ]
      };
    }
    
    // 否则按城市分组统计销售数据
    const cityData = storeComparisonData.reduce((acc, store) => {
      const city = store.city || '未知城市';
      if (!acc[city]) {
        acc[city] = { 
          sales: 0, 
          orders: 0, 
          customers: 0, 
          stores: 0, 
          avgOrderValue: 0,
          avgSalesPerStore: 0,
          avgOrdersPerStore: 0
        };
      }
      acc[city].sales += store.sales;
      acc[city].orders += store.orders;
      acc[city].customers += store.customers;
      acc[city].stores += 1;
      acc[city].avgOrderValue = acc[city].sales / acc[city].orders;
      acc[city].avgSalesPerStore = acc[city].sales / acc[city].stores;
      acc[city].avgOrdersPerStore = acc[city].orders / acc[city].stores;
      return acc;
    }, {} as Record<string, { 
      sales: number; 
      orders: number; 
      customers: number; 
      stores: number; 
      avgOrderValue: number;
      avgSalesPerStore: number;
      avgOrdersPerStore: number;
    }>);

    const sortedCities = Object.entries(cityData)
      .sort(([,a], [,b]) => (b as any).sales - (a as any).sales);

    return {
      labels: sortedCities.map(([city]) => city),
      datasets: [
        {
          label: '销售额 (万元)',
          data: sortedCities.map(([, data]) => (data as any).sales / 10000),
          backgroundColor: 'rgba(24, 144, 255, 0.6)',
          borderColor: '#1890ff',
          borderWidth: 1,
        },
        {
          label: '订单数',
          data: sortedCities.map(([, data]) => (data as any).orders),
          backgroundColor: 'rgba(82, 196, 26, 0.6)',
          borderColor: '#52c41a',
          borderWidth: 1,
        }
      ]
    };
  };


  // 生成门店排名数据
  const generateStoreRankingData = () => {
    if (!storeComparisonData || storeComparisonData.length === 0) return null;
    
    let filteredData = storeComparisonData;
    
    // 如果选择了特定城市，只显示该城市的数据
    if (selectedCity) {
      filteredData = storeComparisonData.filter(store => 
        store.storeName.includes(selectedCity)
      );
    }
    
    return filteredData
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  };

  // 生成商品表现图表数据
  const generateProductPerformanceChartData = () => {
    if (!overallComparisonData || !overallComparisonData.categoryDistribution) return null;
    
    const topCategories = overallComparisonData.categoryDistribution.slice(0, 5);
    
    return {
      labels: topCategories.map(item => item.category),
      datasets: [
        {
          label: '销售额占比',
          data: topCategories.map(item => item.percentage),
          backgroundColor: [
            'rgba(24, 144, 255, 0.6)',
            'rgba(82, 196, 26, 0.6)',
            'rgba(250, 173, 20, 0.6)',
            'rgba(245, 34, 45, 0.6)',
            'rgba(114, 46, 209, 0.6)'
          ],
          borderColor: [
            '#1890ff',
            '#52c41a',
            '#faad14',
            '#f5222d',
            '#722ed1'
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  // 生成趋势分析图表数据
  const generateTrendAnalysisChartData = () => {
    if (!comparisonData) return null;
    
    // 模拟趋势数据（实际应该从历史数据中获取）
    const months = ['1月', '2月', '3月', '4月'];
    const salesData = [20, 35, 45, 40]; // 模拟数据，单位：万元
    
    return {
      labels: months,
      datasets: [
        {
          label: '销售额',
          data: salesData,
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0 24px', background: '#fff', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LineChartOutlined style={{ fontSize: 28, color: '#faad14', marginRight: 8 }} />
            <span style={{ fontWeight: 'bold', fontSize: 24 }}>城市与门店经营分析</span>
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
                <Text strong>分析类型:</Text>
                <Select
                  value={comparisonType}
                  onChange={setComparisonType}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <Option value="overview">概览分析</Option>
                  <Option value="city-comparison">城市对比</Option>
                  <Option value="store-comparison">门店对比</Option>
                </Select>
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong>选择城市:</Text>
                <Select
                  value={selectedCity}
                  onChange={setSelectedCity}
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="选择城市"
                  allowClear
                >
                  {cities.map((city, index) => (
                    <Option key={city.id || `city-${index}`} value={city.name}>
                      {city.name} ({city.store_count}店)
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            {comparisonType === 'city-comparison' && (
              <Col xs={24} sm={12} md={12}>
                <div>
                  <Text strong>选择对比城市 (至少2个):</Text>
                  <Select
                    mode="multiple"
                    value={selectedCities}
                    onChange={setSelectedCities}
                    style={{ width: '100%', marginTop: '8px' }}
                    placeholder="选择要对比的城市"
                    maxTagCount={3}
                  >
                    {cities.map((city, index) => (
                      <Option key={city.id || `city-${index}`} value={city.name}>
                        {city.name} ({city.store_count}店)
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            )}
            
            {comparisonType === 'store-comparison' && (
              <Col xs={24} sm={12} md={12}>
                <div>
                  <Text strong>选择对比门店 (至少2个):</Text>
                  <Select
                    mode="multiple"
                    value={selectedStores}
                    onChange={setSelectedStores}
                    style={{ width: '100%', marginTop: '8px' }}
                    placeholder="选择要对比的门店"
                    maxTagCount={3}
                  >
                    {allStores.map((store, index) => (
                      <Option key={store.id || `store-${index}`} value={store.id}>
                        {store.store_name}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
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
            <Col xs={24} sm={12} md={6}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => {
                  if (comparisonType === 'overview') {
                    fetchStoreComparisonData();
                    fetchOverallComparisonData();
                  } else if (comparisonType === 'city-comparison' && selectedCities.length >= 2) {
                    fetchCityComparisonData();
                  } else if (comparisonType === 'store-comparison' && selectedStores.length >= 2) {
                    fetchStoreComparisonData();
                  }
                }}
                loading={loading}
                style={{ width: '100%' }}
              >
                刷新数据
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 概览分析 - 城市和门店基本情况 */}
        {comparisonType === 'overview' && (
          <>
            {/* 城市概览信息框 */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24}>
                <Card title={
                  <Space>
                    <BarChartOutlined />
                    城市运营情况概览
                  </Space>
                }>
                  <div style={{ height: '400px' }}>
                    {generateCityOverviewChartData() ? (
                      <Bar data={generateCityOverviewChartData()!} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' as const },
                          title: { display: true, text: '各城市运营情况对比' }
                        },
                        scales: {
                          y: { beginAtZero: true, title: { display: true, text: '数值' } },
                          x: { title: { display: true, text: '城市' } }
                        }
                      }} />
                    ) : (
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#999'
                      }}>
                        {loading ? '加载中...' : '暂无数据'}
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 门店概览信息框 */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24}>
                <Card title={
                  <Space>
                    <BarChartOutlined />
                    门店运营情况概览
                  </Space>
                }>
                  <div style={{ height: '400px', overflow: 'auto' }}>
                    {storeComparisonData && storeComparisonData.length > 0 ? (
                      <div>
                        {storeComparisonData.slice(0, 10).map((store, index) => (
                          <div key={store.storeId} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: index < 9 ? '1px solid #f0f0f0' : 'none'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginRight: '12px'
                              }}>
                                {index + 1}
                              </div>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{store.storeName}</div>
                                <div style={{ color: '#666', fontSize: '12px' }}>订单: {store.orders} | 客户: {store.customers}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 'bold', color: '#1890ff' }}>¥{(store.sales / 10000).toFixed(1)}万</div>
                              <div style={{ color: '#666', fontSize: '12px' }}>¥{store.avgOrderValue.toFixed(0)}/单</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#999'
                      }}>
                        暂无数据
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* 城市对比分析 */}
        {comparisonType === 'city-comparison' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  城市对比分析
                </Space>
              }>
                <div style={{ height: '500px' }}>
                  {cityComparisonData && cityComparisonData.length > 0 ? (
                    <Bar data={{
                      labels: cityComparisonData.map((city: any) => city.cityName),
                      datasets: [
                        {
                          label: '销售额 (万元)',
                          data: cityComparisonData.map((city: any) => city.sales / 10000),
                          backgroundColor: 'rgba(24, 144, 255, 0.6)',
                          borderColor: '#1890ff',
                          borderWidth: 1,
                        },
                        {
                          label: '订单数',
                          data: cityComparisonData.map((city: any) => city.orders),
                          backgroundColor: 'rgba(82, 196, 26, 0.6)',
                          borderColor: '#52c41a',
                          borderWidth: 1,
                        },
                        {
                          label: '客户数',
                          data: cityComparisonData.map((city: any) => city.customers),
                          backgroundColor: 'rgba(250, 173, 20, 0.6)',
                          borderColor: '#faad14',
                          borderWidth: 1,
                        }
                      ]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: '选中城市运营情况对比' }
                      },
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: '数值' } },
                        x: { title: { display: true, text: '城市' } }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {selectedCities.length < 2 ? '请选择至少2个城市进行对比' : (loading ? '加载中...' : '暂无数据')}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 门店对比分析 */}
        {comparisonType === 'store-comparison' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  门店对比分析
                </Space>
              }>
                <div style={{ height: '500px' }}>
                  {storeComparisonData && storeComparisonData.length > 0 ? (
                    <Bar data={{
                      labels: storeComparisonData.map((store: any) => store.storeName),
                      datasets: [
                        {
                          label: '销售额 (万元)',
                          data: storeComparisonData.map((store: any) => store.sales / 10000),
                          backgroundColor: 'rgba(24, 144, 255, 0.6)',
                          borderColor: '#1890ff',
                          borderWidth: 1,
                        },
                        {
                          label: '订单数',
                          data: storeComparisonData.map((store: any) => store.orders),
                          backgroundColor: 'rgba(82, 196, 26, 0.6)',
                          borderColor: '#52c41a',
                          borderWidth: 1,
                        },
                        {
                          label: '客户数',
                          data: storeComparisonData.map((store: any) => store.customers),
                          backgroundColor: 'rgba(250, 173, 20, 0.6)',
                          borderColor: '#faad14',
                          borderWidth: 1,
                        }
                      ]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: '选中门店运营情况对比' }
                      },
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: '数值' } },
                        x: { title: { display: true, text: '门店' } }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {selectedStores.length < 2 ? '请选择至少2个门店进行对比' : (loading ? '加载中...' : '暂无数据')}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 城市销售对比 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card title={
              <Space>
                <BarChartOutlined />
{selectedCity ? `${selectedCity}门店销售对比` : '城市销售对比'}
              </Space>
            }>
              <div style={{ height: '300px' }}>
                {generateCityOverviewChartData() ? (
                  <Bar data={generateCityOverviewChartData()!} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
                      title: { display: true, text: '各城市销售额对比' }
                    },
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: '销售额 (万元)' } },
                      x: { title: { display: true, text: '城市' } }
                    }
                  }} />
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    {loading ? '加载中...' : '暂无数据'}
                  </div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={
              <Space>
                <BarChartOutlined />
{selectedCity ? `${selectedCity}门店表现榜单` : '门店表现榜单'}
              </Space>
            }>
              <div style={{ height: '300px', overflow: 'auto' }}>
                {generateStoreRankingData() ? (
                  <div>
                    {generateStoreRankingData()!.map((store, index) => (
                      <div key={store.storeId} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < generateStoreRankingData()!.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginRight: '12px'
                          }}>
                            {index + 1}
                          </div>
                          <span style={{ fontWeight: 'bold' }}>{store.storeName}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                            ¥{(store.sales / 10000).toFixed(1)}万
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            订单: {store.orders} | 客户: {store.customers}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    {loading ? '加载中...' : '暂无数据'}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 商品表现分析 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card title={
              <Space>
                <BarChartOutlined />
                商品表现
              </Space>
            }>
              <div style={{ height: '300px' }}>
                {generateProductPerformanceChartData() ? (
                  <Doughnut data={generateProductPerformanceChartData()!} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' as const },
                      title: { display: true, text: '商品品类销售分布' }
                    }
                  }} />
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    {loading ? '加载中...' : '暂无数据'}
                  </div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={
              <Space>
                <BarChartOutlined />
                趋势分析
              </Space>
            }>
              <div style={{ height: '300px' }}>
                {generateTrendAnalysisChartData() ? (
                  <Line data={generateTrendAnalysisChartData()!} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
                      title: { display: true, text: '销售趋势分析' }
                    },
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: '销售额 (万元)' } },
                      x: { title: { display: true, text: '时间' } }
                    }
                  }} />
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    {loading ? '加载中...' : '暂无数据'}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 运营洞察与预警 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24}>
            <Card title={
              <Space>
                <BellOutlined />
                运营洞察与预警
              </Space>
            }>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px',
                    border: '1px solid #ff4d4f',
                    borderRadius: '8px',
                    backgroundColor: '#fff2f0'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      backgroundColor: '#ff4d4f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <span style={{ color: 'white', fontSize: '20px' }}>↓</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#ff4d4f' }}>销售预警</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>部分门店销售下滑</div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px',
                    border: '1px solid #faad14',
                    borderRadius: '8px',
                    backgroundColor: '#fffbe6'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      backgroundColor: '#faad14',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <span style={{ color: 'white', fontSize: '20px' }}>○</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#faad14' }}>库存提醒</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>部分商品库存不足</div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px',
                    border: '1px solid #52c41a',
                    borderRadius: '8px',
                    backgroundColor: '#f6ffed'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      backgroundColor: '#52c41a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <span style={{ color: 'white', fontSize: '20px' }}>↑</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#52c41a' }}>优化建议</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>可增加热门商品供应</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 门店实际对比图表 */}
        {comparisonType === 'store-comparison' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  门店实际销售对比
                </Space>
              }>
                <div style={{ height: '400px' }}>
                  {generateStoreVsOthersChartData() ? (
                    <Bar data={generateStoreVsOthersChartData()!} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: '门店实际销售对比（红色为目标门店）' }
                      },
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: '销售额 (¥)' } },
                        x: { title: { display: true, text: '门店' } }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  目标门店详情
                </Space>
              }>
                {storeVsOthersData && storeVsOthersData.targetStore && (
                  <div style={{ padding: '16px' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                <Statistic
                          title="销售额"
                          value={storeVsOthersData.targetStore.sales}
                          precision={2}
                          prefix="¥"
                        />
            </Col>
                      <Col span={12}>
                <Statistic
                          title="订单数"
                          value={storeVsOthersData.targetStore.orders}
                        />
            </Col>
                      <Col span={12}>
                <Statistic
                          title="客户数"
                          value={storeVsOthersData.targetStore.customers}
                        />
            </Col>
                      <Col span={12}>
                <Statistic
                          title="平均订单价值"
                          value={storeVsOthersData.targetStore.avgOrderValue}
                          precision={2}
                          prefix="¥"
                        />
                      </Col>
                    </Row>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}


        {/* 概览分析 - 城市统计信息 */}
        {comparisonType === 'overview' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            {/* 城市运营统计 */}
            <Col xs={24} lg={8}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  城市运营统计
                </Space>
              }>
                <div style={{ height: '400px', overflow: 'auto' }}>
                  {storeComparisonData && storeComparisonData.length > 0 ? (
                    <div>
                      {(() => {
                        // 按城市分组统计
                        const cityData = storeComparisonData.reduce((acc, store) => {
                          const city = store.city || '未知城市';
                          if (!acc[city]) {
                            acc[city] = { 
                              sales: 0, 
                              orders: 0, 
                              customers: 0, 
                              stores: 0,
                              avgSalesPerStore: 0,
                              avgOrdersPerStore: 0
                            };
                          }
                          acc[city].sales += store.sales;
                          acc[city].orders += store.orders;
                          acc[city].customers += store.customers;
                          acc[city].stores += 1;
                          acc[city].avgSalesPerStore = acc[city].sales / acc[city].stores;
                          acc[city].avgOrdersPerStore = acc[city].orders / acc[city].stores;
                          return acc;
                        }, {} as Record<string, any>);

                        const sortedCities = Object.entries(cityData)
                          .sort(([,a], [,b]) => (b as any).sales - (a as any).sales);

                        return sortedCities.map(([city, data], index) => (
                          <div key={city} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '16px 0',
                            borderBottom: index < sortedCities.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginRight: '16px'
                              }}>
                                {index + 1}
                              </div>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{city}</div>
                                <div style={{ color: '#666', fontSize: '13px', lineHeight: '1.4' }}>
                                  <div>门店: {(data as any).stores} | 订单: {(data as any).orders}</div>
                                  <div>客户: {(data as any).customers} | 平均: ¥{((data as any).avgSalesPerStore / 10000).toFixed(1)}万/店</div>
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '18px' }}>¥{((data as any).sales / 10000).toFixed(1)}万</div>
                              <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                                总销售额
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      暂无数据
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* 城市销售对比图表 */}
            <Col xs={24} lg={8}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  城市销售对比
                </Space>
              }>
                <div style={{ height: '400px' }}>
                  {generateCityOverviewChartData() ? (
                    <Bar data={generateCityOverviewChartData()!} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: '各城市销售对比' }
                      },
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: '销售额 (万元)' } },
                        x: { title: { display: true, text: '城市' } }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* 商品品类分布 */}
            <Col xs={24} lg={8}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  商品品类分布
                </Space>
              }>
                <div style={{ height: '400px' }}>
                  {generateCategoryComparisonChartData() ? (
                    <Doughnut data={generateCategoryComparisonChartData()!} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right' as const },
                        title: { display: true, text: '商品品类分布' }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 概览分析 - 城市详细信息 */}
        {comparisonType === 'overview' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            {/* 城市详细统计 */}
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  城市详细统计
                </Space>
              }>
                <div style={{ height: '400px', overflow: 'auto' }}>
                  {storeComparisonData && storeComparisonData.length > 0 ? (
                    <div>
                      {(() => {
                        // 按城市分组统计
                        const cityData = storeComparisonData.reduce((acc, store) => {
                          const city = store.city || '未知城市';
                          if (!acc[city]) {
                            acc[city] = { 
                              sales: 0, 
                              orders: 0, 
                              customers: 0, 
                              stores: 0,
                              avgSalesPerStore: 0,
                              avgOrdersPerStore: 0,
                              storeList: []
                            };
                          }
                          acc[city].sales += store.sales;
                          acc[city].orders += store.orders;
                          acc[city].customers += store.customers;
                          acc[city].stores += 1;
                          acc[city].avgSalesPerStore = acc[city].sales / acc[city].stores;
                          acc[city].avgOrdersPerStore = acc[city].orders / acc[city].stores;
                          acc[city].storeList.push(store);
                          return acc;
                        }, {} as Record<string, any>);

                        const sortedCities = Object.entries(cityData)
                          .sort(([,a], [,b]) => (b as any).sales - (a as any).sales);

                        return sortedCities.map(([city, data]) => (
                          <div key={city} style={{ 
                            marginBottom: '24px',
                            padding: '16px',
                            border: '1px solid #f0f0f0',
                            borderRadius: '8px',
                            backgroundColor: '#fafafa'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '16px'
                            }}>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1890ff' }}>{city}</div>
                                <div style={{ color: '#666', fontSize: '14px' }}>
                                  门店: {(data as any).stores} | 订单: {(data as any).orders} | 客户: {(data as any).customers}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '20px' }}>¥{((data as any).sales / 10000).toFixed(1)}万</div>
                                <div style={{ color: '#666', fontSize: '12px' }}>总销售额</div>
                              </div>
                            </div>
                            
                            {/* 该城市门店列表 */}
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>门店详情:</div>
                              {(data as any).storeList.slice(0, 3).map((store: any, index: number) => (
                                <div key={store.storeId} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  padding: '8px 0',
                                  borderBottom: index < 2 ? '1px solid #e8e8e8' : 'none'
                                }}>
                                  <div style={{ fontSize: '13px', color: '#666' }}>{store.storeName}</div>
                                  <div style={{ fontSize: '13px', color: '#1890ff' }}>¥{(store.sales / 10000).toFixed(1)}万</div>
                                </div>
                              ))}
                              {(data as any).storeList.length > 3 && (
                                <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '8px' }}>
                                  还有 {(data as any).storeList.length - 3} 个门店...
                                </div>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      暂无数据
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* 门店表现榜单 */}
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  门店表现榜单
                </Space>
              }>
                <div style={{ height: '400px', overflow: 'auto' }}>
                  {storeComparisonData && storeComparisonData.length > 0 ? (
                    <div>
                      {storeComparisonData.slice(0, 15).map((store, index) => (
                        <div key={store.storeId} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: index < 14 ? '1px solid #f0f0f0' : 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%', 
                              backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              marginRight: '12px'
                            }}>
                              {index + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{store.storeName}</div>
                              <div style={{ color: '#666', fontSize: '12px' }}>
                                {store.city} | 订单: {store.orders} | 客户: {store.customers}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', color: '#1890ff' }}>¥{(store.sales / 10000).toFixed(1)}万</div>
                            <div style={{ color: '#666', fontSize: '12px' }}>¥{store.avgOrderValue.toFixed(0)}/单</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      暂无数据
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 概览分析 - 趋势分析和统计卡片 */}
        {comparisonType === 'overview' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            {/* 销售趋势分析 */}
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  销售趋势分析
                </Space>
              }>
                <div style={{ height: '300px' }}>
                  {generateTrendAnalysisChartData() ? (
                    <Line data={generateTrendAnalysisChartData()!} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: '销售趋势分析' }
                      },
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: '销售额 (¥)' } },
                        x: { title: { display: true, text: '时间' } }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* 关键指标统计 */}
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  关键指标统计
                </Space>
              }>
                <div style={{ height: '300px', padding: '16px' }}>
                  {overallComparisonData ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                          ¥{(overallComparisonData.totalSales / 10000).toFixed(1)}万
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>总销售额</div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#e6f7ff',
                        border: '1px solid #91d5ff',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                          {overallComparisonData.totalOrders}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>总订单数</div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#fff7e6',
                        border: '1px solid #ffd591',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                          {overallComparisonData.totalCustomers}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>总客户数</div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                          ¥{overallComparisonData.avgOrderValue.toFixed(0)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>平均订单价值</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 概览分析 - 城市对比分析 */}
        {comparisonType === 'overview' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  城市对比分析
                </Space>
              }>
                <div style={{ height: '300px' }}>
                  {generateCityOverviewChartData() ? (
                    <Bar data={generateCityOverviewChartData()!} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: '城市销售对比分析' }
                      },
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: '销售额 (万元)' } },
                        x: { title: { display: true, text: '城市' } }
                      }
                    }} />
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 运营洞察与预警 */}
        {comparisonType === 'overview' && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card 
                style={{ 
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
                  color: 'white',
                  border: 'none'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>销售预警</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>部分门店销售下滑</div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card 
                style={{ 
                  background: 'linear-gradient(135deg, #ffa726 0%, #ffb74d 100%)',
                  color: 'white',
                  border: 'none'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>库存提醒</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>部分商品库存不足</div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card 
                style={{ 
                  background: 'linear-gradient(135deg, #66bb6a 0%, #81c784 100%)',
                  color: 'white',
                  border: 'none'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>优化建议</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>可增加热门商品供应</div>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
};

export default SalesComparison; 