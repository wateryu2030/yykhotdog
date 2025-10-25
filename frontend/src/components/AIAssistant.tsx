import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  message,
  Spin,
  Typography,
  Space,
  Divider,
  Tabs,
  Form,
  Row,
  Col,
  Upload,
  Modal
} from 'antd';
import {
  RobotOutlined,
  CodeOutlined,
  BarChartOutlined,
  FileTextOutlined,
  BugOutlined,
  ThunderboltOutlined,
  SendOutlined,
  UploadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface AIAssistantProps {
  onResult?: (result: any) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onResult }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form] = Form.useForm();

  // 创建axios实例
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
  });

  // 代码审查
  const handleCodeReview = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/code-review', {
        code: values.code,
        language: values.language || 'typescript'
      });
      
      if (response.data.success) {
        setResult({
          type: 'code-review',
          data: response.data.review,
          usage: response.data.usage
        });
        message.success('代码审查完成');
      } else {
        message.error(response.data.error || '代码审查失败');
      }
    } catch (error) {
      console.error('代码审查失败:', error);
      message.error('代码审查失败');
    } finally {
      setLoading(false);
    }
  };

  // 数据分析
  const handleDataAnalysis = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/analyze-data', {
        data: JSON.parse(values.data),
        analysisType: values.analysisType || 'business'
      });
      
      if (response.data.success) {
        setResult({
          type: 'data-analysis',
          data: response.data.analysis,
          usage: response.data.usage
        });
        message.success('数据分析完成');
      } else {
        message.error(response.data.error || '数据分析失败');
      }
    } catch (error) {
      console.error('数据分析失败:', error);
      message.error('数据分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成报告
  const handleGenerateReport = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/generate-report', {
        data: JSON.parse(values.data),
        reportType: values.reportType || 'business'
      });
      
      if (response.data.success) {
        setResult({
          type: 'report',
          data: response.data.report,
          usage: response.data.usage
        });
        message.success('报告生成完成');
      } else {
        message.error(response.data.error || '报告生成失败');
      }
    } catch (error) {
      console.error('报告生成失败:', error);
      message.error('报告生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 错误诊断
  const handleErrorDiagnosis = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/diagnose-error', {
        error: values.error,
        context: values.context
      });
      
      if (response.data.success) {
        setResult({
          type: 'error-diagnosis',
          data: response.data.diagnosis,
          usage: response.data.usage
        });
        message.success('错误诊断完成');
      } else {
        message.error(response.data.error || '错误诊断失败');
      }
    } catch (error) {
      console.error('错误诊断失败:', error);
      message.error('错误诊断失败');
    } finally {
      setLoading(false);
    }
  };

  // 性能优化
  const handlePerformanceOptimization = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/optimize-performance', {
        code: values.code,
        metrics: values.metrics ? JSON.parse(values.metrics) : {}
      });
      
      if (response.data.success) {
        setResult({
          type: 'performance',
          data: response.data.optimization,
          usage: response.data.usage
        });
        message.success('性能优化建议生成完成');
      } else {
        message.error(response.data.error || '性能优化失败');
      }
    } catch (error) {
      console.error('性能优化失败:', error);
      message.error('性能优化失败');
    } finally {
      setLoading(false);
    }
  };

  // 代码生成
  const handleCodeGeneration = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/generate-code', {
        description: values.description,
        language: values.language || 'typescript',
        requirements: values.requirements
      });
      
      if (response.data.success) {
        setResult({
          type: 'code-generation',
          data: response.data.code,
          usage: response.data.usage
        });
        message.success('代码生成完成');
      } else {
        message.error(response.data.error || '代码生成失败');
      }
    } catch (error) {
      console.error('代码生成失败:', error);
      message.error('代码生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 文档生成
  const handleDocumentationGeneration = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/ai-assistant/generate-docs', {
        code: values.code,
        docType: values.docType || 'API'
      });
      
      if (response.data.success) {
        setResult({
          type: 'documentation',
          data: response.data.documentation,
          usage: response.data.usage
        });
        message.success('文档生成完成');
      } else {
        message.error(response.data.error || '文档生成失败');
      }
    } catch (error) {
      console.error('文档生成失败:', error);
      message.error('文档生成失败');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <Card title="AI分析结果" style={{ marginTop: 16 }}>
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {result.data}
        </div>
        {result.usage && (
          <div style={{ marginTop: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
            <Text type="secondary">
              使用情况: {result.usage.total_tokens} tokens
            </Text>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <RobotOutlined /> AI开发助手
      </Title>
      
      <Tabs defaultActiveKey="code-review">
        <TabPane tab={<span><CodeOutlined />代码审查</span>} key="code-review">
          <Card>
            <Form form={form} onFinish={handleCodeReview} layout="vertical">
              <Form.Item
                name="language"
                label="编程语言"
                initialValue="typescript"
              >
                <Select>
                  <Option value="typescript">TypeScript</Option>
                  <Option value="javascript">JavaScript</Option>
                  <Option value="python">Python</Option>
                  <Option value="java">Java</Option>
                  <Option value="csharp">C#</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="code"
                label="代码内容"
                rules={[{ required: true, message: '请输入代码' }]}
              >
                <TextArea rows={10} placeholder="请输入要审查的代码..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />}>
                  开始审查
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined />数据分析</span>} key="data-analysis">
          <Card>
            <Form form={form} onFinish={handleDataAnalysis} layout="vertical">
              <Form.Item
                name="analysisType"
                label="分析类型"
                initialValue="business"
              >
                <Select>
                  <Option value="business">业务分析</Option>
                  <Option value="technical">技术分析</Option>
                  <Option value="performance">性能分析</Option>
                  <Option value="user">用户分析</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="data"
                label="数据内容 (JSON格式)"
                rules={[{ required: true, message: '请输入数据' }]}
              >
                <TextArea rows={8} placeholder="请输入JSON格式的数据..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<BarChartOutlined />}>
                  开始分析
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><FileTextOutlined />报告生成</span>} key="report">
          <Card>
            <Form form={form} onFinish={handleGenerateReport} layout="vertical">
              <Form.Item
                name="reportType"
                label="报告类型"
                initialValue="business"
              >
                <Select>
                  <Option value="business">业务报告</Option>
                  <Option value="technical">技术报告</Option>
                  <Option value="performance">性能报告</Option>
                  <Option value="summary">总结报告</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="data"
                label="数据内容 (JSON格式)"
                rules={[{ required: true, message: '请输入数据' }]}
              >
                <TextArea rows={8} placeholder="请输入JSON格式的数据..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<FileTextOutlined />}>
                  生成报告
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><BugOutlined />错误诊断</span>} key="error-diagnosis">
          <Card>
            <Form form={form} onFinish={handleErrorDiagnosis} layout="vertical">
              <Form.Item
                name="error"
                label="错误信息"
                rules={[{ required: true, message: '请输入错误信息' }]}
              >
                <TextArea rows={4} placeholder="请输入错误信息..." />
              </Form.Item>
              <Form.Item
                name="context"
                label="上下文信息"
              >
                <TextArea rows={4} placeholder="请输入相关的上下文信息..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<BugOutlined />}>
                  诊断错误
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><ThunderboltOutlined />性能优化</span>} key="performance">
          <Card>
            <Form form={form} onFinish={handlePerformanceOptimization} layout="vertical">
              <Form.Item
                name="code"
                label="代码内容"
                rules={[{ required: true, message: '请输入代码' }]}
              >
                <TextArea rows={8} placeholder="请输入要优化的代码..." />
              </Form.Item>
              <Form.Item
                name="metrics"
                label="性能指标 (JSON格式，可选)"
              >
                <TextArea rows={4} placeholder="请输入性能指标数据..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<ThunderboltOutlined />}>
                  优化建议
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><CodeOutlined />代码生成</span>} key="code-generation">
          <Card>
            <Form form={form} onFinish={handleCodeGeneration} layout="vertical">
              <Form.Item
                name="language"
                label="编程语言"
                initialValue="typescript"
              >
                <Select>
                  <Option value="typescript">TypeScript</Option>
                  <Option value="javascript">JavaScript</Option>
                  <Option value="python">Python</Option>
                  <Option value="java">Java</Option>
                  <Option value="csharp">C#</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="description"
                label="功能描述"
                rules={[{ required: true, message: '请输入功能描述' }]}
              >
                <TextArea rows={4} placeholder="请描述要生成的功能..." />
              </Form.Item>
              <Form.Item
                name="requirements"
                label="技术要求"
              >
                <TextArea rows={3} placeholder="请输入特殊的技术要求..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<CodeOutlined />}>
                  生成代码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><FileTextOutlined />文档生成</span>} key="documentation">
          <Card>
            <Form form={form} onFinish={handleDocumentationGeneration} layout="vertical">
              <Form.Item
                name="docType"
                label="文档类型"
                initialValue="API"
              >
                <Select>
                  <Option value="API">API文档</Option>
                  <Option value="README">README文档</Option>
                  <Option value="Tutorial">教程文档</Option>
                  <Option value="Reference">参考文档</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="code"
                label="代码内容"
                rules={[{ required: true, message: '请输入代码' }]}
              >
                <TextArea rows={8} placeholder="请输入要生成文档的代码..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<FileTextOutlined />}>
                  生成文档
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      {renderResult()}
    </div>
  );
};

export default AIAssistant;
