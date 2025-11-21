import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Pagination,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Badge,
  Tabs,
  Dropdown
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  TrophyOutlined,
  WarningOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

// 声明全局 AMap 类型
declare global {
  interface Window {
    AMap: any;
    AMapUI: any;
  }
}

interface CandidateLocation {
  id: string;
  shop_name: string;
  shop_address: string;
  location: string;
  description: string;
  province: string;
  city: string;
  district: string;
  rent_amount: number;
  area_size?: number;
  investment_amount?: number;
  approval_state: string;
  approval_remarks: string;
  status: string;
  analysis_score?: number;
  poi_density_score?: number;
  traffic_score?: number;
  population_score?: number;
  competition_score?: number;
  rental_cost_score?: number;
  predicted_revenue?: number;
  confidence_score?: number;
  success_probability?: number;
  risk_level?: string;
  photo_url?: string;
  longitude?: number | null;
  latitude?: number | null;
  record_time: string;
  created_at: string;
}

interface AnalysisResult {
  location: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
  scores: {
    poiDensity: number;
    populationDensity: number;
    trafficAccessibility: number;
    competitionLevel: number;
    rentalCost: number;
    footTraffic: number;
    overallScore: number;
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskLevel: string;
  };
  predictions: {
    expectedRevenue: number;
    confidence: number;
    breakEvenTime: number;
  };
  data: {
    nearbyPOIs: Record<string, number>;
    schools: Record<string, number>;
    competitors: Record<string, number>;
    trafficStations: Array<{
      type: string;
      count: number;
    }>;
  };
}

const parseLocationString = (location?: string | null): { longitude: number; latitude: number } | null => {
  if (!location) return null;

  const match = location.match(/(-?\d+\.?\d*)[,，]\s*(-?\d+\.?\d*)/);
  if (match) {
    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);
    if (!isNaN(longitude) && !isNaN(latitude)) {
      return { longitude, latitude };
    }
  }

  const parts = location.split(',');
  if (parts.length === 2) {
    const longitude = parseFloat(parts[0]);
    const latitude = parseFloat(parts[1]);
    if (!isNaN(longitude) && !isNaN(latitude)) {
      return { longitude, latitude };
    }
  }

  return null;
};

const CANDIDATE_LIMIT_FOR_MAP = 500;

