import os, textwrap, shutil, datetime
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
def ensure_dir(p): os.makedirs(os.path.dirname(p), exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p, f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES = {}

# ---------- 1️⃣ 数据表 ----------
FILES["database/manual_overrides.sql"] = r"""
IF OBJECT_ID('dbo.manual_overrides','U') IS NULL
CREATE TABLE dbo.manual_overrides (
  id INT IDENTITY(1,1) PRIMARY KEY,
  module NVARCHAR(50),
  ref_id INT,
  operator NVARCHAR(100),
  note NVARCHAR(1000),
  score_manual DECIMAL(5,2) NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO
"""

# ---------- 2️⃣ 后端 controller ----------
FILES["backend/src/modules/manual/manual.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class ManualController {
  async save(req: Request, res: Response) {
    const { module, ref_id, operator="system", note, score_manual=null } = req.body;
    if (!module || !ref_id) return res.status(400).json({ error: "module/ref_id required" });
    await sequelize.query(`
      INSERT INTO manual_overrides (module, ref_id, operator, note, score_manual)
      VALUES (:module, :ref_id, :operator, :note, :score_manual)
    `, { replacements: { module, ref_id, operator, note, score_manual }, type: QueryTypes.INSERT });
    res.json({ ok:true });
  }

  async list(req: Request, res: Response) {
    const { module, ref_id } = req.query as any;
    const where = [];
    if (module) where.push(`module='${module}'`);
    if (ref_id) where.push(`ref_id=${ref_id}`);
    const sql = `SELECT * FROM manual_overrides ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY created_at DESC`;
    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
"""

# ---------- 3️⃣ routes ----------
FILES["backend/src/modules/manual/manual.routes.ts"] = r"""
import { Router } from "express";
import { ManualController } from "./manual.controller";
export const manualRouter = Router();
const ctl = new ManualController();
manualRouter.post("/save", ctl.save);
manualRouter.get("/list", ctl.list);
"""

# ---------- 4️⃣ 注册模块 ----------
FILES["backend/src/modules/index.ts"] = r"""
export { metricsRouter } from './metrics/metrics.routes';
export { segmentsRouter } from './segments/segments.routes';
export { alertsRouter } from './alerts/alerts.routes';
export { siteRouter } from './site/site.routes';
export { siteSelectionRouter } from './siteSelection/siteSelection.routes';
export { openingRouter } from './opening/opening.routes';
export { operationsRouter } from './operations/operations.routes';
export { salesRouter } from './sales/sales.routes';
export { allocationRouter } from './allocation/allocation.routes';
export { profilesRouter } from './profiles/profiles.routes';
export { insightsRouter } from './insights/insights.routes';
export { competitorsRouter } from './competitors/competitors.routes';
export { manualRouter } from './manual/manual.routes';
"""

# ---------- 5️⃣ 通用前端组件 ----------
FILES["frontend/src/components/ManualNoteCard.tsx"] = r"""
import React,{useEffect,useState} from 'react';
import { Card, Input, Button, Rate, message, List } from 'antd';
import { getJSON } from '../utils/api';

export default function ManualNoteCard({ module, refId, operator }:{
  module:string; refId:number; operator?:string;
}){
  const [note,setNote]=useState('');
  const [score,setScore]=useState<number|null>(null);
  const [records,setRecords]=useState<any[]>([]);

  const load=()=>getJSON('/api/manual/list',{module,ref_id:refId}).then(d=>setRecords(d.rows||[]));
  const save=async()=>{
    await fetch('/api/manual/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      module,ref_id:refId,operator:operator||'user',note,score_manual:score
    })});
    message.success('已保存人工备注');
    setNote('');setScore(null);load();
  };

  useEffect(()=>{ if(refId) load(); },[refId]);

  return (
    <Card title="人工备注 / 打分" size="small">
      <Rate value={score||0} onChange={setScore}/>
      <Input.TextArea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="写下你的观察或建议..." style={{marginTop:8}}/>
      <Button type="primary" size="small" onClick={save} style={{marginTop:8}}>保存</Button>
      <List size="small" dataSource={records} style={{marginTop:8,maxHeight:150,overflowY:'auto'}}
        renderItem={(r:any)=>(<List.Item><b>{r.operator}</b> {r.score_manual!=null?`评分:${r.score_manual}`:''} {r.note}</List.Item>)} />
    </Card>
  );
}
"""

# ---------- 6️⃣ Dashboard 页面集成 ----------
FILES["frontend/src/pages/DashboardHotdog.tsx"] = r"""
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
"""

# ---------- 7️⃣ SiteMap 页面集成 ----------
FILES["frontend/src/pages/SiteMap.tsx"] = r"""
import React,{useEffect,useState} from 'react';
import { Row, Col, Card, Select, Button, message } from 'antd';
import AMapLoader from '@amap/amap-jsapi-loader';
import SiteInfoCard from '../components/SiteInfoCard';
import ManualNoteCard from '../components/ManualNoteCard';
import HeatMapLayer from '../components/HeatMapLayer';
import { getJSON } from '../utils/api';

