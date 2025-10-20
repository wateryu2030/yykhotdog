import React, { useEffect, useState } from 'react';
import { Card, Table } from 'antd';
import { getJSON } from '../utils/api';

export default function CityProfiles(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ getJSON('/api/profiles/cities').then((d:any)=> setRows(d.rows||[])); },[]);
  const cols = [
    { title:'城市', dataIndex:'city' },
    { title:'门店数', dataIndex:'stores_cnt' },
    { title:'收入', dataIndex:'revenue' },
    { title:'净利', dataIndex:'net_profit' },
    { title:'毛利率', dataIndex:'gross_margin', render:(v:number)=> (v*100).toFixed(1)+'%' },
    { title:'门店均单量', dataIndex:'avg_orders_per_store' },
  ];
  return (
    <Card title="城市画像">
      <Table dataSource={rows} columns={cols} rowKey="city" />
    </Card>
  );
}
