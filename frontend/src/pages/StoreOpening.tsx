import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Table, Tag, Space, Modal, Form, Input, Select, DatePicker, Avatar, Descriptions, Spin, message } from 'antd';
import { PlusOutlined, ShopOutlined, CalendarOutlined, UserOutlined, BellOutlined, PhoneOutlined, EnvironmentOutlined, ClockCircleOutlined, FileTextOutlined, InfoCircleOutlined, DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Badge } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

const StoreOpening: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [storeDetailVisible, setStoreDetailVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    opened: 0,
    planned: 0,
    preparing: 0
  });
  const [form] = Form.useForm();
  const [orderListVisible, setOrderListVisible] = useState(false);
  const [orderList, setOrderList] = useState<any[]>([]);
  const [orderPagination, setOrderPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

  // 获取门店列表
  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/operations/stores');
      if (response.data.success) {
        const storesData = response.data.data;
        setStores(storesData);
        
        // 计算统计数据
        const total = storesData.length;
        const opened = storesData.filter((s: any) => s.status === '营业中' || s.status === '正常营业').length;
        const planned = storesData.filter((s: any) => s.status === '计划中').length;
        const preparing = storesData.filter((s: any) => s.status === '筹备中' || s.status === '暂停营业').length;
        
        setStats({ total, opened, planned, preparing });
      }
    } catch (error) {
      console.error('获取门店列表失败:', error);
      message.error('获取门店列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 查看门店详情
  const handleViewDetail = async (record: any) => {
    try {
      const response = await api.get(`/operations/stores/${record.id}`);
      if (response.data.success) {
        setSelectedStore(response.data.data);
        setStoreDetailVisible(true);
      }
    } catch (error) {
      console.error('获取门店详情失败:', error);
      message.error('获取门店详情失败');
    }
  };

  // 编辑门店
  const handleEditStore = (record: any) => {
    setSelectedStore(record);
    form.setFieldsValue({
      store_name: record.store_name,
      store_type: record.store_type,
      city: record.city,
      address: record.address,
      director: record.director,
      director_phone: record.director_phone,
      status: record.status
    });
    setIsModalVisible(true);
  };

  // 获取门店订单列表
  const fetchStoreOrders = async (storeId: number, page = 1, pageSize = 20) => {
    setOrderLoading(true);
    try {
      const response = await api.get(`/operations/stores/${storeId}/orders`, {
        params: { page, limit: pageSize }
      });
      if (response.data.success) {
        setOrderList(response.data.data.orders);
        setOrderPagination({
          current: response.data.data.pagination.page,
          pageSize: response.data.data.pagination.limit,
          total: response.data.data.pagination.total
        });
        setOrderListVisible(true);
      } else {
        message.error('获取订单列表失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      message.error('获取订单列表失败');
    } finally {
      setOrderLoading(false);
    }
  };

  // 订单分页处理
  const handleOrderPagination = (page: number, pageSize?: number) => {
    if (selectedStore) {
      fetchStoreOrders(selectedStore.id, page, pageSize || 20);
    }
  };

  // 获取订单详情
  const fetchOrderDetail = async (orderId: number) => {
    try {
      const response = await api.get(`/operations/orders/${orderId}`);
      if (response.data.success) {
        setSelectedOrderDetail(response.data.data);
        setOrderDetailVisible(true);
        
        // 同时获取商品明细
        fetchOrderItems(orderId);
      } else {
        message.error('获取订单详情失败');
      }
    } catch (error) {
      console.error('获取订单详情失败:', error);
      message.error('获取订单详情失败');
    }
  };

  // 获取订单商品明细
  const fetchOrderItems = async (orderId: number) => {
    try {
      setItemsLoading(true);
      const response = await api.get(`/operations/orders/${orderId}/items`);
      if (response.data.success) {
        setOrderItems(response.data.data);
      } else {
        message.error('获取商品明细失败');
      }
    } catch (error) {
      console.error('获取商品明细失败:', error);
      message.error('获取商品明细失败');
    } finally {
      setItemsLoading(false);
    }
  };

  const columns = [
    {
      title: '门店编号',
      dataIndex: 'store_code',
      key: 'store_code',
      width: 100,
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 200,
    },
    {
      title: '门店类型',
      dataIndex: 'is_self',
      key: 'is_self',
      width: 100,
      render: (is_self: number) => {
        const isDirectStore = is_self === 1;
        return (
          <Tag color={isDirectStore ? 'blue' : 'green'}>
            {isDirectStore ? '直营店' : '加盟店'}
          </Tag>
        );
      },
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 120,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: '营业状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: any = {
          '营业中': 'green',
          '正常营业': 'green',
          '暂停营业': 'orange',
          '计划中': 'blue',
          '筹备中': 'cyan'
        };
        return (
          <Tag color={colorMap[status] || 'default'}>
            {status || '未知'}
          </Tag>
        );
      },
    },
    {
      title: '店长',
      dataIndex: 'director',
      key: 'director',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'director_phone',
      key: 'director_phone',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '开业时间',
      dataIndex: 'opening_time',
      key: 'opening_time',
      width: 120,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleViewDetail(record)}>查看详情</Button>
          <Button type="link" onClick={() => handleEditStore(record)}>编辑</Button>
        </Space>
      ),
    },
  ];

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      console.log('Success:', values);
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载门店数据中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0 24px', background: '#fff', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShopOutlined style={{ fontSize: 28, color: '#faad14', marginRight: 8 }} />
          <span style={{ fontWeight: 'bold', fontSize: 24 }}>门店管理</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, marginRight: 16 }}>{timeStr} {dateStr}</span>
          <Badge count={1} size="small" style={{ marginRight: 16 }}><BellOutlined style={{ fontSize: 22, color: '#666' }} /></Badge>
          <Avatar style={{ backgroundColor: '#87d068', marginRight: 8 }} icon={<UserOutlined />} />
          <span>管理员</span>
        </div>
      </div>
      
      {/* 门店统计 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总门店数"
              value={stats.total}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="营业中"
              value={stats.opened}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="计划中"
              value={stats.planned}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="暂停/筹备中"
              value={stats.preparing}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 门店列表 */}
      <Card
        title={`门店列表 (共${stores.length}家)`}
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={showModal}>
              新增门店
            </Button>
            <Button onClick={fetchStores}>刷新</Button>
          </Space>
        }
      >
        <Table 
          columns={columns} 
          dataSource={stores} 
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 家门店`,
          }}
        />
      </Card>

      {/* 新增门店Modal */}
      <Modal
        title="新增门店"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="门店名称"
                rules={[{ required: true, message: '请输入门店名称!' }]}
              >
                <Input placeholder="请输入门店名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="开业状态"
                rules={[{ required: true, message: '请选择开业状态!' }]}
              >
                <Select placeholder="请选择开业状态">
                  <Option value="planned">计划中</Option>
                  <Option value="preparing">筹备中</Option>
                  <Option value="opened">已开业</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="address"
            label="门店地址"
            rules={[{ required: true, message: '请输入门店地址!' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入门店地址" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="openingDate"
                label="计划开业日期"
                rules={[{ required: true, message: '请选择开业日期!' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="manager"
                label="店长"
                rules={[{ required: true, message: '请输入店长姓名!' }]}
              >
                <Input placeholder="请输入店长姓名" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 门店详情Modal */}
      <Modal
        title={
          <Space>
            <ShopOutlined />
            门店详细信息
          </Space>
        }
        open={storeDetailVisible}
        onCancel={() => setStoreDetailVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setStoreDetailVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {selectedStore && (
          <div>
            {/* 基本信息 */}
            <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="门店编号">{selectedStore.store_code || '-'}</Descriptions.Item>
                <Descriptions.Item label="门店名称">{selectedStore.store_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="门店类型">
                  <Tag color={selectedStore.is_self === 1 ? 'blue' : 'green'}>
                    {selectedStore.is_self === 1 ? '直营店' : '加盟店'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="营业状态">
                  <Tag color={
                    selectedStore.status === '营业中' || selectedStore.status === '正常营业' ? 'green' :
                    selectedStore.status === '暂停营业' ? 'orange' :
                    selectedStore.status === '计划中' ? 'blue' : 'default'
                  }>
                    {selectedStore.status || '-'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 地址信息 */}
            <Card title="地址信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="省份">{selectedStore.province || '未填写'}</Descriptions.Item>
                <Descriptions.Item label="城市">{selectedStore.city || '-'}</Descriptions.Item>
                <Descriptions.Item label="区县" span={2}>{selectedStore.district || '未填写'}</Descriptions.Item>
                <Descriptions.Item label="详细地址" span={2}>{selectedStore.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="经度">{selectedStore.longitude || '-'}</Descriptions.Item>
                <Descriptions.Item label="纬度">{selectedStore.latitude || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 运营信息 */}
            <Card title="运营信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="店长">
                  <Space>
                    <UserOutlined />
                    {selectedStore.director || '未指定'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">
                  <Space>
                    <PhoneOutlined />
                    {selectedStore.director_phone || '-'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="营业时间">
                  <Space>
                    <ClockCircleOutlined />
                    {selectedStore.morning_time || '-'} ~ {selectedStore.night_time || '-'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="客流情况">
                  {selectedStore.passenger_flow || '未填写'}
                </Descriptions.Item>
                <Descriptions.Item label="成立时间">
                  {selectedStore.establish_time ? dayjs(selectedStore.establish_time).format('YYYY-MM-DD') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="开业时间">
                  {selectedStore.opening_time ? dayjs(selectedStore.opening_time).format('YYYY-MM-DD') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 经营数据 */}
            <Card title="经营数据统计" size="small">
              <Descriptions bordered column={3} size="small">
                <Descriptions.Item label="总订单数">
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                    {selectedStore.total_orders?.toLocaleString() || '0'}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="总营收">
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                    ¥{selectedStore.total_revenue?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="平均客单价">
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>
                    ¥{selectedStore.avg_order_value?.toFixed(2) || '0.00'}
                  </span>
                </Descriptions.Item>
              </Descriptions>
              
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  onClick={() => fetchStoreOrders(selectedStore.id)}
                  loading={orderLoading}
                >
                  查看订单明细
                </Button>
              </div>
              
              {selectedStore.total_orders > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>📊 该门店共有 <strong>{selectedStore.total_orders}</strong> 笔订单</div>
                    <div>💰 总营收 <strong>¥{selectedStore.total_revenue?.toFixed(2)}</strong></div>
                    <div>📈 平均每单 <strong>¥{selectedStore.avg_order_value?.toFixed(2)}</strong></div>
                  </Space>
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>

         {/* 订单列表Modal */}
         <Modal
           title={
             <Space>
               <ShopOutlined />
               {selectedStore?.store_name} - 订单明细
             </Space>
           }
           open={orderListVisible}
           onCancel={() => setOrderListVisible(false)}
           width={1200}
           footer={[
             <Button key="close" onClick={() => setOrderListVisible(false)}>
               关闭
             </Button>
           ]}
         >
           <Table
             dataSource={orderList}
             loading={orderLoading}
             pagination={{
               current: orderPagination.current,
               pageSize: orderPagination.pageSize,
               total: orderPagination.total,
               onChange: handleOrderPagination,
               showSizeChanger: true,
               showQuickJumper: true,
               showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
             }}
             size="small"
             scroll={{ x: 800 }}
             columns={[
               {
                 title: '订单号',
                 dataIndex: 'order_no',
                 key: 'order_no',
                 width: 150,
                 sorter: (a, b) => a.order_no?.localeCompare(b.order_no) || 0,
                 sortDirections: ['ascend', 'descend'],
               },
               {
                 title: '订单金额',
                 dataIndex: 'total_amount',
                 key: 'total_amount',
                 width: 100,
                 sorter: (a, b) => (a.total_amount || 0) - (b.total_amount || 0),
                 sortDirections: ['ascend', 'descend'],
                 render: (value) => (
                   <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                     ¥{value?.toFixed(2) || '0.00'}
                   </span>
                 ),
               },
               {
                 title: '支付方式',
                 dataIndex: 'pay_mode',
                 key: 'pay_mode',
                 width: 100,
                 sorter: (a, b) => (a.pay_mode || '').localeCompare(b.pay_mode || ''),
                 sortDirections: ['ascend', 'descend'],
                 render: (mode) => (
                   <Tag color="blue">{mode || '未知'}</Tag>
                 ),
               },
               {
                 title: '现金',
                 dataIndex: 'cash',
                 key: 'cash',
                 width: 80,
                 sorter: (a, b) => (a.cash || 0) - (b.cash || 0),
                 sortDirections: ['ascend', 'descend'],
                 render: (value) => `¥${value?.toFixed(2) || '0.00'}`,
               },
               {
                 title: '会员充值',
                 dataIndex: 'vip_amount',
                 key: 'vip_amount',
                 width: 80,
                 sorter: (a, b) => (a.vip_amount || 0) - (b.vip_amount || 0),
                 sortDirections: ['ascend', 'descend'],
                 render: (value) => `¥${value?.toFixed(2) || '0.00'}`,
               },
               {
                 title: '卡充值',
                 dataIndex: 'card_amount',
                 key: 'card_amount',
                 width: 80,
                 sorter: (a, b) => (a.card_amount || 0) - (b.card_amount || 0),
                 sortDirections: ['ascend', 'descend'],
                 render: (value) => `¥${value?.toFixed(2) || '0.00'}`,
               },
               {
                 title: '支付状态',
                 dataIndex: 'pay_state',
                 key: 'pay_state',
                 width: 100,
                 sorter: (a, b) => (a.pay_state || 0) - (b.pay_state || 0),
                 sortDirections: ['ascend', 'descend'],
                 render: (state) => (
                   <Tag color={state === 2 ? 'green' : 'orange'}>
                     {state === 2 ? '已支付' : '未支付'}
                   </Tag>
                 ),
               },
               {
                 title: '客户ID',
                 dataIndex: 'customer_id',
                 key: 'customer_id',
                 width: 120,
                 sorter: (a, b) => (a.customer_id || '').localeCompare(b.customer_id || ''),
                 sortDirections: ['ascend', 'descend'],
                 render: (id) => id || '-',
               },
              {
                title: '下单时间',
                dataIndex: 'created_at',
                key: 'created_at',
                width: 150,
                sorter: (a, b) => {
                  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return timeA - timeB;
                },
                sortDirections: ['ascend', 'descend'],
                render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
              },
              {
                title: '操作',
                key: 'action',
                width: 100,
                fixed: 'right' as const,
                render: (_, record) => (
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => fetchOrderDetail(record.id)}
                  >
                    查看详情
                  </Button>
                ),
              },
            ]}
          />
        </Modal>

        {/* 订单详情Modal */}
        <Modal
          title={
            <Space>
              <FileTextOutlined />
              订单详情
            </Space>
          }
          open={orderDetailVisible}
          onCancel={() => setOrderDetailVisible(false)}
          width={1000}
          footer={[
            <Button key="close" onClick={() => setOrderDetailVisible(false)}>
              关闭
            </Button>
          ]}
        >
          {selectedOrderDetail && (
            <div>
              {/* 订单基本信息 */}
              <Card 
                title={<Space><InfoCircleOutlined />基本信息</Space>} 
                size="small" 
                style={{ marginBottom: 16 }}
              >
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="订单号">{selectedOrderDetail.order_no}</Descriptions.Item>
                  <Descriptions.Item label="下单时间">
                    {selectedOrderDetail.created_at ? dayjs(selectedOrderDetail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="支付方式">{selectedOrderDetail.pay_mode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="支付状态">
                    <Tag color={selectedOrderDetail.pay_state === 2 ? 'green' : 'orange'}>
                      {selectedOrderDetail.pay_state === 2 ? '已支付' : '未支付'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 金额信息 */}
              <Card 
                title={<Space><DollarOutlined />金额明细</Space>} 
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Descriptions bordered size="small" column={3}>
                  <Descriptions.Item label="订单总额">
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                      ¥{selectedOrderDetail.total_amount?.toFixed(2) || '0.00'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="现金支付">¥{selectedOrderDetail.cash?.toFixed(2) || '0.00'}</Descriptions.Item>
                  <Descriptions.Item label="会员卡支付">¥{selectedOrderDetail.vip_amount?.toFixed(2) || '0.00'}</Descriptions.Item>
                  <Descriptions.Item label="会员卡赠送">¥{selectedOrderDetail.vip_amount_zengsong?.toFixed(2) || '0.00'}</Descriptions.Item>
                  <Descriptions.Item label="储值卡支付">¥{selectedOrderDetail.card_amount?.toFixed(2) || '0.00'}</Descriptions.Item>
                  <Descriptions.Item label="储值卡赠送">¥{selectedOrderDetail.card_zengsong?.toFixed(2) || '0.00'}</Descriptions.Item>
                  {selectedOrderDetail.refund_money > 0 && (
                    <Descriptions.Item label="退款金额" span={3}>
                      <span style={{ color: 'red' }}>¥{selectedOrderDetail.refund_money?.toFixed(2) || '0.00'}</span>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

             {/* 客户信息 */}
             <Card 
               title={<Space><UserOutlined />客户信息</Space>} 
               size="small"
               style={{ marginBottom: 16 }}
             >
               <Descriptions bordered size="small" column={2}>
                 <Descriptions.Item label="客户ID">{selectedOrderDetail.customer_id || '-'}</Descriptions.Item>
                 <Descriptions.Item label="订单备注">{selectedOrderDetail.remark || '-'}</Descriptions.Item>
               </Descriptions>
             </Card>

             {/* 商品明细 */}
             <Card 
               title={<Space><ShoppingCartOutlined />商品明细</Space>} 
               size="small"
             >
               {itemsLoading ? (
                 <div style={{ textAlign: 'center', padding: '20px' }}>
                   <Spin size="large" />
                   <div style={{ marginTop: '16px' }}>加载商品明细中...</div>
                 </div>
               ) : orderItems.length > 0 ? (
                 <Table
                   dataSource={orderItems}
                   rowKey="id"
                   pagination={false}
                   size="small"
                   columns={[
                     {
                       title: '商品名称',
                       dataIndex: 'product_name',
                       key: 'product_name',
                     },
                     {
                       title: '数量',
                       dataIndex: 'quantity',
                       key: 'quantity',
                       width: 80,
                       align: 'center' as const,
                     },
                     {
                       title: '单价',
                       dataIndex: 'price',
                       key: 'price',
                       width: 100,
                       align: 'right' as const,
                       render: (value: number) => value ? `¥${value.toFixed(2)}` : '-',
                     },
                     {
                       title: '小计',
                       dataIndex: 'total_price',
                       key: 'total_price',
                       width: 100,
                       align: 'right' as const,
                       render: (value: number) => value ? `¥${value.toFixed(2)}` : '-',
                     },
                   ]}
                 />
               ) : (
                 <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                   暂无商品明细
                 </div>
               )}
             </Card>
           </div>
         )}
       </Modal>
    </div>
  );
};

export default StoreOpening; 