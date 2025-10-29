import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Progress,
  Table,
  Tag,
  Space,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Alert,
  Checkbox,
  Input,
  Select
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

interface BatchAnalysisResult {
  id: number;
  success: boolean;
  candidate?: any;
  analysis?: any;
  error?: string;
}

interface BatchAnalysisSummary {
  total: number;
  success: number;
  failed: number;
  successRate: string;
}

const BatchAnalysisPage: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<BatchAnalysisResult[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<BatchAnalysisSummary | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 获取意向铺位列表
  const fetchCandidates = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100', // 获取更多数据用于批量分析
        ...(filterStatus && { status: filterStatus })
      });

      const response = await axios.get(`/api/site-selection/candidates?${params}`);
      
      if (response.data.success) {
        let filteredCandidates = response.data.data.records;
        
        // 搜索过滤
        if (searchKeyword) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            candidate.shop_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            candidate.shop_address.toLowerCase().includes(searchKeyword.toLowerCase())
          );
        }
        
        setCandidates(filteredCandidates);
      } else {
        message.error('获取意向铺位列表失败');
      }
    } catch (error) {
      console.error('获取意向铺位列表失败:', error);
      message.error('获取意向铺位列表失败');
    }
  };

  // 批量分析
  const startBatchAnalysis = async () => {
    if (selectedCandidates.length === 0) {
      message.warning('请选择要分析的意向铺位');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisResults([]);
    setAnalysisSummary(null);

    try {
      const response = await axios.post('/api/site-selection/candidates/batch-analyze', {
        candidateIds: selectedCandidates,
        includeMLPrediction: true
      });

      if (response.data.success) {
        setAnalysisResults(response.data.data.results);
        setAnalysisSummary(response.data.data.summary);
        setShowResults(true);
        message.success(`批量分析完成: 成功 ${response.data.data.summary.success} 个，失败 ${response.data.data.summary.failed} 个`);
        
        // 刷新候选列表
        fetchCandidates();
      } else {
        message.error('批量分析失败');
      }
    } catch (error) {
      console.error('批量分析失败:', error);
      message.error('批量分析失败');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(100);
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = candidates
        .filter(c => c.status === 'pending')
        .map(c => parseInt(c.id));
      setSelectedCandidates(pendingIds);
    } else {
      setSelectedCandidates([]);
    }
  };

  // 选择单个候选
  const handleSelectCandidate = (candidateId: number, checked: boolean) => {
    if (checked) {
      setSelectedCandidates([...selectedCandidates, candidateId]);
    } else {
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId));
    }
  };

  // 导出分析结果
  const exportResults = () => {
    if (!analysisResults.length) {
      message.warning('没有分析结果可导出');
      return;
    }

    const csvContent = [
      ['ID', '店铺名称', '地址', '状态', '分析评分', '预测收入', '置信度', '风险等级', '分析结果'],
      ...analysisResults.map(result => [
        result.id,
        result.candidate?.shop_name || '',
        result.candidate?.shop_address || '',
        result.success ? '成功' : '失败',
        result.analysis?.scores?.overallScore?.toFixed(1) || '',
        result.analysis?.predictions?.expectedRevenue || '',
        result.analysis?.predictions?.confidence?.toFixed(2) || '',
        result.analysis?.analysis?.riskLevel || '',
        result.success ? '分析完成' : result.error || '分析失败'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `批量分析结果_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchCandidates();
  }, [filterStatus]);

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedCandidates.length > 0 && selectedCandidates.length === candidates.filter(c => c.status === 'pending').length}
          indeterminate={selectedCandidates.length > 0 && selectedCandidates.length < candidates.filter(c => c.status === 'pending').length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          选择
        </Checkbox>
      ),
      key: 'select',
      width: 80,
      render: (record: any) => (
        <Checkbox
          checked={selectedCandidates.includes(parseInt(record.id))}
          disabled={record.status !== 'pending'}
          onChange={(e) => handleSelectCandidate(parseInt(record.id), e.target.checked)}
        />
      )
    },
    {
      title: '店铺名称',
      dataIndex: 'shop_name',
      key: 'shop_name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.shop_address}</div>
        </div>
      )
    },
    {
      title: '位置',
      key: 'location',
      render: (record: any) => (
        <div>
          <div>{record.city}</div>
          <div>{record.district}</div>
        </div>
      )
    },
    {
      title: '租金',
      dataIndex: 'rent_amount',
      key: 'rent_amount',
      render: (amount: number) => amount ? `¥${amount}` : '未设置'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
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
      render: (score: number) => {
        if (!score) return <span style={{ color: '#999' }}>未分析</span>;
        return (
          <div style={{ color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f' }}>
            {score.toFixed(1)}
          </div>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="批量选址分析" style={{ marginBottom: '24px' }}>
        {/* 筛选和搜索 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Option value="">全部</Option>
              <Option value="pending">待分析</Option>
              <Option value="analyzed">已分析</Option>
              <Option value="approved">已批准</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Input
              placeholder="搜索店铺名称或地址"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={fetchCandidates}
            />
          </Col>
          <Col span={6}>
            <Button type="primary" onClick={fetchCandidates}>
              刷新
            </Button>
          </Col>
          <Col span={6}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={isAnalyzing}
              onClick={startBatchAnalysis}
              disabled={selectedCandidates.length === 0}
            >
              开始批量分析 ({selectedCandidates.length})
            </Button>
          </Col>
        </Row>

        {/* 进度条 */}
        {isAnalyzing && (
          <div style={{ marginBottom: '16px' }}>
            <Progress
              percent={analysisProgress}
              status={analysisProgress === 100 ? 'success' : 'active'}
              format={() => `分析进度: ${analysisProgress}%`}
            />
          </div>
        )}

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Statistic
              title="总铺位数"
              value={candidates.length}
              prefix={<BarChartOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="待分析"
              value={candidates.filter(c => c.status === 'pending').length}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已分析"
              value={candidates.filter(c => c.status === 'analyzed').length}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已选择"
              value={selectedCandidates.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={candidates}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 分析结果模态框 */}
      <Modal
        title="批量分析结果"
        visible={showResults}
        onCancel={() => setShowResults(false)}
        width={1000}
        footer={[
          <Button key="export" icon={<DownloadOutlined />} onClick={exportResults}>
            导出结果
          </Button>,
          <Button key="close" onClick={() => setShowResults(false)}>
            关闭
          </Button>
        ]}
      >
        {analysisSummary && (
          <div>
            {/* 分析摘要 */}
            <Alert
              message={`批量分析完成: 成功 ${analysisSummary.success} 个，失败 ${analysisSummary.failed} 个，成功率 ${analysisSummary.successRate}%`}
              type={analysisSummary.successRate === '100.0' ? 'success' : 'warning'}
              style={{ marginBottom: '16px' }}
            />

            {/* 统计信息 */}
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Statistic
                  title="总数"
                  value={analysisSummary.total}
                  prefix={<BarChartOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="成功"
                  value={analysisSummary.success}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="失败"
                  value={analysisSummary.failed}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="成功率"
                  value={analysisSummary.successRate}
                  suffix="%"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>

            {/* 详细结果 */}
            <Table
              columns={[
                {
                  title: 'ID',
                  dataIndex: 'id',
                  key: 'id',
                  width: 80
                },
                {
                  title: '店铺名称',
                  dataIndex: ['candidate', 'shop_name'],
                  key: 'shop_name'
                },
                {
                  title: '地址',
                  dataIndex: ['candidate', 'shop_address'],
                  key: 'address'
                },
                {
                  title: '状态',
                  key: 'status',
                  render: (record: BatchAnalysisResult) => (
                    <Tag color={record.success ? 'green' : 'red'}>
                      {record.success ? '成功' : '失败'}
                    </Tag>
                  )
                },
                {
                  title: '分析评分',
                  dataIndex: ['analysis', 'scores', 'overallScore'],
                  key: 'score',
                  render: (score: number) => score ? score.toFixed(1) : '-'
                },
                {
                  title: '预测收入',
                  dataIndex: ['analysis', 'predictions', 'expectedRevenue'],
                  key: 'revenue',
                  render: (revenue: number) => revenue ? `¥${(revenue / 10000).toFixed(1)}万` : '-'
                },
                {
                  title: '风险等级',
                  dataIndex: ['analysis', 'analysis', 'riskLevel'],
                  key: 'risk',
                  render: (risk: string) => {
                    if (!risk) return '-';
                    const color = risk === 'low' ? 'green' : risk === 'medium' ? 'orange' : 'red';
                    return <Tag color={color}>{risk === 'low' ? '低风险' : risk === 'medium' ? '中风险' : '高风险'}</Tag>;
                  }
                },
                {
                  title: '错误信息',
                  dataIndex: 'error',
                  key: 'error',
                  render: (error: string) => error || '-'
                }
              ]}
              dataSource={analysisResults}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BatchAnalysisPage;
