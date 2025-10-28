// 商品分类组件
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Spin, Empty } from 'antd';
import { PieChartOutlined, BarChartOutlined } from '@ant-design/icons';
import { Pie, Column } from '@ant-design/plots';

interface ProductCategoriesProps {
  filters: {
    city?: string;
    shopId?: string;
    dateRange?: [string, string] | null;
  };
}

const ProductCategories: React.FC<ProductCategoriesProps> = ({ filters }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchCategoryData();
  }, [filters]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.shopId) params.append('shopId', filters.shopId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }

      const response = await fetch(`http://localhost:3001/api/product-profile/categories?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('获取商品分类数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!data.length) {
    return <Empty description="暂无数据" />;
  }

  const pieData = data.map(cat => ({
    type: cat.category,
    value: cat.total_revenue
  }));

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}%',
    },
  };

  const columns = [
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '商品数', dataIndex: 'product_count', key: 'product_count' },
    { title: '销售额', dataIndex: 'total_revenue', key: 'total_revenue', render: (value: number) => `¥${value.toLocaleString()}` },
    { title: '销量', dataIndex: 'total_quantity', key: 'total_quantity' },
    { title: '客户数', dataIndex: 'total_customers', key: 'total_customers' },
    { title: '订单数', dataIndex: 'total_orders', key: 'total_orders' },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="分类销售分布" size="small">
            <Pie {...pieConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="分类商品数量" size="small">
            <Column
              data={data}
              xField="category"
              yField="product_count"
              height={300}
            />
          </Card>
        </Col>
      </Row>
      
      <Card title="分类详细统计" size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="category"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default ProductCategories;