const CandidateLocationsPage: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateLocation[]>([]);
  const [mapCandidates, setMapCandidates] = useState<CandidateLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [comprehensiveAnalysisLoading, setComprehensiveAnalysisLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    city: '',
    status: ''
  });
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateLocation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    analyzed: 0,
    pending: 0,
    avgScore: 0
  });
  const [activeTab, setActiveTab] = useState('list');
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const geocoderRef = useRef<any>(null);
  const geocodeCacheRef = useRef<Record<string, { longitude: number; latitude: number }>>({});
  const geocodePendingRef = useRef<Set<string>>(new Set());

  // 获取意向铺位列表
  const enrichRecords = useCallback((records: CandidateLocation[]) => {
    if (!records || !Array.isArray(records)) {
      return [];
    }
    return records
      .filter((record): record is CandidateLocation => record != null)
      .map(record => {
        const parsed = parseLocationString(record.location);
        return {
          ...record,
          longitude: record.longitude ?? parsed?.longitude ?? null,
          latitude: record.latitude ?? parsed?.latitude ?? null
        };
      });
  }, []);

  const fetchCandidates = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      
      // 添加过滤条件
      if (filters.city && filters.city.trim()) {
        params.append('city', filters.city.trim());
      }
      if (filters.status && filters.status.trim()) {
        params.append('status', filters.status.trim());
      }

      console.log('📥 获取铺位列表，参数:', { page, pageSize, filters });
      const response = await axios.get(`/api/site-selection/candidates?${params}`);
      
      console.log('📥 API响应:', {
        success: response.data?.success,
        recordsCount: response.data?.data?.records?.length || 0,
        total: response.data?.data?.pagination?.total || 0
      });
      
      if (response.data.success && response.data.data && response.data.data.records) {
        const enrichedRecords = enrichRecords(response.data.data.records);

        setCandidates(enrichedRecords);
        setPagination({
          current: response.data.data.pagination.page || page,
          pageSize: response.data.data.pagination.limit || pageSize,
          total: response.data.data.pagination.total || 0
        });
        // 获取统计数据
        fetchStatistics();
      } else {
        console.warn('⚠️ API返回数据格式不正确:', response.data);
        setCandidates([]);
        setPagination(prev => ({ ...prev, total: 0 }));
        message.error('获取意向铺位列表失败：数据格式错误');
      }
    } catch (error: any) {
      console.error('❌ 获取意向铺位列表失败:', error);
      setCandidates([]);
      setPagination(prev => ({ ...prev, total: 0 }));
      message.error(`获取意向铺位列表失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapCandidates = useCallback(async () => {
    if (mapLoading) return;

    setMapLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: CANDIDATE_LIMIT_FOR_MAP.toString(),
      });
      
      // 添加过滤条件
      if (filters.city && filters.city.trim()) {
        params.append('city', filters.city.trim());
      }
      if (filters.status && filters.status.trim()) {
        params.append('status', filters.status.trim());
      }

      console.log('📍 获取地图铺位数据，参数:', { filters });
      const response = await axios.get(`/api/site-selection/candidates?${params}`);
      
      console.log('📍 API响应:', {
        success: response.data?.success,
        recordsCount: response.data?.data?.records?.length || 0
      });
      
      if (response.data.success && response.data.data && response.data.data.records) {
        const enrichedRecords = enrichRecords(response.data.data.records);
        setMapCandidates(enrichedRecords);
        // addMarkersToMap 会在数据更新后通过 useEffect 自动调用
        // 不需要在这里手动调用，避免循环依赖问题
      } else {
        console.warn('⚠️ 地图数据API返回格式不正确:', response.data);
        setMapCandidates([]);
      }
    } catch (error: any) {
      // 429 错误时不再重复请求
      if (error?.response?.status === 429) {
        console.warn('请求频率过高，请稍后再试');
        message.warning('请求过于频繁，请稍后再试');
      } else {
        console.error('❌ 获取地图铺位数据失败:', error);
        setMapCandidates([]);
        message.error(`获取地图数据失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
      }
    } finally {
      setMapLoading(false);
    }
  }, [filters.city, filters.status, enrichRecords]);

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/site-selection/statistics');
      if (response.data.success) {
        const stats = response.data.data.overview;
        setStatistics({
          total: stats.total_count || stats.total_analyses || 0,
          analyzed: stats.analyzed_count || 0,
          pending: stats.pending_count || 0,
          avgScore: stats.avg_score || 0
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
      // 如果统计 API 失败，从当前列表计算基本统计
      const analyzedCount = candidates.filter(c => c.analysis_score !== null && c.analysis_score !== undefined).length;
      const pendingCount = candidates.filter(c => !c.analysis_score || c.analysis_score === null).length;
      const avgScore = candidates
        .filter(c => c.analysis_score !== null && c.analysis_score !== undefined)
        .reduce((sum, c) => sum + (c.analysis_score || 0), 0) / analyzedCount || 0;
      
      setStatistics({
        total: candidates.length,
        analyzed: analyzedCount,
        pending: pendingCount,
        avgScore
      });
    }
  };

  // 分析意向铺位
  const analyzeCandidate = async (candidate: CandidateLocation) => {
    setAnalysisLoading(parseInt(candidate.id));
    try {
      const response = await axios.post(`/api/site-selection/candidates/${candidate.id}/analyze`, {
        includeMLPrediction: true
      });
      
      if (response.data.success) {
        setSelectedCandidate(candidate);
        setAnalysisResult(response.data.data.analysis);
        setAnalysisModalVisible(true);
        message.success('分析完成');
        
        // 刷新列表
        fetchCandidates(pagination.current, pagination.pageSize);
        fetchStatistics();
      } else {
        message.error('分析失败');
      }
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败');
    } finally {
      setAnalysisLoading(null);
    }
  };

  // 批量分析
  const batchAnalyze = async (candidateIds: string[]) => {
    setLoading(true);
    let successCount = 0;
    
    for (const id of candidateIds) {
      try {
        const response = await axios.post(`/api/site-selection/candidates/${id}/analyze`, {
          includeMLPrediction: true
        });
        
        if (response.data.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`分析ID ${id} 失败:`, error);
      }
    }
    
    message.success(`批量分析完成，成功分析 ${successCount}/${candidateIds.length} 个铺位`);
    setLoading(false);
    
    // 刷新列表和统计
    fetchCandidates(pagination.current, pagination.pageSize);
    fetchStatistics();
  };

  // 导出分析报告
  const exportReport = async (candidateId: string, format: 'pdf' | 'word') => {
    try {
      const response = await axios.get(`/api/site-selection/candidates/${candidateId}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 从响应头获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `铺位分析报告_${candidateId}.${format === 'pdf' ? 'pdf' : 'docx'}`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`报告导出成功: ${fileName}`);
    } catch (error: any) {
      console.error('导出报告失败:', error);
      const errorMsg = error.response?.data?.message || error.message || '导出失败';
      message.error(`导出失败: ${errorMsg}`);
    }
  };

  // 批量综合分析（使用大模型）
  const comprehensiveAnalysis = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要分析的铺位');
      return;
    }

    setComprehensiveAnalysisLoading(true);
    try {
      const response = await axios.post('/api/site-selection/candidates/comprehensive-analysis', {
        candidateIds: selectedRowKeys.map(key => parseInt(key.toString())),
        productType: '高性价比小吃快餐',
        targetCustomers: '价格敏感的年轻群体、追求效率的通勤者、学生和社区家庭'
      });

      if (response.data.success) {
        const { summary } = response.data.data;
        message.success(`综合分析完成：成功 ${summary.success} 个，失败 ${summary.failed} 个`);
        
        // 清空选择
        setSelectedRowKeys([]);
        
        // 刷新列表和统计
        fetchCandidates(pagination.current, pagination.pageSize);
        fetchStatistics();
      } else {
        message.error('综合分析失败');
      }
    } catch (error: any) {
      console.error('综合分析失败:', error);
      message.error(`综合分析失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setComprehensiveAnalysisLoading(false);
    }
  };

  // 加载高德地图脚本
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.AMap) {
      setMapReady(true);
      return;
    }

    const existingScript = document.querySelector(`script[src*="webapi.amap.com"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapReady(true));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=703f67ca1815ae0324022fcf7bc2afe9&plugin=AMap.Scale,AMap.ToolBar,AMap.Geocoder,AMap.PlaceSearch,AMap.Geolocation,AMap.MapType';
    script.async = true;
    script.onload = () => {
      console.log('✅ 高德地图脚本加载成功');
      setMapReady(true);
    };
    script.onerror = () => {
      console.error('❌ 高德地图脚本加载失败');
    };
    document.head.appendChild(script);
  }, []);

  const geocodeMissingCoordinates = useCallback((records: CandidateLocation[]) => {
    if (!mapReady || typeof window === 'undefined' || !window.AMap) return;

    try {
      if (!geocoderRef.current) {
        geocoderRef.current = new window.AMap.Geocoder({
          city: '全国',
          batch: false
        });
      }
    } catch (error) {
      console.error('初始化地理编码器失败:', error);
      return;
    }

    const targets = records
      .filter(record => (!record.longitude || !record.latitude) && (record.shop_address || record.shop_name))
      .slice(0, 20);

    targets.forEach(record => {
      const key = record.shop_address || record.shop_name;
      if (!key) return;
      if (geocodeCacheRef.current[key]) return;
      if (geocodePendingRef.current.has(key)) return;

      geocodePendingRef.current.add(key);

      try {
        geocoderRef.current.getLocation(key, (status: string, result: any) => {
          geocodePendingRef.current.delete(key);

          if (status === 'complete' && result?.geocodes?.length) {
            const location = result.geocodes[0].location;
            const lng = location.lng ?? (typeof location.getLng === 'function' ? location.getLng() : null);
            const lat = location.lat ?? (typeof location.getLat === 'function' ? location.getLat() : null);

            if (lng && lat) {
              geocodeCacheRef.current[key] = { longitude: lng, latitude: lat };

              setCandidates(prev =>
                prev.map(item =>
                  item.id === record.id
                    ? {
                        ...item,
                        longitude: item.longitude ?? lng,
                        latitude: item.latitude ?? lat
                      }
                    : item
                )
              );
            }
          }
        });
      } catch (error) {
        console.error('地理编码请求失败:', { key, error });
        geocodePendingRef.current.delete(key);
      }
    });
  }, [mapReady]);

  // 初始化地图
  const initMap = () => {
    if (!mapRef.current || typeof window === 'undefined' || !window.AMap || !mapReady) {
      return;
    }

    try {
      if (amapRef.current) {
        try {
          amapRef.current.destroy();
        } catch (e) {
          console.warn('清理旧地图实例失败:', e);
        }
        amapRef.current = null;
        markersRef.current = [];
      }

      const defaultCenter: [number, number] = [116.3974, 39.9093];
      // 优先使用地图专用数据，但如果过滤条件改变了，使用最新的列表数据
      // 确保数组有效且过滤掉undefined元素
      const validMapCandidates = (mapCandidates || []).filter((c): c is CandidateLocation => c != null);
      const validCandidates = (candidates || []).filter((c): c is CandidateLocation => c != null);
      
      const sourceData = validMapCandidates.length > 0 && 
                         validMapCandidates.some(c => c && c.longitude && c.latitude) 
                         ? validMapCandidates : validCandidates;
      const firstWithCoords = sourceData.find(c => 
        c != null && 
        typeof c.longitude === 'number' && 
        typeof c.latitude === 'number' &&
        !isNaN(c.longitude) && 
        !isNaN(c.latitude)
      );
      
      const map = new window.AMap.Map(mapRef.current, {
        center: firstWithCoords && 
                typeof firstWithCoords.longitude === 'number' && 
                typeof firstWithCoords.latitude === 'number'
          ? [firstWithCoords.longitude, firstWithCoords.latitude]
          : defaultCenter,
        zoom: firstWithCoords ? 12 : 10,
        mapStyle: 'amap://styles/normal',
        features: ['bg', 'road', 'building', 'point']
      });

      try {
        map.addControl(new window.AMap.Scale({ position: 'LB' }));
        map.addControl(new window.AMap.ToolBar({ position: 'RT' }));
        
        const mapType = new window.AMap.MapType({
          defaultType: 0,
          showRoad: true,
          showTraffic: false
        });
        map.addControl(mapType);
      } catch (e) {
        console.warn('添加地图控件失败:', e);
      }

      amapRef.current = map;
      // addMarkersToMap 会在 useEffect 中自动调用，这里不需要手动调用
    } catch (error) {
      console.error('初始化地图失败:', error);
    }
  };

  // 添加标记到地图（必须在 initMap 之后定义，但 initMap 不直接调用它）
  const addMarkersToMap = useCallback(() => {
    if (!amapRef.current || !window.AMap) {
      return;
    }

    try {
      markersRef.current.forEach(marker => {
        try {
          amapRef.current.remove(marker);
        } catch (e) {
          console.warn('移除标记失败:', e);
        }
      });
      markersRef.current = [];

      // 优先使用地图专用数据，确保数据与当前过滤条件一致
      // 确保数组有效且过滤掉undefined元素
      const validMapCandidates = (mapCandidates || []).filter((c): c is CandidateLocation => c != null);
      const validCandidates = (candidates || []).filter((c): c is CandidateLocation => c != null);
      const sourceData = validMapCandidates.length > 0 ? validMapCandidates : validCandidates;
      const locationsWithCoords = sourceData.filter(c => 
        c != null &&
        typeof c.longitude === 'number' && typeof c.latitude === 'number' &&
        !isNaN(c.longitude) && !isNaN(c.latitude)
      );
      
      console.log(`📍 准备添加 ${locationsWithCoords.length} 个标记到地图（数据来源：${mapCandidates.length > 0 ? 'mapCandidates' : 'candidates'}）`);

      if (locationsWithCoords.length === 0) {
        console.warn('⚠️ 没有找到有效的坐标数据');
        return;
      }

      const infoWindow = new window.AMap.InfoWindow({ offset: new window.AMap.Pixel(0, -30) });

      locationsWithCoords.forEach((candidate) => {
        if (!candidate || 
            typeof candidate.longitude !== 'number' || 
            typeof candidate.latitude !== 'number' ||
            isNaN(candidate.longitude) || 
            isNaN(candidate.latitude)) {
          console.warn('跳过无效的候选数据:', candidate);
          return;
        }
        
        try {
          const position: [number, number] = [candidate.longitude, candidate.latitude];
          
          const marker = new window.AMap.Marker({
            position,
            title: candidate.shop_name,
            icon: new window.AMap.Icon({
              size: new window.AMap.Size(32, 32),
              image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
              imageOffset: new window.AMap.Pixel(0, 0),
              imageSize: new window.AMap.Size(32, 32)
            })
          });

          marker.on('click', () => {
            const statusText =
              candidate.status === 'approved'
                ? '已批准'
                : candidate.status === 'rejected'
                ? '已拒绝'
                : '待分析';
            const statusColor =
              candidate.status === 'approved'
                ? '#52c41a'
                : candidate.status === 'rejected'
                ? '#ff4d4f'
                : '#faad14';

            const content = `
              <div style="padding: 10px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px;">${candidate.shop_name}</h3>
                <p style="margin: 4px 0; color: #666; font-size: 12px;">
                  <strong>地址：</strong>${candidate.shop_address || '未知'}
                </p>
                <p style="margin: 4px 0; color: #666; font-size: 12px;">
                  <strong>位置：</strong>${candidate.province || ''} ${candidate.city || ''} ${candidate.district || ''}
                </p>
                ${candidate.rent_amount ? `<p style="margin: 4px 0; color: #666; font-size: 12px;"><strong>租金：</strong>¥${candidate.rent_amount}</p>` : ''}
                <p style="margin: 4px 0; font-size: 12px;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${statusColor}; color: white;">${statusText}</span>
                </p>
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(amapRef.current, position);
          });

          amapRef.current.add(marker);
          markersRef.current.push(marker);
        } catch (e) {
          console.error('创建标记失败:', e);
        }
      });

      if (markersRef.current.length > 0) {
        amapRef.current.setFitView(markersRef.current, false, [60, 60, 60, 60]);
      }

      console.log(`✅ 已添加 ${locationsWithCoords.length} 个铺位标记`);
    } catch (error) {
      console.error('添加标记失败:', error);
    }
  }, [mapCandidates, candidates]);

  // 当切换到地图标签页时初始化地图
  useEffect(() => {
    if (activeTab === 'map' && candidates.length > 0 && mapReady) {
      setTimeout(() => {
        initMap();
      }, 300);
    }
  }, [activeTab, candidates, mapReady]);

  // 当数据更新时，如果在地图标签页，更新标记
  useEffect(() => {
    if (activeTab === 'map' && amapRef.current) {
      // 优先使用 mapCandidates，如果为空则使用 candidates
      const hasData = (mapCandidates.length > 0 || candidates.length > 0);
      if (hasData) {
        addMarkersToMap();
      }
    }
  }, [activeTab, mapCandidates, candidates, addMarkersToMap]);

  // 数据加载后尝试补全缺失坐标（仅在地图标签页且地图已准备好时）
  const geocodeProcessed = useRef(false);
  useEffect(() => {
    if (activeTab === 'map' && mapReady && mapCandidates.length > 0 && !geocodeProcessed.current) {
      geocodeProcessed.current = true;
      // 延迟执行，避免与地图初始化冲突
      setTimeout(() => {
        geocodeMissingCoordinates(mapCandidates);
      }, 1000);
    } else if (activeTab !== 'map') {
      geocodeProcessed.current = false;
    }
  }, [activeTab, mapReady, mapCandidates, geocodeMissingCoordinates]);

  // 当过滤条件改变时，同步更新两个视图的数据
  useEffect(() => {
    // 重置地图数据获取标志，确保下次切换到地图时会重新获取
    hasFetchedMapData.current = false;
    
    // 清空当前数据，强制重新加载
    if (activeTab === 'list') {
      // 列表视图：重新获取第一页数据
      fetchCandidates(1, pagination.pageSize);
    } else if (activeTab === 'map') {
      // 地图视图：清空现有数据并重新获取
      setMapCandidates([]);
      fetchMapCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.city, filters.status]);

  // 只在切换到地图标签页时加载数据，避免重复请求
  const hasFetchedMapData = useRef(false);
  useEffect(() => {
    if (activeTab === 'map' && !mapLoading && !hasFetchedMapData.current) {
      hasFetchedMapData.current = true;
      fetchMapCandidates();
    } else if (activeTab !== 'map') {
      hasFetchedMapData.current = false;
    }
  }, [activeTab, fetchMapCandidates]);

  useEffect(() => {
    fetchCandidates();
    fetchStatistics();
  }, []);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record: CandidateLocation) => ({
      disabled: false
    })
  };

  const columns = [
    {
      title: '店铺名称',
      dataIndex: 'shop_name',
      key: 'shop_name',
      width: 200,
      render: (text: string, record: CandidateLocation) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <EnvironmentOutlined /> {record.shop_address}
          </div>
        </div>
      )
    },
    {
      title: '位置信息',
      key: 'location',
      width: 150,
      render: (record: CandidateLocation) => (
        <div>
          <div>{record.province}</div>
          <div>{record.city}</div>
          <div>{record.district}</div>
        </div>
      )
    },
    {
      title: '租金',
      dataIndex: 'rent_amount',
      key: 'rent_amount',
      width: 100,
      render: (amount: number) => (
        <div>
          <DollarOutlined /> {amount ? `¥${amount}` : '未设置'}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', text: '待分析' },
          analyzed: { color: 'green', text: '已分析' },
          approved: { color: 'blue', text: '已批准' },
          rejected: { color: 'red', text: '已拒绝' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '分析评分',
      dataIndex: 'analysis_score',
      key: 'analysis_score',
      width: 120,
      render: (score: number | null | undefined) => {
        if (score === null || score === undefined || score === 0) {
          return <Tag color="orange">待分析</Tag>;
        }
        
        const getScoreColor = (score: number) => {
          if (score >= 80) return '#52c41a';
          if (score >= 60) return '#faad14';
          return '#ff4d4f';
        };
        
        return (
          <div>
            <Progress
              percent={score}
              size="small"
              strokeColor={getScoreColor(score)}
              format={() => `${score.toFixed(1)}`}
            />
          </div>
        );
      }
    },
    {
      title: '预测收入',
      dataIndex: 'predicted_revenue',
      key: 'predicted_revenue',
      width: 120,
      render: (revenue: number | null | undefined) => {
        if (revenue === null || revenue === undefined || revenue === 0) {
          return <Tag color="default">未预测</Tag>;
        }
        return (
          <div>
            <DollarOutlined /> ¥{(revenue / 10000).toFixed(1)}万
          </div>
        );
      }
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (riskLevel: string | null | undefined) => {
        if (!riskLevel || riskLevel === '') {
          return <Tag color="default">未评估</Tag>;
        }
        
        const riskConfig = {
          low: { color: 'green', text: '低风险' },
          medium: { color: 'orange', text: '中风险' },
          high: { color: 'red', text: '高风险' }
        };
        const config = riskConfig[riskLevel as keyof typeof riskConfig] || { color: 'default', text: riskLevel };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (record: CandidateLocation) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<BarChartOutlined />}
            loading={analysisLoading === parseInt(record.id)}
            onClick={() => analyzeCandidate(record)}
            disabled={analysisLoading !== null}
          >
            分析
          </Button>
          {(record.analysis_score && record.analysis_score > 0) || record.description ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'pdf',
                    label: '导出PDF',
                    icon: <FilePdfOutlined />,
                    onClick: () => exportReport(record.id, 'pdf')
                  },
                  {
                    key: 'word',
                    label: '导出Word',
                    icon: <FileWordOutlined />,
                    onClick: () => exportReport(record.id, 'word')
                  }
                ]
              }}
              trigger={['click']}
            >
              <Button
                type="default"
                size="small"
                icon={<DownloadOutlined />}
                onClick={(e) => e.stopPropagation()}
              >
                导出
              </Button>
            </Dropdown>
          ) : null}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedCandidate(record);
              setAnalysisModalVisible(true);
            }}
          >
            查看
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="意向铺位管理" style={{ marginBottom: '24px' }}>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic
              title="总铺位数"
              value={statistics.total || pagination.total}
              prefix={<EnvironmentOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已分析"
              value={statistics.analyzed}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="待分析"
              value={statistics.pending}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均评分"
              value={statistics.analyzed > 0 ? statistics.avgScore : 0}
              precision={1}
              suffix={statistics.analyzed > 0 ? "分" : ""}
              prefix={<BarChartOutlined />}
              valueStyle={statistics.analyzed === 0 ? { color: '#999' } : {}}
            />
          </Col>
        </Row>

        {/* 筛选条件 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Select
              placeholder="选择城市"
              style={{ width: '100%' }}
              allowClear
              value={filters.city || undefined}
              onChange={(value) => {
                const newFilters = { ...filters, city: value || '' };
                setFilters(newFilters);
                // 立即触发数据刷新
                setPagination(prev => ({ ...prev, current: 1 }));
                if (activeTab === 'list') {
                  fetchCandidates(1, pagination.pageSize);
                } else {
                  hasFetchedMapData.current = false;
                  fetchMapCandidates();
                }
              }}
            >
              <Option value="北京市">北京市</Option>
              <Option value="上海市">上海市</Option>
              <Option value="广州市">广州市</Option>
              <Option value="深圳市">深圳市</Option>
              <Option value="大连市">大连市</Option>
              <Option value="天津市">天津市</Option>
              <Option value="沈阳市">沈阳市</Option>
              <Option value="辽阳市">辽阳市</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters({ ...filters, status: value || '' })}
            >
              <Option value="pending">待分析</Option>
              <Option value="analyzed">已分析</Option>
              <Option value="approved">已批准</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => {
                // 重置分页到第一页
                setPagination(prev => ({ ...prev, current: 1 }));
                // 根据当前视图刷新对应数据
                if (activeTab === 'list') {
                  fetchCandidates(1, pagination.pageSize);
                } else {
                  hasFetchedMapData.current = false;
                  fetchMapCandidates();
                }
              }}
            >
              搜索
            </Button>
          </Col>
          <Col span={6}>
            <Button
              onClick={() => {
                const pendingIds = candidates
                  .filter(c => c.status === 'pending')
                  .map(c => c.id);
                if (pendingIds.length > 0) {
                  batchAnalyze(pendingIds);
                } else {
                  message.info('没有待分析的铺位');
                }
              }}
            >
              批量分析待分析铺位
            </Button>
          </Col>
          <Col span={6}>
            <Button
              type="primary"
              danger
              loading={comprehensiveAnalysisLoading}
              disabled={selectedRowKeys.length === 0}
              onClick={comprehensiveAnalysis}
            >
              大模型综合分析 ({selectedRowKeys.length})
            </Button>
          </Col>
        </Row>

        {/* 列表和地图切换 */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: (
                <span>
                  <UnorderedListOutlined /> 列表视图
                </span>
              ),
              children: (
                <>
                  {/* 表格 */}
                  <Table
                    columns={columns}
                    dataSource={candidates}
                    loading={loading}
                    rowKey="id"
                    rowSelection={rowSelection}
                    pagination={false}
                    scroll={{ x: 1200 }}
                  />

                  {/* 分页 */}
                  <div style={{ textAlign: 'right', marginTop: '16px' }}>
                    <Pagination
                      current={pagination.current}
                      pageSize={pagination.pageSize}
                      total={pagination.total}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                      onChange={(page, pageSize) => fetchCandidates(page, pageSize || 20)}
                      onShowSizeChange={(current, size) => fetchCandidates(current, size)}
                    />
                  </div>
                </>
              )
            },
            {
              key: 'map',
              label: (
                <span>
                  <AppstoreOutlined /> 地图视图
                </span>
              ),
              children: (
                <>
                  <div 
                    ref={mapRef} 
                    style={{ 
                      width: '100%', 
                      height: '600px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px'
                    }} 
                  />
                  {candidates.filter(c => c.longitude && c.latitude).length === 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px',
                      color: '#999'
                    }}>
                      暂无有效的坐标数据，请确保数据中包含经纬度信息
                    </div>
                  )}
                </>
              )
            }
          ]}
        />
      </Card>

      {/* 分析结果模态框 */}
      <Modal
        title={`分析结果 - ${selectedCandidate?.shop_name}`}
        open={analysisModalVisible}
        onCancel={() => setAnalysisModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setAnalysisModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {analysisResult && (
          <div>
            {/* 基本信息 */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>地址：</strong>{analysisResult?.location || '未知'}</div>
                  {analysisResult?.coordinates && typeof analysisResult.coordinates.longitude === 'number' && typeof analysisResult.coordinates.latitude === 'number' && (
                    <div><strong>坐标：</strong>{analysisResult.coordinates.longitude}, {analysisResult.coordinates.latitude}</div>
                  )}
                </Col>
                <Col span={12}>
                  <div><strong>总分：</strong>
                    <Badge
                      count={(analysisResult?.scores?.overallScore || 0).toFixed(1)}
                      style={{ backgroundColor: (analysisResult?.scores?.overallScore || 0) >= 80 ? '#52c41a' : (analysisResult?.scores?.overallScore || 0) >= 60 ? '#faad14' : '#ff4d4f' }}
                    />
                  </div>
                  <div><strong>风险等级：</strong>
                    <Tag color={analysisResult?.analysis?.riskLevel === 'low' ? 'green' : analysisResult?.analysis?.riskLevel === 'medium' ? 'orange' : 'red'}>
                      {analysisResult?.analysis?.riskLevel === 'low' ? '低风险' : analysisResult?.analysis?.riskLevel === 'medium' ? '中风险' : '高风险'}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 评分详情 */}
            <Card size="small" title="评分详情" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div>POI密度: {(analysisResult?.scores?.poiDensity || 0).toFixed(1)}</div>
                  <div>人口密度: {(analysisResult?.scores?.populationDensity || 0).toFixed(1)}</div>
                </Col>
                <Col span={8}>
                  <div>交通便利性: {(analysisResult?.scores?.trafficAccessibility || 0).toFixed(1)}</div>
                  <div>竞争水平: {(analysisResult?.scores?.competitionLevel || 0).toFixed(1)}</div>
                </Col>
                <Col span={8}>
                  <div>租金成本: {(analysisResult?.scores?.rentalCost || 0).toFixed(1)}</div>
                  <div>人流量: {(analysisResult?.scores?.footTraffic || 0).toFixed(1)}</div>
                </Col>
              </Row>
            </Card>

            {/* 分析结果 */}
            <Card size="small" title="分析结果" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div><strong>优势：</strong></div>
                  {(analysisResult?.analysis?.strengths || []).map((strength, index) => (
                    <div key={index}>• {strength}</div>
                  ))}
                </Col>
                <Col span={8}>
                  <div><strong>劣势：</strong></div>
                  {(analysisResult?.analysis?.weaknesses || []).map((weakness, index) => (
                    <div key={index}>• {weakness}</div>
                  ))}
                </Col>
                <Col span={8}>
                  <div><strong>建议：</strong></div>
                  {(analysisResult?.analysis?.recommendations || []).map((recommendation, index) => (
                    <div key={index}>• {recommendation}</div>
                  ))}
                </Col>
              </Row>
            </Card>

            {/* 预测结果 */}
            <Card size="small" title="预测结果" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="预期月收入"
                    value={analysisResult?.predictions?.expectedRevenue || 0}
                    formatter={(value) => `¥${(Number(value) / 10000).toFixed(1)}万`}
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="置信度"
                    value={(analysisResult?.predictions?.confidence || 0) * 100}
                    suffix="%"
                    precision={1}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="回本时间"
                    value={analysisResult?.predictions?.breakEvenTime || 0}
                    suffix="个月"
                  />
                </Col>
              </Row>
            </Card>

            {/* 周边环境 */}
            <Card size="small" title="周边环境">
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>学校：</strong></div>
                  {Object.entries(analysisResult?.data?.schools || {}).map(([type, count]) => (
                    <div key={type}>• {type}: {count}个</div>
                  ))}
                </Col>
                <Col span={12}>
                  <div><strong>交通设施：</strong></div>
                  {(analysisResult?.data?.trafficStations || []).map((station: any, index: number) => (
                    <div key={index}>• {station?.type || '未知'}: {station?.count || 0}个</div>
                  ))}
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CandidateLocationsPage;
