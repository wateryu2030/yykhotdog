import React,{useEffect,useState} from 'react';
import {Card,Row,Col,Statistic} from 'antd';
import {Line} from '@ant-design/plots';
import InsightsPanel from '../components/InsightsPanel';
import ManualNoteCard from '../components/ManualNoteCard';

export default function DashboardHotdog(){
 const [data,setData]=useState([]);const [summary,setSummary]=useState<any>({});
 useEffect(()=>{
  fetch('/api/metrics/dashboard').then(r=>r.json()).then(d=>{setData(d.trend||[]);setSummary(d.summary||{});});
 },[]);
 const chartData=data.map((r:any)=>({date:r.date_key,revenue:r.revenue,profit:r.net_profit}));
 return (
  <div style={{padding:20}}>
   <Row gutter={16}>
    <Col span={6}><Card><Statistic title="总收入" value={summary.total_revenue||0} precision={0}/></Card></Col>
    <Col span={6}><Card><Statistic title="毛利" value={summary.total_gross_profit||0} precision={0}/></Card></Col>
    <Col span={6}><Card><Statistic title="净利" value={summary.total_net_profit||0} precision={0}/></Card></Col>
    <Col span={6}><Card><Statistic title="毛利率" value={((summary.avg_gross_margin||0)*100).toFixed(1)} suffix="%"/></Card></Col>
   </Row>
   <Row gutter={16} style={{marginTop:20}}>
    <Col span={16}>
      <Card title="收入/利润趋势">
        <Line data={chartData} xField="date" yField="revenue" smooth />
      </Card>
    </Col>
    <Col span={8}>
      <InsightsPanel defaultScope="city" />
      <div style={{marginTop:12}}>
        <ManualNoteCard module="dashboard" refId={1} operator="manager"/>
      </div>
    </Col>
   </Row>
  </div>
 );
}
