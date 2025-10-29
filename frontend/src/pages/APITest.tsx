import React, { useState, useEffect } from 'react';
import { Card, Button, message, Spin } from 'antd';
import axios from 'axios';

const APITest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const testAPI = async () => {
    setLoading(true);
    try {
      // 测试意向铺位API
      const candidatesResponse = await axios.get('/api/site-selection/candidates?page=1&limit=3');
      console.log('Candidates API Response:', candidatesResponse.data);
      
      // 测试统计API
      const statsResponse = await axios.get('/api/site-selection/statistics');
      console.log('Statistics API Response:', statsResponse.data);
      
      setData({
        candidates: candidatesResponse.data,
        statistics: statsResponse.data
      });
      
      message.success('API测试成功！');
    } catch (error: any) {
      console.error('API测试失败:', error);
      message.error(`API测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>API连接测试</h1>
      
      <Card style={{ marginBottom: 24 }}>
        <Button 
          type="primary" 
          onClick={testAPI}
          loading={loading}
        >
          测试API连接
        </Button>
      </Card>

      {loading && (
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <p>正在测试API连接...</p>
          </div>
        </Card>
      )}

      {data && (
        <Card title="API测试结果">
          <h3>意向铺位API:</h3>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
            {JSON.stringify(data.candidates, null, 2)}
          </pre>
          
          <h3>统计API:</h3>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
            {JSON.stringify(data.statistics, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default APITest;
