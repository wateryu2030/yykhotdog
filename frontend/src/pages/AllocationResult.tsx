import React, { useEffect, useState } from 'react';
import { Card, Table } from 'antd';
import { getJSON } from '../utils/api';

export default function AllocationResult(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ getJSON('/api/allocation/result').then((d:any)=> setRows(d.rows||[])); },[]);
  const cols = [
    { title:'城市', dataIndex:'city' },
    { title:'门店ID', dataIndex:'store_id' },
    { title:'城市营收', dataIndex:'city_revenue' },
    { title:'门店营收', dataIndex:'store_revenue' },
    { title:'分配权重', dataIndex:'weight_in_city', render:(v:number)=> (v*100).toFixed(1)+'%' },
    { title:'基础期间费', dataIndex:'base_operating_exp' },
    { title:'分配后费用', dataIndex:'allocated_expense' },
  ];
  return (
    <Card title="费用分配结果（示例规则）">
      <Table dataSource={rows} columns={cols} rowKey={(r)=>r.city+'_'+r.store_id}/>
    </Card>
  );
}
