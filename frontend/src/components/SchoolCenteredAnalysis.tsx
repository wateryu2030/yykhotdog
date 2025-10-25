import React from 'react';
import { Card, Table, Tag, Progress } from 'antd';
import { SchoolAnalysisResult } from '../types/schoolAnalysis';

interface SchoolCenteredAnalysisProps {
  analysisResults: SchoolAnalysisResult[];
}

const SchoolCenteredAnalysis: React.FC<SchoolCenteredAnalysisProps> = ({ analysisResults }) => {
  const columns = [
    {
      title: '学校名称',
      dataIndex: 'schoolName',
      key: 'schoolName',
    },
    {
      title: '学生数量',
      dataIndex: 'studentCount',
      key: 'studentCount',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: '潜在客户',
      dataIndex: 'potentialCustomers',
      key: 'potentialCustomers',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: '市场份额',
      dataIndex: 'marketShare',
      key: 'marketShare',
      render: (share: number) => (
        <Progress 
          percent={Math.round(share * 100)} 
          size="small" 
          status={share > 0.1 ? 'active' : 'normal'}
        />
      ),
    },
    {
      title: '建议',
      dataIndex: 'recommendation',
      key: 'recommendation',
      render: (text: string) => (
        <Tag color={text.includes('建议') ? 'green' : 'orange'}>
          {text}
        </Tag>
      ),
    },
  ];

  return (
    <Card title="学校中心分析结果" style={{ marginTop: 16 }}>
      <Table
        columns={columns}
        dataSource={analysisResults}
        rowKey="schoolId"
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );
};

export default SchoolCenteredAnalysis;
