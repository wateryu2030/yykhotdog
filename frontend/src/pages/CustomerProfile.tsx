import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Modal, message, Space, Tag, Tooltip, Avatar, Badge, Dropdown, Alert, List, InputNumber } from 'antd';
import type { MenuProps } from 'antd';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from 'chart.js';
import { 
  EyeOutlined, 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  TrophyOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  BellOutlined,
  RobotOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import AIInsightsOverview from '../components/AIInsightsOverview';
import PurchasePatternAnalysis from './CustomerProfile/components/PurchasePatternAnalysis';
import AIComprehensiveAnalysis from './CustomerProfile/components/AIComprehensiveAnalysis';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { exportToPDF, exportToWord } from '../utils/exportAIInsights';

ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

const { RangePicker } = DatePicker;
const { Option } = Select;
const now = new Date();
const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

interface CustomerProfileData {
  total_stores: number;
  operating_stores: number;
  total_sales: number;
  total_orders: number;
  totalCustomers: number;
  activeCustomers: number;
  avgOrderValue: number;
  segments: Array<{
    segment_name: string;
    customer_count: number;
    avg_spend: number;
    avg_orders: number;
    total_revenue: number;
    lifetime_value_3y: number;
  }>;
  timeDistribution: Array<{
    hour: string;
    customer_count: number;
    order_count: number;
  }>;
  productPreferences: any[];
  aiSuggestions: any[];
}

interface City {
  name: string;
}

interface Store {
  id: number;
  store_name: string;
  store_code: string;
  city: string;
  district: string;
  province: string;
  status: string;
  store_type: string;
}

type ExportFormat = 'xlsx' | 'csv' | 'pdf';

interface ExportColumnConfig {
  title: string;
  dataIndex?: string;
  getValue?: (record: any) => any;
  formatter?: (value: any, record?: any) => string | number;
}

const EXPORT_MENU_ITEMS: MenuProps['items'] = [
  { key: 'xlsx', label: '导出 Excel (.xlsx)' },
  { key: 'csv', label: '导出 CSV (.csv)' },
  { key: 'pdf', label: '导出 PDF (.pdf)' },
];

const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

const generateFileName = (prefix: string, format: ExportFormat) =>
  `${sanitizeFileName(prefix)}_${dayjs().format('YYYYMMDD_HHmmss')}.${format}`;

const downloadBlob = (content: string | ArrayBuffer, fileName: string, mimeType: string) => {
  const blobPart: BlobPart = typeof content === 'string' ? content : content;
  const blob = new Blob([blobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const formatExportValue = (column: ExportColumnConfig, record: any) => {
  const rawValue =
    column.getValue?.(record) ??
    (column.dataIndex ? record[column.dataIndex] : '');
  if (column.formatter) {
    const formatted = column.formatter(rawValue, record);
    return formatted ?? '';
  }
  if (rawValue === null || rawValue === undefined) {
    return '';
  }
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : '';
  }
  return rawValue;
};

const exportDataSet = (
  filePrefix: string,
  format: ExportFormat,
  columns: ExportColumnConfig[],
  data: any[]
) => {
  const header = columns.map((col) => col.title);
  const rows = data.map((record) =>
    columns.map((column) => formatExportValue(column, record))
  );
  const fileName = generateFileName(filePrefix, format);

  if (format === 'pdf') {
    const doc = new jsPDF('l', 'mm', 'a4');
    autoTable(doc, {
      head: [header],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 73, 130] },
    });
    doc.save(fileName);
    return;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  if (format === 'xlsx') {
    XLSX.writeFile(workbook, fileName);
  } else {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    downloadBlob(csv, fileName, 'text/csv;charset=utf-8;');
  }
};

const CustomerProfile: React.FC = () => {
  const [data, setData] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [segmentDetailVisible, setSegmentDetailVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentExportLoading, setSegmentExportLoading] = useState(false);
  const [premiumCustomers, setPremiumCustomers] = useState<any[]>([]);
  const [premiumStats, setPremiumStats] = useState({
    totalPremiumCustomers: 0,
    inactivePremiumCustomers: 0,
    storeCount: 0,
  });
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumModalFilter, setPremiumModalFilter] = useState<'all' | 'inactive' | 'new' | 'stable'>('all');
  const [premiumExportLoading, setPremiumExportLoading] = useState(false);
  const [exportFilterVisible, setExportFilterVisible] = useState(false);
  const [exportFilterType, setExportFilterType] = useState<'all' | 'new' | 'stable' | 'inactive'>('all');
  const [exportContext, setExportContext] = useState<'premium' | 'city' | 'store'>('premium');
  const [cityPremiumModalVisible, setCityPremiumModalVisible] = useState(false);
  const [cityPremiumCustomers, setCityPremiumCustomers] = useState<any[]>([]);
  const [cityPremiumLoading, setCityPremiumLoading] = useState(false);
  const [cityPremiumPagination, setCityPremiumPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [selectedCityForPremium, setSelectedCityForPremium] = useState<string>('');
  const [storePremiumModalVisible, setStorePremiumModalVisible] = useState(false);
  const [storePremiumCustomers, setStorePremiumCustomers] = useState<any[]>([]);
  const [storePremiumLoading, setStorePremiumLoading] = useState(false);
  const [storePremiumPagination, setStorePremiumPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [selectedStoreForPremium, setSelectedStoreForPremium] = useState<{ storeId: string; storeName: string } | null>(null);
  const visiblePremiumCustomers = useMemo(() => {
    if (selectedShopId) {
      return premiumCustomers.filter(
        (item) => String(item.store_id) === String(selectedShopId)
      );
    }
    return premiumCustomers;
  }, [premiumCustomers, selectedShopId]);

  const displayPremiumStats = useMemo(() => {
    if (selectedShopId) {
      const inactiveCount = visiblePremiumCustomers.filter((item) => {
        const status =
          item.customer_status ||
          (item.is_inactive ? '超过30天未购' : '购频稳定');
        return status === '超过30天未购' || item.is_inactive;
      }).length;
      return {
        totalPremiumCustomers: visiblePremiumCustomers.length,
        inactivePremiumCustomers: inactiveCount,
        storeCount: visiblePremiumCustomers.length > 0 ? 1 : 0,
      };
    }
    return premiumStats;
  }, [selectedShopId, visiblePremiumCustomers, premiumStats]);

  const premiumCustomersByStore = useMemo(() => {
    const storeMap = new Map<
      string,
      { storeId: string; storeName: string; storeCode: string; city: string; customers: any[] }
    >();
    visiblePremiumCustomers.forEach((item) => {
      if (!item.store_id) {
        return;
      }
      const key = String(item.store_id);
      if (!storeMap.has(key)) {
        storeMap.set(key, {
          storeId: key,
          storeName: item.store_name || '未命名门店',
          storeCode: item.store_code || '',
          city: selectedCity || '',
          customers: [],
        });
      }
      storeMap.get(key)?.customers.push(item);
    });
    return Array.from(storeMap.values()).sort((a, b) => {
      if (a.storeCode && b.storeCode) {
        return a.storeCode.localeCompare(b.storeCode);
      }
      return (a.storeCode || a.storeName).localeCompare(b.storeCode || b.storeName);
    });
  }, [visiblePremiumCustomers, selectedCity]);

  const premiumInactiveCustomers = useMemo(() => {
    return visiblePremiumCustomers.filter((item) => {
      const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
      return status === '超过30天未购' || item.is_inactive;
    });
  }, [visiblePremiumCustomers]);

  const premiumModalData = useMemo(() => {
    const source =
      premiumModalFilter === 'inactive' ? premiumInactiveCustomers : visiblePremiumCustomers;
    return source;
  }, [premiumModalFilter, premiumInactiveCustomers, visiblePremiumCustomers]);
  
  // AI分析相关状态
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  
  // 新增AI功能状态
  const [churnAlertVisible, setChurnAlertVisible] = useState(false);
  const [churnAlertData, setChurnAlertData] = useState<any>(null);
  const [churnAlertLoading, setChurnAlertLoading] = useState(false);
  const [churnAlertFilters, setChurnAlertFilters] = useState<{
    riskLevel?: string[];
    daysRange?: [number, number];
  }>({});
  const [churnAlertExportLoading, setChurnAlertExportLoading] = useState(false);
  const [lifecyclePredictionVisible, setLifecyclePredictionVisible] = useState(false);
  const [lifecycleData, setLifecycleData] = useState<any>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  // 1. 新增订单详情和订单详细信息的弹窗状态
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [customerOrdersVisible, setCustomerOrdersVisible] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersPagination, setOrdersPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [ordersExportLoading, setOrdersExportLoading] = useState(false);
  const [goodsExportLoading, setGoodsExportLoading] = useState(false);
  

  // 2. 获取客户订单
  const fetchCustomerOrders = async (customerId: string, page = 1, pageSize = 10) => {
    setCustomerOrders([]);
    setOrdersPagination(p => ({ ...p, current: page, pageSize }));
    try {
      const res = await api.get(`/customer-profile/customers/${customerId}/orders?page=${page}&pageSize=${pageSize}`);
      if (res.data.success) {
        setCustomerOrders(res.data.data.orders); // Fixed: access the orders array
        setOrdersPagination(p => ({ ...p, total: res.data.data.total }));
      }
    } catch (e) {
      message.error('获取客户订单失败');
    }
  };

  const openCustomerOrders = (customerId?: string) => {
    if (!customerId) {
      message.warning('缺少客户ID，无法查看订单');
      return;
    }
    setSelectedCustomerId(customerId);
    setCustomerOrdersVisible(true);
    fetchCustomerOrders(customerId, 1, 10);
  };

  const handleOpenPremiumModal = (filter: 'all' | 'inactive') => {
    setPremiumModalFilter(filter);
    setPremiumModalVisible(true);
  };

  const handleExportPremium = async (format: ExportFormat, filter?: 'all' | 'inactive' | 'new' | 'stable') => {
    const actualFilter = filter || exportFilterType;
    let dataset: any[] = [];
    let label = '';

    switch (actualFilter) {
      case 'new':
        dataset = visiblePremiumCustomers.filter((item: any) => {
          const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
          return status === '新客户';
        });
        label = '新客户';
        break;
      case 'stable':
        dataset = visiblePremiumCustomers.filter((item: any) => {
          const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
          return status === '购频稳定';
        });
        label = '购频稳定';
        break;
      case 'inactive':
        dataset = premiumInactiveCustomers;
        label = '超30天未购';
        break;
      default:
        dataset = visiblePremiumCustomers;
        label = '全部';
    }

    setPremiumExportLoading(true);
    try {
      if (!dataset.length) {
        message.info(`当前筛选下暂无${label}优质客户数据`);
        return;
      }
      exportDataSet(`门店优质客户_${label}`, format, premiumExportColumnsConfig, dataset);
      message.success(`${label}优质客户导出成功`);
      setExportFilterVisible(false);
    } catch (error) {
      console.error(error);
      message.error('优质客户导出失败');
    } finally {
      setPremiumExportLoading(false);
    }
  };

  // 获取某个城市的所有优质客户
  const fetchCityPremiumCustomers = async (city: string, page = 1, pageSize = 50) => {
    setCityPremiumLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('city', city);
      params.append('intervalThreshold', '7');
      params.append('inactivityDays', '30');
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }

      const response = await api.get(`/customer-profile/city-premium-customers?${params.toString()}`);
      if (response.data.success) {
        setCityPremiumCustomers(response.data.data.records || []);
        setCityPremiumPagination({
          current: page,
          pageSize,
          total: response.data.data.total || 0,
        });
      } else {
        message.error('获取城市优质客户失败');
      }
    } catch (error) {
      console.error('获取城市优质客户失败:', error);
      message.error('获取城市优质客户失败');
    } finally {
      setCityPremiumLoading(false);
    }
  };

  const handleOpenCityPremiumModal = (city: string) => {
    setSelectedCityForPremium(city);
    setCityPremiumModalVisible(true);
    fetchCityPremiumCustomers(city, 1, 50);
  };

  // 获取某个门店的所有优质客户
  const fetchStorePremiumCustomers = async (storeId: string, page = 1, pageSize = 50) => {
    setStorePremiumLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('storeId', storeId);
      params.append('intervalThreshold', '7');
      params.append('inactivityDays', '30');
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }

      const response = await api.get(`/customer-profile/store-premium-customers-all?${params.toString()}`);
      if (response.data.success) {
        setStorePremiumCustomers(response.data.data.records || []);
        setStorePremiumPagination({
          current: page,
          pageSize,
          total: response.data.data.total || 0,
        });
      } else {
        message.error('获取门店优质客户失败');
      }
    } catch (error) {
      console.error('获取门店优质客户失败:', error);
      message.error('获取门店优质客户失败');
    } finally {
      setStorePremiumLoading(false);
    }
  };

  const handleOpenStorePremiumModal = (storeId: string, storeName: string) => {
    setSelectedStoreForPremium({ storeId, storeName });
    setStorePremiumModalVisible(true);
    fetchStorePremiumCustomers(storeId, 1, 50);
  };

  const handleExportStorePremium = async (format: ExportFormat, filter?: 'all' | 'new' | 'stable' | 'inactive') => {
    if (!selectedStoreForPremium) {
      message.warning('请先选择门店');
      return;
    }
    const actualFilter = filter || exportFilterType;
    setPremiumExportLoading(true);
    const hide = message.loading('正在导出门店优质客户...');
    try {
      const allCustomers: any[] = [];
      const pageSize = 1000;
      let page = 1;
      let total = 0;
      while (true) {
        const params = new URLSearchParams();
        params.append('storeId', selectedStoreForPremium.storeId);
        params.append('intervalThreshold', '7');
        params.append('inactivityDays', '30');
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        if (dateRange) {
          params.append('startDate', dateRange[0]);
          params.append('endDate', dateRange[1]);
        }
        const response = await api.get(`/customer-profile/store-premium-customers-all?${params.toString()}`);
        if (response.data.success) {
          const chunk = response.data.data?.records || [];
          allCustomers.push(...chunk);
          total = response.data.data?.total || chunk.length;
          if (allCustomers.length >= total || chunk.length === 0) {
            break;
          }
          page += 1;
        } else {
          break;
        }
      }
      
      // 根据筛选条件过滤数据
      let filteredCustomers = allCustomers;
      let label = '';
      switch (actualFilter) {
        case 'new':
          filteredCustomers = allCustomers.filter((item: any) => {
            const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
            return status === '新客户';
          });
          label = '新客户';
          break;
        case 'stable':
          filteredCustomers = allCustomers.filter((item: any) => {
            const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
            return status === '购频稳定';
          });
          label = '购频稳定';
          break;
        case 'inactive':
          filteredCustomers = allCustomers.filter((item: any) => item.is_inactive === 1);
          label = '超30天未购';
          break;
        default:
          label = '全部';
      }
      
      if (filteredCustomers.length === 0) {
        message.info(`该门店暂无${label}优质客户数据`);
      } else {
        exportDataSet(`门店优质客户_${selectedStoreForPremium.storeName}_${label}`, format, premiumExportColumnsConfig, filteredCustomers);
        message.success(`门店${label}优质客户导出成功`);
        setExportFilterVisible(false);
      }
    } catch (error) {
      console.error(error);
      message.error('门店优质客户导出失败');
    } finally {
      hide();
      setPremiumExportLoading(false);
    }
  };

  const handleExportCityPremium = async (format: ExportFormat, filter?: 'all' | 'new' | 'stable' | 'inactive') => {
    if (!selectedCityForPremium) {
      message.warning('请先选择城市');
      return;
    }
    const actualFilter = filter || exportFilterType;
    setPremiumExportLoading(true);
    const hide = message.loading('正在导出城市优质客户...');
    try {
      const allCustomers: any[] = [];
      const pageSize = 1000;
      let page = 1;
      let total = 0;
      while (true) {
        const params = new URLSearchParams();
        params.append('city', selectedCityForPremium);
        params.append('intervalThreshold', '7');
        params.append('inactivityDays', '30');
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        if (dateRange) {
          params.append('startDate', dateRange[0]);
          params.append('endDate', dateRange[1]);
        }
        const response = await api.get(`/customer-profile/city-premium-customers?${params.toString()}`);
        if (response.data.success) {
          const chunk = response.data.data?.records || [];
          allCustomers.push(...chunk);
          total = response.data.data?.total || chunk.length;
          if (allCustomers.length >= total || chunk.length === 0) {
            break;
          }
          page += 1;
        } else {
          break;
        }
      }
      
      // 根据筛选条件过滤数据
      let filteredCustomers = allCustomers;
      let label = '';
      switch (actualFilter) {
        case 'new':
          filteredCustomers = allCustomers.filter((item: any) => {
            const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
            return status === '新客户';
          });
          label = '新客户';
          break;
        case 'stable':
          filteredCustomers = allCustomers.filter((item: any) => {
            const status = item.customer_status || (item.is_inactive ? '超过30天未购' : '购频稳定');
            return status === '购频稳定';
          });
          label = '购频稳定';
          break;
        case 'inactive':
          filteredCustomers = allCustomers.filter((item: any) => item.is_inactive === 1);
          label = '超30天未购';
          break;
        default:
          label = '全部';
      }
      
      if (filteredCustomers.length === 0) {
        message.info(`该城市暂无${label}优质客户数据`);
      } else {
        exportDataSet(`城市优质客户_${selectedCityForPremium}_${label}`, format, premiumExportColumnsConfig, filteredCustomers);
        message.success(`城市${label}优质客户导出成功`);
        setExportFilterVisible(false);
      }
    } catch (error) {
      console.error(error);
      message.error('城市优质客户导出失败');
    } finally {
      hide();
      setPremiumExportLoading(false);
    }
  };

  // 3. 获取订单详细信息
  const fetchOrderDetail = async (orderId: string) => {
    setOrderDetailLoading(true);
    try {
      const res = await api.get(`/customer-profile/orders/${orderId}`);
      if (res.data.success) {
        setOrderDetail(res.data.data);
        setOrderDetailVisible(true);
      }
    } catch (e) {
      message.error('获取订单详情失败');
    } finally {
      setOrderDetailLoading(false);
    }
  };

  // 4. 修改fetchSegmentCustomers支持分页
  const fetchSegmentCustomers = async (segment: string, page = 1, pageSize = 10, sortField?: string, sortOrder?: string) => {
    setSegmentLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('segment', segment);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('shop', selectedShopId);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      const response = await api.get(`/customer-profile/customers?${params.toString()}`);
      if (response.data.success) {
        setSegmentCustomers(response.data.data);
        setSegmentPagination({ current: page, pageSize, total: response.data.total });
      }
    } catch (error) {
      message.error('获取客户列表失败');
    } finally {
      setSegmentLoading(false);
    }
  };

  // 5. 客户详情分页状态
  const [segmentPagination, setSegmentPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  
  // 6. 排序状态
  const [sortState, setSortState] = useState<{ field?: string; order?: string }>({});

  // 7. 查看分层详情
  const handleViewSegmentDetail = (segment: string) => {
    setSelectedSegment(segment);
    setSegmentDetailVisible(true);
    fetchSegmentCustomers(segment, 1, segmentPagination.pageSize, sortState.field, sortState.order);
  };

  // 8. 处理表格排序变化
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const { field, order } = sorter;
    const sortField = field;
    const sortOrder = order === 'ascend' ? 'asc' : order === 'descend' ? 'desc' : undefined;
    setSortState({ field: sortField, order: sortOrder });
    fetchSegmentCustomers(selectedSegment, 1, segmentPagination.pageSize, sortField, sortOrder);
  };

  // 9. 获取AI分析
  const fetchAIAnalysis = async (segment: string) => {
    setAiAnalysisLoading(true);
    try {
      const response = await api.get(`/customer-profile/ai-segment-analysis?segment=${encodeURIComponent(segment)}`);
      if (response.data.success) {
        setAiAnalysisData(response.data.data);
        setAiAnalysisVisible(true);
      } else {
        message.error('获取AI分析失败');
      }
    } catch (error) {
      message.error('获取AI分析失败');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // 10. 获取AI深度洞察
  const fetchAIInsights = async () => {
    setAiAnalysisLoading(true);
    try {
      const requestData = {
        city: selectedCity || undefined,
        shopId: selectedShopId || undefined,
        startDate: dateRange ? dateRange[0] : undefined,
        endDate: dateRange ? dateRange[1] : undefined
      };

      const response = await api.post('/customer-profile/ai-insights', requestData);
      if (response.data.success) {
        setAiAnalysisData(response.data.data);
        setAiAnalysisVisible(true);
        message.success('AI洞察生成成功');
      } else {
        message.error('获取AI洞察失败');
      }
    } catch (error) {
      message.error('获取AI洞察失败');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const fetchSegmentDataForExport = async () => {
    const results: any[] = [];
    if (!selectedSegment) {
      return results;
    }
    const pageSize = 1000;
    let page = 1;
    let total = 0;
    do {
      const params = new URLSearchParams();
      params.append('segment', selectedSegment || 'all');
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('shop', selectedShopId);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      if (sortState.field) params.append('sortField', sortState.field);
      if (sortState.order) params.append('sortOrder', sortState.order);
      const response = await api.get(`/customer-profile/customers?${params.toString()}`);
      if (response.data.success) {
        const chunk = response.data.data || [];
        results.push(...chunk);
        total = response.data.total || chunk.length;
        if (results.length >= total || chunk.length === 0) {
          break;
        }
        page += 1;
      } else {
        break;
      }
    } while (results.length < total);
    return results;
  };

  const fetchCustomerOrdersForExport = async () => {
    const results: any[] = [];
    if (!selectedCustomerId) {
      return results;
    }
    const pageSize = 1000;
    let page = 1;
    let total = 0;
    while (true) {
      const response = await api.get(
        `/customer-profile/customers/${selectedCustomerId}/orders?page=${page}&pageSize=${pageSize}`
      );
      if (response.data.success) {
        const chunk = response.data.data?.orders || [];
        results.push(...chunk);
        total = response.data.data?.total || chunk.length;
        if (results.length >= total || chunk.length === 0) {
          break;
        }
        page += 1;
      } else {
        break;
      }
    }
    return results;
  };

  const handleExportSegmentCustomers = async (format: ExportFormat) => {
    if (!selectedSegment) {
      message.warning('请先打开客户详情');
      return;
    }
    setSegmentExportLoading(true);
    const hide = message.loading('正在导出客户列表...');
    try {
      const rows = await fetchSegmentDataForExport();
      if (!rows.length) {
        message.info('当前筛选条件下暂无客户数据');
      } else {
        exportDataSet(`客户列表_${selectedSegment}`, format, customerExportColumnsConfig, rows);
        message.success('客户列表导出成功');
      }
    } catch (error) {
      console.error(error);
      message.error('客户列表导出失败');
    } finally {
      hide();
      setSegmentExportLoading(false);
    }
  };

  const handleExportCustomerOrders = async (format: ExportFormat) => {
    if (!selectedCustomerId) {
      message.warning('请先选择客户再导出订单');
      return;
    }
    setOrdersExportLoading(true);
    const hide = message.loading('正在导出客户订单...');
    try {
      const rows = await fetchCustomerOrdersForExport();
      if (!rows.length) {
        message.info('该客户暂无订单数据');
      } else {
        exportDataSet(`客户订单_${selectedCustomerId}`, format, orderExportColumnsConfig, rows);
        message.success('客户订单导出成功');
      }
    } catch (error) {
      console.error(error);
      message.error('客户订单导出失败');
    } finally {
      hide();
      setOrdersExportLoading(false);
    }
  };

  const handleExportOrderGoods = async (format: ExportFormat) => {
    if (!orderDetail || !orderDetail.goods || orderDetail.goods.length === 0) {
      message.info('该订单暂无商品明细');
      return;
    }
    setGoodsExportLoading(true);
    const hide = message.loading('正在导出商品明细...');
    try {
      exportDataSet(`商品明细_${orderDetail.order_id}`, format, goodsExportColumnsConfig, orderDetail.goods);
      message.success('商品明细导出成功');
    } catch (error) {
      console.error(error);
      message.error('商品明细导出失败');
    } finally {
      hide();
      setGoodsExportLoading(false);
    }
  };

  // 11. 获取客户流失预警
  const fetchChurnAlert = async () => {
    setChurnAlertLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('shopId', selectedShopId);
      params.append('days', '30');

      const response = await api.get(`/customer-profile/churn-alert?${params.toString()}`);
      if (response.data.success) {
        setChurnAlertData(response.data.data);
        setChurnAlertVisible(true);
        message.success('流失预警生成成功');
      } else {
        message.error('获取流失预警失败');
      }
    } catch (error) {
      message.error('获取流失预警失败');
    } finally {
      setChurnAlertLoading(false);
    }
  };

  // 12. 筛选流失预警数据
  const getFilteredChurnAlerts = () => {
    if (!churnAlertData?.alerts) return [];
    
    let filtered = [...churnAlertData.alerts];
    
    // 按风险等级筛选
    if (churnAlertFilters.riskLevel && churnAlertFilters.riskLevel.length > 0) {
      filtered = filtered.filter((alert: any) => 
        churnAlertFilters.riskLevel?.includes(alert.churn_risk_level)
      );
    }
    
    // 按距今天数范围筛选
    if (churnAlertFilters.daysRange) {
      const [minDays, maxDays] = churnAlertFilters.daysRange;
      filtered = filtered.filter((alert: any) => {
        const days = alert.days_since_last_order || 0;
        return days >= minDays && days <= maxDays;
      });
    }
    
    return filtered;
  };

  // 13. 导出流失预警数据
  const handleExportChurnAlert = async (format: 'xlsx' | 'csv' | 'pdf') => {
    const filteredData = getFilteredChurnAlerts();
    if (filteredData.length === 0) {
      message.warning('没有数据可导出');
      return;
    }
    
    setChurnAlertExportLoading(true);
    try {
      const exportData = filteredData.map((item: any) => ({
        '客户ID': item.customer_id,
        '首次购买时间': item.first_order_date ? dayjs(item.first_order_date).format('YYYY-MM-DD HH:mm:ss') : '-',
        '最后订单时间': item.last_order_date ? dayjs(item.last_order_date).format('YYYY-MM-DD HH:mm:ss') : '-',
        '距今天数': item.days_since_last_order,
        '风险等级': item.churn_risk_level,
        '历史订单数': item.total_orders,
        '历史消费': `¥${Number(item.total_spent || 0).toFixed(2)}`,
        '平均订单价值': `¥${Number(item.avg_order_value || 0).toFixed(2)}`,
        '购买频率': item.avg_purchase_interval_days ? `≈${Math.ceil(item.avg_purchase_interval_days)}天/次` : '-'
      }));
      
      if (format === 'xlsx' || format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '流失预警客户');
        
        const fileName = `客户流失预警_${selectedCity || '全部城市'}_${dayjs().format('YYYY-MM-DD')}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
        XLSX.writeFile(wb, fileName);
        message.success(`${format.toUpperCase()}导出成功`);
      } else if (format === 'pdf') {
        const doc = new jsPDF();
        const fileName = `客户流失预警_${selectedCity || '全部城市'}_${dayjs().format('YYYY-MM-DD')}`;
        
        // 标题
        doc.setFontSize(16);
        doc.text('客户流失预警报告', 105, 15, { align: 'center' });
        
        // 统计信息
        doc.setFontSize(12);
        doc.text(`高风险客户: ${churnAlertData.riskStats?.high || 0}`, 20, 30);
        doc.text(`中风险客户: ${churnAlertData.riskStats?.medium || 0}`, 20, 37);
        doc.text(`低风险客户: ${churnAlertData.riskStats?.low || 0}`, 20, 44);
        doc.text(`总预警客户: ${churnAlertData.riskStats?.total || 0}`, 20, 51);
        doc.text(`导出时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 20, 58);
        
        // 表格数据
        const tableData = exportData.map((item: any) => [
          item['客户ID']?.substring(0, 20) || '',
          item['首次购买时间'] || '-',
          item['最后订单时间'] || '-',
          item['距今天数'] || 0,
          item['风险等级'] || '',
          item['历史订单数'] || 0,
          item['历史消费'] || '¥0.00',
          item['平均订单价值'] || '¥0.00',
          item['购买频率'] || '-'
        ]);
        
        autoTable(doc, {
          head: [['客户ID', '首次购买时间', '最后订单时间', '距今天数', '风险等级', '历史订单数', '历史消费', '平均订单价值', '购买频率']],
          body: tableData,
          startY: 65,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 73, 130], textColor: [255, 255, 255], fontSize: 9 },
          margin: { left: 10, right: 10 }
        });
        
        doc.save(`${fileName}.pdf`);
        message.success('PDF导出成功');
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setChurnAlertExportLoading(false);
    }
  };

  // 14. 获取客户生命周期预测
  const fetchLifecyclePrediction = async (customerId: string) => {
    setLifecycleLoading(true);
    try {
      const response = await api.get(`/customer-profile/customer-lifecycle/${customerId}`);
      if (response.data.success) {
        setLifecycleData(response.data.data);
        setLifecyclePredictionVisible(true);
        message.success('生命周期预测生成成功');
      } else {
        message.error('获取生命周期预测失败');
      }
    } catch (error) {
      message.error('获取生命周期预测失败');
    } finally {
      setLifecycleLoading(false);
    }
  };

  // 9. 客户详情表格列定义，客户ID可点击
  const customerColumns = [
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id',
      render: (text: string) =>
        text ? (
          <a
            onClick={() => {
              setSelectedCustomerId(text);
              setCustomerOrdersVisible(true);
              fetchCustomerOrders(text, 1, 10);
            }}
          >
            {text}
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '客户姓名',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text: string) => text || '-',
      sorter: true
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || '-'
    },
    {
      title: '客户分群',
      dataIndex: 'segment_name',
      key: 'segment_name',
      render: (text: string) => text || '-'
    },
    {
      title: '订单数量',
      dataIndex: 'order_count',
      key: 'order_count',
      sorter: true
    },
    {
      title: '平均购间隔(天)',
      dataIndex: 'avg_purchase_interval_days',
      key: 'avg_purchase_interval_days',
      render: (value: number) => value != null ? `${Math.ceil(value)} 天` : '-',
    },
    {
      title: '总消费',
      dataIndex: 'total_spent',
      key: 'total_spent',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: true
    },
    {
      title: '平均客单价',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`,
      sorter: true
    },
    {
      title: '首次购买',
      dataIndex: 'first_order_date',
      key: 'first_order_date',
      render: (text: string) => text ? new Date(text).toLocaleDateString() : '-',
      sorter: true
    },
    {
      title: '最后购买',
      dataIndex: 'last_order_date',
      key: 'last_order_date',
      render: (text: string) => text ? new Date(text).toLocaleDateString() : '-',
      sorter: true
    }
  ];

const customerExportColumnsConfig: ExportColumnConfig[] = [
  { title: '客户ID', dataIndex: 'customer_id' },
  { title: '客户姓名', dataIndex: 'customer_name', formatter: (value) => value || '-' },
  { title: '手机号', dataIndex: 'phone', formatter: (value) => value || '-' },
  { title: '客户分群', dataIndex: 'segment_name', formatter: (value) => value || '-' },
  { title: '订单数量', dataIndex: 'order_count' },
  {
    title: '平均购间隔(天)',
    dataIndex: 'avg_purchase_interval_days',
    formatter: (value) => (value != null ? Math.ceil(Number(value)) : '-'),
  },
  {
    title: '总消费',
    dataIndex: 'total_spent',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '平均客单价',
    dataIndex: 'avg_order_value',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '首次购买',
    dataIndex: 'first_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '最后购买',
    dataIndex: 'last_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
];

  // 8. 订单表格列定义，订单号可点击
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_id', // Changed from 'order_no' to 'order_id'
      key: 'order_id',
      render: (text: string) => <a onClick={() => fetchOrderDetail(text)}>{text}</a>
    },
    { 
      title: '下单时间', 
      dataIndex: 'order_date', 
      key: 'order_date',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: '金额', 
      dataIndex: 'total_amount', 
      key: 'total_amount', 
      render: (v: number) => `¥${v != null ? v.toFixed(2) : '0.00'}` 
    },
    { 
      title: '支付状态', 
      dataIndex: 'pay_state', 
      key: 'pay_state',
      render: (state: number) => {
        if (state === 1 || state === 2 || state === 3) {
          return <span style={{ color: '#52c41a' }}>已支付</span>;
        } else {
          return <span style={{ color: '#ff4d4f' }}>未支付</span>;
        }
      }
    },
    { 
      title: '门店名称', 
      dataIndex: 'shop_name', 
      key: 'shop_name',
      render: (text: string) => text || '未知门店'
    }
  ];

const orderExportColumnsConfig: ExportColumnConfig[] = [
  { title: '订单ID', dataIndex: 'order_id' },
  { title: '订单编号', dataIndex: 'order_no', formatter: (value) => value || '-' },
  {
    title: '下单时间',
    dataIndex: 'order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '金额',
    dataIndex: 'total_amount',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '支付状态',
    dataIndex: 'pay_state',
    formatter: (value) =>
      value === 1 || value === 2 || value === 3 ? '已支付' : '未支付',
  },
  { title: '支付方式', dataIndex: 'pay_mode', formatter: (value) => value ?? '-' },
  { title: '门店名称', dataIndex: 'shop_name', formatter: (value) => value || '未知门店' },
];

const goodsExportColumnsConfig: ExportColumnConfig[] = [
  { title: '商品名称', dataIndex: 'goods_name', formatter: (value) => value || '-' },
  { title: '数量', dataIndex: 'goods_number' },
  {
    title: '单价',
    dataIndex: 'goods_price',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '小计',
    dataIndex: 'total_price',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  { title: '分类', dataIndex: 'category', formatter: (value) => value || '-' },
  {
    title: '优惠金额',
    dataIndex: 'discount_amount',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '-'),
  },
  {
    title: '退款金额',
    dataIndex: 'refund_amount',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '-'),
  },
];

  const premiumColumns = [
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (_: any, record: any) => record.customer_name || record.customer_id,
      sorter: (a: any, b: any) => {
        const nameA = (a.customer_name || a.customer_id || '').toLowerCase();
        const nameB = (b.customer_name || b.customer_id || '').toLowerCase();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
      render: (text: string) => text || '未命名门店',
      sorter: (a: any, b: any) => {
        const nameA = (a.store_name || '').toLowerCase();
        const nameB = (b.store_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: '平均购频',
      dataIndex: 'avg_purchase_interval_days',
      key: 'avg_purchase_interval_days',
      render: (value: number) => (value != null ? `≈${Math.ceil(value)} 天/次` : '-'),
      sorter: (a: any, b: any) => {
        const valA = a.avg_purchase_interval_days || 0;
        const valB = b.avg_purchase_interval_days || 0;
        return valA - valB;
      },
    },
    {
      title: '累计消费',
      dataIndex: 'total_spent',
      key: 'total_spent',
      render: (value: number) => `¥${(value ?? 0).toFixed(2)}`,
      sorter: (a: any, b: any) => {
        const valA = a.total_spent || 0;
        const valB = b.total_spent || 0;
        return valA - valB;
      },
    },
    {
      title: '首次购买',
      dataIndex: 'first_order_date',
      key: 'first_order_date',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD') : '-'),
      sorter: (a: any, b: any) => {
        const dateA = a.first_order_date ? dayjs(a.first_order_date).valueOf() : 0;
        const dateB = b.first_order_date ? dayjs(b.first_order_date).valueOf() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '最后购买',
      dataIndex: 'last_order_date',
      key: 'last_order_date',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD') : '-'),
      sorter: (a: any, b: any) => {
        const dateA = a.last_order_date ? dayjs(a.last_order_date).valueOf() : 0;
        const dateB = b.last_order_date ? dayjs(b.last_order_date).valueOf() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '状态',
      dataIndex: 'customer_status',
      key: 'customer_status',
      render: (status: string, record: any) => {
        // 如果没有customer_status字段，使用is_inactive作为后备
        const displayStatus = status || (record.is_inactive ? '超过30天未购' : '购频稳定');
        if (displayStatus === '新客户') {
          return <Tag color="blue">新客户</Tag>;
        } else if (displayStatus === '超过30天未购') {
          return <Tag color="red">超过30天未购</Tag>;
        } else {
          return <Tag color="green">购频稳定</Tag>;
        }
      },
      filters: [
        { text: '全部', value: 'all' },
        { text: '新客户', value: 'new' },
        { text: '购频稳定', value: 'stable' },
        { text: '超过30天未购', value: 'inactive' },
      ],
      onFilter: (value: any, record: any) => {
        if (value === 'all') return true;
        const status = record.customer_status || (record.is_inactive ? '超过30天未购' : '购频稳定');
        if (value === 'new') return status === '新客户';
        if (value === 'stable') return status === '购频稳定';
        if (value === 'inactive') return status === '超过30天未购';
        return true;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => openCustomerOrders(record.customer_id)}>
          查看订单
        </Button>
      ),
    },
];

const premiumExportColumnsConfig: ExportColumnConfig[] = [
  { title: '客户ID', dataIndex: 'customer_id' },
  { title: '客户姓名', dataIndex: 'customer_name', formatter: (value, record) => value || record?.customer_id || '-' },
  { title: '门店', dataIndex: 'store_name', formatter: (value) => value || '未命名门店' },
  {
    title: '平均购频(天/次)',
    dataIndex: 'avg_purchase_interval_days',
    formatter: (value) => (value != null ? Math.ceil(Number(value)) : '-'),
  },
  {
    title: '累计消费',
    dataIndex: 'total_spent',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '首次购买',
    dataIndex: 'first_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '最后购买',
    dataIndex: 'last_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '状态',
    dataIndex: 'customer_status',
    formatter: (value, record) => {
      // 如果没有customer_status字段，使用is_inactive作为后备
      return value || (record?.is_inactive ? '超过30天未购' : '购频稳定');
    },
  },
];

  // 获取城市列表
  const fetchCities = async () => {
    try {
      const response = await api.get('/customer-profile/cities');
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (error) {
      console.error('获取城市列表失败:', error);
    }
  };

  // 获取指定城市下的门店列表
  const fetchStoresByCity = async (city: string) => {
    try {
      const response = await api.get(`/customer-profile/stores/by-city-name/${encodeURIComponent(city)}`);
      if (response.data.success) {
        setStores(response.data.data);
      }
    } catch (error) {
      console.error('获取门店列表失败:', error);
    }
  };

  // 获取所有门店列表（用于订单列表显示门店名称）
  const fetchAllStores = async () => {
    try {
      const response = await api.get('/customer-profile/stores');
      if (response.data.success) {
        setStores(response.data.data);
      }
    } catch (error) {
      console.error('获取所有门店列表失败:', error);
    }
  };

  // 获取客户画像数据
  const fetchCustomerProfileData = async () => {
    setLoading(true);
    setPremiumLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedShopId) params.append('shopId', selectedShopId);
      if (dateRange) {
        params.append('startDate', dateRange[0]);
        params.append('endDate', dateRange[1]);
      }
      const premiumParams = new URLSearchParams(params.toString());
      premiumParams.set('intervalThreshold', '7');
      premiumParams.set('inactivityDays', '30');
      premiumParams.set('limitPerStore', '5');

      const paramsString = params.toString();
      const premiumParamsString = premiumParams.toString();
      const dashboardUrl = paramsString
        ? `/customer-profile/dashboard?${paramsString}`
        : '/customer-profile/dashboard';
      const premiumUrl = premiumParamsString
        ? `/customer-profile/store-premium-customers?${premiumParamsString}`
        : '/customer-profile/store-premium-customers';

      const [dashboardResponse, premiumResponse] = await Promise.all([
        api.get(dashboardUrl),
        api.get(premiumUrl),
      ]);

      if (dashboardResponse.data.success) {
        setData(dashboardResponse.data.data);
      } else {
        message.error('获取数据失败');
      }

      if (premiumResponse.data.success) {
        setPremiumCustomers(premiumResponse.data.data?.records || []);
        setPremiumStats(
          premiumResponse.data.data?.stats || {
            totalPremiumCustomers: 0,
            inactivePremiumCustomers: 0,
            storeCount: 0,
          }
        );
      } else {
        setPremiumCustomers([]);
        setPremiumStats({
          totalPremiumCustomers: 0,
          inactivePremiumCustomers: 0,
          storeCount: 0,
        });
      }
    } catch (error) {
      console.error('获取客户画像数据失败:', error);
      message.error('获取数据失败');
      setPremiumCustomers([]);
      setPremiumStats({
        totalPremiumCustomers: 0,
        inactivePremiumCustomers: 0,
        storeCount: 0,
      });
    } finally {
      setLoading(false);
      setPremiumLoading(false);
    }
  };

  // 城市选择变化
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedShopId(''); // 清空门店选择
    setStores([]); // 清空门店列表
    if (city) {
      fetchStoresByCity(city);
    }
    // 自动刷新数据，应用城市筛选
    setTimeout(() => {
      fetchCustomerProfileData();
    }, 100);
  };

  // 门店选择变化
  const handleStoreChange = (shopId: string) => {
    setSelectedShopId(shopId);
    setCustomerOrdersVisible(false); // 关闭订单弹窗
    setSelectedCustomerId(''); // 清空客户ID
    setCustomerOrders([]); // 清空订单列表
    setOrdersPagination({ current: 1, pageSize: 10, total: 0 }); // 重置订单分页
    setOrderDetail(null); // 清空订单详情
    setOrderDetailVisible(false); // 关闭订单详情弹窗
    setOrderDetailLoading(false); // 重置订单详情加载状态
    // 自动刷新数据，应用门店筛选
    setTimeout(() => {
      fetchCustomerProfileData();
    }, 100);
  };

  // 查询按钮点击
  const handleQuery = () => {
    fetchCustomerProfileData();
  };

  // 重置按钮点击
  const handleReset = () => {
    setSelectedCity('');
    setSelectedShopId('');
    setDateRange(null);
    setStores([]);
    fetchCustomerProfileData();
  };

  useEffect(() => {
    fetchCities();
    fetchAllStores(); // 获取所有门店列表
    fetchCustomerProfileData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  if (!data || !data.totalCustomers) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>暂无数据</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '20px 24px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '12px', 
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TeamOutlined style={{ fontSize: 32, color: '#fff', marginRight: 12 }} />
          <span style={{ fontWeight: 'bold', fontSize: 28, color: '#fff' }}>客群画像</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<RobotOutlined />}
              onClick={fetchAIInsights}
              loading={aiAnalysisLoading}
              style={{ marginRight: 8 }}
            >
              AI深度洞察
            </Button>
            <Button 
              icon={<BellOutlined />}
              onClick={fetchChurnAlert}
              loading={churnAlertLoading}
              style={{ marginRight: 8 }}
            >
              流失预警
            </Button>
            <Button 
              icon={<TrophyOutlined />}
              onClick={() => message.info('生命周期预测功能开发中...')}
              style={{ marginRight: 8 }}
            >
              生命周期预测
            </Button>
          </Space>
          <span style={{ fontSize: 16, color: '#fff', marginLeft: 16 }}>{timeStr} {dateStr}</span>
          <Badge count={1} size="small" style={{ marginLeft: 16 }}>
            <BellOutlined style={{ fontSize: 20, color: '#fff' }} />
          </Badge>
          <Avatar style={{ backgroundColor: '#87d068', marginLeft: 16 }} icon={<UserOutlined />} />
          <span style={{ color: '#fff', marginLeft: 8 }}>管理员</span>
        </div>
      </div>

      {/* 过滤条件 */}
      <Card 
        style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        styles={{
          body: { padding: '24px' }
        }}
      >
        <Row gutter={24} align="middle">
          <Col span={6}>
            <div style={{ marginBottom: '8px', fontWeight: '500', color: '#333' }}>城市:</div>
            <Select
              placeholder="选择城市"
              value={selectedCity}
              onChange={handleCityChange}
              style={{ width: '100%' }}
              allowClear
              size="large"
            >
              {cities.map(city => (
                <Option key={city.name} value={city.name}>
                  {city.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: '8px', fontWeight: '500', color: '#333' }}>门店:</div>
            <Select
              placeholder="选择门店"
              value={selectedShopId}
              onChange={handleStoreChange}
              style={{ width: '100%' }}
              allowClear
              disabled={!selectedCity}
              size="large"
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id.toString()}>
                  {store.store_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: '8px', fontWeight: '500', color: '#333' }}>时间范围:</div>
            <RangePicker
              style={{ width: '100%' }}
              size="large"
              onChange={(dates) => {
                if (dates) {
                  setDateRange([
                    dates[0]?.format('YYYY-MM-DD') || '',
                    dates[1]?.format('YYYY-MM-DD') || ''
                  ]);
                  // 自动刷新数据，应用时间筛选
                  setTimeout(() => {
                    fetchCustomerProfileData();
                  }, 100);
                } else {
                  setDateRange(null);
                  // 自动刷新数据，清除时间筛选
                  setTimeout(() => {
                    fetchCustomerProfileData();
                  }, 100);
                }
              }}
            />
          </Col>
          <Col span={4}>
            <Button type="primary" onClick={handleQuery} size="large" style={{ marginRight: '8px', width: '100%', marginBottom: '8px' }}>
              查询
            </Button>
            <Button onClick={handleReset} size="large" style={{ marginRight: '8px', width: '100%', marginBottom: '8px' }}>
              重置
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={async () => {
                console.log('点击了数据同步按钮');
                try {
                  message.loading({ content: '正在同步数据...', key: 'sync' });
                  console.log('即将发起POST /customer-profile/sync');
                  const res = await api.post('/customer-profile/sync');
                  console.log('POST /customer-profile/sync响应:', res);
                  if (res.data.success) {
                    message.success({ content: '数据同步成功', key: 'sync' });
                    fetchCustomerProfileData();
                  } else {
                    message.error({ content: res.data.message || '同步失败', key: 'sync' });
                  }
                } catch (err) {
                  console.log('POST /customer-profile/sync异常:', err);
                  message.error({ content: '同步失败', key: 'sync' });
                }
              }}
              style={{ width: '100%' }}
            >
              数据同步
            </Button>
          </Col>
        </Row>
        
        {/* 显示当前过滤条件 */}
        {(selectedCity || selectedShopId || dateRange) && (
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            backgroundColor: '#f0f8ff', 
            borderRadius: '8px',
            border: '1px solid #d6e4ff'
          }}>
            <strong style={{ color: '#1890ff' }}>当前过滤条件:</strong>
            {selectedCity && <Tag color="blue" style={{ marginLeft: '8px', borderRadius: '4px' }}>城市: {selectedCity}</Tag>}
            {selectedShopId && <Tag color="green" style={{ marginLeft: '8px', borderRadius: '4px' }}>门店: {(() => {
              const foundStore = stores?.find(s => s.id.toString() === selectedShopId);
              return foundStore ? foundStore.store_name : selectedShopId;
            })()}</Tag>}
            {dateRange && (
              <Tag color="orange" style={{ marginLeft: '8px', borderRadius: '4px' }}>
                时间: {dateRange[0]} 至 {dateRange[1]}
              </Tag>
            )}
          </div>
        )}
      </Card>

      {/* KPI卡片 */}
      <Row gutter={20} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={
                <span style={{ fontSize: '16px', fontWeight: '500' }}>
                  总客户数
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<EyeOutlined />}
                    onClick={() => handleViewSegmentDetail('all')}
                    style={{ marginLeft: '8px' }}
                  >
                    查看详情
                  </Button>
                </span>
              }
              value={data.totalCustomers}
              prefix={<UserOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={<span style={{ fontSize: '16px', fontWeight: '500' }}>活跃客户数</span>}
              value={data.totalCustomers}
              prefix={<ShoppingCartOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={
                <Space>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>平均客单价</span>
                  <Tooltip title="计算公式：总消费金额 ÷ 总订单数 = 仪表盘显示的总消费金额 ÷ 总订单数，统计口径为所有订单（含匿名）">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
              value={data.avgOrderValue}
              precision={2}
              suffix="元"
              prefix={<DollarOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Statistic
              title={
                <Space>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>客户生命周期价值</span>
                  <Tooltip title={`客户生命周期价值（CLV）衡量客户在整个合作周期内为企业带来的总价值。\n\n计算方法：\nCLV = 平均每次购买金额 × 年购买频率 × 3年\n\n年购买频率 = 总订单数 ÷ 客户活跃天数 × 365天\n\n本系统基于各类客户的实际购买行为计算3年生命周期价值，\n核心客户：${(data.segments?.find(s => s.segment_name === '核心客户')?.lifetime_value_3y || 0).toFixed(2)}元\n活跃客户：${(data.segments?.find(s => s.segment_name === '活跃客户')?.lifetime_value_3y || 0).toFixed(2)}元\n机会客户：${(data.segments?.find(s => s.segment_name === '机会客户')?.lifetime_value_3y || 0).toFixed(2)}元\n沉睡/新客户：${(data.segments?.find(s => s.segment_name === '沉睡/新客户')?.lifetime_value_3y || 0).toFixed(2)}元`}> 
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
              value={(() => {
                // 计算加权平均的生命周期价值
                const totalCustomers = data.totalCustomers || 0;
                const weightedCLV = data.segments?.reduce((sum, segment) => {
                  return sum + (segment.lifetime_value_3y || 0) * (segment.customer_count / totalCustomers);
                }, 0) || 0;
                return weightedCLV || data.avgOrderValue;
              })()}
              precision={2}
              suffix="元"
              prefix={<TrophyOutlined style={{ fontSize: '24px' }} />}
              valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
              门店优质客户（周购频）
            </span>
            <Tag color="blue" style={{ borderRadius: '4px' }}>
              平均≤7天/次
            </Tag>
          </Space>
        }
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: 'none',
        }}
        loading={premiumLoading}
      >
        {displayPremiumStats.totalPremiumCustomers === 0 ? (
          <div style={{ padding: '16px', color: '#999' }}>
            当前筛选条件下暂无符合“每周购买一次”特征的优质客户
          </div>
        ) : (
          <>
            <Space size="large" wrap>
              <div
                onClick={() => handleOpenPremiumModal('all')}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title="优质客户总数"
                  value={displayPremiumStats.totalPremiumCustomers}
                  valueStyle={{ fontWeight: 600 }}
                />
              </div>
              <div
                onClick={() => handleOpenPremiumModal('all')}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title="覆盖门店数"
                  value={displayPremiumStats.storeCount}
                  valueStyle={{ fontWeight: 600 }}
                />
              </div>
              <div
                onClick={() => handleOpenPremiumModal('inactive')}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title="超30天未购买"
                  value={displayPremiumStats.inactivePremiumCustomers}
                  valueStyle={{
                    fontWeight: 600,
                    color: displayPremiumStats.inactivePremiumCustomers ? '#ff4d4f' : '#52c41a',
                  }}
                />
              </div>
            </Space>
            <Space style={{ marginTop: 12 }}>
              <Button type="link" onClick={() => handleOpenPremiumModal('all')}>
                查看全部优质客户
              </Button>
              <Button type="link" onClick={() => handleOpenPremiumModal('inactive')}>
                仅看超过30天未购
              </Button>
            </Space>
            {premiumInactiveCustomers.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
                message={`共有 ${displayPremiumStats.inactivePremiumCustomers} 位优质客户已超过30天未复购`}
                description="建议尽快发起关怀回访或发送专属活动券，避免优质客群流失。"
              />
            )}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {premiumCustomersByStore.map((store) => (
                <Col span={12} key={store.storeId}>
                  <Card
                    size="small"
                    title={`${store.storeName} · 优质客户 ${store.customers.length} 人`}
                    styles={{ body: { padding: '16px' } }}
                    headStyle={{ fontWeight: 600 }}
                  >
                    {store.customers.map((customer: any) => (
                      <div
                        key={`${store.storeId}-${customer.customer_id}`}
                        style={{
                          padding: '12px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>
                              {customer.customer_name || customer.customer_id}
                            </span>
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0 }}
                              onClick={() => openCustomerOrders(customer.customer_id)}
                            >
                              查看订单
                            </Button>
                          </div>
                          <Tag color="#2db7f5">
                            ≈{Math.ceil(customer.avg_purchase_interval_days || 0)}天/次
                          </Tag>
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          首次购买：{' '}
                          {customer.first_order_date
                            ? dayjs(customer.first_order_date).format('YYYY-MM-DD')
                            : '-'}
                          ，最近购买：{' '}
                          {customer.last_order_date
                            ? dayjs(customer.last_order_date).format('YYYY-MM-DD')
                            : '-'}
                          ，累计消费 ¥{Number(customer.total_spent || 0).toFixed(2)}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          {customer.phone && (
                            <Tag color="default" style={{ marginRight: 8 }}>
                              {customer.phone}
                            </Tag>
                          )}
                          {(() => {
                            const status = customer.customer_status || (customer.is_inactive ? '超过30天未购' : '购频稳定');
                            if (status === '新客户') {
                              return <Tag color="blue">新客户</Tag>;
                            } else if (status === '超过30天未购') {
                              return <Tag color="red">超过30天未购</Tag>;
                            } else {
                              return <Tag color="green">购频稳定</Tag>;
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, textAlign: 'center', paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                      <Button
                        type="link"
                        onClick={() => handleOpenStorePremiumModal(store.storeId, store.storeName)}
                      >
                        更多
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Card>

      <Modal
        title="门店优质客户列表"
        open={premiumModalVisible}
        onCancel={() => setPremiumModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Tag color="blue">
            当前显示：{premiumModalFilter === 'inactive' ? '超过30天未复购' : '全部优质客户'}
          </Tag>
          <Button
            type={premiumModalFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setPremiumModalFilter('all')}
          >
            全部 ({displayPremiumStats.totalPremiumCustomers})
          </Button>
          <Button
            type={premiumModalFilter === 'inactive' ? 'primary' : 'default'}
            onClick={() => setPremiumModalFilter('inactive')}
          >
            超30天未购 ({displayPremiumStats.inactivePremiumCustomers})
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            loading={premiumExportLoading}
            onClick={() => {
              setExportContext('premium');
              setExportFilterVisible(true);
              setExportFilterType(premiumModalFilter === 'inactive' ? 'inactive' : 'all');
            }}
          >
            导出（筛选）
          </Button>
        </Space>
        <Table
          columns={premiumColumns}
          dataSource={premiumModalData}
          rowKey={(record) => `${record.store_id || 'unknown'}-${record.customer_id}`}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Modal>

      {/* 导出筛选Modal */}
      <Modal
        title="选择导出筛选条件"
        open={exportFilterVisible}
        onCancel={() => setExportFilterVisible(false)}
        footer={null}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择要导出的客户状态：</div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                type={exportFilterType === 'all' ? 'primary' : 'default'}
                onClick={() => setExportFilterType('all')}
              >
                全部优质客户
              </Button>
              <Button
                block
                type={exportFilterType === 'new' ? 'primary' : 'default'}
                onClick={() => setExportFilterType('new')}
              >
                新客户
              </Button>
              <Button
                block
                type={exportFilterType === 'stable' ? 'primary' : 'default'}
                onClick={() => setExportFilterType('stable')}
              >
                购频稳定
              </Button>
              <Button
                block
                type={exportFilterType === 'inactive' ? 'primary' : 'default'}
                onClick={() => setExportFilterType('inactive')}
              >
                超过30天未购
              </Button>
            </Space>
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择导出格式：</div>
            <Space wrap>
              {EXPORT_MENU_ITEMS.filter((item): item is { key: string; label: string } => 
                item !== null && 'key' in item && 'label' in item
              ).map((item) => (
                <Button
                  key={item.key}
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    if (exportContext === 'city') {
                      handleExportCityPremium(item.key as ExportFormat);
                    } else if (exportContext === 'store') {
                      handleExportStorePremium(item.key as ExportFormat);
                    } else {
                      handleExportPremium(item.key as ExportFormat);
                    }
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Space>
          </div>
        </Space>
      </Modal>

      {/* 城市优质客户列表模态框 */}
      <Modal
        title={`${selectedCityForPremium} - 城市优质客户列表`}
        open={cityPremiumModalVisible}
        onCancel={() => {
          setCityPremiumModalVisible(false);
          setCityPremiumCustomers([]);
          setSelectedCityForPremium('');
        }}
        footer={null}
        width={1200}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Tag color="blue">
            城市：{selectedCityForPremium} | 共 {cityPremiumPagination.total} 位优质客户
          </Tag>
          <Button 
            icon={<DownloadOutlined />} 
            loading={premiumExportLoading}
            onClick={() => {
              setExportContext('city');
              setExportFilterVisible(true);
              setExportFilterType('all');
            }}
          >
            导出（筛选）
          </Button>
        </Space>
        <Table
          columns={premiumColumns}
          dataSource={cityPremiumCustomers}
          rowKey={(record) => `${record.store_id || 'unknown'}-${record.customer_id}`}
          loading={cityPremiumLoading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: cityPremiumPagination.current,
            pageSize: cityPremiumPagination.pageSize,
            total: cityPremiumPagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              if (selectedCityForPremium) {
                fetchCityPremiumCustomers(selectedCityForPremium, page, pageSize);
              }
            },
            onShowSizeChange: (current, size) => {
              if (selectedCityForPremium) {
                fetchCityPremiumCustomers(selectedCityForPremium, current, size);
              }
            },
          }}
        />
      </Modal>

      {/* 门店优质客户列表模态框 */}
      <Modal
        title={`${selectedStoreForPremium?.storeName || ''} - 门店优质客户列表`}
        open={storePremiumModalVisible}
        onCancel={() => {
          setStorePremiumModalVisible(false);
          setStorePremiumCustomers([]);
          setSelectedStoreForPremium(null);
        }}
        footer={null}
        width={1200}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Tag color="blue">
            门店：{selectedStoreForPremium?.storeName || ''} | 共 {storePremiumPagination.total} 位优质客户
          </Tag>
          <Button 
            icon={<DownloadOutlined />} 
            loading={premiumExportLoading}
            onClick={() => {
              setExportContext('store');
              setExportFilterVisible(true);
              setExportFilterType('all');
            }}
          >
            导出（筛选）
          </Button>
        </Space>
        <Table
          columns={premiumColumns}
          dataSource={storePremiumCustomers}
          rowKey={(record) => `${record.store_id || 'unknown'}-${record.customer_id}`}
          loading={storePremiumLoading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: storePremiumPagination.current,
            pageSize: storePremiumPagination.pageSize,
            total: storePremiumPagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              if (selectedStoreForPremium) {
                fetchStorePremiumCustomers(selectedStoreForPremium.storeId, page, pageSize);
              }
            },
            onShowSizeChange: (current, size) => {
              if (selectedStoreForPremium) {
                fetchStorePremiumCustomers(selectedStoreForPremium.storeId, current, size);
              }
            },
          }}
        />
      </Modal>

      {/* 购买习惯分析 */}
      <PurchasePatternAnalysis
        selectedCity={selectedCity}
        selectedStoreId={selectedShopId}
      />

      {/* AI智能洞察 - 综合分析 */}
      <Row gutter={20} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <AIComprehensiveAnalysis
            selectedCity={selectedCity}
            selectedShopId={selectedShopId}
            dateRange={dateRange}
          />
        </Col>
      </Row>

      {/* AI洞察快速概览 */}
      <Row gutter={20} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <AIInsightsOverview onViewDetails={() => setAiAnalysisVisible(true)} />
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={20}>
        <Col span={12}>
          <Card 
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                客户分层分布
                {(selectedCity || selectedShopId || dateRange) && (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    已过滤
                  </Tag>
                )}
              </span>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <Table
                dataSource={data.segments?.map((item, idx) => ({ ...item, key: item.segment_name || idx })) || []}
                columns={[
                  {
                    title: '客户分层',
                    dataIndex: 'segment_name',
                    key: 'segment_name',
                    render: (text: string) => {
                      const colorMap: { [key: string]: string } = {
                        '核心客户': '#52c41a',
                        '活跃客户': '#1890ff',
                        '机会客户': '#faad14',
                        '沉睡/新客户': '#ff4d4f'
                      };
                      return <Tag color={colorMap[text] || '#d9d9d9'} style={{ borderRadius: '4px', fontWeight: '500' }}>{text}</Tag>;
                    }
                  },
                  {
                    title: '客户数量',
                    dataIndex: 'customer_count',
                    key: 'customer_count',
                    render: (value: number) => value?.toLocaleString() || '0'
                  },
                  {
                    title: '占比',
                    key: 'percentage',
                    render: (_, record) => `${((record.customer_count / data.totalCustomers) * 100).toFixed(1)}%`
                  },
                  {
                    title: '平均消费',
                    dataIndex: 'avg_spend',
                    key: 'avg_spend',
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '平均订单数',
                    dataIndex: 'avg_orders',
                    key: 'avg_orders',
                    render: (value: number) => value?.toFixed(1) || '0'
                  },
                  {
                    title: '总消费',
                    dataIndex: 'total_revenue',
                    key: 'total_revenue',
                    render: (value: number) => `¥${value?.toLocaleString() || '0'}`
                  },
                  {
                    title: '3年生命周期价值',
                    dataIndex: 'lifetime_value_3y',
                    key: 'lifetime_value_3y',
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_, record) => (
                      <Space>
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={() => handleViewSegmentDetail(record.segment_name)}
                          style={{ padding: '4px 8px' }}
                        >
                          查看详情
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<BellOutlined />}
                          onClick={() => fetchAIAnalysis(record.segment_name)}
                          loading={aiAnalysisLoading}
                          style={{ padding: '4px 8px' }}
                        >
                          AI分析
                        </Button>
                      </Space>
                    )
                  }
                ]}
                pagination={false}
                size="small"
                style={{ borderRadius: '8px' }}
              />
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                客户购买时间分布
                {(selectedCity || selectedShopId || dateRange) && (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    已过滤
                  </Tag>
                )}
              </span>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            styles={{
              body: { padding: '24px' }
            }}
          >
            <Bar
              data={{
                labels: data.timeDistribution?.map(item => `${item.hour}:00`) || [],
                datasets: [
                  {
                    label: '订单数量',
                    data: data.timeDistribution?.map(item => item.order_count) || [],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    yAxisID: 'y'
                  },
                  {
                    label: '客户数量',
                    data: data.timeDistribution?.map(item => item.customer_count) || [],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index' as const,
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 12,
                        weight: 'bold'
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    display: true,
                    title: {
                      display: true,
                      text: '时间',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    grid: {
                      color: 'rgba(0,0,0,0.1)'
                    }
                  },
                  y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: {
                      display: true,
                      text: '订单数量',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    grid: {
                      color: 'rgba(0,0,0,0.1)'
                    }
                  },
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: {
                      display: true,
                      text: '客户数量',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  }
                }
              }}
              style={{ height: '300px' }}
            />
          </Card>
        </Col>
      </Row>


      {/* 客户分层详情模态框 */}
      <Modal
        title={
          <Space>
            <span>{`${selectedSegment || '全部'}客户详情`}</span>
            <Dropdown
              menu={{
                items: EXPORT_MENU_ITEMS,
                onClick: ({ key }) => handleExportSegmentCustomers(key as ExportFormat),
              }}
              trigger={['click']}
            >
              <Button icon={<DownloadOutlined />} loading={segmentExportLoading}>
                导出
              </Button>
            </Dropdown>
          </Space>
        }
        open={segmentDetailVisible}
        onCancel={() => setSegmentDetailVisible(false)}
        width={1200}
        footer={null}
      >
        <Table
          columns={customerColumns}
          dataSource={segmentCustomers}
          loading={segmentLoading}
          rowKey="customer_id"
          pagination={{
            current: segmentPagination.current,
            pageSize: segmentPagination.pageSize,
            total: segmentPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => fetchSegmentCustomers(selectedSegment, page, pageSize, sortState.field, sortState.order),
            onShowSizeChange: (current, size) => fetchSegmentCustomers(selectedSegment, current, size, sortState.field, sortState.order),
          }}
          onChange={handleTableChange}
        />
      </Modal>

      {/* 客户订单弹窗 */}
      <Modal
        title={
          <Space>
            <span>{`客户 ${selectedCustomerId || '-'} 的订单`}</span>
            <Dropdown
              menu={{
                items: EXPORT_MENU_ITEMS,
                onClick: ({ key }) => handleExportCustomerOrders(key as ExportFormat),
              }}
              trigger={['click']}
            >
              <Button
                icon={<DownloadOutlined />}
                loading={ordersExportLoading}
                disabled={!selectedCustomerId}
              >
                导出
              </Button>
            </Dropdown>
          </Space>
        }
        open={customerOrdersVisible}
        onCancel={() => setCustomerOrdersVisible(false)}
        width={900}
        footer={null}
      >
        <Table
          columns={orderColumns}
          dataSource={customerOrders}
          rowKey="order_id"
          pagination={{
            current: ordersPagination.current,
            pageSize: ordersPagination.pageSize,
            total: ordersPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条订单`,
            onChange: (page, pageSize) => fetchCustomerOrders(selectedCustomerId, page, pageSize)
          }}
        />
      </Modal>

      {/* AI分析弹窗 */}
      <Modal
        title={`${aiAnalysisData?.segment_data?.segment || '客户'}AI分析报告`}
        open={aiAnalysisVisible}
        onCancel={() => setAiAnalysisVisible(false)}
        width={1000}
        footer={null}
      >
        {aiAnalysisLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>AI分析生成中，请稍候...</div>
          </div>
        ) : aiAnalysisData ? (
          <div>
            {/* 客户分层数据概览 */}
            <Card title="客户分层数据概览" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="客户数量"
                    value={aiAnalysisData?.segment_data?.customer_count || 0}
                    suffix="人"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均消费"
                    value={aiAnalysisData?.segment_data?.avg_spend || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均订单数"
                    value={aiAnalysisData?.segment_data?.avg_orders || 0}
                    precision={1}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总消费"
                    value={aiAnalysisData?.segment_data?.total_revenue || 0}
                    precision={0}
                    prefix="¥"
                  />
                </Col>
              </Row>
            </Card>

            {/* AI分析结果 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="客户特征分析" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData?.ai_analysis?.characteristics?.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>{item}</li>
                    )) || []}
                  </ul>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="营销建议" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData?.ai_analysis?.marketing_suggestions?.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Tag color="blue">{item}</Tag>
                      </li>
                    )) || []}
                  </ul>
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card title="风险因素" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData?.ai_analysis?.risk_factors?.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Tag color="red">{item}</Tag>
                      </li>
                    )) || []}
                  </ul>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="发展机会" style={{ marginBottom: 16 }}>
                  <ul style={{ paddingLeft: 20 }}>
                    {aiAnalysisData?.ai_analysis?.opportunities?.map((item: string, index: number) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Tag color="green">{item}</Tag>
                      </li>
                    )) || []}
                  </ul>
                </Card>
              </Col>
            </Row>

            {/* 产品偏好分析 */}
            {aiAnalysisData?.segment_data?.product_preferences && aiAnalysisData?.segment_data?.product_preferences.length > 0 && (
              <Card title="产品偏好分析">
                <Table
                  dataSource={aiAnalysisData?.segment_data?.product_preferences || []}
                  rowKey="goods_name"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '商品名称',
                      dataIndex: 'goods_name',
                      key: 'goods_name',
                    },
                    {
                      title: '购买次数',
                      dataIndex: 'purchase_count',
                      key: 'purchase_count',
                    },
                    {
                      title: '总金额',
                      dataIndex: 'total_amount',
                      key: 'total_amount',
                      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                    },
                    {
                      title: '平均价格',
                      dataIndex: 'avg_price',
                      key: 'avg_price',
                      render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                    }
                  ]}
                />
              </Card>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无AI分析数据
          </div>
        )}
      </Modal>

      {/* AI深度洞察弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <RobotOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              AI深度客户洞察
            </div>
            {aiAnalysisData && (
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const storeName = selectedShopId 
                      ? stores.find(s => String(s.id) === String(selectedShopId))?.store_name || ''
                      : '';
                    exportToPDF(aiAnalysisData, selectedCity || '', storeName);
                    message.success('PDF导出中...');
                  }}
                >
                  导出PDF
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const storeName = selectedShopId 
                      ? stores.find(s => String(s.id) === String(selectedShopId))?.store_name || ''
                      : '';
                    exportToWord(aiAnalysisData, selectedCity || '', storeName);
                    message.success('Word导出中...');
                  }}
                >
                  导出Word
                </Button>
              </Space>
            )}
          </div>
        }
        open={aiAnalysisVisible}
        onCancel={() => setAiAnalysisVisible(false)}
        width={1200}
        footer={null}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        className="ai-insights-modal"
      >
        {aiAnalysisData ? (
          <div>
            {/* 客户健康度评分 */}
            <Card title="客户健康度评分" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="健康度评分"
                    value={aiAnalysisData?.insights?.healthScore || 0}
                    suffix="/ 100"
                    valueStyle={{ color: (aiAnalysisData?.insights?.healthScore || 0) > 70 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="客户价值评估"
                    value={aiAnalysisData?.insights?.customerValueAssessment || '评估中...'}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="流失风险预测"
                    value={aiAnalysisData?.insights?.churnRiskPrediction || '分析中...'}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
              </Row>
            </Card>

            {/* 个性化营销建议 */}
            {aiAnalysisData?.insights?.personalizedMarketingSuggestions && (
              <Card title="个性化营销建议" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {aiAnalysisData?.insights?.personalizedMarketingSuggestions?.map((suggestion: string, index: number) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 8 }}>
                      {suggestion}
                    </Tag>
                  ))}
                </div>
              </Card>
            )}

            {/* 优先行动 */}
            {aiAnalysisData?.insights?.priorityActions && (
              <Card title="优先行动建议" style={{ marginBottom: 16 }}>
                {aiAnalysisData?.insights?.priorityActions?.map((action: any, index: number) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Tag color={action.priority === 'high' ? 'red' : action.priority === 'medium' ? 'orange' : 'green'}>
                          {action.priority === 'high' ? '高优先级' : action.priority === 'medium' ? '中优先级' : '低优先级'}
                        </Tag>
                        <strong>{action.title}</strong>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, color: '#666' }}>
                      {action.description}
                    </div>
                    <div style={{ marginTop: 8, color: '#1890ff' }}>
                      <strong>建议行动：</strong>{action.action}
                    </div>
                  </Card>
                ))}
              </Card>
            )}

            {/* 竞品营销方法参考 */}
            {aiAnalysisData?.insights?.competitiveMarketingSuggestions && aiAnalysisData.insights.competitiveMarketingSuggestions.length > 0 && (
              <Card title="竞品营销方法参考" style={{ marginBottom: 16 }}>
                <List
                  dataSource={aiAnalysisData.insights.competitiveMarketingSuggestions}
                  renderItem={(suggestion: string, index: number) => (
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ marginRight: 8, fontWeight: 'bold', color: '#1890ff' }}>{index + 1}.</span>
                        <span style={{ lineHeight: 1.6 }}>{suggestion}</span>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* 数据表格 */}
            {aiAnalysisData?.insights?.dataTables && aiAnalysisData.insights.dataTables.length > 0 && (
              <Card title="数据表格" style={{ marginBottom: 16 }}>
                {aiAnalysisData.insights.dataTables.map((table: any, tableIndex: number) => (
                  <div key={tableIndex} style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 'bold' }}>{table.title}</h4>
                    <Table
                      dataSource={table.data.slice(0, 20)}
                      columns={table.columns.map((col: string) => ({
                        title: col,
                        dataIndex: col,
                        key: col,
                        render: (text: any) => String(text || '')
                      }))}
                      pagination={false}
                      size="small"
                      style={{ marginBottom: 16 }}
                    />
                  </div>
                ))}
              </Card>
            )}

            {/* 产品推荐策略 */}
            {aiAnalysisData?.insights?.productRecommendationStrategy && (
              <Card title="产品推荐策略" style={{ marginBottom: 16 }}>
                <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {aiAnalysisData?.insights?.productRecommendationStrategy}
                </p>
              </Card>
            )}

            {/* 分析数据详情 */}
            <Card title="分析数据详情" size="small">
              <div style={{ fontSize: 12, color: '#666' }}>
                <p><strong>生成时间：</strong>{aiAnalysisData?.generatedAt ? dayjs(aiAnalysisData.generatedAt).format('YYYY-MM-DD HH:mm:ss') : '未知'}</p>
                <p><strong>数据样本：</strong>{aiAnalysisData?.rawData?.segments?.length || 0} 个客户分群</p>
                {aiAnalysisData?.analysisScope && (
                  <>
                    <p><strong>分析范围：</strong>
                      {aiAnalysisData.analysisScope.type === 'all_cities' ? '全部城市' :
                       aiAnalysisData.analysisScope.type === 'city' ? `城市：${aiAnalysisData.analysisScope.city}` :
                       aiAnalysisData.analysisScope.type === 'store' ? `店铺：${aiAnalysisData.analysisScope.storeName}（${aiAnalysisData.analysisScope.city}）` :
                       '未知'}
                    </p>
                    {aiAnalysisData.analysisScope.cityStoreCount && (
                      <p><strong>城市店铺数：</strong>{aiAnalysisData.analysisScope.cityStoreCount} 个</p>
                    )}
                  </>
                )}
                {aiAnalysisData?.rawData?.timeDistribution && (
                  <p><strong>时间分布：</strong>24小时分布分析（{aiAnalysisData.rawData.timeDistribution.filter((t: any) => t.customer_count > 0).length} 个活跃时段）</p>
                )}
                {aiAnalysisData?.rawData?.productPreferences && (
                  <p><strong>产品偏好：</strong>{aiAnalysisData.rawData.productPreferences.length} 个热门产品</p>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无AI洞察数据
          </div>
        )}
      </Modal>

      {/* 客户流失预警弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <BellOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
              客户流失预警
            </div>
            {churnAlertData && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'xlsx',
                      label: '导出Excel',
                      onClick: () => handleExportChurnAlert('xlsx')
                    },
                    {
                      key: 'csv',
                      label: '导出CSV',
                      onClick: () => handleExportChurnAlert('csv')
                    },
                    {
                      key: 'pdf',
                      label: '导出PDF',
                      onClick: () => handleExportChurnAlert('pdf')
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button icon={<DownloadOutlined />} loading={churnAlertExportLoading}>
                  导出
                </Button>
              </Dropdown>
            )}
          </div>
        }
        open={churnAlertVisible}
        onCancel={() => {
          setChurnAlertVisible(false);
          setChurnAlertFilters({});
        }}
        width={1400}
        footer={null}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {churnAlertData ? (
          <div>
            {/* 风险统计 */}
            <Card title="风险分布统计" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="高风险客户"
                    value={churnAlertData.riskStats?.high || 0}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="中风险客户"
                    value={churnAlertData.riskStats?.medium || 0}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="低风险客户"
                    value={churnAlertData.riskStats?.low || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总预警客户"
                    value={churnAlertData.riskStats?.total || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* 筛选器 */}
            <Card title="筛选条件" style={{ marginBottom: 16 }} size="small">
              <Space wrap>
                <span>风险等级：</span>
                <Select
                  mode="multiple"
                  placeholder="选择风险等级"
                  style={{ width: 200 }}
                  value={churnAlertFilters.riskLevel}
                  onChange={(value) => setChurnAlertFilters({ ...churnAlertFilters, riskLevel: value })}
                  allowClear
                  options={[
                    { label: '高风险', value: '高风险' },
                    { label: '中风险', value: '中风险' },
                    { label: '低风险', value: '低风险' }
                  ]}
                />
                <span>距今天数范围：</span>
                <InputNumber
                  placeholder="最小天数"
                  min={0}
                  style={{ width: 120 }}
                  value={churnAlertFilters.daysRange?.[0]}
                  onChange={(value) => setChurnAlertFilters({
                    ...churnAlertFilters,
                    daysRange: [value || 0, churnAlertFilters.daysRange?.[1] || 9999]
                  })}
                />
                <span>-</span>
                <InputNumber
                  placeholder="最大天数"
                  min={0}
                  style={{ width: 120 }}
                  value={churnAlertFilters.daysRange?.[1]}
                  onChange={(value) => setChurnAlertFilters({
                    ...churnAlertFilters,
                    daysRange: [churnAlertFilters.daysRange?.[0] || 0, value || 9999]
                  })}
                />
                <Button onClick={() => setChurnAlertFilters({})}>重置筛选</Button>
              </Space>
            </Card>

            {/* 预警客户列表 */}
            <Card title="预警客户详情">
              <Table
                dataSource={getFilteredChurnAlerts()}
                rowKey="customer_id"
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                size="small"
                scroll={{ x: 1200 }}
                columns={[
                  {
                    title: '客户ID',
                    dataIndex: 'customer_id',
                    key: 'customer_id',
                    width: 200,
                    fixed: 'left' as const,
                    ellipsis: true,
                    render: (customerId: string) => (
                      <Button 
                        type="link" 
                        onClick={() => fetchLifecyclePrediction(customerId)}
                        loading={lifecycleLoading}
                        style={{ padding: 0, fontSize: '12px' }}
                      >
                        <span style={{ maxWidth: '180px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {customerId}
                        </span>
                      </Button>
                    )
                  },
                  {
                    title: '首次购买时间',
                    dataIndex: 'first_order_date',
                    key: 'first_order_date',
                    width: 160,
                    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
                    sorter: (a: any, b: any) => {
                      if (!a.first_order_date) return 1;
                      if (!b.first_order_date) return -1;
                      return new Date(a.first_order_date).getTime() - new Date(b.first_order_date).getTime();
                    }
                  },
                  {
                    title: '最后订单时间',
                    dataIndex: 'last_order_date',
                    key: 'last_order_date',
                    width: 160,
                    render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
                    sorter: (a: any, b: any) => {
                      if (!a.last_order_date) return 1;
                      if (!b.last_order_date) return -1;
                      return new Date(a.last_order_date).getTime() - new Date(b.last_order_date).getTime();
                    }
                  },
                  {
                    title: '距今天数',
                    dataIndex: 'days_since_last_order',
                    key: 'days_since_last_order',
                    width: 110,
                    align: 'right' as const,
                    render: (days: number) => (
                      <Tag color={days > 30 ? 'red' : days > 15 ? 'orange' : 'green'}>
                        {days} 天
                      </Tag>
                    ),
                    sorter: (a: any, b: any) => a.days_since_last_order - b.days_since_last_order,
                    filters: [
                      { text: '0-15天', value: '0-15' },
                      { text: '16-30天', value: '16-30' },
                      { text: '31-60天', value: '31-60' },
                      { text: '60天以上', value: '60+' }
                    ],
                    onFilter: (value: any, record: any) => {
                      const days = record.days_since_last_order;
                      if (value === '0-15') return days >= 0 && days <= 15;
                      if (value === '16-30') return days >= 16 && days <= 30;
                      if (value === '31-60') return days >= 31 && days <= 60;
                      if (value === '60+') return days > 60;
                      return true;
                    }
                  },
                  {
                    title: '风险等级',
                    dataIndex: 'churn_risk_level',
                    key: 'churn_risk_level',
                    width: 100,
                    filters: [
                      { text: '高风险', value: '高风险' },
                      { text: '中风险', value: '中风险' },
                      { text: '低风险', value: '低风险' }
                    ],
                    onFilter: (value: any, record: any) => record.churn_risk_level === value,
                    render: (level: string) => (
                      <Tag color={level === '高风险' ? 'red' : level === '中风险' ? 'orange' : 'green'}>
                        {level}
                      </Tag>
                    )
                  },
                  {
                    title: '历史订单数',
                    dataIndex: 'total_orders',
                    key: 'total_orders',
                    width: 110,
                    align: 'right' as const,
                    sorter: (a: any, b: any) => a.total_orders - b.total_orders
                  },
                  {
                    title: '历史消费',
                    dataIndex: 'total_spent',
                    key: 'total_spent',
                    width: 120,
                    align: 'right' as const,
                    render: (value: number) => <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{Number(value || 0).toFixed(2)}</span>,
                    sorter: (a: any, b: any) => a.total_spent - b.total_spent
                  },
                  {
                    title: '平均订单价值',
                    dataIndex: 'avg_order_value',
                    key: 'avg_order_value',
                    width: 120,
                    align: 'right' as const,
                    render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
                    sorter: (a: any, b: any) => a.avg_order_value - b.avg_order_value
                  },
                  {
                    title: '购买频率',
                    dataIndex: 'avg_purchase_interval_days',
                    key: 'avg_purchase_interval_days',
                    width: 110,
                    align: 'center' as const,
                    render: (val: number) => {
                      if (!val || val === 0) return '-';
                      return <Tag color="blue">≈{Math.ceil(val)}天/次</Tag>;
                    },
                    sorter: (a: any, b: any) => {
                      const valA = a.avg_purchase_interval_days || 0;
                      const valB = b.avg_purchase_interval_days || 0;
                      return valA - valB;
                    }
                  }
                ]}
              />
            </Card>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无流失预警数据
          </div>
        )}
      </Modal>

      {/* 客户生命周期预测弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TrophyOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            客户生命周期预测
          </div>
        }
        open={lifecyclePredictionVisible}
        onCancel={() => setLifecyclePredictionVisible(false)}
        width={800}
        footer={null}
      >
        {lifecycleData ? (
          <div>
            <Card title="客户基本信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="客户ID" value={lifecycleData.customerId} />
                </Col>
                <Col span={8}>
                  <Statistic title="历史订单数" value={lifecycleData.currentData?.order_count || 0} />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="历史消费" 
                    value={lifecycleData.currentData?.total_spent || 0} 
                    prefix="¥"
                    precision={2}
                  />
                </Col>
              </Row>
            </Card>

            <Card title="生命周期预测" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="当前阶段" 
                    value={lifecycleData.prediction?.currentStage || '未知'} 
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="下一阶段" 
                    value={lifecycleData.prediction?.nextStage || '未知'} 
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="预测持续天数" 
                    value={lifecycleData.prediction?.predictedDuration || 0} 
                    suffix="天"
                  />
                </Col>
              </Row>
            </Card>

            <Card title="风险评估">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title="流失风险" 
                    value={lifecycleData.prediction?.churnRisk || 0} 
                    suffix="/ 100"
                    valueStyle={{ color: lifecycleData.prediction?.churnRisk > 70 ? '#ff4d4f' : '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="增长潜力" 
                    value={lifecycleData.prediction?.growthPotential || 0} 
                    suffix="/ 100"
                    valueStyle={{ color: lifecycleData.prediction?.growthPotential > 70 ? '#52c41a' : '#faad14' }}
                  />
                </Col>
              </Row>
            </Card>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无生命周期预测数据
          </div>
        )}
      </Modal>

      {/* 订单详细信息弹窗 */}
      <Modal
        title={
          <Space>
            <span>订单详情</span>
            <Dropdown
              menu={{
                items: EXPORT_MENU_ITEMS,
                onClick: ({ key }) => handleExportOrderGoods(key as ExportFormat),
              }}
              trigger={['click']}
            >
              <Button
                icon={<DownloadOutlined />}
                loading={goodsExportLoading}
                disabled={!orderDetail || !orderDetail?.goods?.length}
              >
                导出
              </Button>
            </Dropdown>
          </Space>
        }
        open={orderDetailVisible}
        onCancel={() => setOrderDetailVisible(false)}
        width={1000}
        footer={null}
      >
        {orderDetailLoading ? <div>加载中...</div> : orderDetail ? (
          <div>
            <h4>订单基本信息</h4>
            <div style={{ marginBottom: 20 }}>
              <p><strong>订单号：</strong>{orderDetail.order_id}</p>
              <p><strong>订单编号：</strong>{orderDetail.order_no}</p>
              <p><strong>下单时间：</strong>{orderDetail.order_date ? new Date(orderDetail.order_date).toLocaleString() : '-'}</p>
              <p><strong>金额：</strong>¥{orderDetail.total_amount?.toFixed(2) || '0.00'}</p>
              <p><strong>支付状态：</strong>{orderDetail.pay_state}</p>
              <p><strong>门店名称：</strong>{orderDetail.shop_name || '未知门店'}</p>
              <p><strong>客户ID：</strong>{orderDetail.customer_id}</p>
              <p><strong>客户名：</strong>{orderDetail.customer_name || '-'}</p>
              <p><strong>手机号：</strong>{orderDetail.phone || '-'}</p>
              <p><strong>创建时间：</strong>{orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleString() : '-'}</p>
            </div>
            
            <h4>商品明细 ({orderDetail.goods ? orderDetail.goods.length : 0} 件商品)</h4>
            {orderDetail.goods && orderDetail.goods.length > 0 ? (
              <Table
                dataSource={orderDetail.goods}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '商品名称',
                    dataIndex: 'goods_name',
                    key: 'goods_name',
                    width: 200,
                    render: (text: any) => text || '-'
                  },
                  {
                    title: '数量',
                    dataIndex: 'goods_number',
                    key: 'goods_number',
                    width: 80,
                    render: (value: number) => value || 0
                  },
                  {
                    title: '单价',
                    dataIndex: 'goods_price',
                    key: 'goods_price',
                    width: 100,
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '小计',
                    dataIndex: 'total_price',
                    key: 'total_price',
                    width: 100,
                    render: (value: number) => `¥${value?.toFixed(2) || '0.00'}`
                  },
                  {
                    title: '分类',
                    dataIndex: 'category',
                    key: 'category',
                    width: 120,
                    render: (text: any) => text || '-'
                  },
                  {
                    title: '优惠金额',
                    dataIndex: 'discount_amount',
                    key: 'discount_amount',
                    width: 100,
                    render: (value: number) => value ? `¥${value.toFixed(2)}` : '-'
                  },
                  {
                    title: '退款金额',
                    dataIndex: 'refund_amount',
                    key: 'refund_amount',
                    width: 100,
                    render: (value: number) => value ? `¥${value.toFixed(2)}` : '-'
                  }
                ]}
                scroll={{ x: 800 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                该订单暂无商品明细数据
              </div>
            )}
          </div>
        ) : <div>暂无数据</div>}
      </Modal>
    </div>
  );
};

export default CustomerProfile; 