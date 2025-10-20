import React, { useEffect, useState } from 'react';
import { Card, Radio, DatePicker, Space, Button, Table, Row, Col } from 'antd';
import { getJSON } from '../utils/api';
import { Bar, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;

export default function SalesCompare(){
  const [level, setLevel] = useState<'city'|'store'>('city');
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<any>([dayjs().add(-30,'day'), dayjs()]);
  const load = () => {
    const [a,b] = range||[];
    getJSON('/api/sales/compare', {
      level,
      from: a? a.format('YYYYMMDD'): undefined,
      to: b? b.format('YYYYMMDD'): undefined
    }).then((d:any)=> setRows(d.rows||[]));
  };
  useEffect(()=>{ load(); }, [level]);
  const cols = [
    { title: level==='city'?'城市':'门店', dataIndex:'dim' },
    { title:'收入', dataIndex:'revenue', render:(v:number)=>v?.toFixed(2) },
    { title:'净利', dataIndex:'net_profit', render:(v:number)=>v?.toFixed(2) },
    { title:'毛利率', dataIndex:'gross_margin', render:(v:number)=> (v*100).toFixed(1)+'%' },
  ];
  
  // 准备图表数据
  const chartData = rows.slice(0, 10).map(r => ({
    name: r.dim,
    revenue: r.revenue || 0,
    profit: r.net_profit || 0,
    margin: (r.gross_margin || 0) * 100
  }));
  
  return (
    <div>
      <Card title="销售对比分析">
        <Space style={{marginBottom:12}}>
          <Radio.Group value={level} onChange={(e)=>setLevel(e.target.value)}>
            <Radio.Button value="city">按城市</Radio.Button>
            <Radio.Button value="store">按门店</Radio.Button>
          </Radio.Group>
          <RangePicker value={range} onChange={setRange}/>
          <Button type="primary" onClick={load}>查询</Button>
        </Space>
        
        {/* 图表区域 */}
        <Row gutter={16} style={{marginBottom:20}}>
          <Col span={12}>
            <Card title={`${level==='city'?'城市':'门店'}收入排行`} size="small">
              <Bar 
                data={chartData} 
                xField="name" 
                yField="revenue"
                height={300}
                label={{
                  position: 'middle',
                  style: { fill: '#FFFFFF' }
                }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="毛利率分布" size="small">
              <Pie 
                data={chartData.map(r => ({ type: r.name, value: r.margin }))} 
                angleField="value"
                colorField="type"
                height={300}
                label={{
                  type: 'outer',
                  content: '{name}: {percentage}'
                }}
              />
            </Card>
          </Col>
        </Row>
        
        <Table dataSource={rows} columns={cols} rowKey={(r)=>r.dim}/>
      </Card>
    </div>
  );
}
