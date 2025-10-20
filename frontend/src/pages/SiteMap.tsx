import React,{useEffect,useState} from 'react';
import { Row, Col, Card, Select, Button, message, Spin } from 'antd';
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
  const [cities,setCities]=useState<any[]>([]);
  const [city,setCity]=useState('上海');
  const [keyword,setKeyword]=useState('热狗');
  const [loading,setLoading]=useState(false);
  const key = process.env.REACT_APP_AMAP_KEY || "bdca958664f9ce5e3e6cb7aad0fc49ac";

  // 加载城市列表
  useEffect(()=>{
    getJSON('/api/site-selection/cities').then((d:any)=>setCities(d.rows||[]));
  },[]);

  // 加载基础地图
  useEffect(()=>{
    if (!key) {
      message.error('高德地图API Key未配置');
      return;
    }
    
    setLoading(true);
    console.log('开始加载高德地图，API Key:', key);
    
    // 直接使用script标签加载，避免AMapLoader的问题
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.onload = () => {
      console.log('高德地图API加载成功');
      try {
        const m = new (window as any).AMap.Map('mapContainer',{ 
          zoom:11, 
          center:[121.47,31.23],
          mapStyle: 'amap://styles/normal'
        });
        setMap(m);
        setLoading(false);
        console.log('地图初始化完成');
      } catch (e) {
        console.error('地图初始化失败:', e);
        message.error('地图初始化失败: ' + (e instanceof Error ? e.message : String(e)));
        setLoading(false);
      }
    };
    script.onerror = () => {
      console.error('高德地图API加载失败');
      message.error('高德地图API加载失败');
      setLoading(false);
    };
    document.head.appendChild(script);
  },[key]);

  // 拉取候选点与门店
  useEffect(()=>{
    if(!city) return;
    setLoading(true);
    Promise.all([
      getJSON('/api/site-selection/ai-suggest',{city, minScore:0.5}),
      getJSON('/api/site-selection/stores')
    ]).then(([candidatesData, storesData])=>{
      setCandidates(candidatesData.rows||[]);
      setStores(storesData.rows?.filter((r:any)=>r.longitude&&r.latitude)||[]);
      setLoading(false);
    }).catch(e=>{
      message.error('数据加载失败:'+e);
      setLoading(false);
    });
  },[city]);

  // 绘制点
  useEffect(()=>{
    if(!map || !window.AMap) return;
    
    console.log('开始绘制标记点，门店数:', stores.length, '候选点数:', candidates.length);
    
    // 清除现有标记
    map.clearMap();
    
    // 绘制现有门店（蓝色标记）
    if(stores.length){
      stores.forEach((s:any)=>{
        const marker = new window.AMap.Marker({ 
          position:[s.longitude,s.latitude], 
          map, 
          title:`门店:${s.store_name}`,
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(25, 34),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
            imageSize: new window.AMap.Size(25, 34)
          })
        });
        marker.on('click',()=>{
          message.info(`门店: ${s.store_name}\n位置: ${s.city}\n平均收入: ¥${s.avg_revenue?.toFixed(0) || 0}`);
        });
      });
    }
    
    // 绘制候选点（彩色标记）
    if(candidates.length){
      candidates.forEach((c:any)=>{
        if(!c.lng || !c.lat) return; // 跳过没有坐标的候选点
        
        const color=c.total_score>=0.7?'green':c.total_score>=0.6?'blue':'orange';
        const marker=new window.AMap.Marker({
          position:[c.lng,c.lat],
          map,
          title:`候选:${c.city} ${(c.total_score*100).toFixed(1)}%`,
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(25, 34),
            image: `https://webapi.amap.com/theme/v1.3/markers/n/mark_${color === 'green' ? 'g' : color === 'blue' ? 'b' : 'r'}.png`,
            imageSize: new window.AMap.Size(25, 34)
          })
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
            <Select 
              value={city} 
              onChange={setCity} 
              style={{width:160,marginRight:8}}
              showSearch
              placeholder="选择城市"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {cities.map(c => (
                <Option key={c.city} value={c.city}>{c.city}</Option>
              ))}
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
          <div style={{position:'relative'}}>
            <div id="mapContainer" style={{width:'100%',height:'85%'}} />
            {loading && (
              <div style={{
                position:'absolute',
                top:'50%',
                left:'50%',
                transform:'translate(-50%, -50%)',
                zIndex:1000
              }}>
                <Spin size="large" />
              </div>
            )}
          </div>
        </div>
      </Col>
      <Col span={8}>
        <SiteInfoCard site={selected} onOverride={saveNote}/>
        {selected && <ManualNoteCard module="site" refId={selected.candidate_id} operator="expander" />}
        <div style={{marginTop:8,height:'40vh'}}>
          <HeatMapLayer map={map} city={city} keyword={keyword} amapKey={key}/>
        </div>
      </Col>
    </Row>
  );
}