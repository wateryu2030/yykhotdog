import React, { useState, useEffect } from 'react';
import { Tabs, Card, Cascader, message } from 'antd';
import SiteSelectionModel from '../components/SiteSelectionModel';
import { api } from '../config/api';

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
  const [regionOptions, setRegionOptions] = useState<any[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);

  // 获取地区级联数据
  useEffect(() => {
    fetchRegionData();
  }, []);

  const fetchRegionData = async () => {
    setRegionLoading(true);
    try {
      console.log('📥 开始获取地区级联数据...');
      const response = await api.get('/region/cascade');
      console.log('📥 地区级联API响应:', { 
        success: response.data?.success, 
        dataCount: response.data?.data?.length || 0,
        message: response.data?.message 
      });
      
      if (response.data?.success) {
        // 转换数据格式为Cascader需要的格式
        const convertToCascaderFormat = (regions: any[]): any[] => {
          return regions.map(region => ({
            value: region.value || region.code,
            label: region.label || region.name,
            isLeaf: region.level === 3, // 区县级别是叶子节点
            children: region.children && region.children.length > 0 
              ? convertToCascaderFormat(region.children) 
              : undefined
          }));
        };
        const cascaderData = convertToCascaderFormat(response.data.data || []);
        console.log(`✅ 成功转换地区数据: ${cascaderData.length}个顶级节点`);
        setRegionOptions(cascaderData);
      } else {
        console.warn('⚠️ 地区级联API返回失败:', response.data);
        message.warning('获取地区数据失败: ' + (response.data?.error || '未知错误'));
      }
    } catch (error: any) {
      console.error('❌ 获取地区数据失败:', error);
      console.error('   错误详情:', error?.message);
      message.error('获取地区数据失败: ' + (error?.message || '未知错误'));
    } finally {
      setRegionLoading(false);
    }
  };

  // 处理城市选择 - 优化直辖市和省管县的处理逻辑
  const handleCityChange = (value: string[], selectedOptions: any[]) => {
    console.log('SiteSelection handleCityChange:', { value, selectedOptions });
    
    if (value && value.length > 0) {
      // 根据选择的层级构建查询参数
      const selectedProvince = selectedOptions[0]?.label || '';
      let selectedCity = selectedOptions[1]?.label || '';
      let selectedDistrict = selectedOptions[2]?.label || '';

      // 特殊处理：直辖市和省管县
      // 直辖市情况：北京市/市辖区/西城区 -> 城市=北京市，区县=西城区
      if (selectedCity === '市辖区' || selectedCity === '县') {
        // 直辖市：使用省份名称作为城市名称
        selectedCity = selectedProvince;
        // 区县名称保持不变（已经是第三级）
        console.log('检测到直辖市，使用省份名称作为城市:', selectedCity);
      } 
      // 省管县情况：湖北省/省直辖县级行政区划/仙桃市 -> 城市=仙桃市，区县=仙桃市
      else if (selectedCity === '省直辖县级行政区划' || selectedCity === '省直辖县') {
        if (selectedOptions.length >= 3 && selectedDistrict) {
          // 省管县：使用区县名称作为城市名称
          selectedCity = selectedDistrict;
          // 区县名称保持不变
          console.log('检测到省管县，使用区县名称作为城市:', selectedCity);
        } else {
          // 如果还没有选择到区县级别，暂时使用省份名称
          selectedCity = selectedProvince;
          console.log('检测到省管县但未选择区县，暂时使用省份名称:', selectedCity);
        }
      }
      // 其他特殊情况：包含"直辖"关键词
      else if (selectedCity && (selectedCity.includes('直辖') || selectedCity === '')) {
        // 如果第二级是特殊行政区划，尝试使用第三级
        if (selectedOptions.length >= 3 && selectedDistrict) {
          selectedCity = selectedDistrict;
        } else {
          selectedCity = selectedProvince;
        }
        console.log('检测到特殊行政区划，调整城市名称:', selectedCity);
      }
      // 如果只选择了省份级别，使用省份名称作为城市
      else if (!selectedCity && selectedProvince) {
        selectedCity = selectedProvince;
        console.log('只选择了省份，使用省份名称作为城市:', selectedCity);
      }

      console.log('解析的地区信息:', {
        province: selectedProvince,
        city: selectedCity,
        district: selectedDistrict,
        codes: value,
        selectedOptionsLength: selectedOptions.length
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
      
      // 如果选择到区县级别（3级），自动切换到城市地图标签页并加载数据
      if (value.length >= 3 && selectedDistrict) {
        console.log('✅ 已选择到区县级别，自动切换到城市地图标签页');
        setActiveTab('city-map');
        message.info(`已切换到城市地图，正在加载${selectedCity}${selectedDistrict}的数据...`);
      }
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
        <SiteSelectionModel 
          selectedRegionCodes={sharedRegionCodes} 
          selectedRegionNames={sharedRegionNames}
          showCityMapOnly={true}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '12px', width: '100%', minWidth: '1200px' }}>
      <Card style={{ width: '100%', marginBottom: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            选择地区：
          </div>
          <Cascader
            style={{ width: '100%', maxWidth: '600px' }}
            placeholder="请选择省市区县"
            value={sharedRegionCodes}
            onChange={handleCityChange}
            options={regionOptions}
            showSearch
            allowClear
            changeOnSelect
            loading={regionLoading}
            displayRender={(labels) => {
              // 优化显示：对于直辖市和省管县，显示更友好的格式
              if (labels.length >= 2) {
                const province = labels[0];
                const secondLevel = labels[1];
                const thirdLevel = labels[2];
                
                // 直辖市：北京市 / 市辖区 / 西城区 -> 显示为：北京市 / 西城区
                if (secondLevel === '市辖区' || secondLevel === '县') {
                  if (thirdLevel) {
                    return `${province} / ${thirdLevel}`;
                  }
                  return `${province} / ${secondLevel}`;
                }
                // 省管县：湖北省 / 省直辖县级行政区划 / 仙桃市 -> 显示为：湖北省 / 仙桃市
                else if (secondLevel === '省直辖县级行政区划' || secondLevel === '省直辖县') {
                  if (thirdLevel) {
                    return `${province} / ${thirdLevel}`;
                  }
                  return `${province} / ${secondLevel}`;
                }
              }
              return labels.join(' / ');
            }}
          />
        </div>
        {sharedRegionNames.length > 0 && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '4px',
            color: '#52c41a',
            fontSize: '14px',
            marginTop: '8px'
          }}>
            ✅ 已选择: {sharedRegionNames.join(' / ')}
          </div>
        )}
      </Card>
      <Card style={{ width: '100%' }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={items} />
      </Card>
    </div>
  );
};

export default SiteSelection; 