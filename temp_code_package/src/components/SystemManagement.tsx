import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Alert, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Tabs,
  List,
  Badge,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  Switch
} from 'antd';
import { 
  MonitorOutlined, 
  DatabaseOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  BarChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  ChartTooltip,
  Legend
);

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: string[];
}

interface PerformanceAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
  resolved: boolean;
}

interface DataQualityIssue {
  id: string;
  ruleId: string;
  table: string;
  column?: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  examples: any[];
  detectedAt: string;
}

const SystemManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [dataQualityIssues, setDataQualityIssues] = useState<DataQualityIssue[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [dataQualityRules, setDataQualityRules] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'rule' | 'alert'>('rule');
  const [form] = Form.useForm();

  // 模拟数据
  const mockSystemHealth: SystemHealth = {
    status: 'warning',
    score: 75,
    issues: ['CPU使用率过高: 85.2%', '数据库响应时间过长: 1200ms']
  };

  const mockPerformanceAlerts: PerformanceAlert[] = [
    {
      id: '1',
      type: 'cpu',
      severity: 'high',
      message: 'CPU使用率过高: 85.2%',
      threshold: 80,
      currentValue: 85.2,
      timestamp: '2025-10-26T14:00:00Z',
      resolved: false
    },
    {
      id: '2',
      type: 'database',
      severity: 'medium',
      message: '数据库响应时间过长: 1200ms',
      threshold: 1000,
      currentValue: 1200,
      timestamp: '2025-10-26T13:45:00Z',
      resolved: false
    },
    {
      id: '3',
      type: 'memory',
      severity: 'low',
      message: '内存使用率较高: 78.5%',
      threshold: 75,
      currentValue: 78.5,
      timestamp: '2025-10-26T13:30:00Z',
      resolved: true
    }
  ];

  const mockDataQualityIssues: DataQualityIssue[] = [
    {
      id: '1',
      ruleId: 'orders_null_customer_id',
      table: 'orders',
      column: 'customer_id',
      issue: '订单客户ID不能为空 - 发现 3 条记录',
      severity: 'critical',
      count: 3,
      examples: [
        { id: 1001, customer_id: null, store_id: 'S001', total_amount: 58.00 },
        { id: 1002, customer_id: null, store_id: 'S002', total_amount: 45.00 }
      ],
      detectedAt: '2025-10-26T14:00:00Z'
    },
    {
      id: '2',
      ruleId: 'duplicate_orders',
      table: 'orders',
      issue: '发现 2 组重复订单',
      severity: 'medium',
      count: 2,
      examples: [
        { customer_id: 'C001', store_id: 'S001', created_at: '2025-10-26 10:00:00', total_amount: 58.00, duplicate_count: 2 }
      ],
      detectedAt: '2025-10-26T14:00:00Z'
    }
  ];

  const mockMetricsHistory = [
    { timestamp: '14:00', cpu: 85, memory: 78, disk: 45, database: 1200 },
    { timestamp: '13:45', cpu: 82, memory: 76, disk: 44, database: 1100 },
    { timestamp: '13:30', cpu: 78, memory: 74, disk: 43, database: 950 },
    { timestamp: '13:15', cpu: 75, memory: 72, disk: 42, database: 900 },
    { timestamp: '13:00', cpu: 72, memory: 70, disk: 41, database: 850 }
  ];

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSystemHealth(mockSystemHealth);
      setPerformanceAlerts(mockPerformanceAlerts);
      setDataQualityIssues(mockDataQualityIssues);
      setMetricsHistory(mockMetricsHistory);
      
    } catch (error) {
      console.error('加载系统数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <CloseCircleOutlined />;
      case 'high': return <ExclamationCircleOutlined />;
      case 'medium': return <WarningOutlined />;
      case 'low': return <CheckCircleOutlined />;
      default: return null;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'default';
    }
  };

  // 性能指标图表数据
  const metricsChartData = {
    labels: metricsHistory.map(m => m.timestamp),
    datasets: [
      {
        label: 'CPU使用率 (%)',
        data: metricsHistory.map(m => m.cpu),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      },
      {
        label: '内存使用率 (%)',
        data: metricsHistory.map(m => m.memory),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1
      },
      {
        label: '磁盘使用率 (%)',
        data: metricsHistory.map(m => m.disk),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  const metricsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '系统性能指标趋势'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: '使用率 (%)'
        }
      }
    }
  };

  // 性能警报表格列
  const alertColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">{type.toUpperCase()}</Tag>
      )
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message'
    },
    {
      title: '当前值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      render: (value: number, record: PerformanceAlert) => (
        <Text type={value > record.threshold ? 'danger' : 'success'}>
          {value}
        </Text>
      )
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold'
    },
    {
      title: '状态',
      dataIndex: 'resolved',
      key: 'resolved',
      render: (resolved: boolean) => (
        <Tag color={resolved ? 'green' : 'red'}>
          {resolved ? '已解决' : '未解决'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (record: PerformanceAlert) => (
        <Space>
          {!record.resolved && (
            <Button 
              type="link" 
              size="small"
              onClick={() => resolveAlert(record.id)}
            >
              解决
            </Button>
          )}
        </Space>
      )
    }
  ];

  // 数据质量问题表格列
  const qualityColumns = [
    {
      title: '表名',
      dataIndex: 'table',
      key: 'table',
      render: (table: string) => (
        <Tag color="blue">{table}</Tag>
      )
    },
    {
      title: '列名',
      dataIndex: 'column',
      key: 'column',
      render: (column: string) => column || '-'
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '问题描述',
      dataIndex: 'issue',
      key: 'issue'
    },
    {
      title: '影响记录数',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => (
        <Badge count={count} showZero color="red" />
      )
    },
    {
      title: '检测时间',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      render: (time: string) => new Date(time).toLocaleString()
    }
  ];

  const resolveAlert = async (alertId: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPerformanceAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
    } catch (error) {
      console.error('解决警报失败:', error);
    }
  };

  const runDataQualityCheck = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟新的检查结果
      const newIssues = [
        ...mockDataQualityIssues,
        {
          id: '3',
          ruleId: 'stores_null_city',
          table: 'stores',
          column: 'city',
          issue: '门店城市不能为空 - 发现 1 条记录',
          severity: 'high' as const,
          count: 1,
          examples: [{ id: 'S999', city: null, store_name: '测试门店' }],
          detectedAt: new Date().toISOString()
        }
      ];
      
      setDataQualityIssues(newIssues);
    } catch (error) {
      console.error('数据质量检查失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const showModal = (type: 'rule' | 'alert') => {
    setModalType(type);
    setModalVisible(true);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalType === 'rule') {
        // 添加数据质量规则
        console.log('添加规则:', values);
      }
      
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <MonitorOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          系统管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSystemData} loading={loading}>
            刷新数据
          </Button>
          <Button type="primary" icon={<SettingOutlined />} onClick={() => showModal('rule')}>
            添加规则
          </Button>
        </Space>
      </div>

      {/* 系统健康状态 */}
      <Card title="系统健康状态" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="健康评分"
              value={systemHealth?.score || 0}
              suffix="/100"
              valueStyle={{ 
                color: getHealthStatusColor(systemHealth?.status || 'healthy')
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="系统状态"
              value={systemHealth?.status === 'healthy' ? '健康' : 
                     systemHealth?.status === 'warning' ? '警告' : '严重'}
              valueStyle={{ 
                color: getHealthStatusColor(systemHealth?.status || 'healthy')
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="性能警报"
              value={performanceAlerts.filter(a => !a.resolved).length}
              suffix="个"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="数据质量问题"
              value={dataQualityIssues.length}
              suffix="个"
            />
          </Col>
        </Row>
        
        {systemHealth?.issues && systemHealth.issues.length > 0 && (
          <Alert
            message="系统问题"
            description={
              <ul>
                {systemHealth.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            }
            type={systemHealth.status === 'critical' ? 'error' : 'warning'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* 性能指标图表 */}
      <Card title="性能指标趋势" style={{ marginBottom: 24 }}>
        <div style={{ height: 300 }}>
          <Line data={metricsChartData} options={metricsChartOptions} />
        </div>
      </Card>

      {/* 标签页 */}
      <Tabs defaultActiveKey="alerts">
        <TabPane tab="性能警报" key="alerts">
          <Table
            dataSource={performanceAlerts}
            columns={alertColumns}
            rowKey="id"
            pagination={false}
          />
        </TabPane>
        
        <TabPane tab="数据质量" key="quality">
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<DatabaseOutlined />} 
              onClick={runDataQualityCheck}
              loading={loading}
            >
              执行数据质量检查
            </Button>
          </div>
          <Table
            dataSource={dataQualityIssues}
            columns={qualityColumns}
            rowKey="id"
            pagination={false}
            expandable={{
              expandedRowRender: (record) => (
                <div>
                  <Title level={5}>示例数据:</Title>
                  <pre>{JSON.stringify(record.examples, null, 2)}</pre>
                </div>
              )
            }}
          />
        </TabPane>
        
        <TabPane tab="系统统计" key="stats">
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总规则数"
                  value={10}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="启用规则数"
                  value={8}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="最后检查时间"
                  value={new Date().toLocaleString()}
                  prefix={<LineChartOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* 添加规则模态框 */}
      <Modal
        title={modalType === 'rule' ? '添加数据质量规则' : '添加性能警报'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="规则描述"
            rules={[{ required: true, message: '请输入规则描述' }]}
          >
            <Input.TextArea placeholder="请输入规则描述" />
          </Form.Item>
          
          <Form.Item
            name="table"
            label="表名"
            rules={[{ required: true, message: '请输入表名' }]}
          >
            <Input placeholder="请输入表名" />
          </Form.Item>
          
          <Form.Item
            name="column"
            label="列名"
          >
            <Input placeholder="请输入列名（可选）" />
          </Form.Item>
          
          <Form.Item
            name="rule"
            label="规则条件"
            rules={[{ required: true, message: '请输入规则条件' }]}
          >
            <Input.TextArea placeholder="请输入SQL WHERE条件" />
          </Form.Item>
          
          <Form.Item
            name="severity"
            label="严重程度"
            rules={[{ required: true, message: '请选择严重程度' }]}
          >
            <Select placeholder="请选择严重程度">
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="critical">严重</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="enabled"
            label="启用规则"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemManagement;
