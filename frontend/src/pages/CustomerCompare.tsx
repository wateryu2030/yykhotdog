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
  Empty,
  Modal,
  message
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
  TrophyOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import { api } from '../config/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 导出相关类型和配置
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

// 导出列配置
const customerExportColumnsConfig: ExportColumnConfig[] = [
  { title: '客户ID', dataIndex: 'customer_id' },
  { title: '客户姓名', dataIndex: 'customer_name', formatter: (value) => value || '-' },
  { title: '订单数量', dataIndex: 'order_count' },
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
    title: '首次购买时间',
    dataIndex: 'first_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '购买频率',
    dataIndex: 'avg_purchase_interval_days',
    formatter: (value) => {
      if (!value || value === 0) return '-';
      return `≈${Math.ceil(value)}天/次`;
    },
  },
  {
    title: '最后下单日期',
    dataIndex: 'last_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
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
];

const topCustomerExportColumnsConfig: ExportColumnConfig[] = [
  { title: '排名', dataIndex: 'rank' },
  { title: '客户ID', dataIndex: 'customer_id' },
  { title: '客户名称', dataIndex: 'customer_name', formatter: (value) => value || '未命名客户' },
  { title: '订单数', dataIndex: 'order_count' },
  {
    title: '总消费',
    dataIndex: 'total_revenue',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '平均客单价',
    dataIndex: 'avg_order_value',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '首次购买时间',
    dataIndex: 'first_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '购买频率',
    dataIndex: 'avg_purchase_interval_days',
    formatter: (value) => {
      if (!value || value === 0) return '-';
      return `≈${Math.ceil(value)}天/次`;
    },
  },
  {
    title: '最后下单',
    dataIndex: 'last_order_date',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '-'),
  },
];

