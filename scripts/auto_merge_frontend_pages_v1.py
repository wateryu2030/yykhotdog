import os, textwrap, shutil, datetime
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def ensure_dir(p): os.makedirs(os.path.dirname(p), exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p, f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES = {}

# ========== 通用 API 工具 ==========
FILES["frontend/src/utils/api.ts"] = r"""
export async function getJSON<T=any>(url: string, params: Record<string, any> = {}): Promise<T> {
  const qs = Object.entries(params)
    .filter(([,v]) => v !== undefined && v !== null && v !== "")
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  const u = qs ? `${url}?${qs}` : url;
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
"""

# ========== 1) 选店候选榜 ==========
FILES["frontend/src/pages/SiteCandidates.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Row, Col, Typography } from 'antd';
import { getJSON } from '../utils/api';

export default function SiteCandidates() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    getJSON('/api/site-selection/candidates').then((d:any)=> setRows(d.rows||[]));
  }, []);
  const cols = [
    { title:'候选ID', dataIndex:'candidate_id' },
    { title:'城市', dataIndex:'city' },
    { title:'综合分', dataIndex:'total_score', render:(v:number)=> <Tag color={v>=0.7?'green':v>=0.6?'blue':'orange'}>{(v*100).toFixed(1)}%</Tag> },
    { title:'匹配度', dataIndex:'match_score', render:(v:number)=> (v*100).toFixed(0)+'%' },
    { title:'蚕食度', dataIndex:'cannibal_score', render:(v:number)=> (v*100).toFixed(0)+'%' },
    { title:'商圈画像毛利', dataIndex:'gross_margin', render:(v:number)=> v!=null? (v*100).toFixed(1)+'%':'—' },
    { title:'门店数', dataIndex:'stores_cnt' },
    { title:'说明', dataIndex:'rationale' },
  ];
  return (
    <Card title="选店候选榜（重力模型+城市画像）">
      <Typography.Paragraph type="secondary">数据来源：fact_site_score + vw_city_profile</Typography.Paragraph>
      <Table rowKey="candidate_id" dataSource={rows} columns={cols} pagination={{pageSize:20}}/>
    </Card>
  );
}
"""

# ========== 2) 智能选店建议 ==========
FILES["frontend/src/pages/SiteAISuggest.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Space, Button } from 'antd';
import { getJSON } from '../utils/api';

export default function SiteAISuggest() {
  const [rows, setRows] = useState<any[]>([]);
  const [city, setCity] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0.6);

  const search = () => getJSON('/api/site-selection/ai-suggest', { city, minScore }).then((d:any)=> setRows(d.rows||[]));
  useEffect(()=> { search(); }, []);

  const cols = [
    { title:'候选ID', dataIndex:'candidate_id' },
    { title:'城市', dataIndex:'city' },
    { title:'综合分', dataIndex:'total_score' },
    { title:'匹配度', dataIndex:'match_score' },
    { title:'蚕食度', dataIndex:'cannibal_score' },
    { title:'城市毛利率', dataIndex:'gross_margin', render:(v:number)=> v!=null? (v*100).toFixed(1)+'%':'—' },
  ];
  return (
    <Card title="智能选店建议">
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="城市（可留空）" value={city} onChange={(e)=>setCity(e.target.value)} style={{width:200}}/>
        <Input placeholder="最低综合分(0~1)" value={minScore} onChange={(e)=>setMinScore(Number(e.target.value)||0)} style={{width:160}}/>
        <Button type="primary" onClick={search}>查询</Button>
      </Space>
      <Table rowKey="candidate_id" dataSource={rows} columns={cols}/>
    </Card>
  );
}
"""

