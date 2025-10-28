// AI功能测试页面

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Alert, Spin, List, Tag } from 'antd';
import { RobotOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

const AITestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runAITests = async () => {
    setLoading(true);
    setTestResults([]);

    const tests = [
      {
        name: 'AI个性化指标测试',
        url: 'http://localhost:3001/api/ai-dashboard/personalized-metrics?userId=test&role=admin',
        description: '测试AI个性化指标生成功能'
      },
      {
        name: 'AI智能洞察测试',
        url: 'http://localhost:3001/api/ai-dashboard/intelligent-insights?timeRange=7',
        description: '测试AI智能洞察分析功能'
      },
      {
        name: 'AI预测预警测试',
        url: 'http://localhost:3001/api/ai-dashboard/predictive-alerts?timeRange=30',
        description: '测试AI预测性预警功能'
      },
      {
        name: 'AI上下文建议测试',
        url: 'http://localhost:3001/api/ai-dashboard/contextual-recommendations?context=morning&currentMetrics={}',
        description: '测试AI上下文建议功能'
      },
      {
        name: '商品画像概览测试',
        url: 'http://localhost:3001/api/product-profile/dashboard',
        description: '测试商品画像概览功能'
      },
      {
        name: '商品分类分析测试',
        url: 'http://localhost:3001/api/product-profile/categories',
        description: '测试商品分类分析功能'
      }
    ];

    const results = [];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const response = await fetch(test.url);
        const data = await response.json();
        const endTime = Date.now();

        results.push({
          name: test.name,
          description: test.description,
          status: data.success ? 'success' : 'error',
          responseTime: endTime - startTime,
          data: data.success ? '数据正常' : data.error || '请求失败',
          details: data.success ? `返回${JSON.stringify(data.data).length}字符数据` : data.error
        });
      } catch (error) {
        results.push({
          name: test.name,
          description: test.description,
          status: 'error',
          responseTime: 0,
          data: '网络错误',
          details: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <WarningOutlined style={{ color: '#f5222d' }} />;
      default:
        return <RobotOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card title="AI功能测试页面" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <p>此页面用于测试AI智能仪表盘和商品画像模块的各项功能是否正常工作。</p>
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={runAITests}
            loading={loading}
            size="large"
          >
            运行AI功能测试
          </Button>
        </div>

        {testResults.length > 0 && (
          <div>
            <h3>测试结果</h3>
            <List
              dataSource={testResults}
              renderItem={(result) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={getStatusIcon(result.status)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {result.name}
                        <Tag color={getStatusColor(result.status)}>
                          {result.status === 'success' ? '成功' : '失败'}
                        </Tag>
                        {result.responseTime > 0 && (
                          <Tag color="blue">{result.responseTime}ms</Tag>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        <p>{result.description}</p>
                        <p style={{ color: '#666', fontSize: '12px' }}>
                          <strong>结果：</strong>{result.data}
                        </p>
                        {result.details && (
                          <p style={{ color: '#999', fontSize: '11px' }}>
                            <strong>详情：</strong>{result.details}
                          </p>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>

      <Card title="功能说明">
        <div style={{ padding: '16px' }}>
          <h4>AI智能仪表盘功能：</h4>
          <ul>
            <li><strong>个性化指标</strong>：基于用户角色生成相关业务指标</li>
            <li><strong>智能洞察</strong>：AI分析业务数据生成深度洞察</li>
            <li><strong>预测预警</strong>：基于历史数据预测未来趋势和风险</li>
            <li><strong>上下文建议</strong>：根据当前情况提供行动建议</li>
          </ul>
          
          <h4>商品画像模块功能：</h4>
          <ul>
            <li><strong>商品概览</strong>：商品基础统计和趋势分析</li>
            <li><strong>商品分类</strong>：按分类分析商品表现</li>
            <li><strong>销售分析</strong>：商品销售排行和趋势</li>
            <li><strong>利润分析</strong>：商品利润和成本分析</li>
            <li><strong>AI洞察</strong>：商品相关的AI建议和预测</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default AITestPage;