const segmentsExportColumnsConfig: ExportColumnConfig[] = [
  { title: '客户群体', dataIndex: 'segment' },
  { title: '客户数', dataIndex: 'customerCount' },
  {
    title: '总销售额',
    dataIndex: 'totalRevenue',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '平均客单价',
    dataIndex: 'avgOrderValue',
    formatter: (value) => (value != null ? Number(value).toFixed(2) : '0.00'),
  },
  {
    title: '平均频次',
    dataIndex: 'avgOrderFrequency',
    formatter: (value) => (value != null ? Number(value).toFixed(1) : '0.0'),
  },
  {
    title: '最后下单日期',
    dataIndex: 'lastOrderDate',
    formatter: (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '-'),
  },
];

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
  
  // 下钻功能状态
  const [segmentCustomersVisible, setSegmentCustomersVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
  const [segmentCustomersLoading, setSegmentCustomersLoading] = useState(false);
  const [segmentCustomersPagination, setSegmentCustomersPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  
  const [customerOrdersVisible, setCustomerOrdersVisible] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [customerOrdersPagination, setCustomerOrdersPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  
  // 导出功能状态
  const [segmentExportLoading, setSegmentExportLoading] = useState(false);
  const [ordersExportLoading, setOrdersExportLoading] = useState(false);
  const [goodsExportLoading, setGoodsExportLoading] = useState(false);
  const [topCustomersExportLoading, setTopCustomersExportLoading] = useState(false);
  const [segmentsExportLoading, setSegmentsExportLoading] = useState(false);

  useEffect(() => {
    fetchCustomerCompareData();
  }, [dateRange]);

  // 下钻功能处理函数
  const handleViewSegmentCustomers = async (segment: string) => {
    setSelectedSegment(segment);
    setSegmentCustomersVisible(true);
    await fetchSegmentCustomers(segment, 1, 10);
  };

  const fetchSegmentCustomers = async (segment: string, page = 1, pageSize = 10) => {
    setSegmentCustomersLoading(true);
    try {
      if (!dateRange) return;
      const [startDate, endDate] = dateRange.map(d => d.format('YYYY-MM-DD'));
      
      // 获取指定分群的客户数据
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('segment', segment); // 直接传递segment参数
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      
      const response = await api.get(`/customer-profile/customers?${params.toString()}`);
      if (response.data.success) {
        setSegmentCustomers(response.data.data || []);
        setSegmentCustomersPagination({ 
          current: page, 
          pageSize, 
          total: response.data.total || 0 
        });
      }
    } catch (error) {
      message.error('获取客户列表失败');
    } finally {
      setSegmentCustomersLoading(false);
    }
  };

  const handleViewCustomerOrders = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCustomerOrdersVisible(true);
    await fetchCustomerOrders(customerId, 1, 10);
  };

  const fetchCustomerOrders = async (customerId: string, page = 1, pageSize = 10) => {
    setCustomerOrdersLoading(true);
    try {
      // 使用与客户列表相同的日期范围筛选订单
      let url = `/customer-profile/customers/${customerId}/orders?page=${page}&pageSize=${pageSize}`;
      if (dateRange) {
        const [startDate, endDate] = dateRange.map(d => d.format('YYYY-MM-DD'));
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await api.get(url);
      if (res.data.success) {
        setCustomerOrders(res.data.data.orders || []);
        setCustomerOrdersPagination({ 
          current: page, 
          pageSize, 
          total: res.data.data.total || 0 
        });
      }
    } catch (e) {
      message.error('获取客户订单失败');
    } finally {
      setCustomerOrdersLoading(false);
    }
  };
  
  // 导出功能处理函数
  const fetchSegmentDataForExport = async () => {
    const results: any[] = [];
    if (!selectedSegment) {
      return results;
    }
    const pageSize = 1000;
    let page = 1;
    let total = 0;
    do {
      if (!dateRange) break;
      const [startDate, endDate] = dateRange.map(d => d.format('YYYY-MM-DD'));
      
      const params = new URLSearchParams();
      params.append('segment', selectedSegment);
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      
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
    do {
      let url = `/customer-profile/customers/${selectedCustomerId}/orders?page=${page}&pageSize=${pageSize}`;
      if (dateRange) {
        const [startDate, endDate] = dateRange.map(d => d.format('YYYY-MM-DD'));
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get(url);
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
    } while (results.length < total);
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

  const handleExportTopCustomers = async (format: ExportFormat) => {
    if (!topCustomers || topCustomers.length === 0) {
      message.info('暂无TOP客户数据');
      return;
    }
    setTopCustomersExportLoading(true);
    const hide = message.loading('正在导出TOP客户数据...');
    try {
      const exportData = topCustomers.map((customer, index) => ({
        ...customer,
        rank: index + 1
      }));
      exportDataSet('TOP客户排行榜', format, topCustomerExportColumnsConfig, exportData);
      message.success('TOP客户数据导出成功');
    } catch (error) {
      console.error(error);
      message.error('TOP客户数据导出失败');
    } finally {
      hide();
      setTopCustomersExportLoading(false);
    }
  };

  const handleExportSegments = async (format: ExportFormat) => {
    if (!segments || segments.length === 0) {
      message.info('暂无客户群体对比数据');
      return;
    }
    setSegmentsExportLoading(true);
    const hide = message.loading('正在导出客户群体对比数据...');
    try {
      exportDataSet('客户群体对比表', format, segmentsExportColumnsConfig, segments);
      message.success('客户群体对比数据导出成功');
    } catch (error) {
      console.error(error);
      message.error('客户群体对比数据导出失败');
    } finally {
      hide();
      setSegmentsExportLoading(false);
    }
  };

  const handleViewOrderDetail = async (orderId: string) => {
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

  const fetchCustomerCompareData = async () => {
    setLoading(true);
    try {
      if (!dateRange) return;
      const [startDate, endDate] = dateRange.map(d => d.format('YYYY-MM-DD'));
      
      // 获取客户列表并进行群体分析
      const customersResponse = await fetch(
        `/api/customer-profile/customers?startDate=${startDate}&endDate=${endDate}&pageSize=1000`
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
          avgOrderValue: Number((seg.totalRevenue / seg.customerCount).toFixed(2)),
          avgOrderFrequency: Number((seg.totalOrderCount / seg.customerCount).toFixed(1)),
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
            total_revenue: Number((c.total_spent || 0).toFixed(2)),
            avg_order_value: Number((c.avg_order_value || 0).toFixed(2)),
            first_order_date: c.first_order_date,
            avg_purchase_interval_days: c.avg_purchase_interval_days,
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
          '核心客户': '#52c41a',
          '活跃客户': '#1890ff',
          '机会客户': '#faad14',
          '沉睡/新客户': '#999',
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
      render: (count: number, record: CustomerSegment) => (
        <Button 
          type="link" 
          onClick={() => handleViewSegmentCustomers(record.segment)}
          style={{ padding: 0 }}
        >
          {count}
        </Button>
      )
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
      width: 70,
      align: 'center' as const,
      fixed: 'left' as const,
    },
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id',
      width: 180,
      ellipsis: true,
      render: (customerId: string) => (
        <Button 
          type="link" 
          onClick={() => handleViewCustomerOrders(customerId)}
          style={{ padding: 0, fontSize: '12px' }}
        >
          <span style={{ maxWidth: '160px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customerId}
          </span>
        </Button>
      )
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 120,
      ellipsis: true,
      render: (text: string) => <span title={text}>{text || '未命名客户'}</span>
    },
    {
      title: '订单数',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 90,
      align: 'right' as const,
      sorter: (a: any, b: any) => a.order_count - b.order_count,
    },
    {
      title: '总消费',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      width: 120,
      align: 'right' as const,
      render: (val: number) => <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{Number(val || 0).toFixed(2)}</span>,
      sorter: (a: any, b: any) => a.total_revenue - b.total_revenue,
    },
    {
      title: '平均客单价',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      width: 120,
      align: 'right' as const,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.avg_order_value - b.avg_order_value,
    },
    {
      title: '首次购买时间',
      dataIndex: 'first_order_date',
      key: 'first_order_date',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
      sorter: (a: any, b: any) => {
        if (!a.first_order_date) return 1;
        if (!b.first_order_date) return -1;
        return new Date(a.first_order_date).getTime() - new Date(b.first_order_date).getTime();
      }
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
    },
    {
      title: '最后下单',
      dataIndex: 'last_order_date',
      key: 'last_order_date',
      width: 120,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-',
      sorter: (a: any, b: any) => {
        if (!a.last_order_date) return 1;
        if (!b.last_order_date) return -1;
        return new Date(a.last_order_date).getTime() - new Date(b.last_order_date).getTime();
      }
    }
  ];
  
  // 客户列表表格列定义
  const customerColumns = [
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id',
      width: 180,
      fixed: 'left' as const,
      ellipsis: true,
      render: (customerId: string) => (
        <Button 
          type="link" 
          onClick={() => handleViewCustomerOrders(customerId)}
          style={{ padding: 0, fontSize: '12px' }}
        >
          <span style={{ maxWidth: '160px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customerId}
          </span>
        </Button>
      )
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 120,
      ellipsis: true,
      render: (text: string) => <span title={text}>{text || '未命名客户'}</span>
    },
    {
      title: '订单数',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 90,
      align: 'right' as const,
      sorter: (a: any, b: any) => a.order_count - b.order_count,
    },
    {
      title: '总消费',
      dataIndex: 'total_spent',
      key: 'total_spent',
      width: 120,
      align: 'right' as const,
      render: (val: number) => <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{Number(val || 0).toFixed(2)}</span>,
      sorter: (a: any, b: any) => a.total_spent - b.total_spent,
    },
    {
      title: '平均客单价',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      width: 120,
      align: 'right' as const,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
      sorter: (a: any, b: any) => a.avg_order_value - b.avg_order_value,
    },
    {
      title: '首次购买时间',
      dataIndex: 'first_order_date',
      key: 'first_order_date',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
      sorter: (a: any, b: any) => {
        if (!a.first_order_date) return 1;
        if (!b.first_order_date) return -1;
        return new Date(a.first_order_date).getTime() - new Date(b.first_order_date).getTime();
      }
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
    },
    {
      title: '最后下单日期',
      dataIndex: 'last_order_date',
      key: 'last_order_date',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-',
      sorter: (a: any, b: any) => {
        if (!a.last_order_date) return 1;
        if (!b.last_order_date) return -1;
        return new Date(a.last_order_date).getTime() - new Date(b.last_order_date).getTime();
      }
    }
  ];
  
  // 订单列表表格列定义
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 100,
      fixed: 'left' as const,
      render: (orderId: string) => (
        <Button 
          type="link" 
          onClick={() => handleViewOrderDetail(orderId)}
          style={{ padding: 0, fontSize: '12px' }}
        >
          {orderId}
        </Button>
      )
    },
    {
      title: '下单时间',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 160,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right' as const,
      render: (val: number) => <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{Number(val || 0).toFixed(2)}</span>,
      sorter: (a: any, b: any) => a.total_amount - b.total_amount,
    },
    {
      title: '支付状态',
      dataIndex: 'pay_state',
      key: 'pay_state',
      width: 100,
      align: 'center' as const,
      render: (state: number) => {
        if (state === 1 || state === 2 || state === 3) {
          return <Tag color="green">已支付</Tag>;
        } else {
          return <Tag color="red">未支付</Tag>;
        }
      }
    },
    {
      title: '门店名称',
      dataIndex: 'shop_name',
      key: 'shop_name',
      width: 150,
      ellipsis: true,
      render: (text: string) => <span title={text}>{text || '未知门店'}</span>
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
    interactions: [{ type: 'element-active' }],
    onReady: (plot: any) => {
      plot.on('element:click', (evt: any) => {
        const segment = evt.data?.data?.type;
        if (segment) {
          handleViewSegmentCustomers(segment);
        }
      });
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
    interactions: [{ type: 'element-active' }],
    onReady: (plot: any) => {
      plot.on('element:click', (evt: any) => {
        const segment = evt.data?.data?.type;
        if (segment) {
          handleViewSegmentCustomers(segment);
        }
      });
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
          <Card 
            title={
              <Space>
                <span>客户群体对比表</span>
                <Dropdown
                  menu={{
                    items: EXPORT_MENU_ITEMS,
                    onClick: ({ key }) => handleExportSegments(key as ExportFormat),
                  }}
                  trigger={['click']}
                >
                  <Button icon={<DownloadOutlined />} loading={segmentsExportLoading}>
                    导出
                  </Button>
                </Dropdown>
              </Space>
            }
            style={{ marginBottom: 16 }}
            styles={{ body: { padding: '16px' } }}
          >
            <Table
              dataSource={segments}
              columns={segmentColumns}
              rowKey="segment"
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
              style={{ fontSize: '13px' }}
            />
          </Card>
        )}

        {/* TOP客户 */}
        {topCustomers.length > 0 && (
          <Card 
            title={
              <Space>
                <span>TOP客户排行榜</span>
                <Dropdown
                  menu={{
                    items: EXPORT_MENU_ITEMS,
                    onClick: ({ key }) => handleExportTopCustomers(key as ExportFormat),
                  }}
                  trigger={['click']}
                >
                  <Button icon={<DownloadOutlined />} loading={topCustomersExportLoading}>
                    导出
                  </Button>
                </Dropdown>
              </Space>
            }
            styles={{ body: { padding: '16px' } }}
          >
            <Table
              dataSource={topCustomers.map((customer, index) => ({
                ...customer,
                rank: index + 1
              }))}
              columns={topCustomerColumns}
              rowKey="customer_id"
              pagination={{ pageSize: 20, showSizeChanger: true, showQuickJumper: true }}
              size="middle"
              scroll={{ x: 1200 }}
              style={{ fontSize: '13px' }}
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

      {/* 客户群体客户列表弹窗 */}
      <Modal
        title={
          <Space>
            <span>{`${selectedSegment}客户列表`}</span>
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
        open={segmentCustomersVisible}
        onCancel={() => setSegmentCustomersVisible(false)}
        width="90%"
        style={{ maxWidth: '1400px' }}
        footer={null}
        styles={{ body: { padding: '20px' } }}
      >
        <Table
          columns={customerColumns}
          dataSource={segmentCustomers}
          loading={segmentCustomersLoading}
          rowKey="customer_id"
          pagination={{
            current: segmentCustomersPagination.current,
            pageSize: segmentCustomersPagination.pageSize,
            total: segmentCustomersPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => fetchSegmentCustomers(selectedSegment, page, pageSize),
            onShowSizeChange: (current, size) => fetchSegmentCustomers(selectedSegment, current, size),
          }}
          size="middle"
          scroll={{ x: 1200 }}
          style={{ fontSize: '13px' }}
        />
      </Modal>

      {/* 客户订单列表弹窗 */}
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
        width="85%"
        style={{ maxWidth: '1200px' }}
        footer={null}
        styles={{ body: { padding: '20px' } }}
      >
        <Table
          columns={orderColumns}
          dataSource={customerOrders}
          loading={customerOrdersLoading}
          rowKey="order_id"
          pagination={{
            current: customerOrdersPagination.current,
            pageSize: customerOrdersPagination.pageSize,
            total: customerOrdersPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条订单`,
            onChange: (page, pageSize) => fetchCustomerOrders(selectedCustomerId, page, pageSize),
            onShowSizeChange: (current, size) => fetchCustomerOrders(selectedCustomerId, current, size),
          }}
          size="middle"
          scroll={{ x: 800 }}
          style={{ fontSize: '13px' }}
        />
      </Modal>

      {/* 订单详情弹窗 */}
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
        {orderDetailLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) : orderDetail ? (
          <div>
            <Card title="订单基本信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>订单号：</strong>{orderDetail.order_id}</p>
                  <p><strong>订单编号：</strong>{orderDetail.order_no || '-'}</p>
                  <p><strong>下单时间：</strong>{orderDetail.order_date ? dayjs(orderDetail.order_date).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
                  <p><strong>金额：</strong>¥{orderDetail.total_amount?.toFixed(2) || '0.00'}</p>
                </Col>
                <Col span={12}>
                  <p><strong>支付状态：</strong>
                    {orderDetail.pay_state === 1 || orderDetail.pay_state === 2 || orderDetail.pay_state === 3 ? (
                      <Tag color="green">已支付</Tag>
                    ) : (
                      <Tag color="red">未支付</Tag>
                    )}
                  </p>
                  <p><strong>门店名称：</strong>{orderDetail.shop_name || '未知门店'}</p>
                  <p><strong>客户ID：</strong>{orderDetail.customer_id}</p>
                  <p><strong>客户名：</strong>{orderDetail.customer_name || '-'}</p>
                  <p><strong>手机号：</strong>{orderDetail.phone || '-'}</p>
                </Col>
              </Row>
            </Card>
            
            <Card title={`商品明细 (${orderDetail.goods ? orderDetail.goods.length : 0} 件商品)`}>
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
                    }
                  ]}
                  scroll={{ x: 600 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  该订单暂无商品明细数据
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>暂无数据</div>
        )}
      </Modal>
    </Spin>
  );
};

export default CustomerCompare;