# ========== 3) 开店管道 ==========
FILES["frontend/src/pages/OpeningPipeline.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, DatePicker } from 'antd';
import { getJSON } from '../utils/api';

export default function OpeningPipeline() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => getJSON('/api/opening/pipeline').then((d:any)=> setRows(d.rows||[]));
  useEffect(()=>{ load(); }, []);

  const add = async () => {
    const v = await form.validateFields();
    await fetch('/api/opening/pipeline', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      candidate_id: Number(v.candidate_id),
      city: v.city || null,
      expected_open_date: v.expected_open_date ? v.expected_open_date.format('YYYY-MM-DD') : null,
      owner: v.owner || null,
      note: v.note || null
    })});
    setOpen(false); form.resetFields(); load();
  };

  const cols = [
    { title:'ID', dataIndex:'id' },
    { title:'候选ID', dataIndex:'candidate_id' },
    { title:'城市', dataIndex:'city' },
    { title:'状态', dataIndex:'status', render:(s:string)=> <Tag color={s==='approved'?'green':s==='opening'?'blue':s==='dead'?'red':'default'}>{s}</Tag> },
    { title:'预计开业', dataIndex:'expected_open_date' },
    { title:'负责人', dataIndex:'owner' },
    { title:'备注', dataIndex:'note' },
  ];

  return (
    <Card title="开店管道">
      <Button type="primary" onClick={()=>setOpen(true)} style={{marginBottom:12}}>新建开店项目</Button>
      <Table rowKey="id" dataSource={rows} columns={cols}/>
      <Modal title="新建开店项目" open={open} onCancel={()=>setOpen(false)} onOk={add}>
        <Form form={form} layout="vertical">
          <Form.Item name="candidate_id" label="候选ID" rules={[{required:true}]}><Input/></Form.Item>
          <Form.Item name="city" label="城市"><Input/></Form.Item>
          <Form.Item name="expected_open_date" label="预计开业"><DatePicker/></Form.Item>
          <Form.Item name="owner" label="负责人"><Input/></Form.Item>
          <Form.Item name="note" label="备注"><Input.TextArea rows={3}/></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
"""

# ========== 4) 运营 KPI ==========
FILES["frontend/src/pages/OperationsKPI.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Table, DatePicker, Space, Button } from 'antd';
import { getJSON } from '../utils/api';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;

export default function OperationsKPI(){
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<any>([dayjs().add(-30,'day'), dayjs()]);
  const query = () => {
    const [a,b] = range||[];
    getJSON('/api/operations/stores/kpi', {
      from: a? a.format('YYYYMMDD'): undefined,
      to: b? b.format('YYYYMMDD'): undefined
    }).then((d:any)=> setRows(d.rows||[]));
  };
  useEffect(()=>{ query(); }, []);
  const cols = [
    { title:'门店', dataIndex:'store_name' },
    { title:'日期', dataIndex:'date_key' },
    { title:'订单数', dataIndex:'orders_cnt' },
    { title:'销量', dataIndex:'items_qty' },
    { title:'收入', dataIndex:'revenue' },
    { title:'毛利', dataIndex:'gross_profit' },
    { title:'净利', dataIndex:'net_profit' },
  ];
  return (
    <Card title="运营KPI（门店-日）">
      <Space style={{marginBottom:12}}>
        <RangePicker value={range} onChange={setRange}/>
        <Button type="primary" onClick={query}>查询</Button>
      </Space>
      <Table dataSource={rows} columns={cols} rowKey={(r)=>r.store_name+'_'+r.date_key} pagination={{pageSize:50}}/>
    </Card>
  );
}
"""

# ========== 5) 销售对比 ==========
FILES["frontend/src/pages/SalesCompare.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Radio, DatePicker, Space, Button, Table } from 'antd';
import { getJSON } from '../utils/api';
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
    { title:'收入', dataIndex:'revenue' },
    { title:'净利', dataIndex:'net_profit' },
    { title:'毛利率', dataIndex:'gross_margin', render:(v:number)=> (v*100).toFixed(1)+'%' },
  ];
  return (
    <Card title="销售对比分析">
      <Space style={{marginBottom:12}}>
        <Radio.Group value={level} onChange={(e)=>setLevel(e.target.value)}>
          <Radio.Button value="city">按城市</Radio.Button>
          <Radio.Button value="store">按门店</Radio.Button>
        </Radio.Group>
        <RangePicker value={range} onChange={setRange}/>
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table dataSource={rows} columns={cols} rowKey={(r)=>r.dim}/>
    </Card>
  );
}
"""

# ========== 6) 分配结果 ==========
FILES["frontend/src/pages/AllocationResult.tsx"] = r"""
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
"""

# ========== 7) 客群画像 ==========
FILES["frontend/src/pages/CustomerProfiles.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import { getJSON } from '../utils/api';

function segLabel(code:number){
  if(!code) return '—';
  const r=Math.floor(code/100), f=Math.floor((code%100)/10), m=code%10;
  return `R${r} F${f} M${m}`;
}

export default function CustomerProfiles(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ getJSON('/api/profiles/customers').then((d:any)=> setRows(d.rows||[])); },[]);
  const cols = [
    { title:'客户ID', dataIndex:'customer_id' },
    { title:'常购门店', dataIndex:'store_name' },
    { title:'RFM', dataIndex:'segment_code', render:(v:number)=> <Tag color="blue">{segLabel(v)}</Tag> },
    { title:'订单数', dataIndex:'orders_cnt' },
    { title:'消费额', dataIndex:'total_spent' },
    { title:'首次', dataIndex:'first_date_key' },
    { title:'末次', dataIndex:'last_date_key' }
  ];
  return (
    <Card title="客群画像">
      <Table dataSource={rows} columns={cols} rowKey="customer_id" pagination={{pageSize:50}}/>
    </Card>
  );
}
"""

