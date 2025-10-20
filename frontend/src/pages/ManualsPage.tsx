import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Input, Button, Row, Col, message, DatePicker } from 'antd';
import { getJSON } from '../utils/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function ManualsPage(){
  const [rows,setRows]=useState<any[]>([]);
  const [module,setModule]=useState<string|undefined>();
  const [operator,setOperator]=useState<string|undefined>();
  const [keyword,setKeyword]=useState<string>('');
  const [range,setRange]=useState<any>([dayjs().add(-7,'day'), dayjs()]); // 默认近7天

  const load=()=>{
    const [start,end] = range || [];
    getJSON('/api/manual/list',{
      module,operator,
      from: start? start.format('YYYYMMDD'):undefined,
      to: end? end.format('YYYYMMDD'):undefined
    }).then((d:any)=>{
      let data = d.rows || [];
      if(keyword) data = data.filter((r:any)=>r.note?.includes(keyword));
      setRows(data);
    });
  };
  useEffect(()=>{ load(); },[module,operator,range]);

  const exportCSV=()=>{
    const headers=['模块','关联ID','操作者','评分','备注','创建时间'];
    const csv=[headers.join(',')].concat(rows.map(r=>[
      r.module,r.ref_id,r.operator,r.score_manual||'',r.note?.replace(/,/g,' '),r.created_at
    ].join(',')));
    const blob=new Blob([csv.join('\n')],{type:'text/csv'});
    const url=window.URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='manual_overrides.csv';a.click();
    window.URL.revokeObjectURL(url);
    message.success('CSV 已导出');
  };

  const cols=[
    {title:'模块',dataIndex:'module'},
    {title:'关联ID',dataIndex:'ref_id'},
    {title:'操作者',dataIndex:'operator'},
    {title:'评分',dataIndex:'score_manual'},
    {title:'备注',dataIndex:'note',ellipsis:true},
    {title:'创建时间',dataIndex:'created_at'},
  ];

  return (
    <div style={{padding:20}}>
      <Card title="人工备注与评分管理">
        <Row gutter={12} style={{marginBottom:12}}>
          <Col><Select value={module} onChange={setModule} placeholder="模块筛选" allowClear style={{width:150}}>
            <Option value="dashboard">经营驾驶舱</Option>
            <Option value="site">选址</Option>
            <Option value="other">其他</Option>
          </Select></Col>
          <Col><Input value={operator} onChange={e=>setOperator(e.target.value)} placeholder="操作者" style={{width:150}}/></Col>
          <Col><Input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="关键字" style={{width:200}}/></Col>
          <Col><RangePicker value={range} onChange={setRange} /></Col>
          <Col><Button type="primary" onClick={load}>查询</Button></Col>
          <Col><Button onClick={exportCSV}>导出CSV</Button></Col>
        </Row>
        <Table dataSource={rows} columns={cols} rowKey={(r)=>r.id||r.created_at} pagination={{pageSize:20}}/>
      </Card>
    </div>
  );
}
