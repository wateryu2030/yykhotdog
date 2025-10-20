import React,{useState} from 'react';
import { Card, Form, Input, Button, message, Table } from 'antd';
import { getJSON } from '../utils/api';

export default function CompetitorFetch(){
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [form]=Form.useForm();

  const onFetch=async()=>{
    const v=await form.validateFields();
    setLoading(true);
    const res=await fetch(`/api/competitors/fetch?city=${encodeURIComponent(v.city)}&keyword=${encodeURIComponent(v.keyword)}&pages=2`);
    const d=await res.json();
    message.success(`采集完成：${d.count} 条`);
    const list=await getJSON('/api/competitors/list',{city:v.city});
    setRows(list.rows||[]);
    setLoading(false);
  };

  const cols=[
    {title:'城市',dataIndex:'city'},
    {title:'名称',dataIndex:'name'},
    {title:'品牌',dataIndex:'brand'},
    {title:'类型',dataIndex:'type'},
    {title:'地址',dataIndex:'address'},
  ];

  return (
    <Card title="竞争门店采集（高德POI）">
      <Form form={form} layout="inline" style={{marginBottom:12}}>
        <Form.Item name="city" label="城市" rules={[{required:true,message:'请输入城市'}]}><Input placeholder="如 上海" /></Form.Item>
        <Form.Item name="keyword" label="业态关键词" rules={[{required:true,message:'请输入关键词'}]}><Input placeholder="如 热狗、茶饮、简餐" /></Form.Item>
        <Form.Item><Button type="primary" onClick={onFetch} loading={loading}>开始采集</Button></Form.Item>
      </Form>
      <Table dataSource={rows} columns={cols} rowKey={(r)=>r.id} size="small" />
    </Card>
  );
}