# ========== 8) 商品画像 ==========
FILES["frontend/src/pages/ProductProfiles.tsx"] = r"""
import React, { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import { getJSON } from '../utils/api';

export default function ProductProfiles(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ getJSON('/api/profiles/products').then((d:any)=> setRows(d.rows||[])); },[]);
  const cols = [
    { title:'商品ID', dataIndex:'product_id' },
    { title:'商品名', dataIndex:'product_name' },
    { title:'销量', dataIndex:'qty_sold' },
    { title:'销售额', dataIndex:'sales_amount' },
    { title:'成本', dataIndex:'cogs' },
    { title:'毛利率', dataIndex:'gross_margin', render:(v:number)=> <Tag color={v>=0.6?'green':v>=0.45?'blue':'orange'}>{(v*100).toFixed(1)}%</Tag> },
    { title:'购买人数', dataIndex:'buyers_cnt' },
  ];
  return (
    <Card title="商品画像">
      <Table dataSource={rows} columns={cols} rowKey="product_id" pagination={{pageSize:50}}/>
    </Card>
  );
}
"""

# ========== 9) 城市画像 ==========
FILES["frontend/src/pages/CityProfiles.tsx"] = r"""
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
"""

# ========== 10) 更新 App.tsx 路由（保留你已有内容，附加导航） ==========
FILES["frontend/src/App.tsx"] = r"""
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardHotdog from './pages/DashboardHotdog';
import SiteCandidates from './pages/SiteCandidates';
import SiteAISuggest from './pages/SiteAISuggest';
import OpeningPipeline from './pages/OpeningPipeline';
import OperationsKPI from './pages/OperationsKPI';
import SalesCompare from './pages/SalesCompare';
import AllocationResult from './pages/AllocationResult';
import CustomerProfiles from './pages/CustomerProfiles';
import ProductProfiles from './pages/ProductProfiles';
import CityProfiles from './pages/CityProfiles';

export default function App(){
  const navStyle: React.CSSProperties = { padding:10, display:'flex', gap:12, flexWrap:'wrap' };
  return (
    <Router>
      <div style={navStyle}>
        <Link to="/">🏠首页</Link>
        <Link to="/dashboard">驾驶舱</Link>
        <Link to="/site/candidates">选店候选</Link>
        <Link to="/site/ai">智能选店</Link>
        <Link to="/opening/pipeline">开店管道</Link>
        <Link to="/ops/kpi">运营KPI</Link>
        <Link to="/sales/compare">销售对比</Link>
        <Link to="/allocation/result">分配结果</Link>
        <Link to="/profiles/customers">客群画像</Link>
        <Link to="/profiles/products">商品画像</Link>
        <Link to="/profiles/cities">城市画像</Link>
      </div>
      <Routes>
        <Route path="/" element={<div style={{padding:20}}>欢迎使用热狗智能运营系统</div>} />
        <Route path="/dashboard" element={<DashboardHotdog/>} />
        <Route path="/site/candidates" element={<SiteCandidates/>} />
        <Route path="/site/ai" element={<SiteAISuggest/>} />
        <Route path="/opening/pipeline" element={<OpeningPipeline/>} />
        <Route path="/ops/kpi" element={<OperationsKPI/>} />
        <Route path="/sales/compare" element={<SalesCompare/>} />
        <Route path="/allocation/result" element={<AllocationResult/>} />
        <Route path="/profiles/customers" element={<CustomerProfiles/>} />
        <Route path="/profiles/products" element={<ProductProfiles/>} />
        <Route path="/profiles/cities" element={<CityProfiles/>} />
      </Routes>
    </Router>
  );
}
"""

def write(rel, content):
    path = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(path, f"{path}.{ts}.bak")
        print(f"🛟 Backup {rel}")
    with open(path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel, content in FILES.items():
        write(rel, content)
    print("\n🎉 Frontend pages generated. Next:")
    print("1) npm install (如未安装 dayjs / antd / @ant-design/plots 则安装)")
    print("2) npm run dev --prefix frontend")
    print("3) 浏览器访问：/site/candidates, /site/ai, /opening/pipeline, /ops/kpi, /sales/compare, /allocation/result, /profiles/*")

if __name__ == "__main__":
    main()
