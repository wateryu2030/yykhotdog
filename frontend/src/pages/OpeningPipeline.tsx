import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, DatePicker } from 'antd';
import { getJSON } from '../utils/api';

export default function OpeningPipeline() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => getJSON('/api/opening/pipeline').then((d:any)=> setRows(d.rows||[]));
  useEffect(()=>{ load(); }, []);

  const add = async () => {
    const v = await form.validateFields();
    await fetch('/api/opening/pipeline', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      candidate_id: Number(v.candidate_id),
      city: v.city || null,
      expected_open_date: v.expected_open_date ? v.expected_open_date.format('YYYY-MM-DD') : null,
      owner: v.owner || null,
      note: v.note || null
    })});
    setOpen(false); form.resetFields(); load();
  };

  const cols = [
    { title:'ID', dataIndex:'id' },
    { title:'候选ID', dataIndex:'candidate_id' },
    { title:'城市', dataIndex:'city' },
    { title:'状态', dataIndex:'status', render:(s:string)=> <Tag color={s==='approved'?'green':s==='opening'?'blue':s==='dead'?'red':'default'}>{s}</Tag> },
    { title:'预计开业', dataIndex:'expected_open_date' },
    { title:'负责人', dataIndex:'owner' },
    { title:'备注', dataIndex:'note' },
  ];

  return (
    <Card title="开店管道">
      <Button type="primary" onClick={()=>setOpen(true)} style={{marginBottom:12}}>新建开店项目</Button>
      <Table rowKey="id" dataSource={rows} columns={cols}/>
      <Modal title="新建开店项目" open={open} onCancel={()=>setOpen(false)} onOk={add}>
        <Form form={form} layout="vertical">
          <Form.Item name="candidate_id" label="候选ID" rules={[{required:true}]}><Input/></Form.Item>
          <Form.Item name="city" label="城市"><Input/></Form.Item>
          <Form.Item name="expected_open_date" label="预计开业"><DatePicker/></Form.Item>
          <Form.Item name="owner" label="负责人"><Input/></Form.Item>
          <Form.Item name="note" label="备注"><Input.TextArea rows={3}/></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
