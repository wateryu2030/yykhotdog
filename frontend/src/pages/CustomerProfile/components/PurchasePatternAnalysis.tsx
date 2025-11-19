import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, DatePicker, Spin, message, Tabs, Table, Tag, Space, Button, Empty } from 'antd';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { DownloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { api } from '../../../config/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface PurchasePatternAnalysisProps {
  selectedCity?: string;
  selectedStoreId?: string;
}

const PurchasePatternAnalysis: React.FC<PurchasePatternAnalysisProps> = ({
  selectedCity,
  selectedStoreId,
}) => {
  const [loading, setLoading] = useState(false);
  const [cityData, setCityData] = useState<any>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [marketingSuggestions, setMarketingSuggestions] = useState<any>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 获取城市购买模式
  const fetchCityPatterns = async () => {
    if (!selectedCity) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('city', selectedCity);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await api.get(`/customer-profile/city-purchase-patterns?${params.toString()}`);
      if (response.data.success) {
        setCityData(response.data.data);
      }
    } catch (error) {
      message.error('获取城市购买模式失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取门店购买模式
  const fetchStorePatterns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStoreId) params.append('storeId', selectedStoreId);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await api.get(`/customer-profile/store-purchase-patterns?${params.toString()}`);
      if (response.data.success) {
        setStoreData(response.data.data);
      }
    } catch (error) {
      message.error('获取门店购买模式失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取产品推荐
  const fetchProductRecommendations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStoreId) params.append('storeId', selectedStoreId);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await api.get(`/customer-profile/product-recommendations?${params.toString()}`);
      if (response.data.success) {
        setProductData(response.data.data);
      }
    } catch (error) {
      message.error('获取产品推荐失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取营销建议
  const fetchMarketingSuggestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedStoreId) params.append('storeId', selectedStoreId);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await api.get(`/customer-profile/marketing-suggestions?${params.toString()}`);
      if (response.data.success) {
        setMarketingSuggestions(response.data.data);
      }
    } catch (error) {
      message.error('获取营销建议失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCity) {
      fetchCityPatterns();
      fetchStorePatterns();
      fetchProductRecommendations();
      fetchMarketingSuggestions();
    }
  }, [selectedCity, selectedStoreId, dateRange]);

  // 购买时段图表
  const timeDistributionChart = cityData?.timeDistribution ? {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: '订单数量',
        data: Array.from({ length: 24 }, (_, i) => {
          const hourData = cityData.timeDistribution.find((d: any) => d.hour === i);
          return hourData?.order_count || 0;
        }),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: '客户数量',
        data: Array.from({ length: 24 }, (_, i) => {
          const hourData = cityData.timeDistribution.find((d: any) => d.hour === i);
          return hourData?.customer_count || 0;
        }),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  // 客户生命周期分布饼图
  const lifecycleChart = cityData?.lifecycleDistribution ? {
    labels: cityData.lifecycleDistribution.map((d: any) => d.lifecycle_stage),
    datasets: [
      {
        data: cityData.lifecycleDistribution.map((d: any) => d.customer_count),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
      },
    ],
  } : null;

  // 价格敏感度图表
  const priceSensitivityChart = cityData?.priceSensitivity ? {
    labels: cityData.priceSensitivity.map((d: any) => d.price_segment),
    datasets: [
      {
        label: '客户数量',
        data: cityData.priceSensitivity.map((d: any) => d.customer_count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
      },
    ],
  } : null;

  // 营销建议表格列
  const suggestionColumns = [
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
    },
    {
      title: '建议类型',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          '高价值流失预警': 'red',
          '流失客户唤醒': 'orange',
          '优质客户复购提醒': 'blue',
          '新客二次转化': 'green',
          'VIP客户维护': 'purple',
          '高客单价客户升级': 'cyan',
          '常规客户维护': 'default',
        };
        return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
      },
    },
    {
      title: '建议内容',
      dataIndex: 'content',
      key: 'content',
      width: 400,
    },
    {
      title: '客户数',
      dataIndex: 'customerCount',
      key: 'customerCount',
      render: (value: number) => <strong>{value}</strong>,
    },
  ];

  if (!selectedCity) {
    return (
      <Card>
        <Empty
          description="请先选择城市以查看购买习惯分析"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div>
      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <BarChartOutlined />
            <span>购买习惯分析 - {selectedCity}</span>
          </Space>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
              format="YYYY-MM-DD"
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                message.info('导出功能开发中');
              }}
            >
              导出
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="city">
          <TabPane tab="城市分析" key="city">
            <Spin spinning={loading}>
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card title="24小时购买时段分布" size="small" style={{ height: 400 }}>
                    {timeDistributionChart ? (
                      <Bar
                        data={timeDistributionChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: '购买时段分析' },
                          },
                          scales: {
                            y: { beginAtZero: true },
                          },
                        }}
                      />
                    ) : (
                      <Empty description="暂无数据" />
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="客户生命周期分布" size="small" style={{ height: 400 }}>
                    {lifecycleChart ? (
                      <Doughnut
                        data={lifecycleChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'right' },
                          },
                        }}
                      />
                    ) : (
                      <Empty description="暂无数据" />
                    )}
                  </Card>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="价格敏感度分布" size="small" style={{ height: 300 }}>
                    {priceSensitivityChart ? (
                      <Bar
                        data={priceSensitivityChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                          },
                          scales: {
                            y: { beginAtZero: true },
                          },
                        }}
                      />
                    ) : (
                      <Empty description="暂无数据" />
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="购买间隔分布" size="small" style={{ height: 300 }}>
                    {cityData?.purchaseInterval && cityData.purchaseInterval.length > 0 ? (
                      <Table
                        size="small"
                        dataSource={cityData.purchaseInterval}
                        columns={[
                          { title: '购频类别', dataIndex: 'interval_category', key: 'category' },
                          { title: '客户数', dataIndex: 'customer_count', key: 'count' },
                          {
                            title: '平均间隔(天)',
                            dataIndex: 'avg_interval',
                            key: 'avg',
                            render: (v: number) => v?.toFixed(1) || '-',
                          },
                        ]}
                        pagination={false}
                      />
                    ) : (
                      <Empty description="暂无数据" />
                    )}
                  </Card>
                </Col>
              </Row>
            </Spin>
          </TabPane>

          <TabPane tab="门店分析" key="store">
            <Spin spinning={loading}>
              {storeData?.storeSegmentation && storeData.storeSegmentation.length > 0 ? (
                <Table
                  dataSource={storeData.storeSegmentation}
                  columns={[
                    { title: '门店', dataIndex: 'store_name', key: 'store' },
                    { title: '客户分层', dataIndex: 'segment_name', key: 'segment' },
                    { title: '客户数', dataIndex: 'customer_count', key: 'count' },
                    {
                      title: '流失客户数',
                      dataIndex: 'inactive_count',
                      key: 'inactive',
                      render: (v: number) => (
                        <Tag color={v > 0 ? 'red' : 'green'}>{v}</Tag>
                      ),
                    },
                  ]}
                  rowKey={(record: any) => `${record.store_id}-${record.segment_name}`}
                  pagination={{ pageSize: 10 }}
                />
              ) : (
                <Empty description="暂无门店数据" />
              )}
            </Spin>
          </TabPane>

          <TabPane tab="产品推荐" key="product">
            <Spin spinning={loading}>
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="热门产品组合" size="small">
                    {productData?.productCombos && productData.productCombos.length > 0 ? (
                      <Table
                        size="small"
                        dataSource={productData.productCombos.slice(0, 10)}
                        columns={[
                          { title: '产品组合', dataIndex: 'product_combo', key: 'combo' },
                          { title: '出现次数', dataIndex: 'combo_frequency', key: 'freq' },
                        ]}
                        pagination={false}
                      />
                    ) : (
                      <Empty description="暂无产品组合数据" />
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="产品关联推荐" size="small">
                    {productData?.productAssociations && productData.productAssociations.length > 0 ? (
                      <Table
                        size="small"
                        dataSource={productData.productAssociations}
                        columns={[
                          { title: '产品A', dataIndex: 'product_a', key: 'a' },
                          { title: '产品B', dataIndex: 'product_b', key: 'b' },
                          {
                            title: '共同购买次数',
                            dataIndex: 'co_occurrence_count',
                            key: 'count',
                          },
                        ]}
                        pagination={false}
                      />
                    ) : (
                      <Empty description="暂无产品关联数据" />
                    )}
                  </Card>
                </Col>
              </Row>
            </Spin>
          </TabPane>

          <TabPane tab="营销建议" key="marketing">
            <Spin spinning={loading}>
              {marketingSuggestions?.summary && marketingSuggestions.summary.length > 0 ? (
                <div>
                  {marketingSuggestions.summary.map((store: any, index: number) => (
                    <Card
                      key={index}
                      title={`${store.city} - ${store.storeName}`}
                      style={{ marginBottom: 16 }}
                      extra={
                        <Tag color="blue">共 {store.totalCustomers} 位客户需要关注</Tag>
                      }
                    >
                      <Table
                        dataSource={store.suggestions}
                        columns={suggestionColumns}
                        rowKey={(record, idx) => `${index}-${idx}`}
                        pagination={false}
                      />
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty description="暂无营销建议" />
              )}
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default PurchasePatternAnalysis;

