// 销售分析组件
import React, { useState, useEffect } from 'react';
import { Card, Table, Spin, Empty } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { Line, Column } from '@ant-design/plots';

interface SalesAnalysisProps {
  filters: {
    city?: string;
    shopId?: string;
    dateRange?: [string, string] | null;
  };
}

const SalesAnalysis: React.FC<SalesAnalysisProps> = ({ filters }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchSalesData();
  }, [filters]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.shopId) params.append('shopId', filters.shopId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }

      const response = await fetch(`http://localhost:3001/api/product-profile/sales-analysis?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('获取销售分析数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!data) {
    return <Empty description="暂无数据" />;
  }

  const trendConfig = {
    data: data.salesTrend,
    xField: 'date',
    yField: 'revenue',
    smooth: true,
    height: 300,
  };

  const columns = [
    { title: '排名', dataIndex: 'rank', key: 'rank', width: 80 },
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name', ellipsis: true },
    { title: '销量', dataIndex: 'total_quantity', key: 'total_quantity', render: (value: number) => value.toLocaleString() },
    { title: '销售额', dataIndex: 'total_revenue', key: 'total_revenue', render: (value: number) => `¥${value.toLocaleString()}` },
    { title: '客户数', dataIndex: 'customer_count', key: 'customer_count' },
    { title: '订单数', dataIndex: 'order_count', key: 'order_count' },
    { title: '平均价格', dataIndex: 'avg_price', key: 'avg_price', render: (value: number) => `¥${value.toFixed(2)}` },
  ];

  return (
    <div>
      <Card title="销售趋势" size="small" style={{ marginBottom: 24 }}>
        <Line {...trendConfig} />
      </Card>
      
      <Card title="商品销售排行" size="small">
        <Table
          columns={columns}
          dataSource={data.salesRanking}
          rowKey="name"
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default SalesAnalysis;
