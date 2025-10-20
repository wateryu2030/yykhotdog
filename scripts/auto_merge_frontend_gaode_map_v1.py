import os, textwrap, shutil, datetime
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))

def ensure_dir(p): os.makedirs(os.path.dirname(p),exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p,f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES={}

# ---------- 1️⃣ 地图右侧信息卡 ----------
FILES["frontend/src/components/SiteInfoCard.tsx"]=r"""
import React from 'react';
import { Card, Progress, Typography, Tag, Input, Button } from 'antd';
const { Paragraph } = Typography;

export default function SiteInfoCard({site,onOverride}:{site:any,onOverride?:(note:string)=>void}){
  if(!site) return <Card title="选址信息">点击地图上的候选点查看详情</Card>;
  const {candidate_id,city,match_score,cannibal_score,total_score,gross_margin,revenue,note}=site;
  const [text,setText]=React.useState(note||"");
  return (
    <Card title={`候选点 #${candidate_id}`} bordered style={{width:'100%'}}>
      <Paragraph><Tag color="blue">{city}</Tag></Paragraph>
      <Paragraph>综合评分：</Paragraph>
      <Progress percent={(total_score*100).toFixed(1)} status="active" />
      <Paragraph>匹配度 {(match_score*100).toFixed(1)}%，蚕食度 {(cannibal_score*100).toFixed(1)}%</Paragraph>
      <Paragraph>城市毛利率 {(gross_margin*100).toFixed(1)}%</Paragraph>
      <Paragraph>城市收入 ¥{revenue?.toFixed(0)||'--'}</Paragraph>
      <Paragraph>备注：</Paragraph>
      <Input.TextArea rows={3} value={text} onChange={(e)=>setText(e.target.value)} placeholder="添加人工备注..." />
      <Button style={{marginTop:8}} type="primary" size="small" onClick={()=>onOverride?.(text)}>保存备注</Button>
    </Card>
  );
}
"""

# ---------- 2️⃣ 主地图页面 ----------
FILES["frontend/src/pages/SiteMap.tsx"]=r"""
import React,{useEffect,useState} from 'react';
import { Row, Col, message } from 'antd';
import AMapLoader from '@amap/amap-jsapi-loader';
import SiteInfoCard from '../components/SiteInfoCard';
import { getJSON } from '../utils/api';

export default function SiteMap(){
  const [map,setMap]=useState<any>(null);
  const [selected,setSelected]=useState<any>(null);
  const [candidates,setCandidates]=useState<any[]>([]);
  const [stores,setStores]=useState<any[]>([]);
  const key = import.meta.env.VITE_AMAP_KEY || "请替换为你的高德Key";

  // 加载地图
  useEffect(()=>{
    AMapLoader.load({ key, version:'2.0' }).then((AMap)=>{
      const m = new AMap.Map('mapContainer',{ zoom:5, center:[105,35] });
      setMap(m);
    }).catch(e=>message.error('地图加载失败:'+e));
  },[]);

  // 拉取候选点 + 门店数据
  useEffect(()=>{
    getJSON('/api/site-selection/ai-suggest',{minScore:0.5}).then((d:any)=>{
      setCandidates(d.rows||[]);
    });
    getJSON('/api/operations/stores/kpi',{from:20250101,to:20251231}).then((d:any)=>{
      // 聚合门店坐标
      setStores(d.rows?.filter((r:any)=>r.longitude&&r.latitude) || []);
    });
  },[]);

  // 在地图上绘制点
  useEffect(()=>{
    if(!map) return;
    map.clearMap();
    if(stores.length){
      stores.forEach((s:any)=>{
        new window.AMap.Marker({
          position:[s.longitude,s.latitude],
          map,
          icon:'https://cdn-icons-png.flaticon.com/512/25/25694.png',
          title:`门店:${s.store_name}`
        });
      });
    }
    if(candidates.length){
      candidates.forEach((c:any)=>{
        const color = c.total_score>=0.7 ? 'green' : c.total_score>=0.6 ? 'blue' : 'orange';
        const marker = new window.AMap.Marker({
          position:[c.lng,c.lat],
          map,
          title:`候选:${c.city} (${(c.total_score*100).toFixed(1)}%)`,
          icon:`https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|${color==='green'?'00cc66':color==='blue'?'3399ff':'ff9900'}`
        });
        marker.on('click',()=>setSelected(c));
      });
    }
  },[map,stores,candidates]);

  const saveNote=async(note:string)=>{
    if(!selected) return;
    await fetch('/api/site-selection/override',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      candidate_id:selected.candidate_id,note
    })});
    message.success('备注已保存');
  };

  return (
    <Row style={{height:'calc(100vh - 60px)'}}>
      <Col span={16}>
        <div id="mapContainer" style={{width:'100%',height:'100%'}} />
      </Col>
      <Col span={8}>
        <SiteInfoCard site={selected} onOverride={saveNote}/>
      </Col>
    </Row>
  );
}
"""

# ---------- 3️⃣ 更新 App.tsx 路由 ----------
FILES["frontend/src/App.tsx"]=r"""
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardHotdog from './pages/DashboardHotdog';
import InsightsPage from './pages/InsightsPage';
import SiteMap from './pages/SiteMap';

export default function App(){
  const navStyle:React.CSSProperties={padding:10,display:'flex',gap:12,flexWrap:'wrap'};
  return (
    <Router>
      <div style={navStyle}>
        <Link to="/">🏠首页</Link>
        <Link to="/dashboard">驾驶舱</Link>
        <Link to="/insights">AI建议</Link>
        <Link to="/map">选址地图</Link>
      </div>
      <Routes>
        <Route path="/" element={<div style={{padding:20}}>欢迎使用热狗智能运营系统</div>} />
        <Route path="/dashboard" element={<DashboardHotdog/>} />
        <Route path="/insights" element={<InsightsPage/>} />
        <Route path="/map" element={<SiteMap/>} />
      </Routes>
    </Router>
  );
}
"""

def write(rel, content):
    path=os.path.join(BASE, rel)
    ensure_dir(path)
    backup(path)
    with open(path,"w",encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel, content in FILES.items():
        write(rel, content)
    print("\n🎯 高德地图选址模块已生成。")
    print("➡ 步骤：")
    print("1) 在前端 .env 文件中添加 VITE_AMAP_KEY=<你的高德Web服务Key>")
    print("2) 启动: docker-compose -f docker-compose.dev.yml up")
    print("3) 打开 http://localhost:3000/map 查看地图")
    print("   - 左侧地图：现有门店 + 候选点（评分颜色）")
    print("   - 右侧：候选详情卡 + 人工备注保存")
    print("💡 提示：未来可添加竞争对手点层、商圈热力、路线分析等扩展。")

if __name__=="__main__":
    main()
