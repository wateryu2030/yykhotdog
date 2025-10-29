import React, { useState } from 'react';
import { Tabs, Card, Row, Col, Typography } from 'antd';
import SiteSelectionModel from '../components/SiteSelectionModel';

const { Title } = Typography;

// 移除不再使用的RegionOption接口

interface SelectedRegion {
  province: string;
  city: string;
  district: string;
  codes: string[];
}

const SiteSelection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('site-selection');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [sharedRegionCodes, setSharedRegionCodes] = useState<string[]>([]);
  const [sharedRegionNames, setSharedRegionNames] = useState<string[]>([]);
  // 不再需要regionOptions和loading状态，使用内置的CityRegionSelector

  // 处理城市选择
  const handleCityChange = (value: string[], selectedOptions: any[]) => {
    console.log('SiteSelection handleCityChange:', { value, selectedOptions });
    
    if (value && value.length > 0) {
      // 根据选择的层级构建查询参数
      const selectedProvince = selectedOptions[0]?.label || '';
      let selectedCity = selectedOptions[1]?.label || selectedOptions[0]?.label || '';
      const selectedDistrict = selectedOptions[2]?.label || '';

      // 智能判断城市名称：处理直辖市和直管县的特殊情况
      if (selectedCity === '市辖区') {
        // 直辖市情况：北京市/市辖区/西城区 -> 使用"北京市"
        selectedCity = selectedProvince;
        console.log('检测到直辖市，使用省份名称作为城市:', selectedCity);
      } else if (selectedCity === '省直辖县级行政区划' && selectedOptions.length >= 3) {
        // 直管县情况：湖北省/省直辖县级行政区划/仙桃市 -> 使用"仙桃市"
        selectedCity = selectedOptions[2]?.label || selectedProvince;
        console.log('检测到直管县，使用区县名称作为城市:', selectedCity);
      } else if (selectedCity.includes('直辖') || selectedCity === '') {
        // 其他直辖情况
        selectedCity = selectedProvince;
        console.log('检测到特殊行政区划，使用省份名称作为城市:', selectedCity);
      }

      console.log('解析的地区信息:', {
        province: selectedProvince,
        city: selectedCity,
        district: selectedDistrict,
        codes: value
      });

      setSelectedCity(selectedCity);
      setSelectedRegion({
        province: selectedProvince,
        city: selectedCity,
        district: selectedDistrict,
        codes: value
      });
      // 同步地区代码和名称到选址分析组件
      setSharedRegionCodes(value);
      const regionNames = selectedOptions.map(option => option?.label || option?.name || '');
      setSharedRegionNames(regionNames);
      console.log('设置共享地区代码:', value);
      console.log('设置共享地区名称:', regionNames);
    } else {
      // 清空选择
      setSelectedCity('');
      setSelectedRegion(null);
      setSharedRegionCodes([]);
      setSharedRegionNames([]);
      console.log('清空地区选择');
    }
  };

  // 不再需要手动获取地区数据，CityRegionSelector会自动处理

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 标签页配置
  const items = [
    {
      key: 'site-selection',
      label: '选址分析',
      children: <SiteSelectionModel 
        selectedRegionCodes={sharedRegionCodes} 
        selectedRegionNames={sharedRegionNames}
      />
    },
    {
      key: 'city-map',
      label: '城市地图',
      children: (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>城市地图功能暂未实现</p>
          <p>选择城市: {selectedCity || '未选择'}</p>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '12px', width: '100%', minWidth: '1200px' }}>
      <Card style={{ width: '100%' }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={items} />
      </Card>
    </div>
  );
};

export default SiteSelection; 