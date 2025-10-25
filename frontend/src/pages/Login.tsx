import React, { useState } from 'react';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 模拟登录请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (values.username === 'admin' && values.password === 'admin123') {
        message.success('登录成功！');
        navigate('/');
      } else {
        message.error('用户名或密码错误！');
      }
    } catch (error) {
      message.error('登录失败，请重试！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-header">
          <ShopOutlined style={{ fontSize: '48px', color: '#fa8c16', marginBottom: '16px' }} />
          <h1>智能热狗管理平台</h1>
          <p>基于阿里云RDS+MaxCompute的智能化热狗管理平台</p>
        </div>
        
        <Card className="login-card">
          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名！' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码！' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="密码" 
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                block
              >
                登录
              </Button>
            </Form.Item>
          </Form>
          
          <div className="login-tips">
            <p>默认账号：admin / admin123</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login; 