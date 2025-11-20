import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  Card, Row, Col, Button, message, Divider, Typography, Space, Spin, Alert, Tag, Table, 
  Modal, Checkbox, List, Descriptions, Empty 
} from 'antd';
import { 
  InfoCircleOutlined, DownloadOutlined, FileExcelOutlined, ReloadOutlined, 
  EnvironmentOutlined, SaveOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, StarOutlined, UnorderedListOutlined, SyncOutlined
} from '@ant-design/icons';
import { amapPOIService } from '../services/amapService';
import { schoolAnalysisService } from '../services/schoolAnalysisService';
import { SchoolAnalysisResult } from '../types/schoolAnalysis';
import SchoolCenteredAnalysis from './SchoolCenteredAnalysis';
import { AMAP_CONFIG } from '../config/amap';
// import CityRegionSelector from './common/CityRegionSelector';
// import InteractiveMap from './InteractiveMap';
import * as XLSX from 'xlsx';

// ========================== 1. 类型定义区 ==========================
const { Text } = Typography;

/** 地区选择器选项类型 */
interface RegionOption {
  value: string;
  label: string;
  children?: RegionOption[];
}

/** 通用地区选项类型 */
interface CommonRegionOption {
  value: string;
  label: string;
  name?: string;
  children?: CommonRegionOption[];
}

/** 商业环境分析结果类型 */
interface BusinessEnvAnalysis {
  location: string;
  poiList: string[];
  analysis: string;
  savedToDB?: boolean;
  recordId?: string;
}

/** 学校数据项类型 */
interface SchoolItem {
  id: string;
  name: string;
  type: '大学' | '高中' | '初中' | '小学' | '幼儿园' | string;
  student_count: number;
  studentCount: number;
  teacher_count: number;
  rating: number;
  address: string;
  longitude?: number;
  latitude?: number;
  aiAnalysis: string;
  savedToDB?: boolean;
  recordId?: string;
  businessValue?: {
    level: 'high' | 'medium' | 'low';
    score: number;
    reasons: string[];
  };
  nearbyBusinesses?: {
    businesses: BusinessItem[];
  };
}

/** 商业数据项类型 */
interface BusinessItem {
  id: string;
  name: string;
  type: string;
  distance: number;
  businessHours?: string;
  brand?: string;
  longitude?: number;
  latitude?: number;
  address: string;
}

/** 增强AI分析结果类型 */
interface EnhancedAIAnalysis {
  schools: SchoolItem[];
  businessEnvironment?: BusinessEnvAnalysis;
  analysisSummary: string;
}

/** 扩展后的分析结果类型 */
interface AnalysisResult {
  businessEnvironment?: BusinessEnvAnalysis;
  enhancedAI: EnhancedAIAnalysis;
  hotspots?: any[];
  businesses?: any[];
  schools?: any[];
  analysisSummary?: string;
  highValueSchools: number;
  lowValueSchools: number;
  mediumValueSchools?: number;
  totalSchools?: number;
  statistics?: any;
  city?: string;
  district?: string;
  analysisDate?: string;
  recommendations?: string[];
  exportConfig: any;
}

/** 组件Props类型 */
interface SiteSelectionModelProps {
  selectedRegionCodes?: string[]; // 外部传入的地区代码
  selectedRegionNames?: string[]; // 外部传入的地区名称
  showCityMapOnly?: boolean; // 是否只显示城市地图（用于城市地图Tab）
}

// ========================== 2. 常量定义区 ==========================
/** 样式常量（统一管理内联样式） */
const STYLE = {
  container: { padding: '20px', background: '#f5f5f5', minHeight: '100vh' },
  card: { 
    background: 'white', 
    borderRadius: '8px', 
    marginBottom: '20px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
  },
  cardTitle: {
    fontSize: '18px', 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: '20px', 
    textAlign: 'center' as const
  },
  sectionTitle: (color: string) => ({
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
    padding: '8px 0',
    borderBottom: `2px solid ${color}`
  }),
  statCard: {
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const
  },
  statValue: (color: string) => ({
    fontSize: '36px',
    fontWeight: 'bold',
    color,
    marginBottom: '8px'
  }),
  statLabel: { fontSize: '14px', color: '#666', marginBottom: '4px' },
  statSubLabel: (color: string) => ({ fontSize: '12px', color })
};

/** 导航提供商配置 */
const NAV_PROVIDERS = {
  amap: { 
    name: '高德', 
    url: (loc: [number, number], name: string) => 
      `https://uri.amap.com/navigation?to=${loc[1]},${loc[0]},${encodeURIComponent(name)}&mode=car&policy=1&src=mypage&coordinate=gaode&callnative=0` 
  },
  baidu: { 
    name: '百度', 
    url: (loc: [number, number]) => 
      `https://api.map.baidu.com/direction?origin=&destination=${loc[1]},${loc[0]}&mode=driving&region=&output=html&src=webapp.baidu.openAPIdemo` 
  },
  tencent: { 
    name: '腾讯', 
    url: (loc: [number, number], name: string) => 
      `https://apis.map.qq.com/uri/v1/routeplan?type=drive&to=${encodeURIComponent(name)}&tocoord=${loc[1]},${loc[0]}&referer=myapp` 
  }
};

