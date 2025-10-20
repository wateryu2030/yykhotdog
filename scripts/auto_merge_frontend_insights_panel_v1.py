import os, textwrap, shutil, datetime
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))

def ensure_dir(p): os.makedirs(os.path.dirname(p),exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p,f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES={}

# ---------- 1️⃣ InsightsPanel 组件 ----------
FILES["frontend/src/components/InsightsPanel.tsx"]=r"""
import React,{useEffect,useState} from 'react';
import { Card, Select, Tag, List, Space, Typography } from 'antd';
import { getJSON } from '../utils/api';

const { Option } = Select;

export default function InsightsPanel({defaultScope='city'}:{
  defaultScope?:'city'|'store';
}){
  const [scope,setScope]=useState<'city'|'store'>(defaultScope);
  const [data,setData]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const load=async()=>{
    setLoading(true);
    const res=await getJSON('/api/insights/suggestions',{scope});
    setData(res.suggestions||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[scope]);

  return (
    <Card
      title={<Space><span>AI 经营建议</span>
      <Select value={scope} onChange={setScope} size="small">
        <Option value="city">按城市</Option>
        <Option value="store">按门店</Option>
      </Select></Space>}
      loading={loading}
      style={{width:'100%',height:'100%',overflowY:'auto'}}
    >
      <List
        dataSource={data}
        renderItem={(item:any)=>(
          <List.Item style={{flexDirection:'column',alignItems:'flex-start'}}>
            <Typography.Text strong>{item.dimension}</Typography.Text>
            <div style={{margin:'4px 0'}}>
              <Tag color="blue">收入 ¥{item.revenue?.toFixed(0)}</Tag>
              <Tag color={item.gross_margin>0.5?'green':'orange'}>毛利率 {(item.gross_margin*100).toFixed(1)}%</Tag>
              <Tag color={item.net_profit>=0?'blue':'red'}>净利 ¥{item.net_profit?.toFixed(0)}</Tag>
            </div>
            {item.advice?.length>0 ?
              item.advice.map((a:string,i:number)=>(
                <Typography.Paragraph key={i} style={{marginBottom:0,fontSize:13}}>
                  {a}
                </Typography.Paragraph>
              ))
              : <Typography.Text type="secondary" style={{fontSize:12}}>暂无建议，运营表现良好。</Typography.Text>}
          </List.Item>
        )}
      />
    </Card>
  );
}
"""

# ---------- 2️⃣ 独立 Insights 页面 ----------
FILES["frontend/src/pages/InsightsPage.tsx"]=r"""
import React from 'react';
import { Row, Col } from 'antd';
import InsightsPanel from '../components/InsightsPanel';

export default function InsightsPage(){
  return (
    <div style={{padding:20}}>
      <Row gutter={16}>
        <Col span={12}>
          <InsightsPanel defaultScope="city" />
        </Col>
        <Col span={12}>
          <InsightsPanel defaultScope="store" />
        </Col>
      </Row>
    </div>
  );
}
"""

# ---------- 3️⃣ 修改 DashboardHotdog.tsx ----------
FILES["frontend/src/pages/DashboardHotdog.tsx"]=r"""
import React,{useEffect,useState} from 'react';
import {Card,Row,Col,Statistic,Table} from 'antd';
import {Line} from '@ant-design/plots';
import InsightsPanel from '../components/InsightsPanel';

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
    </Col>
   </Row>
  </div>
 );
}
"""

# ---------- 4️⃣ 更新 App.tsx 路由 ----------
FILES["frontend/src/App.tsx"]=r"""
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardHotdog from './pages/DashboardHotdog';
import InsightsPage from './pages/InsightsPage';

export default function App(){
  const navStyle: React.CSSProperties = { padding:10, display:'flex', gap:12, flexWrap:'wrap' };
  return (
    <Router>
      <div style={navStyle}>
        <Link to="/">🏠首页</Link>
        <Link to="/dashboard">驾驶舱</Link>
        <Link to="/insights">AI建议</Link>
      </div>
      <Routes>
        <Route path="/" element={<div style={{padding:20}}>欢迎使用热狗智能运营系统</div>} />
        <Route path="/dashboard" element={<DashboardHotdog/>} />
        <Route path="/insights" element={<InsightsPage/>} />
      </Routes>
    </Router>
  );
}
"""

def write(rel, content):
    path=os.path.join(BASE, rel)
    ensure_dir(path); backup(path)
    with open(path,"w",encoding="utf-8") as f:f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel, content in FILES.items():
        write(rel, content)
    print("\n🎯 前端 AI 建议面板已生成！")
    print("➡ 启动开发环境: docker-compose -f docker-compose.dev.yml up")
    print("➡ 访问: http://localhost:3000/dashboard （右侧为城市级建议）")
    print("➡ 或访问独立页: http://localhost:3000/insights 查看城市+门店建议对比")
    print("🚀 如果要添加自定义规则，只需修改 backend/src/modules/insights/insights.controller.ts 即可。")

if __name__=="__main__":
    main()
