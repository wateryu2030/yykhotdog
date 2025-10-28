// 设置管理组件
import React, { useState } from 'react';
import { Card, Form, Input, Button, Switch, Select, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const SettingsManagement: React.FC = () => {
  const [form] = Form.useForm();

  const handleSave = (values: any) => {
    console.log('保存设置:', values);
    message.success('设置保存成功！');
  };

  return (
    <div>
      <Card title="商品画像设置" size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            autoRefresh: true,
            refreshInterval: 30,
            defaultTimeRange: '30',
            chartTheme: 'default'
          }}
        >
          <Form.Item label="自动刷新" name="autoRefresh" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item label="刷新间隔（分钟）" name="refreshInterval">
            <Select>
              <Select.Option value={15}>15分钟</Select.Option>
              <Select.Option value={30}>30分钟</Select.Option>
              <Select.Option value={60}>1小时</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="默认时间范围" name="defaultTimeRange">
            <Select>
              <Select.Option value="7">最近7天</Select.Option>
              <Select.Option value="30">最近30天</Select.Option>
              <Select.Option value="90">最近90天</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="图表主题" name="chartTheme">
            <Select>
              <Select.Option value="default">默认主题</Select.Option>
              <Select.Option value="dark">深色主题</Select.Option>
              <Select.Option value="light">浅色主题</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SettingOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsManagement;
