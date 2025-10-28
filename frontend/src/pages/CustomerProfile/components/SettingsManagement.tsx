// 设置管理功能组件
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Form, 
  Input, 
  InputNumber, 
  Switch, 
  Select, 
  Button, 
  Space,
  Divider,
  message,
  Modal,
  Table,
  Tag,
  Tooltip,
  Alert,
  Tabs,
  DatePicker,
  TimePicker
} from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  BarChartOutlined,
  UserOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface SegmentationRule {
  id: string;
  name: string;
  description: string;
  criteria: {
    minOrders: number;
    minAmount: number;
    timeRange: number;
    lastOrderDays: number;
  };
  segmentName: string;
  color: string;
  enabled: boolean;
  priority: number;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'churn' | 'growth' | 'anomaly' | 'threshold';
  conditions: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    value: number;
    timeWindow: number;
  }[];
  actions: {
    type: 'email' | 'sms' | 'notification' | 'webhook';
    recipients: string[];
    template: string;
  }[];
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ExportConfig {
  id: string;
  name: string;
  description: string;
  format: 'excel' | 'csv' | 'pdf' | 'json';
  schedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  filters: {
    dateRange: [string, string];
    cities: string[];
    stores: string[];
    segments: string[];
  };
  fields: string[];
  lastExport?: string;
  nextExport?: string;
}

interface SettingsData {
  segmentationRules: SegmentationRule[];
  alertRules: AlertRule[];
  exportConfigs: ExportConfig[];
  generalSettings: {
    defaultTimeRange: number;
    refreshInterval: number;
    dataRetentionDays: number;
    enableRealTimeUpdates: boolean;
    enableAIAnalysis: boolean;
    aiAnalysisInterval: number;
  };
}

interface SettingsManagementProps {
  onSettingsChange?: (settings: SettingsData) => void;
}