// 声明全局AMap类型
declare global {
  interface Window {
    AMap: any;
  }
}

const { Option } = Select;

export default function SiteMap(){
  const [map,setMap]=useState<any>(null);
  const [selected,setSelected]=useState<any>(null);
  const [candidates,setCandidates]=useState<any[]>([]);
  const [stores,setStores]=useState<any[]>([]);
  const [city,setCity]=useState('上海');
  const [keyword,setKeyword]=useState('热狗');
  const key = process.env.REACT_APP_AMAP_KEY || "bdca958664f9ce5e3e6cb7aad0fc49ac";

  // 加载基础地图
  useEffect(()=>{
    AMapLoader.load({ key, version:'2.0' }).then((AMap)=>{
      const m = new AMap.Map('mapContainer',{ zoom:11, center:[121.47,31.23] });
      setMap(m);
    }).catch(e=>message.error('地图加载失败:'+e));
  },[]);

  // 拉取候选点与门店
  useEffect(()=>{
    getJSON('/api/site-selection/ai-suggest',{city, minScore:0.5}).then((d:any)=>setCandidates(d.rows||[]));
    getJSON('/api/operations/stores/kpi',{from:20250101,to:20251231}).then((d:any)=>setStores(d.rows?.filter((r:any)=>r.longitude&&r.latitude)||[]));
  },[city]);

  // 绘制点
  useEffect(()=>{
    if(!map) return;
    map.clearMap();
    if(stores.length){
      stores.forEach((s:any)=>{
        new window.AMap.Marker({ position:[s.longitude,s.latitude], map, title:`门店:${s.store_name}`, icon:'https://cdn-icons-png.flaticon.com/512/25/25694.png' });
      });
    }
    if(candidates.length){
      candidates.forEach((c:any)=>{
        const color=c.total_score>=0.7?'green':c.total_score>=0.6?'blue':'orange';
        const marker=new window.AMap.Marker({
          position:[c.lng,c.lat],
          map,
          title:`候选:${c.city} ${(c.total_score*100).toFixed(1)}%`,
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
        <div style={{padding:8}}>
          <Card size="small" style={{marginBottom:8}}>
            <Select value={city} onChange={setCity} style={{width:160,marginRight:8}}>
              <Option value="上海">上海</Option>
              <Option value="杭州">杭州</Option>
              <Option value="南京">南京</Option>
              <Option value="北京">北京</Option>
              <Option value="广州">广州</Option>
            </Select>
            <Select value={keyword} onChange={setKeyword} style={{width:160,marginRight:8}}>
              <Option value="热狗">热狗</Option>
              <Option value="茶饮">茶饮</Option>
              <Option value="简餐">简餐</Option>
              <Option value="炸鸡">炸鸡</Option>
              <Option value="咖啡">咖啡</Option>
            </Select>
            <Button onClick={()=>window.location.reload()}>刷新</Button>
          </Card>
          <div id="mapContainer" style={{width:'100%',height:'85%'}} />
        </div>
      </Col>
      <Col span={8}>
        <SiteInfoCard site={selected} onOverride={saveNote}/>
        {selected && <ManualNoteCard module="site" refId={selected.candidate_id} operator="expander" />}
        <div style={{marginTop:8,height:'40vh'}}>
          <HeatMapLayer city={city} keyword={keyword} amapKey={key}/>
        </div>
      </Col>
    </Row>
  );
}
"""

def write(rel, content):
    path = os.path.join(BASE, rel)
    ensure_dir(path); backup(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel, content in FILES.items():
        write(rel, content)
    print("\n🎯 人工修正与打分模块已生成")
    print("➡ 步骤：")
    print("1️⃣ 在 SSMS 执行 database/manual_overrides.sql")
    print("2️⃣ 启动 docker-compose -f docker-compose.dev.yml up")
    print("3️⃣ 在驾驶舱与选址地图右侧即可添加人工备注/评分")
    print("💡 这些数据不会影响主逻辑，只作人工参考记录，可在未来用于复盘。")

if __name__ == "__main__":
    main()
