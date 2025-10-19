import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Progress,
  Alert,
  Row,
  Col,
  Statistic,
  List,
  Typography,
  Space,
  Divider,
  Spin,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  TeamOutlined,
  ShopOutlined,
  ShoppingOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  RocketOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ETLStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'error' | 'missing';
  scriptPath?: string;
}

interface ETLStatus {
  success: boolean;
  message: string;
  steps: ETLStep[];
  etlPath?: string;
}

const ETLManagement: React.FC = () => {
  const [etlStatus, setEtlStatus] = useState<ETLStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [executingStep, setExecutingStep] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 获取ETL状态
  const fetchETLStatus = async () => {
    try {
      const response = await fetch('/api/etl/status');
      const data = await response.json();
      setEtlStatus(data);
    } catch (error) {
      console.error('获取ETL状态失败:', error);
      message.error('获取ETL状态失败');
    }
  };

  // 执行单个ETL步骤
  const executeStep = async (stepId: number) => {
    setExecutingStep(stepId);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/etl/execute/${stepId}`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        addLog(`✅ 步骤 ${stepId} 执行成功: ${data.message}`);
        message.success(`步骤 ${stepId} 执行成功`);
        await fetchETLStatus(); // 刷新状态
      } else {
        addLog(`❌ 步骤 ${stepId} 执行失败: ${data.message}`);
        message.error(`步骤 ${stepId} 执行失败`);
      }
    } catch (error) {
      addLog(`❌ 步骤 ${stepId} 执行异常: ${error}`);
      message.error(`步骤 ${stepId} 执行异常`);
    } finally {
      setExecutingStep(null);
      setLoading(false);
    }
  };

  // 执行完整ETL流程
  const executeAll = async () => {
    setLoading(true);
    addLog('🚀 开始执行完整ETL流程...');
    message.info('开始执行完整ETL流程...');
    
    try {
      const response = await fetch('/api/etl/execute-all', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        addLog('🎉 完整ETL流程执行成功!');
        message.success('完整ETL流程执行成功!');
        await fetchETLStatus();
      } else {
        addLog(`❌ 完整ETL流程执行失败: ${data.message}`);
        message.error('完整ETL流程执行失败');
      }
    } catch (error) {
      addLog(`❌ 完整ETL流程执行异常: ${error}`);
      message.error('完整ETL流程执行异常');
    } finally {
      setLoading(false);
    }
  };

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 获取步骤图标
  const getStepIcon = (stepId: number) => {
    const icons = {
      1: DatabaseOutlined,
      2: ShoppingOutlined,
      3: ShopOutlined,
      4: ShoppingOutlined,
      5: TeamOutlined,
      6: BarChartOutlined,
      7: TeamOutlined,
      8: RiseOutlined,
      9: EnvironmentOutlined,
      10: ThunderboltOutlined
    };
    return icons[stepId as keyof typeof icons] || DatabaseOutlined;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'processing';
      case 'error': return 'error';
      case 'missing': return 'default';
      case 'ready': return 'warning';
      default: return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '执行中';
      case 'error': return '错误';
      case 'missing': return '缺失';
      case 'ready': return '就绪';
      default: return '待执行';
    }
  };

  useEffect(() => {
    fetchETLStatus();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DatabaseOutlined style={{ marginRight: '8px' }} />
          ETL数据同步管理
        </Title>
        <Text type="secondary">智能数据提取、转换和加载系统</Text>
      </div>

      <Space style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ReloadOutlined />}
          onClick={fetchETLStatus}
          disabled={loading}
        >
          刷新状态
        </Button>
        <Button 
          type="primary"
          icon={<RocketOutlined />}
          onClick={executeAll}
          disabled={loading}
          loading={loading}
        >
          执行全部ETL
        </Button>
      </Space>

      {/* 状态概览 */}
      {etlStatus && (
        <Card style={{ marginBottom: '24px' }}>
          <Title level={4}>
            <DatabaseOutlined style={{ marginRight: '8px' }} />
            ETL框架状态
          </Title>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="已完成"
                value={etlStatus.steps.filter(s => s.status === 'completed').length}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="就绪"
                value={etlStatus.steps.filter(s => s.status === 'ready').length}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="错误"
                value={etlStatus.steps.filter(s => s.status === 'error').length}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="缺失"
                value={etlStatus.steps.filter(s => s.status === 'missing').length}
                valueStyle={{ color: '#8c8c8c' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* ETL步骤列表 */}
      <Row gutter={[16, 16]}>
        {etlStatus?.steps.map((step) => {
          const Icon = getStepIcon(step.id);
          const isExecuting = executingStep === step.id;
          
          return (
            <Col xs={24} sm={12} lg={8} xl={6} key={step.id}>
              <Card
                hoverable
                actions={[
                  <Button
                    key="execute"
                    type="primary"
                    icon={isExecuting ? <ClockCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => executeStep(step.id)}
                    disabled={loading || isExecuting || step.status === 'missing'}
                    loading={isExecuting}
                    block
                  >
                    {isExecuting ? '执行中...' : '执行步骤'}
                  </Button>
                ]}
              >
                <Card.Meta
                  avatar={<Icon style={{ fontSize: '24px', color: '#1890ff' }} />}
                  title={
                    <Space>
                      <span>步骤 {step.id}</span>
                      <Badge 
                        status={getStatusColor(step.status)}
                        text={getStatusText(step.status)}
                      />
                    </Space>
                  }
                  description={step.description}
                />
                {isExecuting && (
                  <div style={{ marginTop: '12px' }}>
                    <Progress percent={50} size="small" />
                  </div>
                )}
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                  脚本: {step.name}.py
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 执行日志 */}
      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>
          <ThunderboltOutlined style={{ marginRight: '8px' }} />
          执行日志
        </Title>
        <div 
          style={{ 
            backgroundColor: '#001529',
            color: '#52c41a',
            padding: '16px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#8c8c8c' }}>暂无日志</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 帮助信息 */}
      <Alert
        message="ETL框架说明"
        description={
          <div>
            <p><strong>步骤1-5：</strong>数据提取层，从源数据库提取和清洗数据</p>
            <p><strong>步骤6-10：</strong>智能分析层，进行利润分析、客户细分、销售预测等</p>
            <p><strong>执行顺序：</strong>建议按步骤顺序执行，或使用"执行全部ETL"一键完成</p>
            <p><strong>数据源：</strong>cyrg2025（主运营库）、cyrgweixin（小程序库）→ hotdog2030（分析库）</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default ETLManagement;