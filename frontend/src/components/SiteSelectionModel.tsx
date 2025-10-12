import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Card, Row, Col, Button, message, Divider, Typography, Space, Spin, Alert, Tag, Table 
} from 'antd';
import { 
  InfoCircleOutlined, DownloadOutlined, FileExcelOutlined, ReloadOutlined, 
  EnvironmentOutlined, SaveOutlined 
} from '@ant-design/icons';
import { amapPOIService } from '../services/amapService';
import { schoolAnalysisService } from '../services/schoolAnalysisService';
import { SchoolAnalysisResult } from '../types/schoolAnalysis';
import SchoolCenteredAnalysis from './SchoolCenteredAnalysis';
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
  selectedRegionNames: propSelectedRegionNames = [] 
}) => {
  // ========================== 3.1 状态管理 ==========================
  const [selectedRegion, setSelectedRegion] = useState<string[]>([]);
  const [selectedRegionNames, setSelectedRegionNames] = useState<string[]>(propSelectedRegionNames);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string>('');
  const [cityName, setCityName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 增强AI分析相关状态
  const [enhancedAIAnalysis, setEnhancedAIAnalysis] = useState<EnhancedAIAnalysis | null>(null);
  const [enhancedAILoading, setEnhancedAILoading] = useState(false);
  const [enhancedAIError, setEnhancedAIError] = useState<string | null>(null);

  // ========================== 3.2 工具函数（缓存优化） ==========================
  /**
   * 构建地区查询URL（处理直辖市、省直辖县等特殊行政区划）
   */
  const buildRegionUrl = useCallback((city: string, district?: string) => {
    let url = `/api/enhanced-ai-analysis/schools-with-analysis/${city}`;
    if (district) {
      const isSpecialDistrict = district === '省直辖县级行政区划' || district.includes('直辖');
      if (!isSpecialDistrict) url += `/${district}`;
    }
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
   */
  const getCityName = useCallback(async (provinceCode: string, cityCode: string) => {
    try {
      // 1. 优先从内部地区名称状态提取
      if (selectedRegionNames.length >= 2) {
        let targetCity = selectedRegionNames[1];
        
        // 特殊处理：直辖市（如北京市/市辖区 → 北京市）
        if (targetCity === '市辖区') targetCity = selectedRegionNames[0];
        // 特殊处理：省直辖县级行政区划（如湖北省/省直辖县级行政区划/仙桃市 → 仙桃市）
        else if (targetCity === '省直辖县级行政区划' && selectedRegionNames.length >= 3) {
          targetCity = selectedRegionNames[2];
        }
          // 其他直辖情况
        else if (targetCity.includes('直辖') || !targetCity) {
          targetCity = selectedRegionNames[0];
        }

        if (targetCity) {
          setCityName(targetCity);
          console.log('✅ 从内部状态获取城市名称:', targetCity);
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
          const finalCity = cityData.label || cityData.name || cityData.value;
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
  }, [selectedRegionNames]);

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
   * 保存所有分析结果到数据库
   */
  const saveAllToDB = useCallback(async () => {
    if (!enhancedAIAnalysis?.schools.length) {
      message.warning('暂无分析数据可保存');
      return;
    }

    setEnhancedAILoading(true);
    
    try {
      // 1. 保存学校分析数据
        await fetchEnhancedAIAnalysis(true);
      
      // 2. 保存商业环境数据（未保存过才执行）
      const needSaveBusiness = enhancedAIAnalysis.businessEnvironment && 
        !enhancedAIAnalysis.businessEnvironment.savedToDB;
      
      if (needSaveBusiness) {
        const poiList = enhancedAIAnalysis.schools.slice(0, 10).map(school => school.name);
        await analyzeBusinessEnv(poiList, true);
      }
      
      message.success('所有分析结果已保存到数据库');
    } catch (err) {
      console.error('❌ 保存数据失败:', err);
      message.error('保存分析结果失败，请重试');
    } finally {
      setEnhancedAILoading(false);
    }
  }, [enhancedAIAnalysis, fetchEnhancedAIAnalysis, analyzeBusinessEnv]);

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
   * 生成选址推荐建议列表
   */
  const generateRecommendations = useCallback((
    schools: SchoolItem[], 
    city: string, 
    businessEnv?: BusinessEnvAnalysis, 
    district?: string
  ) => {
    const recommendations: string[] = [];
    const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    const totalTeachers = schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0);

    // 基础信息
    recommendations.push(`🎯 选址建议：在${city}${district || ''}学校密集区域开设热狗店`);
    recommendations.push(`📚 教育密度：该区域共有${schools.length}所学校，覆盖学生${totalStudents.toLocaleString()}人，教师${totalTeachers}人`);
    recommendations.push(`💰 消费潜力：基于学生数量和师资力量，预计日客流量${Math.round(totalStudents * 0.1)}-${Math.round(totalStudents * 0.2)}人`);

    // 商业环境补充
    if (businessEnv) {
      recommendations.push(`🏪 商业环境：${businessEnv.analysis}`);
    }

    // 按学校类型细分建议
    const schoolTypeCount = {
      university: schools.filter(s => s.type === '大学').length,
      highSchool: schools.filter(s => s.type === '高中').length,
      primarySchool: schools.filter(s => s.type === '小学').length
    };

    if (schoolTypeCount.university > 0) {
      recommendations.push(`🎓 大学市场：${schoolTypeCount.university}所大学，建议主打创新口味和健康理念`);
    }
    if (schoolTypeCount.highSchool > 0) {
      recommendations.push(`🏫 高中市场：${schoolTypeCount.highSchool}所高中，建议提供快速服务和营养搭配`);
    }
    if (schoolTypeCount.primarySchool > 0) {
      recommendations.push(`👶 小学市场：${schoolTypeCount.primarySchool}所小学，建议注重食品安全和趣味包装`);
    }

    // 运营建议
    recommendations.push('⏰ 营业时间：建议07:00-21:00，覆盖学生上下学高峰时段');
    recommendations.push('📍 选址范围：建议在学校周边200-800米范围内，便于学生步行到达');
    recommendations.push('🍔 产品策略：根据学生年龄结构，设计差异化菜单和促销活动');

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
    if (selectedRegionCodes.length > 0) {
      setSelectedRegion(selectedRegionCodes);
      console.log('📥 接收外部地区数据:', { selectedRegionCodes, selectedRegionNames });

      // 当选择到省市两级时，自动获取城市名称
      if (selectedRegionCodes.length >= 2) {
        getCityName(selectedRegionCodes[0], selectedRegionCodes[1]);
      }
    }
  }, [selectedRegionCodes, selectedRegionNames, getCityName]);

  /**
   * 调试用：打印组件状态（开发环境用）
   */
  useEffect(() => {
    console.log('🔍 组件当前状态:', {
      selectedRegion,
      cityName,
      hasAnalysisResult: !!analysisResult,
      hasEnhancedAI: !!enhancedAIAnalysis
    });
  }, [selectedRegion, cityName, analysisResult, enhancedAIAnalysis]);

  /**
   * 自动加载增强AI分析（城市信息和地区选择完成后）
   */
  useEffect(() => {
    if (cityName && cityName !== '未知城市' && selectedRegion.length >= 2) {
      // 延迟执行，避免并发请求
      const timer = setTimeout(() => {
        fetchEnhancedAIAnalysis();
        
        // 延迟1秒分析商业环境
        const envTimer = setTimeout(() => {
          const poiList = ['学校', '教育机构', '培训机构'];
          analyzeBusinessEnv(poiList);
        }, 1000);

        return () => clearTimeout(envTimer);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [cityName, selectedRegion, fetchEnhancedAIAnalysis, analyzeBusinessEnv]);

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

      // 1. 获取学校数据（带AI分析）- 直接以区县级别搜索
      setAnalysisMessage('正在分析学校密度和AI评估...');
      
      // 构建搜索位置：优先使用区县名称，如果是直辖市则使用城市名称
      let searchLocation = district;
      if (district === '市辖区' || district === '省直辖县级行政区划') {
        // 直辖市或省管县情况，使用城市名称
        searchLocation = cityName;
      }
      
      console.log('🔍 搜索位置:', searchLocation);
      
      // 尝试按区县级别搜索
      let res = await fetch(`/api/enhanced-ai-analysis/schools-with-analysis/${searchLocation}?saveToDB=false`);
      let data = await res.json();

      // 处理无数据情况：尝试按城市级别搜索
      if (!data.success || data.data.length === 0) {
        setAnalysisMessage('正在尝试城市级查询...');
        res = await fetch(`/api/enhanced-ai-analysis/schools-with-analysis/${cityName}?saveToDB=false`);
        data = await res.json();

        if (!data.success || data.data.length === 0) {
          throw new Error(`在${searchLocation}未找到学校数据，请检查地区或重试`);
        }
      }

      const schools = data.data as SchoolItem[];
      console.log(`✅ 获取${schools.length}所学校数据`);

      // 2. 分析商业环境
      setAnalysisMessage('正在分析商业环境和市场潜力...');
      const poiList = schools.slice(0, 10).map(school => school.name);
      const envRes = await fetch('/api/enhanced-ai-analysis/analyze-business-environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: searchLocation, // 使用统一的搜索位置
          poiList,
          saveToDB: false
        })
      });
      const envData = await envRes.json();

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
        render: (text: string) => (
          <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}>
            {text}
          </div>
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


  // ========================== 3.7 主渲染函数 ==========================
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
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>地图功能暂未实现</div>
                <div>找到 {analysisResult.schools.length} 所学校</div>
                <div>城市: {cityName}</div>
              </div>
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
    </div>
  );
};

export default SiteSelectionModel; 