const SettingsManagement: React.FC<SettingsManagementProps> = ({ onSettingsChange }) => {
  const [loading, setLoading] = useState(false);
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [form] = Form.useForm();
  const [segmentationForm] = Form.useForm();
  const [alertForm] = Form.useForm();
  const [exportForm] = Form.useForm();
  
  const [activeTab, setActiveTab] = useState('general');
  const [segmentationModalVisible, setSegmentationModalVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<SegmentationRule | null>(null);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [editingExport, setEditingExport] = useState<ExportConfig | null>(null);

  // 模拟数据加载
  const loadSettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: SettingsData = {
        segmentationRules: [
          {
            id: '1',
            name: '核心客户',
            description: '高价值、高频次购买客户',
            criteria: {
              minOrders: 10,
              minAmount: 1000,
              timeRange: 90,
              lastOrderDays: 30
            },
            segmentName: '核心客户',
            color: '#52c41a',
            enabled: true,
            priority: 1
          },
          {
            id: '2',
            name: '活跃客户',
            description: '中等价值、定期购买客户',
            criteria: {
              minOrders: 5,
              minAmount: 500,
              timeRange: 60,
              lastOrderDays: 15
            },
            segmentName: '活跃客户',
            color: '#1890ff',
            enabled: true,
            priority: 2
          },
          {
            id: '3',
            name: '机会客户',
            description: '有潜力但需要激活的客户',
            criteria: {
              minOrders: 2,
              minAmount: 100,
              timeRange: 30,
              lastOrderDays: 7
            },
            segmentName: '机会客户',
            color: '#faad14',
            enabled: true,
            priority: 3
          },
          {
            id: '4',
            name: '沉睡客户',
            description: '长期未购买需要唤醒的客户',
            criteria: {
              minOrders: 1,
              minAmount: 50,
              timeRange: 365,
              lastOrderDays: 60
            },
            segmentName: '沉睡/新客户',
            color: '#ff4d4f',
            enabled: true,
            priority: 4
          }
        ],
        alertRules: [
          {
            id: '1',
            name: '客户流失预警',
            description: '客户超过30天未购买时触发预警',
            type: 'churn',
            conditions: [
              {
                metric: 'days_since_last_order',
                operator: '>',
                value: 30,
                timeWindow: 7
              }
            ],
            actions: [
              {
                type: 'email',
                recipients: ['manager@hotdog.com'],
                template: 'churn_alert_template'
              }
            ],
            enabled: true,
            severity: 'high'
          },
          {
            id: '2',
            name: '销售异常预警',
            description: '日销售额低于预期50%时触发',
            type: 'anomaly',
            conditions: [
              {
                metric: 'daily_sales',
                operator: '<',
                value: 5000,
                timeWindow: 1
              }
            ],
            actions: [
              {
                type: 'notification',
                recipients: ['operations@hotdog.com'],
                template: 'sales_anomaly_template'
              }
            ],
            enabled: true,
            severity: 'medium'
          }
        ],
        exportConfigs: [
          {
            id: '1',
            name: '客户分析日报',
            description: '每日客户分析数据导出',
            format: 'excel',
            schedule: {
              enabled: true,
              frequency: 'daily',
              time: '08:00'
            },
            filters: {
              dateRange: ['2024-01-01', '2024-12-31'],
              cities: ['all'],
              stores: ['all'],
              segments: ['all']
            },
            fields: ['customer_id', 'segment', 'total_orders', 'total_amount', 'last_order_date'],
            lastExport: '2024-10-25 08:00:00',
            nextExport: '2024-10-26 08:00:00'
          }
        ],
        generalSettings: {
          defaultTimeRange: 30,
          refreshInterval: 300,
          dataRetentionDays: 365,
          enableRealTimeUpdates: true,
          enableAIAnalysis: true,
          aiAnalysisInterval: 3600
        }
      };

      setSettingsData(mockData);
      form.setFieldsValue(mockData.generalSettings);
    } catch (error) {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 保存通用设置
  const handleSaveGeneralSettings = async (values: any) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedSettings: SettingsData = {
        ...settingsData!,
        generalSettings: values
      };
      
      setSettingsData(updatedSettings);
      onSettingsChange?.(updatedSettings);
      message.success('设置保存成功');
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存分层规则
  const handleSaveSegmentationRule = async (values: any) => {
    try {
      const newRule: SegmentationRule = {
        id: editingRule?.id || Date.now().toString(),
        ...values,
        enabled: true,
        priority: settingsData?.segmentationRules.length || 1
      };

      const updatedRules = editingRule
        ? settingsData!.segmentationRules.map(rule => rule.id === editingRule.id ? newRule : rule)
        : [...settingsData!.segmentationRules, newRule];

      const updatedSettings: SettingsData = {
        ...settingsData!,
        segmentationRules: updatedRules
      };

      setSettingsData(updatedSettings);
      onSettingsChange?.(updatedSettings);
      setSegmentationModalVisible(false);
      setEditingRule(null);
      segmentationForm.resetFields();
      message.success('分层规则保存成功');
    } catch (error) {
      message.error('保存分层规则失败');
    }
  };

  // 删除分层规则
  const handleDeleteSegmentationRule = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个分层规则吗？',
      onOk: () => {
        const updatedRules = settingsData!.segmentationRules.filter(rule => rule.id !== id);
        const updatedSettings: SettingsData = {
          ...settingsData!,
          segmentationRules: updatedRules
        };
        setSettingsData(updatedSettings);
        onSettingsChange?.(updatedSettings);
        message.success('分层规则删除成功');
      }
    });
  };

  // 分层规则表格列定义
  const segmentationColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SegmentationRule) => (
        <Space>
          <Tag color={record.color}>{text}</Tag>
          {!record.enabled && <Tag color="red">已禁用</Tag>}
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '条件',
      key: 'criteria',
      render: (record: SegmentationRule) => (
        <div>
          <div>订单数 ≥ {record.criteria.minOrders}</div>
          <div>消费金额 ≥ ¥{record.criteria.minAmount}</div>
          <div>时间范围: {record.criteria.timeRange}天</div>
        </div>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => <Tag color="blue">#{priority}</Tag>
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: SegmentationRule) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRule(record);
              segmentationForm.setFieldsValue(record);
              setSegmentationModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSegmentationRule(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  if (loading && !settingsData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>正在加载设置...</div>
      </div>
    );
  }

  if (!settingsData) {
    return <div>暂无设置数据</div>;
  }

  return (
    <div>
      <Card 
        title={
          <Space>
            <SettingOutlined />
            客群画像设置管理
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSettings}>
              刷新
            </Button>
            <Button type="primary" icon={<SaveOutlined />}>
              保存所有设置
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 通用设置 */}
          <TabPane tab="通用设置" key="general">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveGeneralSettings}
              initialValues={settingsData.generalSettings}
            >
              <Row gutter={[24, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="数据设置" size="small">
                    <Form.Item
                      label="默认时间范围"
                      name="defaultTimeRange"
                      tooltip="默认显示多少天的数据"
                    >
                      <Select>
                        <Option value={7}>最近7天</Option>
                        <Option value={30}>最近30天</Option>
                        <Option value={90}>最近90天</Option>
                        <Option value={365}>最近1年</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      label="数据刷新间隔"
                      name="refreshInterval"
                      tooltip="自动刷新数据的间隔时间（秒）"
                    >
                      <InputNumber min={60} max={3600} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      label="数据保留天数"
                      name="dataRetentionDays"
                      tooltip="数据在系统中保留的天数"
                    >
                      <InputNumber min={30} max={3650} style={{ width: '100%' }} />
                    </Form.Item>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card title="功能设置" size="small">
                    <Form.Item
                      label="启用实时更新"
                      name="enableRealTimeUpdates"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>

                    <Form.Item
                      label="启用AI分析"
                      name="enableAIAnalysis"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>

                    <Form.Item
                      label="AI分析间隔"
                      name="aiAnalysisInterval"
                      tooltip="AI分析执行的间隔时间（秒）"
                    >
                      <InputNumber min={1800} max={86400} style={{ width: '100%' }} />
                    </Form.Item>
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    保存设置
                  </Button>
                  <Button onClick={() => form.resetFields()}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>

          {/* 客户分层规则 */}
          <TabPane tab="分层规则" key="segmentation">
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRule(null);
                  segmentationForm.resetFields();
                  setSegmentationModalVisible(true);
                }}
              >
                添加分层规则
              </Button>
            </div>

            <Table
              columns={segmentationColumns}
              dataSource={settingsData.segmentationRules}
              rowKey={(record) => record.id}
              pagination={false}
              size="middle"
            />
          </TabPane>

          {/* 预警规则 */}
          <TabPane tab="预警规则" key="alerts">
            <Alert
              message="预警规则管理"
              description="配置各种业务预警规则，当满足条件时自动发送通知"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Row gutter={[16, 16]}>
              {settingsData.alertRules.map((rule) => (
                <Col xs={24} lg={12} key={rule.id}>
                  <Card 
                    title={
                      <Space>
                        <BellOutlined />
                        {rule.name}
                        <Tag color={rule.severity === 'high' ? 'red' : rule.severity === 'medium' ? 'orange' : 'green'}>
                          {rule.severity === 'high' ? '高' : rule.severity === 'medium' ? '中' : '低'}优先级
                        </Tag>
                        {!rule.enabled && <Tag color="red">已禁用</Tag>}
                      </Space>
                    }
                    size="small"
                    extra={
                      <Space>
                        <Button type="link" size="small" icon={<EditOutlined />}>
                          编辑
                        </Button>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Space>
                    }
                  >
                    <p>{rule.description}</p>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div>类型: {rule.type === 'churn' ? '流失预警' : 
                                 rule.type === 'growth' ? '增长预警' : 
                                 rule.type === 'anomaly' ? '异常预警' : '阈值预警'}</div>
                      <div>条件数: {rule.conditions.length}</div>
                      <div>动作数: {rule.actions.length}</div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>

          {/* 数据导出 */}
          <TabPane tab="数据导出" key="export">
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingExport(null);
                  exportForm.resetFields();
                  setExportModalVisible(true);
                }}
              >
                添加导出配置
              </Button>
            </div>

            <Row gutter={[16, 16]}>
              {settingsData.exportConfigs.map((config) => (
                <Col xs={24} lg={12} key={config.id}>
                  <Card 
                    title={
                      <Space>
                        <BarChartOutlined />
                        {config.name}
                        <Tag color="blue">{config.format.toUpperCase()}</Tag>
                        {config.schedule.enabled && <Tag color="green">定时导出</Tag>}
                      </Space>
                    }
                    size="small"
                    extra={
                      <Space>
                        <Button type="link" size="small" icon={<EditOutlined />}>
                          编辑
                        </Button>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Space>
                    }
                  >
                    <p>{config.description}</p>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div>格式: {config.format}</div>
                      <div>字段数: {config.fields.length}</div>
                      {config.lastExport && <div>上次导出: {config.lastExport}</div>}
                      {config.nextExport && <div>下次导出: {config.nextExport}</div>}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 分层规则编辑模态框 */}
      <Modal
        title={editingRule ? '编辑分层规则' : '添加分层规则'}
        open={segmentationModalVisible}
        onCancel={() => {
          setSegmentationModalVisible(false);
          setEditingRule(null);
          segmentationForm.resetFields();
        }}
        onOk={() => segmentationForm.submit()}
        width={600}
      >
        <Form
          form={segmentationForm}
          layout="vertical"
          onFinish={handleSaveSegmentationRule}
        >
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：核心客户" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: true, message: '请输入规则描述' }]}
          >
            <TextArea rows={2} placeholder="描述这个分层规则的作用" />
          </Form.Item>

          <Form.Item
            label="分层名称"
            name="segmentName"
            rules={[{ required: true, message: '请输入分层名称' }]}
          >
            <Input placeholder="例如：核心客户" />
          </Form.Item>

          <Form.Item
            label="颜色标识"
            name="color"
            rules={[{ required: true, message: '请选择颜色' }]}
          >
            <Select placeholder="选择颜色">
              <Option value="#52c41a">绿色</Option>
              <Option value="#1890ff">蓝色</Option>
              <Option value="#faad14">橙色</Option>
              <Option value="#ff4d4f">红色</Option>
              <Option value="#722ed1">紫色</Option>
            </Select>
          </Form.Item>

          <Divider>分层条件</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="最小订单数"
                name={['criteria', 'minOrders']}
                rules={[{ required: true, message: '请输入最小订单数' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="最小消费金额"
                name={['criteria', 'minAmount']}
                rules={[{ required: true, message: '请输入最小消费金额' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="时间范围(天)"
                name={['criteria', 'timeRange']}
                rules={[{ required: true, message: '请输入时间范围' }]}
              >
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="最后订单天数"
                name={['criteria', 'lastOrderDays']}
                rules={[{ required: true, message: '请输入最后订单天数' }]}
              >
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsManagement;
