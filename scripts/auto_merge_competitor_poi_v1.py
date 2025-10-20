import os, textwrap, shutil, datetime
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
def ensure_dir(p): os.makedirs(os.path.dirname(p),exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p,f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES={}

# ---------- 1️⃣ 数据库表 ----------
FILES["database/competitor_poi.sql"]=r"""
IF OBJECT_ID('dbo.competitor_poi','U') IS NULL
CREATE TABLE dbo.competitor_poi (
  id INT IDENTITY(1,1) PRIMARY KEY,
  city NVARCHAR(100),
  name NVARCHAR(200),
  type NVARCHAR(200),
  address NVARCHAR(300),
  longitude DECIMAL(18,6),
  latitude DECIMAL(18,6),
  brand NVARCHAR(100),
  keyword NVARCHAR(100),
  source NVARCHAR(50) DEFAULT('amap'),
  fetched_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO
"""

# ---------- 2️⃣ 后端接口 controller ----------
FILES["backend/src/modules/competitors/competitors.controller.ts"]=r"""
import { Request, Response } from "express";
import axios from "axios";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

const AMAP_KEY = process.env.AMAP_KEY || "";

export class CompetitorsController {
  /**
   * 抓取高德POI数据
   * GET /api/competitors/fetch?city=上海&keyword=热狗
   */
  async fetch(req: Request, res: Response) {
    const { city="上海", keyword="热狗", pages=2 } = req.query as any;
    if (!AMAP_KEY) return res.status(500).json({ error: "未配置高德Key" });
    const results:any[]=[];
    for(let page=1; page<=Number(pages); page++){
      const url=`https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&citylimit=true&offset=25&page=${page}`;
      const { data } = await axios.get(url);
      if(data.pois && data.pois.length){
        results.push(...data.pois.map((p:any)=>({
          city, keyword,
          name:p.name, type:p.type, address:p.address,
          longitude:parseFloat(p.location.split(',')[0]),
          latitude:parseFloat(p.location.split(',')[1]),
          brand:p.brand||null
        })));
      } else break;
    }
    // 写入数据库
    for(const poi of results){
      await sequelize.query(`
        INSERT INTO competitor_poi (city,name,type,address,longitude,latitude,brand,keyword)
        VALUES (:city,:name,:type,:address,:longitude,:latitude,:brand,:keyword)
      `,{ replacements:poi, type:QueryTypes.INSERT });
    }
    res.json({ ok:true, city, keyword, count:results.length });
  }

  /**
   * 查询POI
   * GET /api/competitors/list?city=上海
   */
  async list(req: Request, res: Response){
    const { city } = req.query as any;
    const where = city ? `WHERE city='${city}'` : "";
    const rows = await sequelize.query(`SELECT TOP 500 * FROM competitor_poi ${where} ORDER BY fetched_at DESC`,{ type:QueryTypes.SELECT });
    res.json({ rows });
  }
}
"""

# ---------- 3️⃣ routes ----------
FILES["backend/src/modules/competitors/competitors.routes.ts"]=r"""
import { Router } from "express";
import { CompetitorsController } from "./competitors.controller";
export const competitorsRouter = Router();
const ctl = new CompetitorsController();
competitorsRouter.get("/fetch", ctl.fetch);
competitorsRouter.get("/list", ctl.list);
"""

# ---------- 4️⃣ 注册模块 ----------
FILES["backend/src/modules/index.ts"]=r"""
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
"""

# ---------- 5️⃣ 前端页面（人工选择 + 启动采集） ----------
FILES["frontend/src/pages/CompetitorFetch.tsx"]=r"""
import React,{useState} from 'react';
import { Card, Form, Input, Button, message, Table } from 'antd';
import { getJSON } from '../utils/api';

export default function CompetitorFetch(){
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [form]=Form.useForm();

  const onFetch=async()=>{
    const v=await form.validateFields();
    setLoading(true);
    const res=await fetch(`/api/competitors/fetch?city=${encodeURIComponent(v.city)}&keyword=${encodeURIComponent(v.keyword)}&pages=2`);
    const d=await res.json();
    message.success(`采集完成：${d.count} 条`);
    const list=await getJSON('/api/competitors/list',{city:v.city});
    setRows(list.rows||[]);
    setLoading(false);
  };

  const cols=[
    {title:'城市',dataIndex:'city'},
    {title:'名称',dataIndex:'name'},
    {title:'品牌',dataIndex:'brand'},
    {title:'类型',dataIndex:'type'},
    {title:'地址',dataIndex:'address'},
  ];

  return (
    <Card title="竞争门店采集（高德POI）">
      <Form form={form} layout="inline" style={{marginBottom:12}}>
        <Form.Item name="city" label="城市" rules={[{required:true,message:'请输入城市'}]}><Input placeholder="如 上海" /></Form.Item>
        <Form.Item name="keyword" label="业态关键词" rules={[{required:true,message:'请输入关键词'}]}><Input placeholder="如 热狗、茶饮、简餐" /></Form.Item>
        <Form.Item><Button type="primary" onClick={onFetch} loading={loading}>开始采集</Button></Form.Item>
      </Form>
      <Table dataSource={rows} columns={cols} rowKey={(r)=>r.id} size="small" />
    </Card>
  );
}
"""

# ---------- 6️⃣ 更新 App.tsx ----------
FILES["frontend/src/App.tsx"]=r"""
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardHotdog from './pages/DashboardHotdog';
import InsightsPage from './pages/InsightsPage';
import SiteMap from './pages/SiteMap';
import CompetitorFetch from './pages/CompetitorFetch';

export default function App(){
  const navStyle:React.CSSProperties={padding:10,display:'flex',gap:12,flexWrap:'wrap'};
  return (
    <Router>
      <div style={navStyle}>
        <Link to="/">🏠首页</Link>
        <Link to="/dashboard">驾驶舱</Link>
        <Link to="/insights">AI建议</Link>
        <Link to="/map">选址地图</Link>
        <Link to="/competitors">竞争店采集</Link>
      </div>
      <Routes>
        <Route path="/" element={<div style={{padding:20}}>欢迎使用热狗智能运营系统</div>} />
        <Route path="/dashboard" element={<DashboardHotdog/>} />
        <Route path="/insights" element={<InsightsPage/>} />
        <Route path="/map" element={<SiteMap/>} />
        <Route path="/competitors" element={<CompetitorFetch/>} />
      </Routes>
    </Router>
  );
}
"""

def write(rel,content):
    path=os.path.join(BASE,rel)
    ensure_dir(path);backup(path)
    with open(path,"w",encoding="utf-8") as f:f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel,content in FILES.items():
        write(rel,content)
    print("\n🎯 竞争门店采集模块已生成！")
    print("➡ 执行步骤：")
    print("1️⃣ 在 SSMS 执行 database/competitor_poi.sql")
    print("2️⃣ 在 .env 或 docker-compose.dev.yml 中设置环境变量 AMAP_KEY=<你的高德Web服务Key>")
    print("3️⃣ 启动 docker-compose -f docker-compose.dev.yml up")
    print("4️⃣ 打开 http://localhost:3000/competitors ，输入城市和关键词（如 热狗/茶饮），点击开始采集。")
    print("📍 系统会自动抓取并存储到 competitor_poi 表，可用于选址竞争分析。")

if __name__=="__main__":
    main()
