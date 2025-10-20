import React, { useEffect, useState } from 'react';
import { Card, Table, DatePicker, Space, Button, Row, Col, Statistic } from 'antd';
import { getJSON } from '../utils/api';
import { Line, Column } from '@ant-design/plots';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;

export default function OperationsKPI(){
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<any>([dayjs().add(-30,'day'), dayjs()]);
  const [summary, setSummary] = useState<any>({});
  
  const query = () => {
    const [a,b] = range||[];
    getJSON('/api/operations/stores/kpi', {
      from: a? a.format('YYYYMMDD'): undefined,
      to: b? b.format('YYYYMMDD'): undefined
    }).then((d:any)=> {
      setRows(d.rows||[]);
      // 计算汇总数据
      const data = d.rows||[];
      const totalRevenue = data.reduce((sum:number, r:any) => sum + (r.revenue || 0), 0);
      const totalOrders = data.reduce((sum:number, r:any) => sum + (r.orders_cnt || 0), 0);
      const totalProfit = data.reduce((sum:number, r:any) => sum + (r.net_profit || 0), 0);
      setSummary({ totalRevenue, totalOrders, totalProfit });
    });
  };
  
  useEffect(()=>{ query(); }, []);
  
  // 准备图表数据
  const chartData = rows.map(r => ({
    date: r.date_key,
    revenue: r.revenue || 0,
    profit: r.net_profit || 0,
    orders: r.orders_cnt || 0
  })).sort((a, b) => a.date - b.date);
  
  const cols = [
    { title:'门店', dataIndex:'store_name' },
    { title:'日期', dataIndex:'date_key' },
    { title:'订单数', dataIndex:'orders_cnt' },
    { title:'销量', dataIndex:'items_qty' },
    { title:'收入', dataIndex:'revenue', render:(v:number)=>v?.toFixed(2) },
    { title:'毛利', dataIndex:'gross_profit', render:(v:number)=>v?.toFixed(2) },
    { title:'净利', dataIndex:'net_profit', render:(v:number)=>v?.toFixed(2) },
  ];
  
  return (
    <div>
      <Card title="运营KPI（门店-日）">
        <Space style={{marginBottom:12}}>
          <RangePicker value={range} onChange={setRange}/>
          <Button type="primary" onClick={query}>查询</Button>
        </Space>
        
        {/* 汇总卡片 */}
        <Row gutter={16} style={{marginBottom:20}}>
          <Col span={8}>
            <Card>
              <Statistic title="总营收" value={summary.totalRevenue} precision={2} prefix="¥" />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="总订单" value={summary.totalOrders} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="总净利" value={summary.totalProfit} precision={2} prefix="¥" />
            </Card>
          </Col>
        </Row>
        
        {/* 趋势图表 */}
        <Row gutter={16} style={{marginBottom:20}}>
          <Col span={12}>
            <Card title="营收趋势" size="small">
              <Line 
                data={chartData} 
                xField="date" 
                yField="revenue"
                smooth
                height={300}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="订单趋势" size="small">
              <Column 
                data={chartData} 
                xField="date" 
                yField="orders"
                height={300}
              />
            </Card>
          </Col>
        </Row>
        
        <Table dataSource={rows} columns={cols} rowKey={(r)=>r.store_name+'_'+r.date_key} pagination={{pageSize:50}}/>
      </Card>
    </div>
  );
}
