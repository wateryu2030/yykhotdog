import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Pagination,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Badge
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  TrophyOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

interface CandidateLocation {
  id: string;
  shop_name: string;
  shop_address: string;
  location: string;
  description: string;
  province: string;
  city: string;
  district: string;
  rent_amount: number;
  area_size?: number;
  investment_amount?: number;
  approval_state: string;
  approval_remarks: string;
  status: string;
  analysis_score?: number;
  poi_density_score?: number;
  traffic_score?: number;
  population_score?: number;
  competition_score?: number;
  rental_cost_score?: number;
  predicted_revenue?: number;
  confidence_score?: number;
  success_probability?: number;
  risk_level?: string;
  photo_url?: string;
  record_time: string;
  created_at: string;
}

interface AnalysisResult {
  location: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
  scores: {
    poiDensity: number;
    populationDensity: number;
    trafficAccessibility: number;
    competitionLevel: number;
    rentalCost: number;
    footTraffic: number;
    overallScore: number;
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskLevel: string;
  };
  predictions: {
    expectedRevenue: number;
    confidence: number;
    breakEvenTime: number;
  };
  data: {
    nearbyPOIs: Record<string, number>;
    schools: Record<string, number>;
    competitors: Record<string, number>;
    trafficStations: Array<{
      type: string;
      count: number;
    }>;
  };
}

