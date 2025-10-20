import os, textwrap, shutil, datetime
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))

def ensure_dir(p): os.makedirs(os.path.dirname(p),exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p,f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES={}

# ---------- 1️⃣ HeatMap 组件 ----------
FILES["frontend/src/components/HeatMapLayer.tsx"]=r"""
import React, { useEffect } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { message } from 'antd';
import { getJSON } from '../utils/api';

/**
 * 竞争强度热力层
 * props:
 *  - city: 城市
 *  - keyword: 业态关键词
 *  - amapKey: 高德Key
 */
export default function HeatMapLayer({ city, keyword, amapKey }: { city:string, keyword:string, amapKey:string }) {
  useEffect(() => {
    if (!amapKey) return;
    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.HeatMap']
    }).then(async (AMap) => {
      const map = new AMap.Map('heatMapContainer', { zoom: 11, center: [116.397, 39.909] });
      const { rows } = await getJSON('/api/competitors/list', { city });
      if (!rows?.length) { message.info('暂无竞争店数据，请先采集。'); return; }
      const dataSet = rows.map((r:any)=>({lng:r.longitude, lat:r.latitude, count:1}));
      // @ts-ignore
      const heatmap = new AMap.HeatMap(map, {
        radius: 25,
        opacity: [0.3, 0.9],
        gradient: {0.4:'blue',0.65:'lime',0.85:'orange',1.0:'red'}
      });
      heatmap.setDataSet({ data: dataSet, max: 10 });
    }).catch(e=>message.error('热力层加载失败: '+e));
  }, [city, keyword]);
  return <div id="heatMapContainer" style={{width:'100%',height:'100%'}} />;
}
"""

# ---------- 2️⃣ 更新 SiteMap 页面 ----------
FILES["frontend/src/pages/SiteMap.tsx"]=r"""
import React,{useEffect,useState} from 'react';
import { Row, Col, Card, Select, Button, message } from 'antd';
import AMapLoader from '@amap/amap-jsapi-loader';
import SiteInfoCard from '../components/SiteInfoCard';
import { getJSON } from '../utils/api';
import HeatMapLayer from '../components/HeatMapLayer';

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
        <div style={{marginTop:8,height:'40vh'}}>
          <HeatMapLayer city={city} keyword={keyword} amapKey={key}/>
        </div>
      </Col>
    </Row>
  );
}
"""

# ---------- 3️⃣ utils/api 扩展 ----------
FILES["frontend/src/utils/api.ts"]=r"""
export async function getJSON<T=any>(url:string, params:Record<string,any>={}):Promise<T>{
  const qs=Object.entries(params).filter(([_,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  const u=qs?`${url}?${qs}`:url;
  const res=await fetch(u);
  if(!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
export const getJSONWithParams = getJSON;
"""

def write(rel,content):
    path=os.path.join(BASE,rel)
    ensure_dir(path)
    backup(path)
    with open(path,"w",encoding="utf-8") as f:f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel,content in FILES.items():
        write(rel,content)
    print("\n🎯 高德地图热力层已集成！")
    print("➡ 使用步骤：")
    print("1️⃣ 确保 competitor_poi 表有数据（通过竞争店采集页获取）")
    print("2️⃣ 在 .env 中配置 VITE_AMAP_KEY=你的高德Web服务Key")
    print("3️⃣ 启动开发环境：docker-compose -f docker-compose.dev.yml up")
    print("4️⃣ 访问 http://localhost:3000/map")
    print("   - 地图左侧显示门店 + 候选点")
    print("   - 右下角为竞争强度热力层（颜色：蓝→绿→橙→红）")
    print("   - 选择城市/业态后自动刷新热力层")
    print("💡 建议：将竞争热力与候选点评分联动，实现AI选址评分增强。")

if __name__=="__main__":
    main()
