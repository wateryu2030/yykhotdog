// AI洞察功能组件
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  List, 
  Tag, 
  Button, 
  Space,
  Alert,
  Progress,
  Tooltip,
  Modal,
  message,
  Spin,
  Empty,
  Divider
} from 'antd';
import { 
  RobotOutlined, 
  BulbOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';

interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'customer' | 'product' | 'operation' | 'marketing';
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestions?: string[];
  metrics?: {
    name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

interface AIPrediction {
  id: string;
  type: 'sales' | 'customer' | 'inventory' | 'demand';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  predictedValue: number;
  currentValue: number;
  changePercent: number;
  factors: string[];
}

interface AIInsightsData {
  insights: AIInsight[];
  predictions: AIPrediction[];
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  summary: {
    totalInsights: number;
    highPriorityCount: number;
    actionableCount: number;
    avgConfidence: number;
  };
}

interface AIInsightsProps {
  filters: {
    city?: string;
    store?: string;
    dateRange?: [string, string];
  };
  onDataLoad?: (data: AIInsightsData) => void;
}

const AIInsights: React.FC<AIInsightsProps> = ({ filters, onDataLoad }) => {
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<AIInsightsData | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 模拟AI分析数据获取
  const fetchAIInsights = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AIInsightsData = {
        insights: [
          {
            id: '1',
            type: 'success',
            title: '客户忠诚度提升',
            description: '核心客户群体在过去30天内购买频次增加了15%，显示出良好的忠诚度趋势',
            priority: 'high',
            category: 'customer',
            confidence: 92,
            impact: 'high',
            actionable: true,
            suggestions: [
              '推出VIP客户专享优惠',
              '增加个性化推荐',
              '建立客户积分体系'
            ],
            metrics: [
              { name: '复购率', value: 78, trend: 'up' },
              { name: '客单价', value: 35.5, trend: 'up' },
              { name: '满意度', value: 4.6, trend: 'stable' }
            ]
          },
          {
            id: '2',
            type: 'warning',
            title: '新客户流失风险',
            description: '新客户在首次购买后30天内的复购率仅为25%，低于行业平均水平',
            priority: 'high',
            category: 'customer',
            confidence: 85,
            impact: 'high',
            actionable: true,
            suggestions: [
              '优化新客户引导流程',
              '发送个性化欢迎邮件',
              '提供新客户专享优惠'
            ],
            metrics: [
              { name: '新客复购率', value: 25, trend: 'down' },
              { name: '新客留存率', value: 45, trend: 'down' },
              { name: '获客成本', value: 12.5, trend: 'up' }
            ]
          },
          {
            id: '3',
            type: 'info',
            title: '产品偏好变化',
            description: '芝士热狗在过去两周内销量增长20%，可能成为新的热门产品',
            priority: 'medium',
            category: 'product',
            confidence: 78,
            impact: 'medium',
            actionable: true,
            suggestions: [
              '增加芝士热狗库存',
              '推出芝士热狗套餐',
              '在菜单中突出显示'
            ],
            metrics: [
              { name: '芝士热狗销量', value: 120, trend: 'up' },
              { name: '市场份额', value: 18.5, trend: 'up' },
              { name: '利润率', value: 65, trend: 'stable' }
            ]
          },
          {
            id: '4',
            type: 'success',
            title: '运营效率优化',
            description: '午餐时段(12:00-13:00)的订单处理效率提升了30%，客户等待时间显著减少',
            priority: 'medium',
            category: 'operation',
            confidence: 88,
            impact: 'medium',
            actionable: false,
            suggestions: [
              '将优化经验推广到其他时段',
              '培训员工使用新的工作流程',
              '监控其他时段的效率指标'
            ],
            metrics: [
              { name: '订单处理时间', value: 3.2, trend: 'down' },
              { name: '客户满意度', value: 4.7, trend: 'up' },
              { name: '员工效率', value: 85, trend: 'up' }
            ]
          }
        ],
        predictions: [
          {
            id: '1',
            type: 'sales',
            title: '下周销售预测',
            description: '基于历史数据和趋势分析，预计下周销售额将增长8-12%',
            confidence: 85,
            timeframe: '7天',
            predictedValue: 125000,
            currentValue: 115000,
            changePercent: 8.7,
            factors: ['周末促销活动', '新品上市', '天气转暖']
          },
          {
            id: '2',
            type: 'customer',
            title: '客户增长预测',
            description: '预计下月新增客户数量将达到450-500人',
            confidence: 78,
            timeframe: '30天',
            predictedValue: 475,
            currentValue: 420,
            changePercent: 13.1,
            factors: ['营销活动效果', '口碑传播', '季节性因素']
          },
          {
            id: '3',
            type: 'inventory',
            title: '库存需求预测',
            description: '经典热狗预计在未来5天内需要补货，建议提前准备',
            confidence: 92,
            timeframe: '5天',
            predictedValue: 150,
            currentValue: 200,
            changePercent: -25,
            factors: ['销售趋势', '历史消耗', '促销计划']
          }
        ],
        healthScore: 78,
        riskLevel: 'medium',
        recommendations: {
          immediate: [
            '立即启动新客户留存计划',
            '增加芝士热狗库存准备',
            '优化午餐时段人员配置'
          ],
          shortTerm: [
            '建立客户积分奖励体系',
            '推出季节性产品组合',
            '完善客户反馈收集机制'
          ],
          longTerm: [
            '构建客户生命周期管理体系',
            '开发个性化推荐系统',
            '建立数据驱动的决策机制'
          ]
        },
        summary: {
          totalInsights: 4,
          highPriorityCount: 2,
          actionableCount: 3,
          avgConfidence: 85.75
        }
      };

      setAiData(mockData);
      onDataLoad?.(mockData);
    } catch (error) {
      message.error('获取AI洞察数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, [filters]);

  const handleInsightClick = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setModalVisible(true);
  };

  const handleRefresh = () => {
    fetchAIInsights(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'info': return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case 'error': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      default: return <InfoCircleOutlined />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'customer': return 'blue';
      case 'product': return 'green';
      case 'operation': return 'purple';
      case 'marketing': return 'orange';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <RobotOutlined style={{ fontSize: '24px', marginRight: '8px' }} />
          AI正在分析数据...
        </div>
      </div>
    );
  }

  if (!aiData) {
    return (
      <Empty 
        description="暂无AI洞察数据" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const { insights, predictions, healthScore, riskLevel, recommendations, summary } = aiData;

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <RobotOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>AI智能洞察</span>
              <Tag color={riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'orange' : 'green'}>
                风险等级: {riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={refreshing}
              >
                刷新分析
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                type="primary"
              >
                导出报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 健康度评分 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="业务健康度"
              value={healthScore}
              suffix="/100"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: healthScore >= 80 ? '#52c41a' : healthScore >= 60 ? '#faad14' : '#ff4d4f' }}
            />
            <Progress 
              percent={healthScore} 
              showInfo={false}
              strokeColor={healthScore >= 80 ? '#52c41a' : healthScore >= 60 ? '#faad14' : '#ff4d4f'}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="洞察总数"
              value={summary.totalInsights}
              prefix={<BulbOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="高优先级"
              value={summary.highPriorityCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均置信度"
              value={summary.avgConfidence}
              suffix="%"
              prefix={<EyeOutlined />}
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* AI洞察列表 */}
      <Card 
        title={
          <Space>
            <BulbOutlined />
            AI洞察分析
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <List
          dataSource={insights}
          renderItem={(insight) => (
            <List.Item
              actions={[
                <Button 
                  type="link" 
                  icon={<EyeOutlined />}
                  onClick={() => handleInsightClick(insight)}
                >
                  查看详情
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={getTypeIcon(insight.type)}
                title={
                  <Space>
                    <span>{insight.title}</span>
                    <Tag color={getPriorityColor(insight.priority)}>
                      {insight.priority === 'high' ? '高优先级' : insight.priority === 'medium' ? '中优先级' : '低优先级'}
                    </Tag>
                    <Tag color={getCategoryColor(insight.category)}>
                      {insight.category === 'customer' ? '客户' : 
                       insight.category === 'product' ? '产品' : 
                       insight.category === 'operation' ? '运营' : '营销'}
                    </Tag>
                    {insight.actionable && <Tag color="green">可执行</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: '8px' }}>{insight.description}</div>
                    <Space>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        置信度: {insight.confidence}%
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        影响: {insight.impact === 'high' ? '高' : insight.impact === 'medium' ? '中' : '低'}
                      </span>
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* AI预测 */}
      <Card 
        title={
          <Space>
            <ThunderboltOutlined />
            AI预测分析
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Row gutter={[16, 16]}>
          {predictions.map((prediction) => (
            <Col xs={24} sm={12} lg={8} key={prediction.id}>
              <Card size="small" hoverable>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {prediction.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {prediction.description}
                  </div>
                </div>
                
                <Row gutter={8}>
                  <Col span={12}>
                    <Statistic
                      title="预测值"
                      value={prediction.predictedValue}
                      precision={0}
                      valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="变化率"
                      value={prediction.changePercent}
                      suffix="%"
                      precision={1}
                      valueStyle={{ 
                        fontSize: '16px', 
                        color: prediction.changePercent > 0 ? '#52c41a' : '#ff4d4f' 
                      }}
                    />
                  </Col>
                </Row>
                
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    置信度: {prediction.confidence}%
                  </div>
                  <Progress 
                    percent={prediction.confidence} 
                    showInfo={false}
                    strokeColor="#1890ff"
                    size="small"
                  />
                </div>
                
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    关键因素:
                  </div>
                  <Space wrap>
                    {prediction.factors.map((factor, index) => (
                      <Tag key={index}>{factor}</Tag>
                    ))}
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 行动建议 */}
      <Card 
        title={
          <Space>
            <CheckCircleOutlined />
            行动建议
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Alert
              message="立即行动"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {recommendations.immediate.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
            />
          </Col>
          <Col xs={24} lg={8}>
            <Alert
              message="短期规划"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {recommendations.shortTerm.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
            />
          </Col>
          <Col xs={24} lg={8}>
            <Alert
              message="长期战略"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {recommendations.longTerm.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
            />
          </Col>
        </Row>
      </Card>

      {/* 洞察详情模态框 */}
      <Modal
        title={
          <Space>
            {selectedInsight && getTypeIcon(selectedInsight.type)}
            {selectedInsight?.title}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          <Button key="action" type="primary" disabled={!selectedInsight?.actionable}>
            执行建议
          </Button>
        ]}
        width={800}
      >
        {selectedInsight && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <p>{selectedInsight.description}</p>
            </div>
            
            <Divider>关键指标</Divider>
            <Row gutter={[16, 16]}>
              {selectedInsight.metrics?.map((metric, index) => (
                <Col span={8} key={index}>
                  <Card size="small">
                    <Statistic
                      title={metric.name}
                      value={metric.value}
                      precision={metric.name.includes('率') ? 1 : 0}
                      suffix={metric.name.includes('率') ? '%' : ''}
                      valueStyle={{ 
                        color: metric.trend === 'up' ? '#52c41a' : 
                               metric.trend === 'down' ? '#ff4d4f' : '#666'
                      }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
            
            {selectedInsight.suggestions && selectedInsight.suggestions.length > 0 && (
              <>
                <Divider>行动建议</Divider>
                <ul>
                  {selectedInsight.suggestions.map((suggestion, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>{suggestion}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIInsights;
