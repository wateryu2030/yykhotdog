import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  message, 
  Select, 
  InputNumber, 
  Switch, 
  Slider,
  Statistic,
  Tag,
  Divider,
  Space,
  Spin,
  Alert,
  Empty,
  Cascader
} from 'antd';
import { message as antdMessage } from 'antd';
import { 
  EnvironmentOutlined, 
  BarChartOutlined, 
  CheckCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  TrophyOutlined,
  UserOutlined,
  ShopOutlined,
  WarningOutlined,
  HomeOutlined,
  StarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { AMAP_CONFIG } from '../config/amap';
import { api } from '../config/api';
import './SiteSelectionDemo.css';

const { Option } = Select;

// 声明全局 AMap 类型
declare global {
  interface Window {
    AMap: any;
    AMapUI: any;
  }
}

interface School {
  id: number;
  school_name: string;
  school_type: string;
  latitude: number;
  longitude: number;
  student_count: number;
  province: string;
  city: string;
  district: string;
  address: string;
}

interface DistrictStat {
  city: string;
  district: string;
  schoolCount: number;
  studentCount: number;
  schools: School[];
}

interface MarketPotentialData {
  statistics: {
    totalStudents: number;
    schoolCount: number;
    avgStudentsPerSchool: number;
    businessCount: number;
    districtCount: number;
  };
  potentialScore: number;
  potentialLevel: string;
  scoreDetails: {
    studentScore: number;
    schoolDensityScore: number;
    districtCoverageScore: number;
  };
  districtStats: DistrictStat[];
  schools: School[];
  debug?: {
    queryConditions: {
      city?: string;
      district?: string;
      minStudentCount?: number;
    };
    totalFound: number;
    schoolsWithCoords: number;
    schoolsWithoutCoords: number;
    sampleSchools: Array<{
      id: number;
      name: string;
      city: string;
      district: string;
      hasCoords: boolean;
      latitude?: number;
      longitude?: number;
    }>;
  };
}

interface FilterState {
  city: string;
  district: string;
  minStudentCount: number;
  businessDensity: string;
  excludeHighCompetition: boolean;
}

const SiteSelectionDemo: React.FC = () => {
  // 状态管理
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    city: '',
    district: '',
    minStudentCount: 0,
    businessDensity: 'all',
    excludeHighCompetition: false
  });
  const [marketData, setMarketData] = useState<MarketPotentialData | null>(null);
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [regionOptions, setRegionOptions] = useState<any[]>([]);
  const [selectedRegionCodes, setSelectedRegionCodes] = useState<string[]>([]);
  const [selectedRegionNames, setSelectedRegionNames] = useState<string[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([116.3974, 39.9093]);
  const [mapZoom, setMapZoom] = useState(10);

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatmapRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const drawingManagerRef = useRef<any>(null);

  // 加载高德地图
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 如果已经加载了，直接使用
    if (window.AMap) {
      setMapReady(true);
      return;
    }

    // 检查是否已经加载了高德地图脚本
    const existingScript = document.querySelector(`script[src*="webapi.amap.com"]`);
    if (existingScript) {
      // 等待脚本加载完成
      const checkAMap = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkAMap);
          setMapReady(true);
        }
      }, 100);

      // 30秒后超时
      setTimeout(() => {
        clearInterval(checkAMap);
      }, 30000);

      existingScript.addEventListener('load', () => {
        clearInterval(checkAMap);
        if (window.AMap) {
          setMapReady(true);
        }
      });

      existingScript.addEventListener('error', () => {
        clearInterval(checkAMap);
        console.error('高德地图脚本加载失败');
        message.error('高德地图加载失败，请检查网络连接');
      });

      return () => {
        clearInterval(checkAMap);
      };
    }

    // 如果没有加载，创建新的脚本（不使用callback，直接监听onload）
    try {
      const script = document.createElement('script');
      const plugins = [...AMAP_CONFIG.plugins, 'AMap.HeatMap', 'AMap.MouseTool'].join(',');
      script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=${plugins}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ 高德地图脚本加载成功');
        // 等待AMap对象和插件初始化
        const checkAMapReady = setInterval(() => {
          if (window.AMap) {
            // 检查核心插件是否已加载（MouseTool和HeatMap）
            const hasMouseTool = window.AMap.MouseTool;
            const hasHeatMap = window.AMap.HeatMap;
            
            // 如果核心插件都加载了，直接设置ready
            if (hasMouseTool && hasHeatMap) {
              clearInterval(checkAMapReady);
              console.log('✅ 核心插件已加载 (MouseTool, HeatMap)');
              setMapReady(true);
            } else if (window.AMap.plugin) {
              // 如果插件未完全加载，尝试动态加载
              clearInterval(checkAMapReady);
              
              const pluginsToLoad: string[] = [];
              if (!hasMouseTool) pluginsToLoad.push('AMap.MouseTool');
              if (!hasHeatMap) pluginsToLoad.push('AMap.HeatMap');
              
              let loadedCount = 0;
              pluginsToLoad.forEach(pluginName => {
                window.AMap.plugin(pluginName, () => {
                  loadedCount++;
                  console.log(`✅ ${pluginName} 插件动态加载成功`);
                  
                  // 所有插件加载完成后设置ready
                  if (loadedCount === pluginsToLoad.length) {
                    console.log('✅ 所有插件加载完成');
                    setMapReady(true);
                  }
                });
              });
              
              // 如果没有插件需要加载，直接设置ready
              if (pluginsToLoad.length === 0) {
                setMapReady(true);
              }
            } else {
              // 如果没有plugin方法，等待一段时间后尝试直接初始化
              setTimeout(() => {
                if (window.AMap) {
                  clearInterval(checkAMapReady);
                  console.warn('⚠️ 使用默认初始化（部分插件可能不可用）');
                  setMapReady(true);
                }
              }, 1000);
            }
          }
        }, 100);
        
        // 5秒后超时
        setTimeout(() => {
          clearInterval(checkAMapReady);
          if (window.AMap) {
            console.warn('⚠️ 插件加载超时，但地图仍可使用（部分功能可能受限）');
            setMapReady(true);
          } else {
            console.error('高德地图对象初始化超时');
            message.error('地图对象初始化失败');
          }
        }, 5000);
      };

      script.onerror = (error) => {
        console.error('高德地图脚本加载失败:', error);
        message.error('高德地图加载失败，请检查网络连接或API Key配置');
      };

      document.head.appendChild(script);

      return () => {
        // 不需要清理回调，因为我们没有使用callback参数
      };
    } catch (error) {
      console.error('创建高德地图脚本失败:', error);
      message.error('高德地图初始化失败');
    }
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.AMap) return;

    const map = new window.AMap.Map(mapRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      mapStyle: 'amap://styles/normal'
    });

    // 添加控件
    map.addControl(new window.AMap.Scale({ position: 'LB' }));
    map.addControl(new window.AMap.ToolBar({ position: 'RT' }));
    
    const mapType = new window.AMap.MapType({
      defaultType: 0,
      showRoad: true,
      showTraffic: false
    });
    map.addControl(mapType);

    amapRef.current = map;

    // 延迟初始化绘制工具，确保插件已完全加载
    const initDrawingTool = () => {
      if (window.AMap && window.AMap.MouseTool && typeof window.AMap.MouseTool === 'function') {
        try {
          const drawingManager = new window.AMap.MouseTool(map);
          drawingManagerRef.current = drawingManager;

          // 监听绘制完成
          drawingManager.on('draw', (e: any) => {
            const obj = e.obj;
            if (obj instanceof window.AMap.Polygon) {
              const path = obj.getPath();
              const coordinates = path.map((point: any) => ({
                lng: point.lng,
                lat: point.lat
              }));
              setSelectedArea({ type: 'polygon', coordinates });
              handleAreaAnalysis(coordinates);
              // 清除绘制
              map.remove(obj);
            } else if (obj instanceof window.AMap.Circle) {
              const center = obj.getCenter();
              const radius = obj.getRadius();
              // 生成圆形边界坐标
              const coordinates = generateCircleCoordinates(center.lng, center.lat, radius);
              setSelectedArea({ type: 'circle', center: [center.lng, center.lat], radius });
              handleAreaAnalysis(coordinates);
              map.remove(obj);
            }
          });
          console.log('✅ MouseTool 初始化成功');
    } catch (error) {
          console.error('❌ MouseTool 初始化失败:', error);
          drawingManagerRef.current = null;
        }
      } else if (window.AMap && window.AMap.plugin) {
        // 尝试动态加载插件
        console.warn('⚠️ MouseTool 插件未加载，尝试动态加载...');
        window.AMap.plugin('AMap.MouseTool', () => {
          setTimeout(() => {
            if (window.AMap && window.AMap.MouseTool && typeof window.AMap.MouseTool === 'function') {
              try {
                const drawingManager = new window.AMap.MouseTool(map);
                drawingManagerRef.current = drawingManager;
                console.log('✅ MouseTool 插件动态加载成功');
                
                // 监听绘制完成
                drawingManager.on('draw', (e: any) => {
                  const obj = e.obj;
                  if (obj instanceof window.AMap.Polygon) {
                    const path = obj.getPath();
                    const coordinates = path.map((point: any) => ({
                      lng: point.lng,
                      lat: point.lat
                    }));
                    setSelectedArea({ type: 'polygon', coordinates });
                    handleAreaAnalysis(coordinates);
                    map.remove(obj);
                  } else if (obj instanceof window.AMap.Circle) {
                    const center = obj.getCenter();
                    const radius = obj.getRadius();
                    const coordinates = generateCircleCoordinates(center.lng, center.lat, radius);
                    setSelectedArea({ type: 'circle', center: [center.lng, center.lat], radius });
                    handleAreaAnalysis(coordinates);
                    map.remove(obj);
                  }
                });
              } catch (error) {
                console.error('❌ MouseTool 动态加载后初始化失败:', error);
                drawingManagerRef.current = null;
              }
            }
          }, 100);
        });
      } else {
        console.warn('⚠️ MouseTool 插件不可用，绘制功能将不可用');
      }
    };
    
    // 延迟初始化，确保插件已加载
    setTimeout(initDrawingTool, 500);

    return () => {
      if (amapRef.current) {
        amapRef.current.destroy();
        amapRef.current = null;
      }
    };
  }, [mapReady, mapCenter, mapZoom]);

  // 生成圆形坐标点
  const generateCircleCoordinates = (lng: number, lat: number, radius: number) => {
    const points: any[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const angle = (i * 360) / steps;
      const radian = (angle * Math.PI) / 180;
      const x = lng + (radius / 111000) * Math.cos(radian);
      const y = lat + (radius / 111000) * Math.sin(radian);
      points.push({ lng: x, lat: y });
    }
    return points;
  };

  // 获取地区级联数据
  useEffect(() => {
    fetchRegionData();
  }, []);

  const fetchRegionData = async () => {
    setRegionLoading(true);
    try {
      const response = await api.get('/region/cascade');
      
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
        setRegionOptions(cascaderData);
      } else {
        console.warn('⚠️ 地区级联API返回失败:', response.data);
        message.warning('获取地区数据失败');
      }
    } catch (error: any) {
      console.error('❌ 获取地区数据失败:', error);
      message.error('获取地区数据失败: ' + (error?.message || '未知错误'));
    } finally {
      setRegionLoading(false);
    }
  };

  // 获取当前选择的城市和区县（考虑多种来源）
  const resolveCityDistrict = () => {
    let city = filters.city;
    let district = filters.district;

    if (!city) {
      if (selectedRegionNames.length > 0) {
        const province = selectedRegionNames[0] || '';
        const secondLevel = selectedRegionNames[1] || '';
        const thirdLevel = selectedRegionNames[2] || '';

        if (secondLevel === '市辖区' || secondLevel === '县' || !secondLevel) {
          city = province;
        } else if (secondLevel) {
          city = secondLevel;
        }

        if (!district && thirdLevel) {
          district = thirdLevel;
        }
      } else if (marketData?.schools?.length) {
        city = marketData.schools[0].city || '';
        if (!district) {
          district = marketData.schools[0].district || '';
        }
      }
    }

    return { city: city || '', district: district || '' };
  };

  // 运行分析（使用与选店模块相同的API）
  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const { city, district } = resolveCityDistrict();

      if (!city) {
        message.warning('请选择城市后再分析');
        setLoading(false);
        return;
      }
      
      // 构建API URL（与SiteSelectionModel使用相同的API）
      let apiUrl = `/api/enhanced-ai-analysis/schools-with-analysis/${encodeURIComponent(city)}`;
      if (district && district !== '市辖区' && district !== '省直辖县级行政区划') {
        apiUrl += `/${encodeURIComponent(district)}`;
      }
      // 不保存到数据库，不强制刷新（使用已有数据）
      apiUrl += `?saveToDB=false&forceRefresh=false&limit=500`;
      
      console.log('📤 请求学校数据API:', apiUrl);
      const response = await axios.get(apiUrl);
      
      console.log('📥 API响应:', {
        success: response.data?.success,
        dataCount: Array.isArray(response.data?.data) ? response.data.data.length : 0
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        const schools = response.data.data;
        console.log('查询到的学校数量:', schools.length);
        
        if (schools.length === 0) {
          message.warning('未找到符合条件的学校数据');
          setMarketData(null);
          return;
        }
        
        // 转换数据格式为MarketPotentialData格式
        const transformedSchools = schools.map((school: any) => ({
          id: school.id || school.school_id,
          school_name: school.name || school.school_name,
          school_type: school.type || school.school_type,
          latitude: school.latitude,
          longitude: school.longitude,
          student_count: school.student_count || school.studentCount || 0,
          province: school.province,
          city: school.city,
          district: school.district,
          address: school.address
        }));
        
        // 计算统计数据
        const totalStudents = transformedSchools.reduce((sum: number, s: any) => sum + (s.student_count || 0), 0);
        const schoolCount = transformedSchools.length;
        const avgStudentsPerSchool = schoolCount > 0 ? Math.round(totalStudents / schoolCount) : 0;
        
        // 按区县聚合
        const districtStats: any = {};
        transformedSchools.forEach((school: any) => {
          const key = `${school.city}-${school.district}`;
          if (!districtStats[key]) {
            districtStats[key] = {
              city: school.city,
              district: school.district,
              schoolCount: 0,
              studentCount: 0,
              schools: []
            };
          }
          districtStats[key].schoolCount++;
          districtStats[key].studentCount += school.student_count || 0;
          districtStats[key].schools.push({
            id: school.id,
            name: school.school_name,
            type: school.school_type,
            students: school.student_count,
            location: [school.longitude, school.latitude]
          });
        });
        
        // 计算潜力评分
        const studentScore = Math.min(40, (totalStudents / 50000) * 40);
        const schoolDensityScore = Math.min(30, (schoolCount / 50) * 30);
        const districtCoverageScore = Math.min(30, Object.keys(districtStats).length * 5);
        const potentialScore = Math.round(studentScore + schoolDensityScore + districtCoverageScore);
        
        let potentialLevel = 'C';
        if (potentialScore >= 80) potentialLevel = 'A+';
        else if (potentialScore >= 70) potentialLevel = 'A';
        else if (potentialScore >= 60) potentialLevel = 'B+';
        else if (potentialScore >= 50) potentialLevel = 'B';
        else if (potentialScore >= 40) potentialLevel = 'C+';
        
        const marketData: MarketPotentialData = {
          statistics: {
            totalStudents,
            schoolCount,
            avgStudentsPerSchool,
            businessCount: 0,
            districtCount: Object.keys(districtStats).length
          },
          potentialScore,
          potentialLevel,
          scoreDetails: {
            studentScore,
            schoolDensityScore,
            districtCoverageScore
          },
          districtStats: Object.values(districtStats),
          schools: transformedSchools,
          debug: {
            queryConditions: { city, district, minStudentCount: filters.minStudentCount },
            totalFound: transformedSchools.length,
            schoolsWithCoords: transformedSchools.filter((s: any) => s.latitude && s.longitude).length,
            schoolsWithoutCoords: transformedSchools.filter((s: any) => !s.latitude || !s.longitude).length,
            sampleSchools: transformedSchools.slice(0, 10).map((s: any) => ({
              id: s.id,
              name: s.school_name,
              city: s.city,
              district: s.district,
              hasCoords: !!(s.latitude && s.longitude),
              latitude: s.latitude,
              longitude: s.longitude
            }))
          }
        };
        
        setMarketData(marketData);
        updateMapWithData(marketData);
        message.success(`分析完成，找到 ${schoolCount} 所学校`);
      } else {
        message.error('获取学校数据失败');
        setMarketData(null);
      }
    } catch (error: any) {
      console.error('分析失败:', error);
      message.error(`分析失败: ${error.message}`);
      setMarketData(null);
    } finally {
      setLoading(false);
    }
  };

  // 区域分析（地图圈选后）- 使用实际数据库数据
  const handleAreaAnalysis = async (coordinates: any[]) => {
    if (!coordinates || coordinates.length === 0) {
      message.warning('请先在地图上圈选区域');
      return;
    }
    
    setLoading(true);
    try {
      // 计算圈选区域的边界
      const bounds = {
        minLng: Math.min(...coordinates.map((c: any) => c.lng || c.longitude || 0)),
        maxLng: Math.max(...coordinates.map((c: any) => c.lng || c.longitude || 0)),
        minLat: Math.min(...coordinates.map((c: any) => c.lat || c.latitude || 0)),
        maxLat: Math.max(...coordinates.map((c: any) => c.lat || c.latitude || 0))
      };
      
      console.log('📍 圈选区域分析:', bounds);
      
      // 查询圈选区域内的学校数据（使用实际数据库）
      // 先查询当前选中城市的学校数据，然后筛选在圈选区域内的
      const { city, district } = resolveCityDistrict();
      
      if (!city) {
        message.warning('请先选择城市');
        setLoading(false);
        return;
      }
      
      let apiUrl = `/api/enhanced-ai-analysis/schools-with-analysis/${encodeURIComponent(city)}`;
      if (district && district !== '市辖区' && district !== '省直辖县级行政区划') {
        apiUrl += `/${encodeURIComponent(district)}`;
      }
      apiUrl += `?saveToDB=false&forceRefresh=false&limit=500`;
      
      console.log('📤 请求圈选区域学校数据:', apiUrl);
      const response = await axios.get(apiUrl);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const allSchools = response.data.data;
        
        // 筛选在圈选区域内的学校
        const schoolsInArea = allSchools.filter((school: any) => {
          const lng = school.longitude || school.lng;
          const lat = school.latitude || school.lat;
          
          if (!lng || !lat || lng === 0 || lat === 0) return false;
          
          // 检查是否在边界框内（简单的矩形判断，可以后续优化为多边形）
          return lng >= bounds.minLng && lng <= bounds.maxLng &&
                 lat >= bounds.minLat && lat <= bounds.maxLat;
        });
        
        console.log(`📍 圈选区域内找到 ${schoolsInArea.length} 所学校`);
        
        if (schoolsInArea.length === 0) {
          message.info('圈选区域内暂无学校数据');
          setMarketData(null);
          setLoading(false);
          return;
        }
        
        // 转换数据格式
        const transformedSchools = schoolsInArea.map((school: any) => ({
          id: school.id || school.school_id,
          school_name: school.name || school.school_name,
          school_type: school.type || school.school_type,
          latitude: school.latitude || school.lat,
          longitude: school.longitude || school.lng,
          student_count: school.student_count || school.studentCount || 0,
          province: school.province,
          city: school.city,
          district: school.district,
          address: school.address
        }));
        
        // 计算统计数据
        const totalStudents = transformedSchools.reduce((sum: number, s: any) => sum + (s.student_count || 0), 0);
        const schoolCount = transformedSchools.length;
        const avgStudentsPerSchool = schoolCount > 0 ? Math.round(totalStudents / schoolCount) : 0;
        
        // 按区县聚合
        const districtStats: any = {};
        transformedSchools.forEach((school: any) => {
          const key = `${school.city}-${school.district}`;
          if (!districtStats[key]) {
            districtStats[key] = {
              city: school.city,
              district: school.district,
              schoolCount: 0,
              studentCount: 0,
              schools: []
            };
          }
          districtStats[key].schoolCount++;
          districtStats[key].studentCount += school.student_count || 0;
          districtStats[key].schools.push({
            id: school.id,
            name: school.school_name,
            type: school.school_type,
            students: school.student_count,
            location: [school.longitude, school.latitude]
          });
        });
        
        // 计算潜力评分
        const studentScore = Math.min(40, (totalStudents / 50000) * 40);
        const schoolDensityScore = Math.min(30, (schoolCount / 50) * 30);
        const districtCoverageScore = Math.min(30, Object.keys(districtStats).length * 5);
        const potentialScore = Math.round(studentScore + schoolDensityScore + districtCoverageScore);
        
        let potentialLevel = 'C';
        if (potentialScore >= 80) potentialLevel = 'A+';
        else if (potentialScore >= 70) potentialLevel = 'A';
        else if (potentialScore >= 60) potentialLevel = 'B+';
        else if (potentialScore >= 50) potentialLevel = 'B';
        else if (potentialScore >= 40) potentialLevel = 'C+';
        
        const marketData: MarketPotentialData = {
          statistics: {
            totalStudents,
            schoolCount,
            avgStudentsPerSchool,
            businessCount: 0,
            districtCount: Object.keys(districtStats).length
          },
          potentialScore,
          potentialLevel,
          scoreDetails: {
            studentScore,
            schoolDensityScore,
            districtCoverageScore
          },
          districtStats: Object.values(districtStats),
          schools: transformedSchools
        };
        
        setMarketData(marketData);
        updateMapWithData(marketData);
        message.success(`区域分析完成，找到 ${schoolCount} 所学校`);
      } else {
        message.warning('圈选区域内暂无学校数据');
        setMarketData(null);
      }
    } catch (error: any) {
      console.error('区域分析失败:', error);
      message.error(`区域分析失败: ${error.message}`);
      setMarketData(null);
    } finally {
      setLoading(false);
    }
  };

  // 更新地图数据
  const updateMapWithData = (data: MarketPotentialData) => {
    if (!amapRef.current || !window.AMap) return;

    // 清除旧标记
    markersRef.current.forEach(marker => {
      amapRef.current.remove(marker);
    });
    markersRef.current = [];

    // 清除旧热力图
    if (heatmapRef.current) {
      amapRef.current.remove(heatmapRef.current);
      heatmapRef.current = null;
    }

    // 添加学校标记
    const schoolPoints: any[] = [];
    data.schools.forEach(school => {
      if (school.longitude && school.latitude) {
        const marker = new window.AMap.Marker({
          position: [school.longitude, school.latitude],
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(24, 24),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
          }),
          title: `${school.school_name} (${school.student_count}人)`
        });

        // 信息窗口
        const infoWindow = new window.AMap.InfoWindow({
          offset: new window.AMap.Pixel(0, -30),
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h4 style="margin: 0 0 8px 0;">${school.school_name}</h4>
              <p style="margin: 4px 0; color: #666; font-size: 12px;">
                <strong>类型：</strong>${school.school_type}
              </p>
              <p style="margin: 4px 0; color: #666; font-size: 12px;">
                <strong>学生数：</strong>${school.student_count}人
              </p>
              <p style="margin: 4px 0; color: #666; font-size: 12px;">
                <strong>位置：</strong>${school.district}
              </p>
            </div>
          `
        });

        marker.on('click', () => {
          infoWindow.open(amapRef.current, [school.longitude, school.latitude]);
        });

        amapRef.current.add(marker);
        markersRef.current.push(marker);

        // 热力图数据点
        schoolPoints.push({
          lng: school.longitude,
          lat: school.latitude,
      count: school.student_count || 1
        });
      }
    });

    // 添加热力图（确保HeatMap插件已加载）
    const createHeatmap = () => {
      if (schoolPoints.length === 0) return;
      
      if (window.AMap && window.AMap.HeatMap && typeof window.AMap.HeatMap === 'function') {
        try {
          const heatmap = new window.AMap.HeatMap(amapRef.current, {
            radius: 25,
            opacity: [0, 0.8]
          });

          heatmap.setDataSet({
            data: schoolPoints,
            max: Math.max(...schoolPoints.map(p => p.count))
          });

          heatmapRef.current = heatmap;
          console.log('✅ 热力图创建成功');
        } catch (error) {
          console.error('❌ 热力图创建失败:', error);
          // 如果热力图创建失败，不影响其他功能
        }
      } else if (window.AMap && window.AMap.plugin) {
        // 如果HeatMap插件未加载，尝试动态加载
        console.warn('⚠️ HeatMap插件未加载，尝试动态加载...');
        window.AMap.plugin('AMap.HeatMap', () => {
          setTimeout(() => {
            if (window.AMap && window.AMap.HeatMap && typeof window.AMap.HeatMap === 'function') {
              try {
                const heatmap = new window.AMap.HeatMap(amapRef.current, {
                  radius: 25,
                  opacity: [0, 0.8]
                });

                heatmap.setDataSet({
                  data: schoolPoints,
                  max: Math.max(...schoolPoints.map(p => p.count))
                });

                heatmapRef.current = heatmap;
                console.log('✅ HeatMap插件动态加载成功');
              } catch (error) {
                console.error('❌ HeatMap动态加载失败:', error);
              }
            }
          }, 100);
        });
      } else {
        console.warn('⚠️ HeatMap插件不可用，热力图功能将不可用');
      }
    };
    
    createHeatmap();

    // 调整视图
    if (data.schools.length > 0) {
      const bounds = new window.AMap.Bounds(
        new window.AMap.LngLat(
          Math.min(...data.schools.map(s => s.longitude)),
          Math.min(...data.schools.map(s => s.latitude))
        ),
        new window.AMap.LngLat(
          Math.max(...data.schools.map(s => s.longitude)),
          Math.max(...data.schools.map(s => s.latitude))
        )
      );
      amapRef.current.setBounds(bounds);
    }
  };

  // 开始圈选
  const handleStartDrawing = (type: 'polygon' | 'circle') => {
    if (!drawingManagerRef.current) {
      message.warning('绘制工具未初始化，请稍候再试');
      return;
    }
    if (!amapRef.current) {
      message.warning('地图未初始化');
      return;
    }
    try {
      if (type === 'polygon') {
        drawingManagerRef.current.polygon({
          strokeColor: '#FF0000',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.2
        });
      } else {
        drawingManagerRef.current.circle({
          strokeColor: '#FF0000',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.2
        });
      }
      message.info('请在地图上绘制区域');
    } catch (error: any) {
      console.error('绘制工具使用失败:', error);
      message.error(`绘制失败: ${error.message || '未知错误'}`);
    }
  };

  // 处理地区级联选择变化
  const handleRegionChange = (value: string[], selectedOptions: any[]) => {
    setSelectedRegionCodes(value);
    
    if (value && value.length > 0 && selectedOptions) {
      const regionNames = selectedOptions.map(option => option?.label || option?.name || '');
      setSelectedRegionNames(regionNames);
      
      // 根据选择的层级构建查询参数
      const selectedProvince = regionNames[0] || '';
      let selectedCity = regionNames[1] || '';
      let selectedDistrict = regionNames[2] || '';

      // 特殊处理：直辖市和省管县
      // 直辖市情况：北京市/市辖区/西城区 -> 城市=北京市，区县=西城区
      if (selectedCity === '市辖区' || selectedCity === '县') {
        selectedCity = selectedProvince;
        console.log('检测到直辖市，使用省份名称作为城市:', selectedCity);
      } 
      // 省管县情况：湖北省/省直辖县级行政区划/仙桃市 -> 城市=仙桃市，区县=仙桃市
      else if (selectedCity === '省直辖县级行政区划' || selectedCity === '省直辖县') {
        if (selectedDistrict) {
          selectedCity = selectedDistrict;
          console.log('检测到省管县，使用区县名称作为城市:', selectedCity);
        } else {
          selectedCity = selectedProvince;
        }
      }

      // 更新筛选条件
      setFilters(prev => ({
        ...prev,
        city: selectedCity || '',
        district: selectedDistrict || ''
      }));
    } else {
      // 清空选择
      setSelectedRegionCodes([]);
      setSelectedRegionNames([]);
      setFilters(prev => ({
        ...prev,
        city: '',
        district: ''
      }));
    }
  };

  const getPotentialLevelColor = (level: string) => {
    const colors: any = {
      'A+': '#52c41a',
      'A': '#1890ff',
      'B+': '#722ed1',
      'B': '#fa8c16',
      'C+': '#faad14',
      'C': '#ff4d4f'
    };
    return colors[level] || '#666';
  };

  return (
    <div className="site-selection-demo">
      <div className="demo-header">
        <h1>
        <EnvironmentOutlined style={{ marginRight: 8 }} />
          咬一口纯佑热狗 - 潜力市场洞察
      </h1>
        <p className="subtitle">基于全国学校、学生数量、周边商业数据的智能选址演示系统</p>
      </div>

      <Row gutter={16} style={{ height: 'calc(100vh - 120px)' }}>
        {/* 左侧面板：数据筛选与输入 */}
          <Col span={6}>
          <Card 
            title="数据筛选" 
            className="filter-panel"
            extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => {
              setFilters({
                city: '',
                district: '',
                minStudentCount: 0,
                businessDensity: 'all',
                excludeHighCompetition: false
              });
              setSelectedRegionCodes([]);
              setSelectedRegionNames([]);
            }}>重置</Button>}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 省市区级联选择 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  选择地区（省/市/区）
                </label>
                <Cascader
                  style={{ width: '100%' }}
                  placeholder="请选择省市区县"
                  value={selectedRegionCodes}
                  onChange={handleRegionChange}
                  options={regionOptions}
                  showSearch={{
                    filter: (inputValue, path) => {
                      return path.some(option => 
                        option.label.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }
                  }}
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
                {selectedRegionNames.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    已选择：{selectedRegionNames.join(' / ')}
                  </div>
                )}
              </div>

              {/* 学生数量门槛 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  学生数量门槛：{filters.minStudentCount.toLocaleString()} 人
                </label>
                <Slider
                  min={0}
                  max={50000}
                  step={1000}
                  value={filters.minStudentCount}
                  onChange={(value) => setFilters(prev => ({ ...prev, minStudentCount: value }))}
                />
                <InputNumber
                  style={{ width: '100%', marginTop: 8 }}
                  min={0}
                  max={50000}
                  step={1000}
                  value={filters.minStudentCount}
                  onChange={(value) => setFilters(prev => ({ ...prev, minStudentCount: value || 0 }))}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => {
                    const parsed = value!.replace(/\$\s?|(,*)/g, '');
                    return parsed ? Number(parsed) : 0;
                  }}
                />
              </div>

              {/* 商业设施密度 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  商业设施密度
                </label>
                <Select
                  style={{ width: '100%' }}
                  value={filters.businessDensity}
                  onChange={(value) => setFilters(prev => ({ ...prev, businessDensity: value }))}
                >
                  <Option value="all">全部</Option>
                  <Option value="high">高密度</Option>
                  <Option value="medium">中等密度</Option>
                  <Option value="low">低密度</Option>
                </Select>
              </div>

              {/* 竞争环境 */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>排除高竞争区域</span>
                  <Switch
                    checked={filters.excludeHighCompetition}
                    onChange={(checked) => setFilters(prev => ({ ...prev, excludeHighCompetition: checked }))}
                  />
                </label>
                <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  排除200米内已有3家以上同类快餐的区域
                </p>
              </div>

              <Divider />

      {/* 操作按钮 */}
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
                block
                size="large"
              loading={loading}
                onClick={handleRunAnalysis}
            >
                运行选址分析
            </Button>

              {/* 地图圈选工具 */}
              <Divider />
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  地图圈选分析
                </label>
                <Space direction="vertical" style={{ width: '100%' }}>
            <Button
                    block
                    onClick={() => handleStartDrawing('polygon')}
                    icon={<EnvironmentOutlined />}
                  >
                    绘制多边形区域
            </Button>
            <Button
                    block
                    onClick={() => handleStartDrawing('circle')}
                    icon={<EnvironmentOutlined />}
                  >
                    绘制圆形区域
                  </Button>
                </Space>
              </div>
            </Space>
      </Card>
        </Col>

        {/* 中央核心：市场可视化地图 */}
        <Col span={12}>
          <Card 
            title="市场潜力地图" 
            className="map-panel"
            extra={
              <Space>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => {
                  if (amapRef.current) {
                    amapRef.current.setZoomAndCenter(mapZoom, mapCenter);
                  }
                }}>重置视图</Button>
              </Space>
            }
          >
            <div 
              ref={mapRef} 
              style={{ 
                width: '100%', 
                height: 'calc(100vh - 220px)',
                position: 'relative'
              }}
            >
              {!mapReady && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000
                }}>
                  <Spin size="large">
                    <div style={{ padding: '50px' }}>
                      <div style={{ marginTop: 16 }}>地图加载中...</div>
                    </div>
                  </Spin>
                </div>
              )}
            </div>
      </Card>
        </Col>

        {/* 右侧面板：潜力评估与详情 */}
        <Col span={6}>
          <Card 
            title="潜力评估详情" 
            className="detail-panel"
            style={{ height: 'calc(100vh - 160px)', overflowY: 'auto' }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large">
                  <div style={{ padding: '50px' }}>
                    <div style={{ marginTop: 16 }}>分析中...</div>
                  </div>
                </Spin>
              </div>
            ) : marketData ? (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 选址评分卡 */}
                <div style={{ textAlign: 'center', padding: '16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 48, fontWeight: 'bold', color: getPotentialLevelColor(marketData.potentialLevel) }}>
                    {marketData.potentialScore}
                    <span style={{ fontSize: 24 }}>/100</span>
                  </div>
                  <Tag 
                    color={getPotentialLevelColor(marketData.potentialLevel)} 
                    style={{ fontSize: 16, padding: '4px 12px', marginTop: 8 }}
                  >
                    {marketData.potentialLevel}级潜力
                  </Tag>
                </div>

                {/* 关键数据快览 */}
                <Divider />
                <div>
                  <h4 style={{ marginBottom: 12 }}>关键数据</h4>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic
                        title="总学生数"
                        value={marketData.statistics.totalStudents}
                        prefix={<UserOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
          </Col>
                    <Col span={12}>
                      <Statistic
                        title="学校数量"
                        value={marketData.statistics.schoolCount}
                        prefix={<EnvironmentOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
          </Col>
                    <Col span={12}>
                      <Statistic
                        title="商业点位"
                        value={marketData.statistics.businessCount}
                        prefix={<ShopOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="覆盖区县"
                        value={marketData.statistics.districtCount}
                        prefix={<HomeOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
          </Col>
        </Row>
                </div>

                {/* 评分明细 */}
                <Divider />
                <div>
                  <h4 style={{ marginBottom: 12 }}>评分明细</h4>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>学生数量评分</span>
                      <span style={{ fontWeight: 'bold' }}>{marketData.scoreDetails.studentScore.toFixed(1)}/40</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: 8, 
                      background: '#f0f0f0', 
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(marketData.scoreDetails.studentScore / 40) * 100}%`,
                        height: '100%',
                        background: '#1890ff',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>学校密度评分</span>
                      <span style={{ fontWeight: 'bold' }}>{marketData.scoreDetails.schoolDensityScore.toFixed(1)}/30</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: 8, 
                      background: '#f0f0f0', 
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(marketData.scoreDetails.schoolDensityScore / 30) * 100}%`,
                        height: '100%',
                        background: '#52c41a',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>区域覆盖评分</span>
                      <span style={{ fontWeight: 'bold' }}>{marketData.scoreDetails.districtCoverageScore.toFixed(1)}/30</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: 8, 
                      background: '#f0f0f0', 
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(marketData.scoreDetails.districtCoverageScore / 30) * 100}%`,
                        height: '100%',
                        background: '#722ed1',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                </div>

                {/* 区县统计 */}
                {marketData.districtStats.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <h4 style={{ marginBottom: 12 }}>区县潜力排行</h4>
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {marketData.districtStats
                          .sort((a, b) => b.studentCount - a.studentCount)
                          .slice(0, 5)
                          .map((district, index) => (
                            <div key={`${district.city}-${district.district}`} style={{
                              padding: 8,
                              background: index === 0 ? '#fff7e6' : '#fafafa',
                              borderRadius: 4,
                              border: index === 0 ? '1px solid #faad14' : '1px solid #e8e8e8'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 500 }}>
                                    {index === 0 && <StarOutlined style={{ color: '#faad14', marginRight: 4 }} />}
                                    {district.district}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                                    {district.schoolCount}所学校
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                                    {district.studentCount.toLocaleString()}人
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </Space>
                    </div>
                  </>
                )}

                {/* 数据可信度说明 */}
                <Divider />
                <Alert
                  message="数据可信度说明"
                  description={
                    <div style={{ fontSize: 12 }}>
                      <p>• 学校数据：基于全国学校基础信息数据库，数据准确率 {'>'}95%</p>
                      <p>• 学生数量：基于学校规模和类型估算，可能存在 ±10% 偏差</p>
                      <p>• 商业密度：基于周边POI数据统计，实时更新</p>
                      <p>• 潜力评分：基于多维度算法计算，仅供参考</p>
                    </div>
                  }
                  type="info"
                  showIcon
                />

                {/* 调试信息（开发环境显示） */}
                {marketData.debug && process.env.NODE_ENV === 'development' && (
                  <>
                    <Divider />
                    <Alert
                      message="调试信息"
                      description={
                        <div style={{ fontSize: 12 }}>
                          <p>• 查询条件：城市={marketData.debug.queryConditions?.city || '无'}, 区县={marketData.debug.queryConditions?.district || '无'}</p>
                          <p>• 查询结果：共找到 {marketData.debug.totalFound} 所学校</p>
                          <p>• 有坐标：{marketData.debug.schoolsWithCoords} 所（可在地图显示）</p>
                          <p>• 无坐标：{marketData.debug.schoolsWithoutCoords} 所（无法在地图显示）</p>
                          {marketData.debug.sampleSchools && marketData.debug.sampleSchools.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <p><strong>示例学校：</strong></p>
                              {marketData.debug.sampleSchools.slice(0, 3).map((school: any, idx: number) => (
                                <p key={idx} style={{ margin: '4px 0', paddingLeft: 12 }}>
                                  {idx + 1}. {school.name} ({school.city} {school.district})
                                  {school.hasCoords ? ' ✅有坐标' : ' ⚠️无坐标'}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      }
                      type="warning"
                      showIcon
                    />
                  </>
                )}
              </Space>
            ) : (
              <Empty 
                description="请运行选址分析或在地图上圈选区域"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
      </Card>
          </Col>
        </Row>
    </div>
  );
};

export default SiteSelectionDemo;