import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Button, Table, Tag, Space, Modal, Form, Input, Select, DatePicker, Progress, Badge, Avatar } from 'antd';
import { 
  PlusOutlined, 
  DollarOutlined, 
  UserOutlined,
  PieChartOutlined,
  BankOutlined,
  GiftOutlined,
  BellOutlined
} from '@ant-design/icons';

const { Option } = Select;
const now = new Date();
const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

const Allocation: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '门店名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: any) => typeof text === 'string' ? text : (text?.name || '未知门店'),
    },
    {
      title: '本月销售额',
      dataIndex: 'monthlySales',
      key: 'monthlySales',
      render: (sales: number) => `¥${sales.toLocaleString()}`,
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => `¥${profit.toLocaleString()}`,
    },
    {
      title: '分配比例',
      dataIndex: 'allocationRate',
      key: 'allocationRate',
      render: (rate: number) => `${rate}%`,
    },
    {
      title: '分配金额',
      dataIndex: 'allocationAmount',
      key: 'allocationAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '分配状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'pending' ? 'orange' : 'red'}>
          {status === 'completed' ? '已分配' : status === 'pending' ? '待分配' : '分配失败'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link">查看详情</Button>
          <Button type="link">编辑</Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      name: '上海旗舰店',
      monthlySales: 125000,
      profit: 37500,
      allocationRate: 30,
      allocationAmount: 11250,
      status: 'completed',
    },
    {
      key: '2',
      name: '北京朝阳店',
      monthlySales: 98000,
      profit: 29400,
      allocationRate: 30,
      allocationAmount: 8820,
      status: 'pending',
    },
    {
      key: '3',
      name: '广州天河店',
      monthlySales: 75000,
      profit: 22500,
      allocationRate: 30,
      allocationAmount: 6750,
      status: 'completed',
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

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0 24px', background: '#fff', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DollarOutlined style={{ fontSize: 28, color: '#faad14', marginRight: 8 }} />
          <span style={{ fontWeight: 'bold', fontSize: 24 }}>分配模块</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, marginRight: 16 }}>{timeStr} {dateStr}</span>
          <Badge count={1} size="small" style={{ marginRight: 16 }}><BellOutlined style={{ fontSize: 22, color: '#666' }} /></Badge>
          <Avatar style={{ backgroundColor: '#87d068', marginRight: 8 }} icon={<UserOutlined />} />
          <span>管理员</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月总销售额"
              value={298000}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月总利润"
              value={89400}
              prefix={<PieChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已分配金额"
              value={26820}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待分配金额"
              value={62580}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="利润分配管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
            新增分配记录
          </Button>
        }
      >
        <Table columns={columns} dataSource={data} rowKey="key" />
      </Card>

      <Modal
        title="新增分配记录"
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
                name="storeName"
                label="门店名称"
                rules={[{ required: true, message: '请选择门店!' }]}
              >
                <Select placeholder="请选择门店">
                  <Option value="shanghai">上海旗舰店</Option>
                  <Option value="beijing">北京朝阳店</Option>
                  <Option value="guangzhou">广州天河店</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="month"
                label="分配月份"
                rules={[{ required: true, message: '请选择月份!' }]}
              >
                <DatePicker picker="month" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="monthlySales"
                label="月度销售额"
                rules={[{ required: true, message: '请输入月度销售额!' }]}
              >
                <Input placeholder="请输入月度销售额" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="profit"
                label="月度利润"
                rules={[{ required: true, message: '请输入月度利润!' }]}
              >
                <Input placeholder="请输入月度利润" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="allocationRate"
                label="分配比例"
                rules={[{ required: true, message: '请输入分配比例!' }]}
              >
                <Input placeholder="请输入分配比例(%)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="allocationAmount"
                label="分配金额"
                rules={[{ required: true, message: '请输入分配金额!' }]}
              >
                <Input placeholder="请输入分配金额" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Allocation; 