// ========================== 3. 组件核心 ==========================
const SiteSelectionModel: React.FC<SiteSelectionModelProps> = ({ 
  selectedRegionCodes = [], 
  selectedRegionNames: propSelectedRegionNames = [],
  showCityMapOnly = false
}) => {
  // ========================== 3.1 状态管理 ==========================
  const [selectedRegion, setSelectedRegion] = useState<string[]>(selectedRegionCodes || []);
  const [selectedRegionNames, setSelectedRegionNames] = useState<string[]>(propSelectedRegionNames || []);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string>('');
  const [cityName, setCityName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string>('');
  const mapRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);
  const [pageSize, setPageSize] = useState(20);
  
  // 增强AI分析相关状态
  const [enhancedAIAnalysis, setEnhancedAIAnalysis] = useState<EnhancedAIAnalysis | null>(null);
  const [enhancedAILoading, setEnhancedAILoading] = useState(false);
  const [enhancedAIError, setEnhancedAIError] = useState<string | null>(null);
  
  // 保存功能相关状态
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set());
  const [savingSchools, setSavingSchools] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  
  // 学校详情相关状态
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<SchoolItem | null>(null);
  const [schoolDetailModalVisible, setSchoolDetailModalVisible] = useState(false);
  
  // 推荐位置相关状态
  const [recommendationListVisible, setRecommendationListVisible] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  
  // 用户选中的铺位（用于城市地图显示）
  const [selectedShops, setSelectedShops] = useState<SchoolItem[]>([]);
  
  // 刷新学校数据相关状态
  const [refreshingSchools, setRefreshingSchools] = useState(false);

  // ========================== 3.2 工具函数（缓存优化） ==========================
  /**
   * 构建地区查询URL（处理直辖市、省直辖县等特殊行政区划）
   */
  const buildRegionUrl = useCallback((city: string, district?: string) => {
    // URL编码中文参数
    const encodedCity = encodeURIComponent(city);
    let url = `/api/enhanced-ai-analysis/schools-with-analysis/${encodedCity}`;
    if (district && district !== '市辖区' && district !== '省直辖县级行政区划') {
      const isSpecialDistrict = district === '省直辖县级行政区划' || district.includes('直辖');
      if (!isSpecialDistrict) {
        const encodedDistrict = encodeURIComponent(district);
        url += `/${encodedDistrict}`;
      }
    }
    console.log(`🔗 构建API URL: ${url} (city: ${city}, district: ${district})`);
    return url;
  }, []);

  /**
   * 将学校数据转换为InteractiveMap组件需要的格式
   */
  const convertSchoolsToStoreLocations = useCallback((schools: SchoolItem[]) => {
    return schools.map((school, index) => ({
      id: school.id || index + 1,
      shopName: school.name,
      shopAddress: school.address,
      location: {
        latitude: school.latitude || 0,
        longitude: school.longitude || 0
      },
      approvalState: 1, // 默认已批准
      approvalRemarks: `${school.type} - ${school.businessValue?.level || '未知'}价值`,
      amount: school.businessValue?.score || 0,
      recordTime: new Date().toISOString(),
      city: cityName
    }));
  }, [cityName]);

  /**
   * 生成地址导航链接
   */
  const generateNavLink = useCallback((address: string) => {
    const encodedAddr = encodeURIComponent(address);
    return `https://uri.amap.com/search?query=${encodedAddr}`;
  }, []);

  /**
   * 处理多平台导航跳转
   */
  const handleNavigation = useCallback((
    location: [number, number], 
    name: string, 
    provider: keyof typeof NAV_PROVIDERS = 'amap'
  ) => {
    const { url, name: providerName } = NAV_PROVIDERS[provider];
    window.open(url(location, name), '_blank');
    message.success(`已打开${providerName}导航到${name}`);
  }, []);

  // ========================== 3.3 数据获取函数 ==========================
  /**
   * 获取城市名称（优先从内部状态提取，失败则调用API）
   * 优化处理：确保省和区县名称准确，城市名称根据实际情况调整
   */
  const getCityName = useCallback(async (provinceCode: string, cityCode: string) => {
    try {
      // 1. 优先从内部地区名称状态提取
      if (selectedRegionNames.length >= 2) {
        const provinceName = selectedRegionNames[0]; // 省份名称（保证准确）
        const secondLevel = selectedRegionNames[1]; // 第二级（可能是市或特殊行政区划）
        const thirdLevel = selectedRegionNames.length >= 3 ? selectedRegionNames[2] : ''; // 第三级（区县）
        
        let targetCity = secondLevel;
        
        // 特殊处理：直辖市（如北京市/市辖区/西城区 → 城市=北京市）
        if (secondLevel === '市辖区' || secondLevel === '县') {
          targetCity = provinceName; // 直辖市：使用省份名称作为城市
          console.log('✅ 检测到直辖市，使用省份名称作为城市:', targetCity);
        } 
        // 特殊处理：省管县（如湖北省/省直辖县级行政区划/仙桃市 → 城市=仙桃市）
        else if (secondLevel === '省直辖县级行政区划' || secondLevel === '省直辖县') {
          if (thirdLevel) {
            targetCity = thirdLevel; // 省管县：使用区县名称作为城市
            console.log('✅ 检测到省管县，使用区县名称作为城市:', targetCity);
          } else {
            targetCity = provinceName; // 如果还没有选择到区县级别，暂时使用省份名称
            console.log('⚠️ 检测到省管县但未选择区县，暂时使用省份名称:', targetCity);
          }
        }
        // 其他特殊情况：包含"直辖"关键词
        else if (secondLevel && (secondLevel.includes('直辖') || secondLevel === '')) {
          if (thirdLevel) {
            targetCity = thirdLevel; // 尝试使用第三级
          } else {
            targetCity = provinceName; // 否则使用省份名称
          }
          console.log('✅ 检测到特殊行政区划，调整城市名称:', targetCity);
        }
        // 正常情况：第二级就是城市名称
        else if (targetCity && targetCity !== '') {
          // 保持原样
          console.log('✅ 使用第二级作为城市名称:', targetCity);
        }
        // 如果第二级为空，使用省份名称
        else {
          targetCity = provinceName;
          console.log('⚠️ 第二级为空，使用省份名称作为城市:', targetCity);
        }

        if (targetCity) {
          setCityName(targetCity);
          console.log('✅ 从内部状态获取城市名称:', targetCity, {
            province: provinceName,
            secondLevel,
            thirdLevel,
            finalCity: targetCity
          });
          return;
        }
      }
      
      // 2. Props提取失败时调用API
      console.log('🔍 从API获取城市名称...');
      const res = await fetch(`/api/region/cascade?level=2&parentCode=${provinceCode}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const cityData = data.data.find((item: any) => 
          item.value === cityCode || item.code === cityCode
        );
        
        if (cityData) {
          let finalCity = cityData.label || cityData.name || cityData.value;
          
          // API返回的数据也需要特殊处理
          if (finalCity === '市辖区' || finalCity === '县') {
            // 直辖市：从selectedRegionNames获取省份名称
            finalCity = selectedRegionNames[0] || finalCity;
          } else if (finalCity === '省直辖县级行政区划' || finalCity === '省直辖县') {
            // 省管县：从selectedRegionNames获取区县名称
            finalCity = selectedRegionNames[2] || selectedRegionNames[0] || finalCity;
          }
          
          setCityName(finalCity);
          console.log('✅ 从API获取城市名称:', finalCity);
        } else {
          console.warn('❌ 未找到匹配城市数据', { cityCode, provinceCode });
          setCityName('未知城市');
        }
      } else {
        console.warn('❌ 城市API请求失败:', data);
        setCityName('未知城市');
      }
    } catch (err) {
      console.error('❌ 获取城市名称异常:', err);
      setCityName('未知城市');
    }
  }, [selectedRegionNames, propSelectedRegionNames]);

  /**
   * 获取增强AI学校分析数据
   */
  const fetchEnhancedAIAnalysis = useCallback(async (saveToDB: boolean = false) => {
    if (!cityName) return;
    
    setEnhancedAILoading(true);
    setEnhancedAIError(null);
    
    try {
      const district = selectedRegionNames[2];
      const baseUrl = buildRegionUrl(cityName, district);
      const url = `${baseUrl}?saveToDB=${saveToDB}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        const analysisSummary = generateAnalysisSummary(data.data, enhancedAIAnalysis?.businessEnvironment);
        setEnhancedAIAnalysis({
          schools: data.data,
          businessEnvironment: enhancedAIAnalysis?.businessEnvironment,
          analysisSummary
        });
        message.success(`成功获取${data.data.length}所学校AI分析数据`);
      } else {
        throw new Error(data.message || '获取学校分析数据失败');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '获取数据失败';
      setEnhancedAIError(errMsg);
      message.error(`增强AI分析失败: ${errMsg}`);
    } finally {
      setEnhancedAILoading(false);
    }
  }, [cityName, selectedRegionNames, buildRegionUrl, enhancedAIAnalysis?.businessEnvironment]);

  /**
   * 分析商业环境
   */
  const analyzeBusinessEnv = useCallback(async (
    poiList: string[], 
    saveToDB: boolean = false
  ) => {
    if (!cityName) return;

    setEnhancedAILoading(true);
    setEnhancedAIError(null);
    
    try {
      // 构建位置信息（处理特殊行政区划）
      const district = selectedRegionNames[2];
      const isSpecial = district && (district === '省直辖县级行政区划' || district.includes('直辖'));
      const location = isSpecial ? cityName : `${cityName}${district || ''}`;

      const res = await fetch('/api/enhanced-ai-analysis/analyze-business-environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, poiList, saveToDB })
      });

      const data = await res.json();
      if (data.success) {
        // 更新分析结果
        setAnalysisResult(prev => prev ? {
          ...prev,
          businessEnvironment: data.data,
          enhancedAI: {
            ...prev.enhancedAI,
            businessEnvironment: data.data,
            analysisSummary: generateAnalysisSummary(prev.enhancedAI.schools, data.data)
          }
        } : null);

        // 更新增强AI分析数据
        setEnhancedAIAnalysis(prev => prev ? {
          ...prev,
          businessEnvironment: data.data,
          analysisSummary: generateAnalysisSummary(prev.schools, data.data)
        } : null);

        message.success('商业环境分析完成');
      } else {
        throw new Error(data.message || '商业环境分析失败');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '分析失败';
      setEnhancedAIError(errMsg);
      message.error(`商业环境分析失败: ${errMsg}`);
    } finally {
      setEnhancedAILoading(false);
    }
  }, [cityName, selectedRegionNames]);

  /**
   * 保存选中的学校到数据库
   */
  const saveSelectedSchoolsToDB = useCallback(async (schoolIds: string[]) => {
    if (!analysisResult?.schools || schoolIds.length === 0) {
      message.warning('请选择要保存的学校');
      return;
    }

    setSavingSchools(true);
    
    try {
      const schoolsToSave = analysisResult.schools.filter(school => 
        schoolIds.includes(school.id?.toString() || '')
      );

      // 调用批量保存API
      const schoolDataList = schoolsToSave.map(school => ({
        id: school.id,
        name: school.name,
        type: school.type,
        address: school.address,
        longitude: school.longitude,
        latitude: school.latitude,
        student_count: school.student_count,
        teacher_count: school.teacher_count,
        businessValue: school.businessValue,
        aiAnalysis: school.aiAnalysis,
        city: cityName,
        province: selectedRegionNames[0] || '',
        district: selectedRegionNames[2] || ''
      }));

      const res = await fetch('/api/enhanced-ai-analysis/save-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolIds: schoolIds,
          schoolDataList: schoolDataList
        })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || '保存失败');
      }
      
      message.success(`成功保存 ${schoolIds.length} 所学校到数据库`);
      setSelectedSchoolIds(new Set()); // 清空选择
      setSaveModalVisible(false);
    } catch (err) {
      console.error('❌ 保存数据失败:', err);
      message.error('保存分析结果失败，请重试');
    } finally {
      setSavingSchools(false);
    }
  }, [analysisResult, cityName, selectedRegionNames]);

  /**
   * 保存所有分析结果到数据库
   */
  const saveAllToDB = useCallback(async () => {
    if (!analysisResult?.schools || analysisResult.schools.length === 0) {
      message.warning('暂无分析数据可保存');
      return;
    }

    const allSchoolIds = analysisResult.schools.map(s => s.id?.toString() || '');
    await saveSelectedSchoolsToDB(allSchoolIds);
  }, [analysisResult, saveSelectedSchoolsToDB]);

  /**
   * 打开保存Modal
   */
  const handleOpenSaveModal = useCallback(() => {
    if (!analysisResult?.schools || analysisResult.schools.length === 0) {
      message.warning('暂无分析数据可保存');
      return;
    }
    setSaveModalVisible(true);
  }, [analysisResult]);

  /**
   * 处理学校选择变化
   */
  const handleSchoolSelectionChange = useCallback((schoolId: string, checked: boolean) => {
    const newSelected = new Set(selectedSchoolIds);
    if (checked) {
      newSelected.add(schoolId);
    } else {
      newSelected.delete(schoolId);
    }
    setSelectedSchoolIds(newSelected);
  }, [selectedSchoolIds]);

  /**
   * 全选/取消全选
   */
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!analysisResult?.schools) return;
    if (checked) {
      const allIds = new Set(analysisResult.schools.map(s => s.id?.toString() || ''));
      setSelectedSchoolIds(allIds);
    } else {
      setSelectedSchoolIds(new Set());
    }
  }, [analysisResult]);

  /**
   * 查看学校详情并定位
   */
  const handleViewSchoolDetail = useCallback((school: SchoolItem) => {
    setSelectedSchoolDetail(school);
    setSchoolDetailModalVisible(true);
    
    // 在地图上定位到该学校
    if (amapRef.current && school.longitude && school.latitude) {
      try {
        amapRef.current.setCenter([school.longitude, school.latitude]);
        amapRef.current.setZoom(16);
        
        // 添加高亮标记
        const marker = new window.AMap.Marker({
          position: [school.longitude, school.latitude],
          title: school.name,
          content: `
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              background-color: #ff4d4f; 
              border: 4px solid white; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.5); 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 18px;
              color: white;
              font-weight: bold;
            ">
              📍
            </div>
          `,
          zIndex: 2000
        });
        
        amapRef.current.add(marker);
        
        // 显示信息窗口
        const infoWindow = new window.AMap.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 250px;">
              <div style="font-weight: bold; color: #1890ff; margin-bottom: 8px; font-size: 16px;">
                ${school.name}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                ${school.type}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                学生数: ${school.student_count?.toLocaleString() || 0}人
              </div>
              <div style="font-size: 12px; color: #999;">
                ${school.address}
              </div>
            </div>
          `,
          offset: new window.AMap.Pixel(0, -40)
        });
        
        infoWindow.open(amapRef.current, [school.longitude, school.latitude]);
        
        message.success(`已定位到 ${school.name}`);
      } catch (error) {
        console.error('地图定位失败:', error);
      }
    }
  }, []);

  /**
   * 查看推荐位置列表
   */
  const handleViewRecommendations = useCallback(() => {
    if (!analysisResult?.recommendations || analysisResult.recommendations.length === 0) {
      message.warning('暂无推荐位置数据');
      return;
    }
    setRecommendationListVisible(true);
  }, [analysisResult]);

  /**
   * 刷新学校详细信息（使用AI重新获取学生人数、教师人数等）
   */
  const handleRefreshSchoolDetails = useCallback(async () => {
    if (!analysisResult?.schools || analysisResult.schools.length === 0) {
      message.warning('没有学校数据需要刷新');
      return;
    }

    setRefreshingSchools(true);
    const hideLoading = message.loading('正在刷新学校详细信息，请稍候...', 0);

    try {
      const schoolIds = analysisResult.schools.map(school => {
        // 尝试从recordId或id获取学校ID
        return school.recordId || school.id;
      }).filter(id => id);

      const response = await fetch('/api/enhanced-ai-analysis/refresh-school-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityName,
          district: selectedRegionNames.length >= 3 ? selectedRegionNames[2] : undefined,
          schoolIds: schoolIds.length > 0 ? schoolIds : undefined,
          limit: 100
        })
      });

      const data = await response.json();
      hideLoading();

      if (data.success) {
        message.success(`刷新完成：成功更新 ${data.data.updated} 所学校，失败 ${data.data.failed} 所`);
        
        // 重新获取学校数据
        if (cityName) {
          await fetchEnhancedAIAnalysis(false);
        }
      } else {
        message.error(data.message || '刷新失败');
      }
    } catch (error) {
      hideLoading();
      console.error('刷新学校详细信息失败:', error);
      message.error('刷新学校详细信息失败');
    } finally {
      setRefreshingSchools(false);
    }
  }, [analysisResult, cityName, selectedRegionNames, fetchEnhancedAIAnalysis]);

  /**
   * 查看推荐位置详情（下钻）
   */
  const handleViewRecommendationDetail = useCallback((recommendation: any, index: number) => {
    setSelectedRecommendation({ ...recommendation, index });
    
    // 如果推荐位置有坐标，在地图上定位
    if (recommendation.location && recommendation.location.length === 2 && amapRef.current) {
      const [lng, lat] = recommendation.location;
      try {
        amapRef.current.setCenter([lng, lat]);
        amapRef.current.setZoom(15);
        message.success(`已定位到推荐位置 ${index + 1}`);
      } catch (error) {
        console.error('地图定位失败:', error);
      }
    }
  }, []);

  // ========================== 3.4 数据分析函数 ==========================
  /**
   * 计算学校商业价值（评分+等级）
   */
  const calculateBusinessValue = useCallback((school: SchoolItem) => {
    const { student_count = 0, teacher_count = 0, rating = 0 } = school;
    let score = 0;
    const reasons: string[] = [];

    // 学生数量评分（40分）
    if (student_count > 10000) { score += 40; reasons.push('学生数量庞大'); }
    else if (student_count > 5000) { score += 30; reasons.push('学生数量较多'); }
    else if (student_count > 1000) { score += 20; reasons.push('学生数量适中'); }
    else { score += 10; reasons.push('学生数量较少'); }

    // 师资力量评分（30分）
    if (teacher_count > 500) { score += 30; reasons.push('师资力量雄厚'); }
    else if (teacher_count > 100) { score += 20; reasons.push('师资力量较强'); }
    else { score += 10; reasons.push('师资力量一般'); }

    // 学校评级评分（30分）
    if (rating > 4.5) { score += 30; reasons.push('学校声誉良好'); }
    else if (rating > 4.0) { score += 20; reasons.push('学校声誉较好'); }
    else { score += 10; reasons.push('学校声誉一般'); }

    // 确定价值等级
    let level: 'high' | 'medium' | 'low' = 'low';
    if (score >= 80) level = 'high';
    else if (score >= 60) level = 'medium';

    return { level, score, reasons };
  }, []);

  /**
   * 生成热点区域推荐
   */
  const generateHotspots = useCallback((
    schools: SchoolItem[], 
    businessEnv?: BusinessEnvAnalysis
  ) => {
    if (schools.length === 0) return [];

    // 基础数据计算
    const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    const totalTeachers = schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0);

    // 综合得分计算
    const densityScore = Math.min(schools.length * 8, 40); // 学校密度（40分）
    const studentScore = Math.min(totalStudents / 1000 * 5, 30); // 学生数量（30分）
    const teacherScore = Math.min(totalTeachers / 100 * 2, 20); // 师资（20分）
    const businessScore = businessEnv ? 25 : 15; // 商业环境（25/15分）
    const totalScore = Math.min(densityScore + studentScore + teacherScore + businessScore, 100);

    // 生成热点区域列表
    const hotspots: AnalysisResult['hotspots'] = [
      // 主要热点区域
      {
      id: 'primary-hotspot',
        center: schools[0].longitude && schools[0].latitude 
          ? [schools[0].longitude, schools[0].latitude] 
          : [0, 0],
      radius: 800,
      score: totalScore,
        recommendation: generateHotspotDesc(schools, businessEnv, 'primary')
      }
    ];
    
    // 次要热点区域（学校数量>5时添加）
    if (schools.length > 5) {
      hotspots.push({
        id: 'secondary-hotspot',
        center: schools[Math.floor(schools.length / 2)].longitude && schools[Math.floor(schools.length / 2)].latitude
          ? [schools[Math.floor(schools.length / 2)].longitude, schools[Math.floor(schools.length / 2)].latitude]
          : [0, 0],
        radius: 500,
        score: Math.max(totalScore - 20, 60),
        recommendation: generateHotspotDesc(schools, businessEnv, 'secondary')
      });
    }
    
    return hotspots;
  }, []);

  /**
   * 生成热点区域描述文案
   */
  const generateHotspotDesc = useCallback((
    schools: SchoolItem[], 
    businessEnv?: BusinessEnvAnalysis, 
    type: 'primary' | 'secondary' = 'primary'
  ) => {
    const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    const schoolTypes = schools.map(s => s.type);
    
    if (type === 'primary') {
      if (schoolTypes.includes('大学')) {
        return `主要热点区域：大学密集区，学生${totalStudents.toLocaleString()}人，消费能力强，建议开设旗舰店`;
      } else if (schoolTypes.includes('高中')) {
        return `主要热点区域：高中密集区，学生${totalStudents.toLocaleString()}人，家长接送频繁，建议开设标准店`;
      } else {
        return `主要热点区域：学校密集区，学生${totalStudents.toLocaleString()}人，适合开设社区店`;
      }
    } else {
      return `次要热点区域：学校分布较分散，学生${totalStudents.toLocaleString()}人，适合开设小型店`;
    }
  }, []);

  /**
   * 生成选址推荐建议列表（返回对象数组，包含位置坐标和详细信息）
   */
  const generateRecommendations = useCallback((
    schools: SchoolItem[], 
    city: string, 
    businessEnv?: BusinessEnvAnalysis, 
    district?: string
  ) => {
    const recommendations: any[] = [];
    const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    const totalTeachers = schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0);

    // 按学校价值排序，选择高价值学校作为推荐位置
    const highValueSchools = schools
      .filter(s => s.businessValue?.level === 'high' && s.longitude && s.latitude)
      .sort((a, b) => (b.businessValue?.score || 0) - (a.businessValue?.score || 0))
      .slice(0, 5); // 最多5个推荐位置

    // 如果没有高价值学校，使用所有有坐标的学校
    const candidateSchools = highValueSchools.length > 0 
      ? highValueSchools 
      : schools.filter(s => s.longitude && s.latitude).slice(0, 5);

    // 为每个候选学校生成推荐位置
    candidateSchools.forEach((school, index) => {
      const score = school.businessValue?.score || Math.round(50 + (school.student_count || 0) / 100);
      const advantages: string[] = [];
      
      if (school.student_count > 1000) {
        advantages.push('学生人数多');
      }
      if (school.businessValue?.level === 'high') {
        advantages.push('商业价值高');
      }
      if (school.type === '大学') {
        advantages.push('大学市场潜力大');
      }

      recommendations.push({
        id: `rec_${index + 1}`,
        location: [school.longitude!, school.latitude!],
        reason: `位于${school.name}附近，${school.type}，学生${school.student_count || 0}人`,
        description: `推荐在${school.name}周边开设热狗店，该区域${school.type}学生${school.student_count || 0}人，商业价值${school.businessValue?.level || '中等'}`,
        score: score,
        advantages: advantages.length > 0 ? advantages : ['地理位置优越'],
        disadvantages: [],
        schoolName: school.name,
        schoolType: school.type,
        studentCount: school.student_count || 0
      });
    });

    // 如果没有生成任何推荐位置，生成基于区域的通用推荐
    if (recommendations.length === 0 && schools.length > 0) {
      // 计算学校中心点
      const validSchools = schools.filter(s => s.longitude && s.latitude);
      if (validSchools.length > 0) {
        const avgLng = validSchools.reduce((sum, s) => sum + (s.longitude || 0), 0) / validSchools.length;
        const avgLat = validSchools.reduce((sum, s) => sum + (s.latitude || 0), 0) / validSchools.length;

        recommendations.push({
          id: 'rec_general',
          location: [avgLng, avgLat],
          reason: `位于${city}${district || ''}学校密集区域中心`,
          description: `🎯 选址建议：在${city}${district || ''}学校密集区域开设热狗店。📚 教育密度：该区域共有${schools.length}所学校，覆盖学生${totalStudents.toLocaleString()}人，教师${totalTeachers}人。💰 消费潜力：基于学生数量和师资力量，预计日客流量${Math.round(totalStudents * 0.1)}-${Math.round(totalStudents * 0.2)}人`,
          score: 60,
          advantages: ['学校密集', '人流量大'],
          disadvantages: []
        });
      }
    }

    return recommendations;
  }, []);

  /**
   * 生成分析总结文案
   */
  const generateAnalysisSummary = useCallback((
    schools: SchoolItem[], 
    businessEnv?: BusinessEnvAnalysis
  ) => {
    const totalSchools = schools.length;
    const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    const totalTeachers = schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0);
    
    let summary = `该区域共有${totalSchools}所学校，覆盖学生${totalStudents.toLocaleString()}人，教师${totalTeachers}人。`;
    
    // 补充商业环境分析
    if (businessEnv) {
      summary += ` ${businessEnv.analysis}`;
    }
    
    // 基于学生密度的选址建议
    if (totalStudents > 20000) {
      summary += ' 学生密度极高，建议开设大型热狗店，主打品牌效应。';
    } else if (totalStudents > 10000) {
      summary += ' 学生密度较高，建议开设中型热狗店，注重服务品质。';
    } else if (totalStudents > 5000) {
      summary += ' 学生密度适中，建议开设小型热狗店，突出特色产品。';
    } else {
      summary += ' 学生密度较低，建议谨慎选址，可考虑其他区域。';
    }
    
    return summary;
  }, []);

  // ========================== 3.5 生命周期与事件处理 ==========================
  /**
   * 同步外部传入的地区数据
   */
  useEffect(() => {
    if (selectedRegionCodes && selectedRegionCodes.length > 0) {
      setSelectedRegion(selectedRegionCodes);
      console.log('📥 接收外部地区数据:', { selectedRegionCodes, selectedRegionNames: propSelectedRegionNames });

      // 同步地区名称
      if (propSelectedRegionNames && propSelectedRegionNames.length > 0) {
        setSelectedRegionNames(propSelectedRegionNames);
        
        // 直接从地区名称提取城市名称，避免调用API
        if (propSelectedRegionNames.length >= 2) {
          const provinceName = propSelectedRegionNames[0];
          const secondLevel = propSelectedRegionNames[1];
          const thirdLevel = propSelectedRegionNames.length >= 3 ? propSelectedRegionNames[2] : '';
          
          let targetCity = secondLevel;
          
          // 特殊处理：直辖市（如：天津市/市辖区/和平区）
          if (secondLevel === '市辖区' || secondLevel === '县') {
            targetCity = provinceName; // 使用省份名称作为城市名称
            console.log('✅ 检测到直辖市，使用省份名称作为城市:', targetCity);
          } 
          // 特殊处理：省管县（如：湖北省/省直辖县级行政区划/仙桃市）
          else if (secondLevel === '省直辖县级行政区划' || secondLevel === '省直辖县') {
            targetCity = thirdLevel || provinceName;
            console.log('✅ 检测到省管县，使用区县名称作为城市:', targetCity);
          }
          // 其他特殊情况
          else if (secondLevel && (secondLevel.includes('直辖') || secondLevel === '')) {
            targetCity = thirdLevel || provinceName;
            console.log('✅ 检测到特殊行政区划，调整城市名称:', targetCity);
          }
          // 普通情况：直接使用第二级作为城市名称
          else if (secondLevel) {
            targetCity = secondLevel;
            console.log('✅ 使用第二级作为城市名称:', targetCity);
          }
          
          if (targetCity && targetCity !== cityName) {
            setCityName(targetCity);
            console.log('✅ 设置城市名称:', targetCity, '区县:', thirdLevel);
          }
        }
      }

      // 当选择到省市两级时，如果还没有城市名称，才调用API
      if (selectedRegionCodes.length >= 2 && !cityName) {
        getCityName(selectedRegionCodes[0], selectedRegionCodes[1]);
      }
    } else {
      // 清空状态
      setSelectedRegion([]);
      setSelectedRegionNames([]);
      setCityName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionCodes, propSelectedRegionNames]); // 移除getCityName依赖，避免循环

  /**
   * 调试用：打印组件状态（开发环境用）- 已禁用避免无限循环
   */
  // useEffect(() => {
  //   console.log('🔍 组件当前状态:', {
  //     selectedRegion,
  //     cityName,
  //     hasAnalysisResult: !!analysisResult,
  //     hasEnhancedAI: !!enhancedAIAnalysis
  //   });
  // }, [selectedRegion, cityName, analysisResult, enhancedAIAnalysis]);

  /**
   * 自动加载增强AI分析（城市信息和地区选择完成后）- 已禁用自动加载，改为手动触发
   */
  // useEffect(() => {
  //   if (cityName && cityName !== '未知城市' && selectedRegion.length >= 2) {
  //     // 延迟执行，避免并发请求
  //     const timer = setTimeout(() => {
  //       fetchEnhancedAIAnalysis();
  //       
  //       // 延迟1秒分析商业环境
  //       const envTimer = setTimeout(() => {
  //         const poiList = ['学校', '教育机构', '培训机构'];
  //         analyzeBusinessEnv(poiList);
  //       }, 1000);

  //       return () => clearTimeout(envTimer);
  //     }, 500);

  //     return () => clearTimeout(timer);
  //   }
  // }, [cityName, selectedRegion, fetchEnhancedAIAnalysis, analyzeBusinessEnv]);

  /**
   * 处理地区选择变化
   */
  const handleRegionChange = useCallback((
    value: string[], 
    selectedOptions: CommonRegionOption[]
  ) => {
    setSelectedRegion(value);
    
    // 更新地区名称
    const regionNames = selectedOptions.map(option => option?.label || option?.name || '');
    setSelectedRegionNames(regionNames);
    
    // 智能判断城市名称：处理直辖市和省管县的特殊情况
    if (value.length >= 2) {
      let targetCity = regionNames[1];
      
      // 特殊处理：直辖市（如北京市/市辖区 → 北京市）
      if (targetCity === '市辖区') {
        targetCity = regionNames[0];
        console.log('检测到直辖市，使用省份名称作为城市:', targetCity);
      } 
      // 特殊处理：省直辖县级行政区划（如湖北省/省直辖县级行政区划/仙桃市 → 仙桃市）
      else if (targetCity === '省直辖县级行政区划' && regionNames.length >= 3) {
        targetCity = regionNames[2];
        console.log('检测到省管县，使用区县名称作为城市:', targetCity);
      } 
      // 其他直辖情况
      else if (targetCity.includes('直辖') || !targetCity) {
        targetCity = regionNames[0];
        console.log('检测到特殊行政区划，使用省份名称作为城市:', targetCity);
      }
      
      if (targetCity) {
        setCityName(targetCity);
        console.log('✅ 设置城市名称:', targetCity);
      }
    }
    
    console.log('🔄 地区选择变化:', { value, selectedOptions, regionNames });
  }, []);

  /**
   * 执行完整AI选址分析
   */
  const handleAIanalysis = useCallback(async () => {
    // 前置校验 - 必须选择到区县级别
    if (selectedRegion.length < 3) {
      message.error('请选择到区县级别（省份+城市+区县）');
      return;
    }
    if (!cityName || cityName === '未知城市') {
      message.error('城市信息不完整，请重新选择地区');
      return;
    }

    // 初始化分析状态
    setIsAnalyzing(true);
    setAnalysisMessage('正在启动增强AI智能选址分析...');
    setAnalysisResult(null);

    try {
      const district = selectedRegionNames[2];
      console.log('🚀 开始增强AI选址分析:', { cityName, district, selectedRegionNames });

      // 1. 获取学校数据（带AI分析）
      setAnalysisMessage('正在分析学校密度和AI评估...');
      
      // 构建API URL：API格式为 /api/enhanced-ai-analysis/schools-with-analysis/:city/:district?
      // 需要正确传递城市名称和区县名称
      // AI智能分析时，forceRefresh=true，强制从高德地图获取最新数据
      const encodedCity = encodeURIComponent(cityName);
      let apiUrl = `/api/enhanced-ai-analysis/schools-with-analysis/${encodedCity}`;
      
      // 如果选择了区县且不是特殊行政区划，添加到URL中
      if (district && district !== '市辖区' && district !== '省直辖县级行政区划') {
        const encodedDistrict = encodeURIComponent(district);
        apiUrl += `/${encodedDistrict}`;
      }
      
      // AI智能分析时，强制刷新（从高德地图获取最新数据）
      apiUrl += '?saveToDB=false&forceRefresh=true';
      
      console.log('🔍 AI智能分析 - 调用API（强制刷新）:', apiUrl);
      
      let res = await fetch(apiUrl);
      let data = await res.json();

      // 处理无数据情况：如果按区县查询没有结果，尝试按城市级别查询（也强制刷新）
      if (!data.success || (data.data && data.data.length === 0)) {
        setAnalysisMessage('区县级查询无结果，正在尝试城市级查询...');
        const cityOnlyUrl = `/api/enhanced-ai-analysis/schools-with-analysis/${encodedCity}?saveToDB=false&forceRefresh=true`;
        console.log('🔍 回退到城市级查询（强制刷新）:', cityOnlyUrl);
        res = await fetch(cityOnlyUrl);
        data = await res.json();

        if (!data.success || (data.data && data.data.length === 0)) {
          throw new Error(`在${cityName}${district ? district : ''}未找到学校数据，请检查地区或重试`);
        }
      }

      const schools = data.data as SchoolItem[];
      console.log(`✅ 获取${schools.length}所学校数据`);

      // 2. 分析商业环境（可选，失败不影响主流程）
      setAnalysisMessage('正在分析商业环境和市场潜力...');
      const poiList = schools.slice(0, 10).map(school => school.name);
      let envData: any = { success: false, data: null };
      try {
        // 构建完整的地址用于地理编码（避免400错误）
        // 优先使用区县名称，如果是特殊行政区划则使用城市名称
        let searchLocation = district;
        if (district === '市辖区' || district === '省直辖县级行政区划' || !district) {
          searchLocation = cityName;
        }
        
        let fullLocation = searchLocation;
        if (selectedRegionNames.length >= 1) {
          // 如果有省份信息，拼接完整地址
          const province = selectedRegionNames[0];
          if (!fullLocation.includes(province)) {
            fullLocation = `${province}${fullLocation}`;
          }
        }
        
        const envRes = await fetch('/api/enhanced-ai-analysis/analyze-business-environment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: fullLocation, // 使用完整地址
            poiList,
            saveToDB: false
          })
        });
        
        if (envRes.ok) {
          envData = await envRes.json();
        } else {
          const errorText = await envRes.text();
          console.warn('商业环境分析API返回错误:', envRes.status, errorText);
        }
      } catch (envError) {
        console.warn('商业环境分析失败，继续使用学校数据:', envError);
        // 不影响主流程，继续执行
      }

      // 3. 生成分析结果
      setAnalysisMessage('正在生成选址建议和热点区域...');
      
      // 计算学校商业价值
      const schoolsWithValue = schools.map(school => ({
        id: school.id,
        name: school.name,
        type: school.type,
        address: school.address,
        location: school.longitude && school.latitude 
          ? [school.longitude, school.latitude] as [number, number]
          : [0, 0] as [number, number],
        longitude: school.longitude || 0,
        latitude: school.latitude || 0,
        district: district || cityName,
        studentCount: school.student_count || school.studentCount || 0,
        features: [],
        description: school.aiAnalysis || '',
        facilities: [],
        achievements: [],
        businessValue: {
          ...calculateBusinessValue(school),
          riskFactors: []
        },
        nearbyBusinesses: { 
          total: 0, 
          categories: {}, 
          businesses: [] 
        },
        competition: { 
          level: 'medium' as const, 
          nearbyHotdogStores: 0, 
          similarBusinesses: 0, 
          marketGap: [] 
        },
        accessibility: { 
          score: 80, 
          busStops: 0, 
          subwayStations: 0, 
          parkingSpaces: 0, 
          walkability: 'good' as const 
        },
        recommendedLocations: {
          primary: {
            id: '',
            name: '',
            address: '',
            location: [0, 0] as [number, number],
            distance: 0,
            reason: '',
            score: 0,
            advantages: [],
            disadvantages: []
          },
          alternatives: []
        },
        financialProjection: { 
          estimatedRevenue: 0, 
          estimatedCost: 0, 
          estimatedProfit: 0, 
          breakEvenMonths: 0, 
          riskLevel: 'medium' as const 
        },
        student_count: school.student_count || school.studentCount || 0,
        teacher_count: school.teacher_count || 0,
        rating: school.rating || 0,
        aiAnalysis: school.aiAnalysis || '',
        savedToDB: school.savedToDB,
        recordId: school.recordId
      }));

      // 生成热点区域和推荐建议
      const hotspots = generateHotspots(schoolsWithValue, envData.success ? envData.data : undefined);
      const recommendations = generateRecommendations(
        schoolsWithValue, 
        cityName,
        envData.success ? envData.data : undefined,
        district
      );

      // 计算统计数据
      const totalStudents = schoolsWithValue.reduce((sum, s) => sum + (s.student_count || 0), 0);
      const highValueSchools = schoolsWithValue.filter(s => s.businessValue?.level === 'high').length;
      const mediumValueSchools = schoolsWithValue.filter(s => s.businessValue?.level === 'medium').length;
      const lowValueSchools = schoolsWithValue.filter(s => s.businessValue?.level === 'low').length;
      const averageStudentCount = totalStudents / schoolsWithValue.length;

      // 构建最终分析结果
      const finalResult: AnalysisResult = {
        schools: schoolsWithValue,
        businesses: [],
        hotspots,
        recommendations,
        enhancedAI: {
          schools: schoolsWithValue,
          businessEnvironment: envData.success ? envData.data : undefined,
          analysisSummary: generateAnalysisSummary(schoolsWithValue, envData.success ? envData.data : undefined)
        },
        totalSchools: schoolsWithValue.length,
        highValueSchools,
        mediumValueSchools,
        lowValueSchools: schoolsWithValue.length - highValueSchools - mediumValueSchools,
        statistics: {
          averageStudentCount: Math.round(totalStudents / schoolsWithValue.length),
          averageBusinessValue: 75, // 默认值
          topBusinessCategories: ['文具店', '零食店', '奶茶店'],
          marketOpportunities: [
            '学校密集区域，学生消费潜力大',
            '周边商业环境良好',
            '交通便利，人流量大'
          ]
        },
        city: cityName,
        district: district || '',
        analysisDate: new Date().toLocaleDateString(),
        exportConfig: {
          format: 'excel',
          includeCharts: true,
          includeMaps: true
        }
      };

      // 更新状态
      setAnalysisResult(finalResult);
      setAnalysisMessage('增强AI分析完成！');
      message.success(`✅ 增强AI选址分析完成，共分析${schoolsWithValue.length}所学校`);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '分析失败，请检查网络';
      console.error('❌ AI分析失败:', errMsg);
      setAnalysisMessage(errMsg);
      message.error(`AI分析失败：${errMsg}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    selectedRegion, 
    cityName, 
    selectedRegionNames, 
    buildRegionUrl, 
    calculateBusinessValue,
    generateHotspots,
    generateRecommendations,
    generateAnalysisSummary
  ]);

  // ========================== 3.5 地图相关函数 ==========================
  /**
   * 添加标记到地图（学校位置）
   */
  const addMarkersToMap = useCallback((map: any) => {
    if (!analysisResult?.schools) return;

    try {
      // 不清除地图，保留基础地图元素

      analysisResult.schools.forEach((school, index) => {
        if (!school.longitude || !school.latitude) return;

        const getBusinessColor = (level?: string) => {
          if (level === 'high') return '#52c41a';
          if (level === 'medium') return '#faad14';
          return '#ff4d4f';
        };

        const marker = new window.AMap.Marker({
          position: [school.longitude, school.latitude],
          title: school.name,
          content: `
            <div style="
              width: 24px; 
              height: 24px; 
              border-radius: 50%; 
              background-color: ${getBusinessColor(school.businessValue?.level)}; 
              border: 2px solid white; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 10px; 
              color: white; 
              font-weight: bold;
            ">
              ${school.businessValue?.score || school.rating || '?'}
            </div>
          `
        });

        marker.on('click', () => {
          handleViewSchoolDetail(school);
        });

        map.add(marker);
      });

      console.log(`✅ 已添加 ${analysisResult.schools.length} 个学校标记`);
    } catch (error) {
      console.error('添加标记到地图失败:', error);
    }
  }, [analysisResult]);

  /**
   * 添加用户选中的铺位标记到地图
   */
  const addSelectedShopMarkers = useCallback((map: any) => {
    if (!selectedShops || selectedShops.length === 0) return;

    try {
      selectedShops.forEach((shop) => {
        if (!shop.longitude || !shop.latitude) return;

        const marker = new window.AMap.Marker({
          position: [shop.longitude, shop.latitude],
          title: shop.name,
          content: `
            <div style="
              width: 36px; 
              height: 36px; 
              border-radius: 50%; 
              background-color: #ff4d4f; 
              border: 4px solid white; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.5); 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 20px;
              color: white;
            ">
              ✓
            </div>
          `,
          zIndex: 1500 // 确保选中的铺位标记在学校标记之上
        });

        marker.on('click', () => {
          handleViewSchoolDetail(shop);
        });

        map.add(marker);
      });

      console.log(`✅ 已添加 ${selectedShops.length} 个选中铺位标记`);
    } catch (error) {
      console.error('添加选中铺位标记失败:', error);
    }
  }, [selectedShops]);

  /**
   * 添加推荐位置标注到地图（智能分析建议的店铺位置）
   */
  const addRecommendationsToMap = useCallback((map: any) => {
    if (!analysisResult?.recommendations || !map) return;

    try {
      // 添加推荐位置标注（使用不同的图标样式）
      analysisResult.recommendations.forEach((rec: any, index: number) => {
        // recommendations可能是字符串数组，需要检查格式
        if (typeof rec === 'string') return; // 跳过字符串类型的推荐
        
        if (!rec.location || !Array.isArray(rec.location) || rec.location.length !== 2) {
          // 尝试从hotspots获取推荐位置
          const hotspot = analysisResult.hotspots?.[index];
          if (hotspot && hotspot.center && hotspot.center.length === 2) {
            const [lng, lat] = hotspot.center;
            addRecommendationMarker(map, lng, lat, `推荐位置 ${index + 1}`, rec || hotspot.reason || 'AI智能推荐', index);
          }
          return;
        }

        const [lng, lat] = rec.location;
        if (!lng || !lat) return;

        addRecommendationMarker(map, lng, lat, `推荐位置 ${index + 1}`, rec.reason || 'AI智能推荐', index);
      });

      console.log(`✅ 已添加推荐位置标注`);
    } catch (error) {
      console.error('添加推荐位置标注失败:', error);
    }
  }, [analysisResult]);

  /**
   * 添加单个推荐位置标记
   */
  const addRecommendationMarker = useCallback((map: any, lng: number, lat: number, title: string, reason: string, index: number) => {
    try {
      // 使用InfoWindow显示推荐信息
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <div style="font-weight: bold; color: #1890ff; margin-bottom: 4px;">
              🎯 ${title}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              ${reason}
            </div>
            <div style="font-size: 11px; color: #999; margin-top: 8px;">
              <button onclick="window.confirmRecommendation(${lng}, ${lat}, '${reason.replace(/'/g, "\\'")}')" 
                      style="background: #1890ff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                确认保存
              </button>
            </div>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -30)
      });

      // 创建推荐位置标记（使用星形图标）
      const marker = new window.AMap.Marker({
        position: [lng, lat],
        title: title,
        content: `
          <div style="
            width: 32px; 
            height: 32px; 
            background-color: #1890ff; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.4); 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px;
            color: white;
          ">
            ⭐
          </div>
        `,
        zIndex: 1000 // 确保推荐标记在最上层
      });

      marker.on('click', () => {
        infoWindow.open(map, [lng, lat]);
      });

      map.add(marker);
    } catch (error) {
      console.error('添加推荐标记失败:', error);
    }
  }, []);

  /**
   * 初始化基础地图（仅显示城市区域，不依赖分析结果）
   */
  const initBaseMap = useCallback(() => {
    if (!mapRef.current || !cityName) {
      return;
    }

    try {
      if (typeof window === 'undefined' || !window.AMap) {
        console.warn('高德地图API未加载');
        return;
      }

      // 如果地图已经初始化，先销毁
      if (amapRef.current) {
        try {
          amapRef.current.destroy();
        } catch (e) {
          console.warn('清理旧地图实例失败:', e);
        }
        amapRef.current = null;
      }

      const container = mapRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(() => initBaseMap(), 200);
        return;
      }

      // 使用城市名称进行地理编码获取中心点
      // 默认使用常见城市的坐标（如果地理编码失败）
      const defaultCenters: Record<string, [number, number]> = {
        '北京市': [116.3974, 39.9093],
        '天津市': [117.2008, 39.0842],
        '上海市': [121.4737, 31.2304],
        '重庆市': [106.5516, 29.5630],
        '沈阳市': [123.4315, 41.8057],
        '大连市': [121.6147, 38.9140],
        '辽阳市': [123.1724, 41.2673],
        '滨州市': [118.0169, 37.3835],
      };

      const defaultCenter = defaultCenters[cityName] || [116.3974, 39.9093]; // 默认北京

      const map = new window.AMap.Map(container, {
        center: defaultCenter,
        zoom: 12,
        mapStyle: 'amap://styles/normal',
        features: ['bg', 'road', 'building', 'point']
      });

      // 添加定位控件
      try {
        const geolocation = new window.AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          buttonOffset: new window.AMap.Pixel(10, 20),
          zoomToAccuracy: true,
          buttonPosition: 'RB' // 右下角
        });
        map.addControl(geolocation);
        geolocation.getCurrentPosition((status: string, result: any) => {
          if (status === 'complete') {
            console.log('✅ 定位成功:', result.formattedAddress);
          } else {
            console.warn('定位失败:', result.message);
          }
        });
      } catch (e) {
        console.warn('添加定位控件失败:', e);
      }

      // 添加图层切换控件（卫星图、路网图等）
      try {
        const mapType = new window.AMap.MapType({
          defaultType: 0, // 0-标准 1-卫星 2-路网
          showRoad: true, // 显示路网图层
          showTraffic: false // 不显示实时路况
        });
        map.addControl(mapType);
      } catch (e) {
        console.warn('添加图层切换控件失败:', e);
      }

      // 添加比例尺控件
      try {
        map.addControl(new window.AMap.Scale({
          position: 'LB' // 左下角
        }));
      } catch (e) {
        console.warn('添加比例尺控件失败:', e);
      }

      // 添加工具栏控件
      try {
        map.addControl(new window.AMap.ToolBar({
          position: 'RT' // 右上角
        }));
      } catch (e) {
        console.warn('添加工具栏控件失败:', e);
      }

      amapRef.current = map;

      map.on('complete', () => {
        setMapLoaded(true);
        setMapError('');
        console.log('✅ 基础地图初始化完成，中心点:', defaultCenter, '城市:', cityName);
        console.log('📍 准备添加铺位标记，铺位数量:', shops.length);
        
        // 如果有学校/铺位数据，延迟添加标记（确保地图完全加载）
        if (shops.length > 0) {
          setTimeout(() => {
            console.log('🔍 开始添加铺位标记到地图...');
            addShopMarkersToMap(map, shops);
          }, 500);
        } else {
          console.warn('⚠️ 没有铺位数据可显示');
        }
      });

      map.on('error', (e: any) => {
        console.error('❌ 地图加载错误:', e);
        const errorDetail = e.message || e.error || '未知错误';
        const fullErrorMsg = `地图加载错误: ${errorDetail}。如果使用IP访问，请确保在高德地图控制台添加了IP白名单`;
        setMapError(fullErrorMsg);
        message.error('地图加载失败，请检查API配置');
      });

    } catch (error) {
      console.error('基础地图初始化失败:', error);
      setMapError('地图初始化失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }, [cityName]);

  /**
   * 初始化高德地图（带分析结果）
   */
  const initMap = useCallback(() => {
    if (!mapRef.current || !analysisResult?.schools || analysisResult.schools.length === 0) {
      return;
    }

    try {
      if (typeof window === 'undefined' || !window.AMap) {
        console.warn('高德地图API未加载');
        return;
      }

      // 如果地图已经初始化，先销毁
      if (amapRef.current) {
        try {
          amapRef.current.destroy();
        } catch (e) {
          console.warn('清理旧地图实例失败:', e);
        }
        amapRef.current = null;
      }

      const container = mapRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(() => initMap(), 200);
        return;
      }

      // 计算地图中心点（基于学校坐标）
      const schoolsWithCoords = analysisResult.schools.filter(s => s.longitude && s.latitude);
      if (schoolsWithCoords.length === 0) {
        setMapError('没有有效的学校坐标数据');
        return;
      }

      const lngs = schoolsWithCoords.map(s => s.longitude);
      const lats = schoolsWithCoords.map(s => s.latitude);
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

      const map = new window.AMap.Map(container, {
        center: [centerLng, centerLat],
        zoom: 13,
        mapStyle: 'amap://styles/normal',
        features: ['bg', 'road', 'building', 'point']
      });

      amapRef.current = map;

      map.on('complete', () => {
        setMapLoaded(true);
        setMapError('');
        addMarkersToMap(map);
        // 延迟添加推荐位置，确保学校标记先显示
        setTimeout(() => {
          addRecommendationsToMap(map);
        }, 500);
      });

      map.on('error', (e: any) => {
        console.error('地图加载错误:', e);
        setMapError('地图加载错误: ' + (e.message || '未知错误'));
      });

    } catch (error) {
      console.error('高德地图初始化失败:', error);
      setMapError('地图初始化失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }, [analysisResult, addMarkersToMap, addRecommendationsToMap, addSelectedShopMarkers]);

  /**
   * 加载高德地图脚本
   */
  const loadAmapScript = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (window.AMap) {
      // 如果有分析结果，初始化完整地图；否则初始化基础地图
      if (analysisResult?.schools && analysisResult.schools.length > 0) {
        initMap();
      } else if (cityName) {
        initBaseMap();
      }
      return;
    }

    if (document.querySelector('script[src*="webapi.amap.com"]')) {
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkInterval);
          // 如果有分析结果，初始化完整地图；否则初始化基础地图
          if (analysisResult?.schools && analysisResult.schools.length > 0) {
            initMap();
          } else if (cityName) {
            initBaseMap();
          }
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    const plugins = AMAP_CONFIG.plugins.join(',');
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=${plugins}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('✅ 高德地图脚本加载成功');
      setTimeout(() => {
        if (window.AMap) {
          console.log('✅ 高德地图API对象已就绪');
          // 如果有分析结果，初始化完整地图；否则初始化基础地图
          if (analysisResult?.schools && analysisResult.schools.length > 0) {
            console.log('🔍 初始化完整地图（有分析结果）');
            initMap();
          } else if (cityName) {
            console.log('🔍 初始化基础地图（城市:', cityName, ')');
            initBaseMap();
          }
        } else {
          console.error('❌ 高德地图API对象未找到');
          setMapError('高德地图API对象未找到，可能是API Key配置问题，请检查高德地图控制台的域名/IP白名单设置');
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('❌ 高德地图脚本加载失败:', error);
      const errorMsg = '高德地图脚本加载失败。可能原因：1) 网络连接问题 2) API Key无效或域名/IP未在白名单中。请检查高德地图控制台的域名/IP白名单设置（需要添加当前访问的域名或IP地址）';
      setMapError(errorMsg);
      message.error('地图加载失败，请检查网络连接和API配置');
    };
    
    document.head.appendChild(script);
    console.log('📥 正在加载高德地图脚本:', script.src);
  }, [initMap, initBaseMap, analysisResult, cityName]);

  // 监听分析结果变化，初始化地图并添加标注
  useEffect(() => {
    if (analysisResult?.schools && analysisResult.schools.length > 0 && mapRef.current) {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.AMap) {
          initMap();
        } else {
          loadAmapScript();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult?.schools?.length]); // 只依赖学校数量，避免无限循环

  // 监听城市变化，优先显示GIS地图（即使没有分析结果）
  useEffect(() => {
    if (cityName && cityName !== '未知城市' && mapRef.current && !analysisResult) {
      // 先初始化一个基础地图，显示城市区域
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.AMap) {
          initBaseMap();
        } else {
          loadAmapScript();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName]); // 只依赖城市名称

  // ========================== 3.6 UI渲染函数（拆分渲染逻辑） ==========================
  /**
   * 渲染地区选择和分析控制区
   */
  const renderControlSection = () => (
    <div style={STYLE.card}>
      {/* 地区选择和AI分析按钮 - 水平布局 */}
                  <div style={{
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '16px',
                  marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        {/* 左侧：地区选择器 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            选择分析区域:
                </div>
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            color: '#999',
            textAlign: 'center'
          }}>
            地区选择功能暂未实现
          </div>
                        </div>
                        
        {/* 右侧：AI分析按钮 */}
          <div>
          {selectedRegionNames.length >= 3 ? (
                          <Button
              type="primary" 
              size="large" 
              onClick={handleAIanalysis}
              loading={isAnalyzing}
              style={{ 
                height: '48px', 
                fontSize: '16px', 
                padding: '0 32px',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              {isAnalyzing ? 'AI分析中...' : 'Q 开始AI智能分析'}
                          </Button>
          ) : (
            <Button
              disabled
              size="large"
              style={{ 
                height: '48px', 
                fontSize: '16px', 
                padding: '0 32px',
                borderRadius: '8px'
              }}
            >
              请先选择区域
            </Button>
          )}
        </div>
      </div>

      {/* 状态提示信息 */}
      <div style={{ marginBottom: '16px' }}>
        {selectedRegionNames.length >= 3 && !isAnalyzing && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            color: '#52c41a',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ✅ 已选择: {selectedRegionNames.join(' / ')}, 点击开始分析
            {cityName && (
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                搜索区域: {cityName}
              </div>
            )}
          </div>
        )}

        {selectedRegionNames.length < 3 && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#fff7e6', 
            border: '1px solid #ffd591',
            borderRadius: '6px',
            color: '#d46b08',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ⚠️ 请先选择到区县级别（省份+城市+区县），然后点击AI分析
          </div>
        )}

        {isAnalyzing && (
                  <div style={{
            padding: '12px 16px',
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff',
            borderRadius: '6px',
            color: '#1890ff',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            🔄 AI正在分析中，请稍候...
                </div>
              )}

        {analysisMessage && !isAnalyzing && (
                  <div style={{
            padding: '12px 16px',
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            color: '#52c41a',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            📊 {analysisMessage}
                </div>
              )}
                  </div>
                    </div>
  );

  /**
   * 渲染分析结果概览（关键指标）
   */
  const renderResultOverview = () => {
    if (!analysisResult) return null;

    const { 
      schools = [], 
      statistics = { averageStudentCount: 0 }
    } = analysisResult;

    return (
      <div style={STYLE.card}>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#1890ff',
          marginBottom: '24px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
          border: '1px solid #91d5ff',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          📊 AI分析结果
        </div>

        {/* 关键指标卡片 - 优化布局 */}
        <Row gutter={[20, 20]}>
          <Col span={6}>
            <div style={{
              ...STYLE.statCard,
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
              border: '2px solid #b7eb8f',
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.15)'
            }}>
              <div style={{...STYLE.statValue('#52c41a'), fontSize: '42px'}}>{schools.length}</div>
              <div style={{...STYLE.statLabel, fontSize: '16px', fontWeight: 'bold'}}>目标学校</div>
              <div style={{...STYLE.statSubLabel('#52c41a'), fontSize: '14px'}}>
                {analysisResult.highValueSchools || 0}所高价值
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{
              ...STYLE.statCard,
              background: 'linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%)',
              border: '2px solid #ffd591',
              boxShadow: '0 4px 12px rgba(250, 173, 20, 0.15)'
            }}>
              <div style={{...STYLE.statValue('#faad14'), fontSize: '42px'}}>
                {statistics.averageStudentCount.toLocaleString()}
              </div>
              <div style={{...STYLE.statLabel, fontSize: '16px', fontWeight: 'bold'}}>平均学生数</div>
              <div style={{...STYLE.statSubLabel('#faad14'), fontSize: '14px'}}>人/校</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{
              ...STYLE.statCard,
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
              border: '2px solid #91d5ff',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)'
            }}>
              <div style={{...STYLE.statValue('#1890ff'), fontSize: '42px'}}>2</div>
              <div style={{...STYLE.statLabel, fontSize: '16px', fontWeight: 'bold'}}>推荐位置</div>
              <div style={{...STYLE.statSubLabel('#1890ff'), fontSize: '14px'}}>热点区域</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{
              ...STYLE.statCard,
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
              border: '2px solid #b7eb8f',
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.15)'
            }}>
              <div style={{...STYLE.statValue('#52c41a'), fontSize: '42px'}}>✓</div>
              <div style={{...STYLE.statLabel, fontSize: '16px', fontWeight: 'bold'}}>商业环境</div>
              <div style={{...STYLE.statSubLabel('#52c41a'), fontSize: '14px'}}>优秀</div>
            </div>
          </Col>
        </Row>
        
        
        {/* 总体推荐（如果有） */}
        {analysisResult.analysisSummary && (
          <div style={{ 
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px',
            color: '#1890ff'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              🎯 总体推荐
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {analysisResult.analysisSummary}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染学校数据表格（合并列表和详情）
   */
  const renderSchoolTable = () => {
    if (!analysisResult || !analysisResult.schools || analysisResult.schools.length === 0) {
      return null;
    }

    const schools = analysisResult.schools;
    const total = schools.length;

    // 表格列定义 - 合并学校列表和详情的完整布局
    const columns = [
      {
        title: (
          <Checkbox
            checked={selectedSchoolIds.size > 0 && selectedSchoolIds.size === schools.length}
            indeterminate={selectedSchoolIds.size > 0 && selectedSchoolIds.size < schools.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        ),
        key: 'selection',
        width: 50,
        render: (_: any, record: any) => (
          <Checkbox
            checked={selectedSchoolIds.has(record.id?.toString() || '')}
            onChange={(e) => handleSchoolSelectionChange(record.id?.toString() || '', e.target.checked)}
          />
        ),
      },
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 60,
        render: (text: any, record: any, index: number) => (currentPage - 1) * pageSize + index + 1,
      },
      {
        title: '学校名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        ellipsis: true,
        render: (text: string, record: any) => (
          <Button
            type="link"
            onClick={() => handleViewSchoolDetail(record)}
            style={{ padding: 0, fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}
          >
            {text}
          </Button>
        ),
      },
      {
        title: '学校地址',
        dataIndex: 'address',
        key: 'address',
        width: 250,
        ellipsis: true,
        render: (text: string) => (
          <div style={{ color: '#666', fontSize: '12px' }}>
            {text}
          </div>
        ),
      },
      {
        title: '学校类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (text: string) => (
          <Tag color="blue" style={{ fontSize: '11px' }}>{text}</Tag>
        ),
      },
      {
        title: '学生数量',
        dataIndex: 'studentCount',
        key: 'studentCount',
        width: 100,
        render: (text: number) => (
          <div style={{ fontWeight: 'bold', color: '#faad14', textAlign: 'center' }}>
            {text ? text.toLocaleString() : 0}
          </div>
        ),
      },
      {
        title: '商业价值',
        dataIndex: 'businessValue',
        key: 'businessValue',
        width: 120,
        render: (businessValue: any) => {
          if (!businessValue) return <Tag color="default" style={{ fontSize: '11px' }}>未知</Tag>;
          const level = businessValue.level;
          const color = level === 'high' ? 'green' : level === 'medium' ? 'orange' : 'red';
          const text = level === 'high' ? '高价值' : level === 'medium' ? '中价值' : '低价值';
          return <Tag color={color} style={{ fontSize: '11px' }}>{text}</Tag>;
        },
      },
      {
        title: '评分',
        dataIndex: 'businessValue',
        key: 'score',
        width: 80,
        render: (businessValue: any) => (
          <div style={{ fontWeight: 'bold', color: '#1890ff', textAlign: 'center' }}>
            {businessValue?.score ? businessValue.score.toFixed(1) : '--'}
          </div>
        ),
      },
      {
        title: '坐标',
        dataIndex: 'location',
        key: 'location',
        width: 150,
        render: (location: any, record: any) => (
          <div style={{ fontSize: '11px', color: '#999', textAlign: 'center' }}>
            {record.longitude && record.latitude 
              ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
              : '--'
            }
          </div>
        ),
      },
    ];

    // 分页配置
    const pagination = {
      current: currentPage,
      pageSize: pageSize,
      total: total,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total: number, range: [number, number]) => 
        `第 ${range[0]}-${range[1]} 条，共 ${total} 条数据`,
      pageSizeOptions: ['10', '20', '50', '100'],
      onChange: (page: number, size: number) => {
        setCurrentPage(page);
        setPageSize(size);
      },
    };

    return (
      <div style={STYLE.card}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1890ff',
              marginBottom: '16px',
              padding: '12px 16px',
          background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
          border: '1px solid #91d5ff',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          📊 学校数据详情 ({total} 所学校)
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleOpenSaveModal}
                  disabled={selectedSchoolIds.size === 0}
                >
                  保存选中 ({selectedSchoolIds.size})
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveAllToDB}
                  loading={savingSchools}
                >
                  保存全部
                </Button>
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <Button
                    icon={<UnorderedListOutlined />}
                    onClick={handleViewRecommendations}
                  >
                    推荐位置列表 ({analysisResult.recommendations.length})
                  </Button>
                )}
                <Button
                  icon={<SyncOutlined />}
                  onClick={handleRefreshSchoolDetails}
                  loading={refreshingSchools}
                  title="使用AI重新获取学校的学生人数、教师人数等详细信息"
                >
                  刷新学校数据
                </Button>
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    const selected = (analysisResult?.schools || []).filter(s => 
                      selectedSchoolIds.has(s.id?.toString() || '')
                    );
                    setSelectedShops(selected);
                    message.success(`已选中 ${selected.length} 个铺位，可在城市地图Tab查看`);
                  }}
                  disabled={selectedSchoolIds.size === 0}
                >
                  标记为选中铺位 ({selectedSchoolIds.size})
                </Button>
              </Space>
            </div>

        <Table
          columns={columns}
          dataSource={schools}
          rowKey="id"
          pagination={pagination}
          scroll={{ x: 1200 }}
          size="middle"
          bordered
          style={{
            backgroundColor: '#fff',
          }}
          rowClassName={(record, index) => 
            index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
          }
              />
            </div>
    );
  };


  // 铺位数据状态
  const [shops, setShops] = useState<any[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  /**
   * 加载该区域的学校数据（已保存到数据库的）
   */
  const loadShopsForCity = useCallback(async () => {
    if (!cityName || cityName === '未知城市') return;
    
    setShopsLoading(true);
    try {
      // 获取该城市的学校数据（从school_basic_info表）
      const district = selectedRegionNames.length >= 3 ? selectedRegionNames[2] : '';
      const url = buildRegionUrl(cityName, district);
      
      console.log(`📤 请求API: ${url}?saveToDB=false&limit=500`);
      const res = await fetch(`${url}?saveToDB=false&limit=500`);
      
      if (!res.ok) {
        console.error(`❌ API请求失败: ${res.status} ${res.statusText}`);
        setShops([]);
        return;
      }
      
      const data = await res.json();
      console.log(`📥 API响应:`, { 
        success: data.success, 
        dataCount: Array.isArray(data.data) ? data.data.length : 0,
        message: data.message 
      });
      
      // 处理响应：无论是否有数据，都返回成功，只是data为空数组
      if (data.success !== false) {
        // 转换学校数据格式为shops格式
        const schools = Array.isArray(data.data) ? data.data : [];
        
        if (schools.length === 0) {
          console.log(`ℹ️ ${cityName}${district ? '/' + district : ''}暂无学校数据`);
          setShops([]);
          return; // 没有数据，直接返回
        }
        
        console.log(`📥 API返回${schools.length}所学校数据 (${cityName}${district ? '/' + district : ''})`);
        
        const formattedShops = schools.map((school: any) => ({
          shop_name: school.name || school.school_name || '学校',
          shop_address: school.address || '',
          latitude: school.latitude,
          longitude: school.longitude,
          student_count: school.student_count || school.studentCount || 0,
          teacher_count: school.teacher_count || 0,
          school_type: school.type || school.school_type || '未知',
          id: school.id,
          type: 'school' // 标识为学校数据
        }));
        
        // 检查有效坐标的数据数量
        const validShops = formattedShops.filter((shop: any) => 
          shop.latitude && shop.longitude && 
          shop.latitude !== 0 && shop.longitude !== 0
        );
        console.log(`✅ 有效坐标的铺位: ${validShops.length}/${formattedShops.length}`);
        
        if (validShops.length > 0) {
          console.log('📍 铺位坐标示例:', validShops.slice(0, 3).map((s: any) => 
            `${s.shop_name}: (${s.longitude}, ${s.latitude})`
          ));
        }
        
        setShops(formattedShops);
        console.log(`✅ 已设置${formattedShops.length}个铺位到状态`);
        
        // 如果地图已经加载，立即添加标记
        if (amapRef.current && mapLoaded) {
          console.log('🗺️ 地图已加载，立即添加铺位标记...');
          setTimeout(() => {
            addShopMarkersToMap(amapRef.current, formattedShops);
          }, 500);
        }
      } else {
        // 只有在明确失败时才显示错误
        console.warn('❌ 加载学校数据失败:', data.message || '未知错误');
        setShops([]);
      }
    } catch (error) {
      console.error('加载学校数据失败:', error);
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, [cityName, selectedRegionNames, buildRegionUrl]);

  /**
   * 在地图上添加学校标记
   */
  const addShopMarkersToMap = useCallback((map: any, shops: any[]) => {
    if (!map) {
      console.error('❌ 无法添加标记：地图对象为空');
      return;
    }
    
    if (!shops || shops.length === 0) {
      console.warn('⚠️ 无法添加标记：铺位数据为空');
      return;
    }
    
    console.log('📍 开始添加铺位标记，铺位数量:', shops.length, '地图对象:', !!map);
    console.log('📍 铺位数据示例:', shops.slice(0, 3));

    let addedCount = 0;
    shops.forEach((shop: any) => {
      // 支持两种数据格式：
      // 1. 学校格式：latitude, longitude
      // 2. 铺位格式：location字符串（"lng,lat"）
      let lng: number | null = null;
      let lat: number | null = null;

      if (shop.longitude && shop.latitude) {
        // 学校数据格式
        lng = parseFloat(shop.longitude);
        lat = parseFloat(shop.latitude);
      } else if (shop.location) {
        // 铺位数据格式（location字符串）
        const locationStr = shop.location.toString();
        const coordMatch = locationStr.match(/(\d+\.?\d*)[,，]\s*(\d+\.?\d*)/);
        if (coordMatch) {
          lng = parseFloat(coordMatch[1]);
          lat = parseFloat(coordMatch[2]);
        }
      }

      // 如果没有有效坐标，跳过
      if (!lng || !lat || isNaN(lng) || isNaN(lat)) {
        console.warn(`跳过无效坐标的数据:`, shop.shop_name || shop.name);
        return;
      }

      try {
        // 根据数据类型选择不同的标记样式
        const isSchool = shop.type === 'school' || shop.school_type || shop.student_count !== undefined;
        const markerColor = isSchool ? '#1890ff' : '#52c41a'; // 蓝色表示学校，绿色表示铺位
        const icon = isSchool ? '🏫' : '🏪';

        const marker = new window.AMap.Marker({
          position: [lng, lat],
          title: shop.shop_name || shop.name || '位置',
          content: `
            <div style="
              width: 28px; 
              height: 28px; 
              background-color: ${markerColor}; 
              border: 2px solid white; 
              border-radius: 50%; 
              box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            ">
              ${icon}
            </div>
          `,
          zIndex: 500,
          extData: 'shop' // 标记为铺位/学校数据
        });

        // 构建信息窗口内容
        let infoContent = `
          <div style="padding: 12px; min-width: 280px; max-width: 350px;">
            <div style="font-weight: bold; color: ${markerColor}; margin-bottom: 8px; font-size: 16px;">
              ${icon} ${shop.shop_name || shop.name || '位置'}
            </div>
            <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
              <strong>地址：</strong>${shop.shop_address || shop.address || '未知'}
            </div>
        `;

        // 如果是学校，显示学校相关信息
        if (isSchool) {
          if (shop.school_type || shop.type) {
            infoContent += `<div style="font-size: 13px; color: #666; margin-bottom: 4px;"><strong>类型：</strong>${shop.school_type || shop.type}</div>`;
          }
          if (shop.student_count || shop.studentCount) {
            infoContent += `<div style="font-size: 13px; color: #666; margin-bottom: 4px;"><strong>学生人数：</strong>${(shop.student_count || shop.studentCount).toLocaleString()}人</div>`;
          }
          if (shop.teacher_count) {
            infoContent += `<div style="font-size: 13px; color: #666; margin-bottom: 4px;"><strong>教师人数：</strong>${shop.teacher_count}人</div>`;
          }
        }

        // 如果是铺位，显示铺位相关信息
        if (!isSchool) {
          if (shop.rent_amount) {
            infoContent += `<div style="font-size: 13px; color: #666; margin-bottom: 4px;"><strong>租金：</strong>¥${shop.rent_amount.toLocaleString()}/月</div>`;
          }
          if (shop.area_size) {
            infoContent += `<div style="font-size: 13px; color: #666; margin-bottom: 4px;"><strong>面积：</strong>${shop.area_size}㎡</div>`;
          }
          if (shop.status) {
            infoContent += `<div style="font-size: 13px; color: #666;"><strong>状态：</strong>${shop.status}</div>`;
          }
        }

        infoContent += `</div>`;

        const infoWindow = new window.AMap.InfoWindow({
          content: infoContent,
          offset: new window.AMap.Pixel(0, -30)
        });

        marker.on('click', () => {
          infoWindow.open(map, [lng, lat]);
        });

        map.add(marker);
        addedCount++;
      } catch (error) {
        console.error('添加标记失败:', error, shop);
      }
    });

    console.log(`✅ 已添加 ${addedCount}/${shops.length} 个标记到地图`);
    
    if (addedCount === 0) {
      console.warn('⚠️ 没有成功添加任何标记，可能原因：1) 坐标数据无效 2) 地图未完全加载');
    }
    
    // 如果有标记，调整地图视野以显示所有标记
    if (addedCount > 0 && map && map.setFitView) {
      setTimeout(() => {
        try {
          const markers = map.getAllOverlays('marker') || [];
          console.log('📊 地图上的标记总数:', markers.length);
          if (markers.length > 0) {
            map.setFitView(markers, false, [50, 50, 50, 50]); // 边距
            console.log('✅ 地图视野已调整为显示所有标记');
          } else {
            console.warn('⚠️ 未找到任何标记，无法调整视野');
          }
        } catch (e) {
          console.warn('❌ 调整地图视野失败:', e);
        }
      }, 500);
    }
  }, []);

  // 城市地图模式：当城市名称或区县变化时，加载铺位数据（使用防抖避免重复调用）
  const loadShopsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // 清除之前的定时器
    if (loadShopsTimeoutRef.current) {
      clearTimeout(loadShopsTimeoutRef.current);
    }
    
    // 无论是城市地图模式还是智能分析模式，只要选择了区县，都应该加载数据
    if (cityName && cityName !== '未知城市') {
      const district = selectedRegionNames.length >= 3 ? selectedRegionNames[2] : '';
      const hasDistrict = district && district !== '';
      
      // 如果选择了区县，或者在城市地图模式下，都加载数据
      if (hasDistrict || showCityMapOnly) {
        // 使用防抖，避免快速切换时重复调用
        loadShopsTimeoutRef.current = setTimeout(() => {
          console.log('🔄 城市或区县变化，重新加载铺位数据:', { 
            cityName, 
            district, 
            showCityMapOnly,
            hasDistrict 
          });
          loadShopsForCity();
        }, 300); // 300ms防抖
      }
    }
    
    // 清理函数
    return () => {
      if (loadShopsTimeoutRef.current) {
        clearTimeout(loadShopsTimeoutRef.current);
      }
    };
  }, [showCityMapOnly, cityName, selectedRegionNames.length, loadShopsForCity]); // 只依赖长度，避免对象引用变化导致重复调用

  // 城市地图模式：初始化地图并添加铺位标记
  useEffect(() => {
    if (!showCityMapOnly || !cityName || cityName === '未知城市') return;
    
    // 延迟初始化地图，确保DOM已渲染
    const timer = setTimeout(() => {
      if (!amapRef.current && mapRef.current) {
        // 如果地图API已加载，直接初始化；否则加载脚本
        if (typeof window !== 'undefined' && window.AMap) {
          initBaseMap();
        } else {
          loadAmapScript();
        }
      } else if (amapRef.current && mapLoaded && shops.length > 0) {
        // 如果地图已加载，直接添加标记
        addShopMarkersToMap(amapRef.current, shops);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showCityMapOnly, cityName, initBaseMap, mapLoaded, shops, addShopMarkersToMap, loadAmapScript]);

  // 地图加载完成后添加铺位标记
  useEffect(() => {
    if (showCityMapOnly && mapLoaded && amapRef.current && shops.length > 0) {
      // 清除之前的标记（避免重复）
      if (amapRef.current.getAllOverlays) {
        const markers = amapRef.current.getAllOverlays('marker') || [];
        markers.forEach((marker: any) => {
          if (marker.getExtData && marker.getExtData() === 'shop') {
            amapRef.current.remove(marker);
          }
        });
      }
      addShopMarkersToMap(amapRef.current, shops);
    }
  }, [showCityMapOnly, mapLoaded, shops, addShopMarkersToMap]);

  /**
   * 渲染城市地图（仅地图模式）
   */
  const renderCityMapOnly = () => {
    if (!cityName || cityName === '未知城市') {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty description="请先选择城市" />
        </div>
      );
    }

    return (
      <div style={STYLE.card}>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#1890ff',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
          border: '1px solid #91d5ff',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          🗺️ 城市地图 - {cityName}
          {shops.length > 0 && ` (${shops.length} 个${shops[0]?.type === 'school' ? '学校' : '位置'})`}
        </div>

        {shopsLoading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" tip="正在加载铺位数据..." />
          </div>
        )}

        <div style={{ 
          height: '600px', 
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          position: 'relative'
        }}>
          {mapError ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff4d4f',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div>⚠️ {mapError}</div>
              <Button onClick={() => {
                if (analysisResult?.schools && analysisResult.schools.length > 0) {
                  loadAmapScript();
                } else {
                  initBaseMap();
                }
              }}>重试加载地图</Button>
            </div>
          ) : (
            <>
              {!mapLoaded && !mapError && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <Spin size="large" tip="正在加载地图..." />
                </div>
              )}
              <div 
                ref={mapRef} 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  minHeight: '600px',
                  backgroundColor: '#f0f0f0'
                }} 
              />
              {/* 显示用户选中的铺位 */}
              {selectedShops.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxWidth: '300px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                    已选中的铺位 ({selectedShops.length})
                  </div>
                  <List
                    size="small"
                    dataSource={selectedShops}
                    renderItem={(shop, index) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <div style={{ fontSize: '12px', width: '100%' }}>
                          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{shop.name}</div>
                          <div style={{ color: '#666', fontSize: '11px' }}>{shop.address}</div>
                          <Button
                            type="link"
                            size="small"
                            icon={<EnvironmentOutlined />}
                            onClick={() => {
                              if (shop.longitude && shop.latitude && amapRef.current) {
                                amapRef.current.setCenter([shop.longitude, shop.latitude]);
                                amapRef.current.setZoom(16);
                                message.success(`已定位到 ${shop.name}`);
                              }
                            }}
                            style={{ padding: 0, fontSize: '11px', height: 'auto' }}
                          >
                            定位
                          </Button>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ========================== 3.7 主渲染函数 ==========================
  // 如果只显示城市地图，直接返回地图组件
  if (showCityMapOnly) {
    return renderCityMapOnly();
  }

  return (
    <div style={STYLE.container}>
      {/* 地区选择和分析控制区 */}
      {renderControlSection()}

      {/* 分析结果概览 */}
      {renderResultOverview()}

      {/* 学校数据表格 */}
      {renderSchoolTable()}

      {/* GIS图显示 - 用户选择区县后立即显示 */}
      {selectedRegionNames.length >= 3 && (
        <div style={STYLE.card}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#1890ff',
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
            border: '1px solid #91d5ff',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            🗺️ GIS地理信息图 - {selectedRegionNames.join(' / ')}
            {analysisResult && analysisResult.schools && ` (${analysisResult.schools.length} 所学校)`}
          </div>

          <div style={{ 
            height: '500px', 
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            position: 'relative'
          }}>
            {analysisResult && analysisResult.schools && analysisResult.schools.length > 0 ? (
              <>
                {mapError ? (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ff4d4f',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div>⚠️ {mapError}</div>
                    <Button onClick={() => loadAmapScript()}>重试加载地图</Button>
                  </div>
                ) : (
                  <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                )}
              </>
            ) : analysisResult && analysisResult.schools && analysisResult.schools.length === 0 ? (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
                <div style={{ fontSize: '18px', marginBottom: '8px', color: '#ff4d4f', fontWeight: 'bold' }}>
                  数据服务暂时不可用
                </div>
                <div style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                  高德地图API服务暂时不可用，可能是以下原因：
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  padding: '12px 16px',
                  background: 'rgba(255, 77, 79, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 77, 79, 0.2)',
                  textAlign: 'left',
                  maxWidth: '300px'
                }}>
                  <div style={{ marginBottom: '8px' }}>• API密钥每日查询次数已超限</div>
                  <div style={{ marginBottom: '8px' }}>• API密钥配置错误</div>
                  <div style={{ marginBottom: '8px' }}>• 网络连接问题</div>
                  <div>• 请稍后重试或联系管理员</div>
                </div>
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
                <div style={{ fontSize: '18px', marginBottom: '8px', color: '#1890ff', fontWeight: 'bold' }}>
                  已选择区域
                </div>
                <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                  {selectedRegionNames.join(' / ')}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  padding: '8px 16px',
                  background: 'rgba(24, 144, 255, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(24, 144, 255, 0.2)'
                }}>
                  点击"开始AI智能分析"查看学校分布
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 保存学校Modal */}
      <Modal
        title="保存学校数据"
        open={saveModalVisible}
        onOk={() => {
          if (selectedSchoolIds.size === 0) {
            message.warning('请至少选择一所学校');
            return;
          }
          saveSelectedSchoolsToDB(Array.from(selectedSchoolIds));
        }}
        onCancel={() => {
          setSaveModalVisible(false);
          setSelectedSchoolIds(new Set());
        }}
        width={800}
        okText="保存选中"
        cancelText="取消"
        confirmLoading={savingSchools}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button size="small" onClick={() => handleSelectAll(true)}>全选</Button>
            <Button size="small" onClick={() => handleSelectAll(false)}>取消全选</Button>
            <span>已选择 {selectedSchoolIds.size} / {analysisResult?.schools?.length || 0} 所学校</span>
          </Space>
        </div>
        <List
          dataSource={analysisResult?.schools || []}
          pagination={{ pageSize: 10 }}
          renderItem={(school) => (
            <List.Item>
              <Checkbox
                checked={selectedSchoolIds.has(school.id?.toString() || '')}
                onChange={(e) => handleSchoolSelectionChange(school.id?.toString() || '', e.target.checked)}
              >
                <div style={{ marginLeft: 8, flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{school.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {school.type} | {school.student_count?.toLocaleString() || 0}人 | 
                    商业价值: {school.businessValue?.level === 'high' ? '高' : school.businessValue?.level === 'medium' ? '中' : '低'}
                  </div>
                </div>
              </Checkbox>
            </List.Item>
          )}
        />
      </Modal>

      {/* 学校详情Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>学校详细信息</span>
            {selectedSchoolDetail && (
              <Button
                type="link"
                icon={<EnvironmentOutlined />}
                onClick={() => {
                  if (selectedSchoolDetail.longitude && selectedSchoolDetail.latitude && amapRef.current) {
                    amapRef.current.setCenter([selectedSchoolDetail.longitude, selectedSchoolDetail.latitude]);
                    amapRef.current.setZoom(16);
                    message.success('已定位到地图');
                  }
                }}
              >
                地图定位
              </Button>
            )}
          </div>
        }
        open={schoolDetailModalVisible}
        onCancel={() => {
          setSchoolDetailModalVisible(false);
          setSelectedSchoolDetail(null);
        }}
        width={800}
        footer={[
          <Button key="close" onClick={() => {
            setSchoolDetailModalVisible(false);
            setSelectedSchoolDetail(null);
          }}>
            关闭
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => {
              if (selectedSchoolDetail) {
                saveSelectedSchoolsToDB([selectedSchoolDetail.id?.toString() || '']);
              }
            }}
            loading={savingSchools}
          >
            保存到数据库
          </Button>
        ]}
      >
        {selectedSchoolDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="学校名称" span={2}>
              <strong style={{ fontSize: '16px', color: '#1890ff' }}>{selectedSchoolDetail.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="学校类型">
              <Tag color="blue">{selectedSchoolDetail.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="学生数量">
              <strong style={{ color: '#faad14' }}>{selectedSchoolDetail.student_count?.toLocaleString() || 0} 人</strong>
            </Descriptions.Item>
            <Descriptions.Item label="教师数量">
              {selectedSchoolDetail.teacher_count || 0} 人
            </Descriptions.Item>
            <Descriptions.Item label="商业价值">
              <Tag color={
                selectedSchoolDetail.businessValue?.level === 'high' ? 'green' :
                selectedSchoolDetail.businessValue?.level === 'medium' ? 'orange' : 'red'
              }>
                {selectedSchoolDetail.businessValue?.level === 'high' ? '高价值' :
                 selectedSchoolDetail.businessValue?.level === 'medium' ? '中价值' : '低价值'}
              </Tag>
              <span style={{ marginLeft: 8 }}>
                评分: {selectedSchoolDetail.businessValue?.score || 0}/100
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {selectedSchoolDetail.address || '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="坐标">
              {selectedSchoolDetail.longitude && selectedSchoolDetail.latitude
                ? `${selectedSchoolDetail.latitude.toFixed(6)}, ${selectedSchoolDetail.longitude.toFixed(6)}`
                : '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="AI分析" span={2}>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedSchoolDetail.aiAnalysis || '暂无AI分析数据'}
              </div>
            </Descriptions.Item>
            {selectedSchoolDetail.businessValue?.reasons && selectedSchoolDetail.businessValue.reasons.length > 0 && (
              <Descriptions.Item label="评估理由" span={2}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {selectedSchoolDetail.businessValue.reasons.map((reason: string, index: number) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{reason}</li>
                  ))}
                </ul>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 推荐位置列表Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarOutlined style={{ color: '#1890ff' }} />
            <span>AI推荐位置列表</span>
          </div>
        }
        open={recommendationListVisible}
        onCancel={() => {
          setRecommendationListVisible(false);
          setSelectedRecommendation(null);
        }}
        width={900}
        footer={null}
      >
        {analysisResult?.recommendations && analysisResult.recommendations.length > 0 ? (
          <List
            dataSource={analysisResult.recommendations.map((rec: any, index: number) => ({
              ...rec,
              index: index + 1
            }))}
            renderItem={(item: any) => (
              <List.Item
                actions={[
                  <Button
                    key="detail"
                    type="link"
                    onClick={() => handleViewRecommendationDetail(item, item.index)}
                  >
                    查看详情
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#1890ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px'
                  }}>⭐</div>}
                  title={
                    <div>
                      <strong style={{ fontSize: '16px', color: '#1890ff' }}>
                        推荐位置 {item.index}
                      </strong>
                      {item.location && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {item.location[1]?.toFixed(4)}, {item.location[0]?.toFixed(4)}
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      {typeof item === 'string' ? (
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{item}</div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: 8 }}>
                            {item.reason || item.description || 'AI智能推荐'}
                          </div>
                          {item.score && (
                            <Tag color="green">评分: {item.score}/100</Tag>
                          )}
                          {item.advantages && item.advantages.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <strong>优势：</strong>
                              {item.advantages.map((adv: string, idx: number) => (
                                <Tag key={idx} color="green" style={{ marginTop: 4 }}>{adv}</Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无推荐位置数据" />
        )}
      </Modal>

      {/* 推荐位置详情Modal（下钻） */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarOutlined style={{ color: '#1890ff' }} />
            <span>推荐位置详情 - 位置 {selectedRecommendation?.index}</span>
          </div>
        }
        open={!!selectedRecommendation}
        onCancel={() => setSelectedRecommendation(null)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setSelectedRecommendation(null)}>
            关闭
          </Button>,
          selectedRecommendation?.location && (
            <Button
              key="locate"
              type="primary"
              icon={<EnvironmentOutlined />}
              onClick={() => {
                if (amapRef.current && selectedRecommendation.location) {
                  const [lng, lat] = selectedRecommendation.location;
                  amapRef.current.setCenter([lng, lat]);
                  amapRef.current.setZoom(15);
                  message.success('已定位到地图');
                }
              }}
            >
              地图定位
            </Button>
          )
        ]}
      >
        {selectedRecommendation && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="推荐理由">
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                {selectedRecommendation.reason || selectedRecommendation.description || 'AI智能推荐'}
              </div>
            </Descriptions.Item>
            {selectedRecommendation.score && (
              <Descriptions.Item label="推荐评分">
                <Tag color="green" style={{ fontSize: '16px', padding: '4px 12px' }}>
                  {selectedRecommendation.score} / 100
                </Tag>
              </Descriptions.Item>
            )}
            {selectedRecommendation.location && (
              <Descriptions.Item label="位置坐标">
                {selectedRecommendation.location[1]?.toFixed(6)}, {selectedRecommendation.location[0]?.toFixed(6)}
              </Descriptions.Item>
            )}
            {selectedRecommendation.advantages && selectedRecommendation.advantages.length > 0 && (
              <Descriptions.Item label="优势">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {selectedRecommendation.advantages.map((adv: string, index: number) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{adv}</li>
                  ))}
                </ul>
              </Descriptions.Item>
            )}
            {selectedRecommendation.disadvantages && selectedRecommendation.disadvantages.length > 0 && (
              <Descriptions.Item label="劣势">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {selectedRecommendation.disadvantages.map((dis: string, index: number) => (
                    <li key={index} style={{ marginBottom: '4px', color: '#ff4d4f' }}>{dis}</li>
                  ))}
                </ul>
              </Descriptions.Item>
            )}
            {selectedRecommendation.distance && (
              <Descriptions.Item label="距离最近学校">
                {selectedRecommendation.distance} 米
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SiteSelectionModel; 

