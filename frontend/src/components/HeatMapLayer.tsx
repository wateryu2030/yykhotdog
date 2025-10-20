import React, { useEffect } from 'react';
import { message } from 'antd';
import { getJSON } from '../utils/api';

/**
 * 竞争强度热力层
 * props:
 *  - city: 城市
 *  - keyword: 业态关键词
 *  - amapKey: 高德Key
 */
export default function HeatMapLayer({ map, city, keyword, amapKey }: { map?:any, city:string, keyword:string, amapKey:string }) {
  useEffect(() => {
    if (!map) return;
    
    const loadHeatMap = async () => {
      try {
        // 等待全局AMap实例加载
        let AMap = (window as any).AMap;
        if (!AMap) {
          // 如果全局AMap不存在，等待一下再试
          await new Promise(resolve => setTimeout(resolve, 500));
          AMap = (window as any).AMap;
        }
        
        if (!AMap || !AMap.HeatMap) {
          message.warning('热力图插件未加载，请稍后重试');
          return;
        }
        
        const { rows } = await getJSON('/api/competitors/list', { city });
        if (!rows?.length) { 
          message.info('暂无竞争店数据，请先采集。'); 
          return; 
        }
        
        const dataSet = rows.map((r:any)=>({lng:r.longitude, lat:r.latitude, count:1}));
        
        // 使用传入的地图实例
        const heatmap = new AMap.HeatMap(map, {
          radius: 25,
          opacity: [0.3, 0.9],
          gradient: {0.4:'blue',0.65:'lime',0.85:'orange',1.0:'red'}
        });
        heatmap.setDataSet({ data: dataSet, max: 10 });
      } catch (e) {
        message.error('热力层加载失败: ' + e);
      }
    };
    
    // 延迟加载，确保插件完全加载
    const timer = setTimeout(loadHeatMap, 2000);
    return () => clearTimeout(timer);
  }, [map, city, keyword, amapKey]);
  
  return null; // 不需要渲染DOM，直接在地图上添加热力层
}