const CandidateLocationsPage: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    city: '',
    status: ''
  });
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateLocation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    analyzed: 0,
    pending: 0,
    avgScore: 0
  });

  // 获取意向铺位列表
  const fetchCandidates = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.city && { city: filters.city }),
        ...(filters.status && { status: filters.status })
      });

      const response = await axios.get(`/api/site-selection/candidates?${params}`);
      
      if (response.data.success) {
        setCandidates(response.data.data.records);
        setPagination({
          current: response.data.data.pagination.page,
          pageSize: response.data.data.pagination.limit,
          total: response.data.data.pagination.total
        });
      } else {
        message.error('获取意向铺位列表失败');
      }
    } catch (error) {
      console.error('获取意向铺位列表失败:', error);
      message.error('获取意向铺位列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/site-selection/statistics');
      if (response.data.success) {
        const stats = response.data.data.overview;
        setStatistics({
          total: stats.total_analyses,
          analyzed: stats.good_count + stats.excellent_count,
          pending: stats.total_analyses - stats.good_count - stats.excellent_count,
          avgScore: stats.avg_score || 0
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 分析意向铺位
  const analyzeCandidate = async (candidate: CandidateLocation) => {
    setAnalysisLoading(parseInt(candidate.id));
    try {
      const response = await axios.post(`/api/site-selection/candidates/${candidate.id}/analyze`, {
        includeMLPrediction: true
      });
      
      if (response.data.success) {
        setSelectedCandidate(candidate);
        setAnalysisResult(response.data.data.analysis);
        setAnalysisModalVisible(true);
        message.success('分析完成');
        
        // 刷新列表
        fetchCandidates(pagination.current, pagination.pageSize);
        fetchStatistics();
      } else {
        message.error('分析失败');
      }
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败');
    } finally {
      setAnalysisLoading(null);
    }
  };

  // 批量分析
  const batchAnalyze = async (candidateIds: string[]) => {
    setLoading(true);
    let successCount = 0;
    
    for (const id of candidateIds) {
      try {
        const response = await axios.post(`/api/site-selection/candidates/${id}/analyze`, {
          includeMLPrediction: true
        });
        
        if (response.data.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`分析ID ${id} 失败:`, error);
      }
    }
    
    message.success(`批量分析完成，成功分析 ${successCount}/${candidateIds.length} 个铺位`);
    setLoading(false);
    
    // 刷新列表和统计
    fetchCandidates(pagination.current, pagination.pageSize);
    fetchStatistics();
  };

  useEffect(() => {
    fetchCandidates();
    fetchStatistics();
  }, []);

  const columns = [
    {
      title: '店铺名称',
      dataIndex: 'shop_name',
      key: 'shop_name',
      width: 200,
      render: (text: string, record: CandidateLocation) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <EnvironmentOutlined /> {record.shop_address}
          </div>
        </div>
      )
    },
    {
      title: '位置信息',
      key: 'location',
      width: 150,
      render: (record: CandidateLocation) => (
        <div>
          <div>{record.province}</div>
          <div>{record.city}</div>
          <div>{record.district}</div>
        </div>
      )
    },
    {
      title: '租金',
      dataIndex: 'rent_amount',
      key: 'rent_amount',
      width: 100,
      render: (amount: number) => (
        <div>
          <DollarOutlined /> {amount ? `¥${amount}` : '未设置'}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', text: '待分析' },
          analyzed: { color: 'green', text: '已分析' },
          approved: { color: 'blue', text: '已批准' },
          rejected: { color: 'red', text: '已拒绝' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '分析评分',
      dataIndex: 'analysis_score',
      key: 'analysis_score',
      width: 120,
      render: (score: number) => {
        if (!score) return <span style={{ color: '#999' }}>未分析</span>;
        
        const getScoreColor = (score: number) => {
          if (score >= 80) return '#52c41a';
          if (score >= 60) return '#faad14';
          return '#ff4d4f';
        };
        
        return (
          <div>
            <Progress
              percent={score}
              size="small"
              strokeColor={getScoreColor(score)}
              format={() => `${score.toFixed(1)}`}
            />
          </div>
        );
      }
    },
    {
      title: '预测收入',
      dataIndex: 'predicted_revenue',
      key: 'predicted_revenue',
      width: 120,
      render: (revenue: number) => {
        if (!revenue) return <span style={{ color: '#999' }}>未预测</span>;
        return (
          <div>
            <DollarOutlined /> ¥{(revenue / 10000).toFixed(1)}万
          </div>
        );
      }
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (riskLevel: string) => {
        if (!riskLevel) return <span style={{ color: '#999' }}>未评估</span>;
        
        const riskConfig = {
          low: { color: 'green', text: '低风险' },
          medium: { color: 'orange', text: '中风险' },
          high: { color: 'red', text: '高风险' }
        };
        const config = riskConfig[riskLevel as keyof typeof riskConfig] || { color: 'default', text: riskLevel };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (record: CandidateLocation) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<BarChartOutlined />}
            loading={analysisLoading === parseInt(record.id)}
            onClick={() => analyzeCandidate(record)}
          >
            分析
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedCandidate(record);
              setAnalysisModalVisible(true);
            }}
          >
            查看
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="意向铺位管理" style={{ marginBottom: '24px' }}>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic
              title="总铺位数"
              value={statistics.total}
              prefix={<EnvironmentOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已分析"
              value={statistics.analyzed}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="待分析"
              value={statistics.pending}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均评分"
              value={statistics.avgScore}
              precision={1}
              suffix="分"
              prefix={<BarChartOutlined />}
            />
          </Col>
        </Row>

        {/* 筛选条件 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Select
              placeholder="选择城市"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters({ ...filters, city: value || '' })}
            >
              <Option value="北京市">北京市</Option>
              <Option value="上海市">上海市</Option>
              <Option value="广州市">广州市</Option>
              <Option value="深圳市">深圳市</Option>
              <Option value="大连市">大连市</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters({ ...filters, status: value || '' })}
            >
              <Option value="pending">待分析</Option>
              <Option value="analyzed">已分析</Option>
              <Option value="approved">已批准</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => fetchCandidates(1, pagination.pageSize)}
            >
              搜索
            </Button>
          </Col>
          <Col span={6}>
            <Button
              onClick={() => {
                const pendingIds = candidates
                  .filter(c => c.status === 'pending')
                  .map(c => c.id);
                if (pendingIds.length > 0) {
                  batchAnalyze(pendingIds);
                } else {
                  message.info('没有待分析的铺位');
                }
              }}
            >
              批量分析待分析铺位
            </Button>
          </Col>
        </Row>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={candidates}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
        />

        {/* 分页 */}
        <div style={{ textAlign: 'right', marginTop: '16px' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
            onChange={(page, pageSize) => fetchCandidates(page, pageSize || 20)}
            onShowSizeChange={(current, size) => fetchCandidates(current, size)}
          />
        </div>
      </Card>

      {/* 分析结果模态框 */}
      <Modal
        title={`分析结果 - ${selectedCandidate?.shop_name}`}
        open={analysisModalVisible}
        onCancel={() => setAnalysisModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setAnalysisModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {analysisResult && (
          <div>
            {/* 基本信息 */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>地址：</strong>{analysisResult.location}</div>
                  <div><strong>坐标：</strong>{analysisResult.coordinates.longitude}, {analysisResult.coordinates.latitude}</div>
                </Col>
                <Col span={12}>
                  <div><strong>总分：</strong>
                    <Badge
                      count={analysisResult.scores.overallScore.toFixed(1)}
                      style={{ backgroundColor: analysisResult.scores.overallScore >= 80 ? '#52c41a' : analysisResult.scores.overallScore >= 60 ? '#faad14' : '#ff4d4f' }}
                    />
                  </div>
                  <div><strong>风险等级：</strong>
                    <Tag color={analysisResult.analysis.riskLevel === 'low' ? 'green' : analysisResult.analysis.riskLevel === 'medium' ? 'orange' : 'red'}>
                      {analysisResult.analysis.riskLevel === 'low' ? '低风险' : analysisResult.analysis.riskLevel === 'medium' ? '中风险' : '高风险'}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 评分详情 */}
            <Card size="small" title="评分详情" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div>POI密度: {analysisResult.scores.poiDensity.toFixed(1)}</div>
                  <div>人口密度: {analysisResult.scores.populationDensity.toFixed(1)}</div>
                </Col>
                <Col span={8}>
                  <div>交通便利性: {analysisResult.scores.trafficAccessibility.toFixed(1)}</div>
                  <div>竞争水平: {analysisResult.scores.competitionLevel.toFixed(1)}</div>
                </Col>
                <Col span={8}>
                  <div>租金成本: {analysisResult.scores.rentalCost.toFixed(1)}</div>
                  <div>人流量: {analysisResult.scores.footTraffic.toFixed(1)}</div>
                </Col>
              </Row>
            </Card>

            {/* 分析结果 */}
            <Card size="small" title="分析结果" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div><strong>优势：</strong></div>
                  {analysisResult.analysis.strengths.map((strength, index) => (
                    <div key={index}>• {strength}</div>
                  ))}
                </Col>
                <Col span={8}>
                  <div><strong>劣势：</strong></div>
                  {analysisResult.analysis.weaknesses.map((weakness, index) => (
                    <div key={index}>• {weakness}</div>
                  ))}
                </Col>
                <Col span={8}>
                  <div><strong>建议：</strong></div>
                  {analysisResult.analysis.recommendations.map((recommendation, index) => (
                    <div key={index}>• {recommendation}</div>
                  ))}
                </Col>
              </Row>
            </Card>

            {/* 预测结果 */}
            <Card size="small" title="预测结果" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="预期月收入"
                    value={analysisResult.predictions.expectedRevenue}
                    formatter={(value) => `¥${(Number(value) / 10000).toFixed(1)}万`}
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="置信度"
                    value={analysisResult.predictions.confidence * 100}
                    suffix="%"
                    precision={1}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="回本时间"
                    value={analysisResult.predictions.breakEvenTime}
                    suffix="个月"
                  />
                </Col>
              </Row>
            </Card>

            {/* 周边环境 */}
            <Card size="small" title="周边环境">
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>学校：</strong></div>
                  {Object.entries(analysisResult.data.schools).map(([type, count]) => (
                    <div key={type}>• {type}: {count}个</div>
                  ))}
                </Col>
                <Col span={12}>
                  <div><strong>交通设施：</strong></div>
                  {analysisResult.data.trafficStations.map((station, index) => (
                    <div key={index}>• {station.type}: {station.count}个</div>
                  ))}
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CandidateLocationsPage;
