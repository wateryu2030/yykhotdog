import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Select, Input, Button, Tag, Statistic, Spin, message, Modal, Table, Space, Image } from 'antd';
import { EnvironmentOutlined, CarOutlined, ShopOutlined, HomeOutlined, BankOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AMAP_CONFIG } from '../config/amap';

const { Option } = Select;
const { Search } = Input;

type CoordinateTuple = [number, number];

interface CandidateLocation {
  id: string;
  shop_name: string;
  shop_address: string;
  location: string;
  province: string;
  city: string;
  district: string;
  rent_amount: number;
  area_size: number;
  analysis_score: number;
  poi_density_score?: number;
  traffic_score?: number;
  population_score?: number;
  competition_score?: number;
  rental_cost_score?: number;
  predicted_revenue: number;
  confidence_score: number;
  success_probability?: number;
  risk_level: string;
  status: string;
  coordinates: CoordinateTuple;
  normalizedCity: string;
  photo_url?: string;
}

type RawCandidateLocation = Omit<CandidateLocation, 'coordinates' | 'normalizedCity'>;
const cleanCityName = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.replace(/市$/, '').trim();
  if (!trimmed || trimmed === '未知') return '';
  return trimmed;
};

const extractCityFromAddress = (address?: string | null) => {
  if (!address) return '';
  const match = address.match(/([\u4e00-\u9fa5]{2,5})市/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
};


const parseLocationCoordinates = (location?: string | null): CoordinateTuple | null => {
  if (!location) return null;
  
  const parts = location
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  
  if (parts.length !== 2) {
    return null;
  }

  const first = Number(parts[0]);
  const second = Number(parts[1]);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  let lng = first;
  let lat = second;

  const firstLooksLikeLat = Math.abs(first) <= 90 && Math.abs(second) > 90;
  const secondLooksLikeLat = Math.abs(second) <= 90 && Math.abs(first) > 90;

  if (firstLooksLikeLat && !secondLooksLikeLat) {
    lat = first;
    lng = second;
  } else if (firstLooksLikeLat && secondLooksLikeLat) {
    // 两个值都在纬度范围内，默认第一个是纬度、第二个是经度
    lat = first;
    lng = second;
  }

  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return null;
  }

  return [lng, lat];
};

const GISMapView: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateLocation[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateLocation[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string>('');
  const mapRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);

  // 从数据中获取城市列表
  const getCityList = () => {
    const cities = new Set<string>();
    candidates.forEach(item => {
      if (item.normalizedCity) {
        cities.add(item.normalizedCity);
      }
    });
    return Array.from(cities).sort();
  };

  // 从数据中获取状态列表
  const getStatusList = () => {
    const statuses = new Set<string>();
    candidates.forEach(item => {
      if (item.status && item.status.trim()) {
        statuses.add(item.status);
      }
    });
    return Array.from(statuses);
  };

  // 从数据中获取风险等级列表
  const getRiskLevelList = () => {
    const riskLevels = new Set<string>();
    candidates.forEach(item => {
      if (item.risk_level && item.risk_level.trim()) {
        riskLevels.add(item.risk_level);
      }
    });
    return Array.from(riskLevels);
  };

  // 根据数据计算地图初始中心点和缩放级别
  // 参数：dataSource - 使用哪个数据源（candidates 或 filteredCandidates）
  const calculateMapCenter = (dataSource: CandidateLocation[]) => {
    if (dataSource.length === 0) {
      // 如果没有数据，返回null
      return null;
    }

    const validCoords = dataSource
      .map(item => item.coordinates)
      .filter(
        (coord): coord is CoordinateTuple =>
          Array.isArray(coord) &&
          Number.isFinite(coord[0]) &&
          Number.isFinite(coord[1])
      );

    if (validCoords.length === 0) {
      return null;
    }

    // 计算所有坐标的中心点
    const sumLng = validCoords.reduce((sum, [lng]) => sum + lng, 0);
    const sumLat = validCoords.reduce((sum, [, lat]) => sum + lat, 0);
    const centerLng = sumLng / validCoords.length;
    const centerLat = sumLat / validCoords.length;

    // 计算合适的缩放级别（根据坐标范围）
    const lngs = validCoords.map(([lng]) => lng);
    const lats = validCoords.map(([, lat]) => lat);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const maxRange = Math.max(lngRange, latRange);
    
    // 根据范围计算缩放级别
    let zoom = 11;
    if (maxRange > 1) zoom = 9;
    else if (maxRange > 0.5) zoom = 10;
    else if (maxRange > 0.2) zoom = 11;
    else if (maxRange > 0.1) zoom = 12;
    else if (maxRange > 0.05) zoom = 13;
    else zoom = 14;

    return { center: [centerLng, centerLat] as [number, number], zoom };
  };

  // 获取意向铺位数据
  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/site-selection/candidates', {
        params: { page: 1, limit: 1000 }
      });
      
      if (response.data.success) {
        // 只保留有有效坐标的数据，移除硬编码的默认位置
        const candidatesData: CandidateLocation[] = response.data.data.records
          .map((item: RawCandidateLocation) => {
            const coordinates = parseLocationCoordinates(item.location);
            if (!coordinates) {
              console.warn(
                `跳过没有有效坐标的铺位: ${item.shop_name}, 原始坐标: ${item.location}`
              );
              return null;
            }

            const normalizedCity =
              cleanCityName(item.city) ||
              extractCityFromAddress(item.shop_address);

            return {
              ...item,
              coordinates,
              normalizedCity
            };
          })
          .filter(
            (item: CandidateLocation | null): item is CandidateLocation =>
              item !== null
          );

        setCandidates(candidatesData);
        // 不要在这里设置filteredCandidates，让filterCandidates函数来处理
        console.log('成功获取意向铺位数据:', candidatesData.length);
      }
    } catch (error) {
      console.error('获取意向铺位数据失败:', error);
      message.error('获取意向铺位数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 筛选数据
  const filterCandidates = () => {
    let filtered = candidates;

    // 城市筛选 - 支持模糊匹配（"沈阳"匹配"沈阳市"）
    if (cityFilter !== 'all') {
      filtered = filtered.filter(item => {
        const city = item.normalizedCity || '';
        // 支持精确匹配和包含匹配
        return city === cityFilter || city.includes(cityFilter) || cityFilter.includes(city);
      });
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // 评分筛选
    if (scoreFilter !== 'all') {
      filtered = filtered.filter(item => {
        const score = item.analysis_score || 0;
        switch (scoreFilter) {
          case 'excellent': return score >= 80;
          case 'good': return score >= 60 && score < 80;
          case 'poor': return score < 60;
          default: return true;
        }
      });
    }

    // 搜索筛选
    if (searchText) {
      filtered = filtered.filter(item => 
        item.shop_name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.shop_address.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  };

  // 获取风险等级颜色
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '#52c41a';
      case 'medium': return '#faad14';
      case 'high': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed': return '#52c41a';
      case 'pending': return '#faad14';
      case 'rejected': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 处理标记点击
  const handleMarkerClick = (candidate: CandidateLocation) => {
    setSelectedCandidate(candidate);
    
    const coords = candidate.coordinates;
    if (coords && amapRef.current) {
      // 移动地图中心
      amapRef.current.setCenter(coords);
      amapRef.current.setZoom(15);
    }
  };

  // 初始化地图
  const initMap = () => {
    try {
      if (typeof window === 'undefined' || !window.AMap) {
        console.warn('高德地图API未加载');
        setMapError('高德地图API未加载，请稍候重试');
        return;
      }

      if (!mapRef.current) {
        console.warn('地图容器未找到');
        setMapError('地图容器未找到');
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

      // 确保容器有尺寸，地图才能正确初始化
      const container = mapRef.current;
      if (container) {
        // 确保容器有尺寸
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          console.warn('地图容器尺寸为0，等待容器渲染');
          setTimeout(() => {
            initMap();
          }, 200);
          return;
        }
      }

      console.log('开始初始化高德地图，容器:', container, '尺寸:', container?.offsetWidth, 'x', container?.offsetHeight);
      console.log('当前数据量 - candidates:', candidates.length, 'filteredCandidates:', filteredCandidates.length);
      
      // 根据实际数据计算地图中心点和缩放级别
      // 使用全部数据（candidates）计算初始中心点
      const mapConfig = calculateMapCenter(candidates);
      if (!mapConfig) {
        console.warn('没有有效的数据坐标，无法初始化地图。candidates数量:', candidates.length);
        // 如果数据还在加载中，等待一下再重试
        if (loading) {
          console.log('数据还在加载中，1秒后重试初始化地图');
          setTimeout(() => {
            initMap();
          }, 1000);
          return;
        } else if (candidates.length === 0) {
          setMapError('没有铺位数据，请先添加铺位');
          return;
        } else {
          setMapError('没有有效的铺位坐标数据');
          return;
        }
      }
      
      const { center, zoom } = mapConfig;
      console.log('地图初始中心点:', center, '缩放级别:', zoom, '基于', candidates.length, '条数据');
      
      const map = new window.AMap.Map(container, {
        center: center,
        zoom: zoom,
        mapStyle: 'amap://styles/normal',
        features: ['bg', 'road', 'building', 'point']
      });
      
      amapRef.current = map;
      
      // 等待地图加载完成
      map.on('complete', () => {
        console.log('高德地图加载完成');
        setMapLoaded(true);
        setMapError('');
        // 标记添加会通过useEffect监听filteredCandidates的变化来触发
      });
      
      // 添加错误处理
      map.on('error', (e: any) => {
        console.error('地图加载错误:', e);
        setMapError('地图加载错误: ' + (e.message || '未知错误'));
      });
      
      console.log('高德地图初始化成功');
    } catch (error) {
      console.error('高德地图初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMapError('地图初始化失败: ' + errorMessage);
      message.error('地图初始化失败: ' + errorMessage);
    }
  };

  // 添加标记到地图
  const addMarkersToMap = (map: any) => {
    try {
      console.log('开始添加标记，数量:', filteredCandidates.length);
      
      // 清除现有标记
      if (map && map.clearMap) {
        map.clearMap();
      }
      
      filteredCandidates.forEach((candidate, index) => {
        try {
          const [longitude, latitude] = candidate.coordinates;
          if (
            !Number.isFinite(longitude) ||
            !Number.isFinite(latitude)
          ) {
            console.warn(`跳过无效坐标的铺位: ${candidate.shop_name}, 坐标: ${candidate.location}`);
            return;
          }

          const marker = new window.AMap.Marker({
            position: [longitude, latitude],
            title: candidate.shop_name,
            content: `
              <div style="
                width: 20px; 
                height: 20px; 
                border-radius: 50%; 
                background-color: ${getRiskColor(candidate.risk_level)}; 
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
                ${candidate.analysis_score ? Math.round(candidate.analysis_score) : '?'}
              </div>
            `
          });

          marker.on('click', () => {
            handleMarkerClick(candidate);
          });

          map.add(marker);
          
          if (index % 50 === 0) {
            console.log(`已添加 ${index + 1} 个标记`);
          }
        } catch (markerError) {
          console.error(`添加标记失败 (${candidate.shop_name}):`, markerError);
        }
      });
      
      console.log('标记添加完成');
    } catch (error) {
      console.error('添加标记到地图失败:', error);
      message.error('地图标记加载失败');
    }
  };

  // 加载高德地图脚本
  const loadAmapScript = () => {
    // 检查是否已经加载
    if (typeof window !== 'undefined' && window.AMap) {
      console.log('高德地图已存在，直接初始化');
      initMap();
      return;
    }

    // 检查是否已经在加载中
    if (document.querySelector('script[src*="webapi.amap.com"]')) {
      console.log('高德地图脚本正在加载中...');
      // 如果脚本正在加载，等待加载完成
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.AMap) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      return;
    }

    console.log('开始加载高德地图脚本，API Key:', AMAP_CONFIG.key);
    
    const script = document.createElement('script');
    const plugins = AMAP_CONFIG.plugins.join(',');
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=${plugins}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('高德地图脚本加载成功');
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.AMap) {
          initMap();
        } else {
          console.error('高德地图对象未找到');
          setMapError('地图对象初始化失败');
        }
      }, 500);
    };
    
    script.onerror = (error) => {
      console.error('高德地图脚本加载失败:', error);
      setMapError('地图服务加载失败，请检查网络连接或API密钥');
      message.error('地图服务加载失败，请检查网络连接或API密钥');
    };
    
    document.head.appendChild(script);
  };

  // 表格列定义
  const columns = [
    {
      title: '铺位名称',
      dataIndex: 'shop_name',
      key: 'shop_name',
      width: 200,
    },
    {
      title: '地址',
      dataIndex: 'shop_address',
      key: 'shop_address',
      width: 300,
    },
    {
      title: '坐标',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'analyzed' ? '已分析' : 
           status === 'pending' ? '待分析' : '已拒绝'}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (riskLevel: string) => (
        <Tag color={getRiskColor(riskLevel)}>
          {riskLevel === 'low' ? '低风险' :
           riskLevel === 'medium' ? '中风险' : '高风险'}
        </Tag>
      ),
    },
    {
      title: '评分',
      dataIndex: 'analysis_score',
      key: 'analysis_score',
      width: 100,
      render: (score: number) => score ? `${score.toFixed(1)}分` : '-',
    },
    {
      title: '预测营收',
      dataIndex: 'predicted_revenue',
      key: 'predicted_revenue',
      width: 120,
      render: (revenue: number) => revenue ? `¥${revenue.toLocaleString()}` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (record: CandidateLocation) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => setSelectedCandidate(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [cityFilter, statusFilter, scoreFilter, searchText, candidates]);

  useEffect(() => {
    // 确保地图已加载、在地图视图模式、且有筛选后的数据
    if (mapLoaded && amapRef.current && viewMode === 'map' && filteredCandidates.length > 0) {
      console.log('更新地图标记，使用filteredCandidates，数量:', filteredCandidates.length);
      addMarkersToMap(amapRef.current);
      
      // 如果筛选了条件，调整地图中心到筛选后的数据区域
      if (cityFilter !== 'all' || statusFilter !== 'all' || scoreFilter !== 'all' || searchText) {
        const mapConfig = calculateMapCenter(filteredCandidates);
        if (mapConfig) {
          setTimeout(() => {
            if (amapRef.current) {
              amapRef.current.setCenter(mapConfig.center);
              amapRef.current.setZoom(mapConfig.zoom);
            }
          }, 500);
        }
      }
    }
  }, [filteredCandidates, mapLoaded, viewMode, cityFilter, statusFilter, scoreFilter, searchText]);

  useEffect(() => {
    // 只有在地图视图模式下才加载地图
    if (viewMode === 'map') {
      console.log('切换到地图视图，准备加载地图');
      setMapError('');
      setMapLoaded(false);
      
      // 等待DOM更新完成后再加载地图
      const checkAndLoad = () => {
        // 使用requestAnimationFrame确保DOM已更新
        requestAnimationFrame(() => {
          // 检查数据是否已加载
          if (loading) {
            console.log('数据还在加载中，等待数据加载完成...');
            setTimeout(checkAndLoad, 500);
            return;
          }
          
          // 检查是否有数据
          if (candidates.length === 0) {
            console.warn('没有数据，等待数据加载...');
            setTimeout(checkAndLoad, 500);
            return;
          }
          
          // 再次检查，确保容器已挂载
          if (mapRef.current) {
            console.log('地图容器已找到，数据已加载，开始加载地图脚本');
            loadAmapScript();
          } else {
            // 如果还没找到，再等待一段时间后重试
            console.warn('地图容器未找到，500ms后重试');
            setTimeout(() => {
              if (mapRef.current) {
                console.log('重试：地图容器已找到，开始加载地图脚本');
                loadAmapScript();
              } else {
                console.error('重试失败：地图容器仍未找到');
                setMapError('地图容器未找到，请刷新页面重试');
              }
            }, 500);
          }
        });
      };
      
      // 延迟执行，确保React完成DOM更新
      const timer = setTimeout(checkAndLoad, 100);

      return () => {
        clearTimeout(timer);
        // 清理地图实例
        if (amapRef.current) {
          try {
            console.log('清理地图实例');
            amapRef.current.destroy();
          } catch (e) {
            console.warn('清理地图实例失败:', e);
          }
          amapRef.current = null;
          setMapLoaded(false);
        }
      };
    } else {
      // 切换到表格视图时，清理地图状态
      if (amapRef.current) {
        try {
          amapRef.current.destroy();
        } catch (e) {
          console.warn('清理地图实例失败:', e);
        }
        amapRef.current = null;
      }
      setMapLoaded(false);
    }
  }, [viewMode, loading, candidates.length]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部控制面板 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={3}>
            <Select
              placeholder="选择城市"
              value={cityFilter}
              onChange={setCityFilter}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) => {
                const value = String(option?.value || '');
                return value.toLowerCase().includes(input.toLowerCase());
              }}
            >
              <Option value="all">全部城市</Option>
              {getCityList().map(city => (
                <Option key={city} value={city}>{city}</Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="选择状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部状态</Option>
              {getStatusList().map(status => (
                <Option key={status} value={status}>
                  {status === 'analyzed' ? '已分析' : 
                   status === 'pending' ? '待分析' : 
                   status === 'rejected' ? '已拒绝' : status}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="选择评分"
              value={scoreFilter}
              onChange={setScoreFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部评分</Option>
              <Option value="excellent">优秀(≥80)</Option>
              <Option value="good">良好(60-79)</Option>
              <Option value="poor">较差(&lt;60)</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Search
              placeholder="搜索铺位名称或地址"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={filterCandidates}
            />
          </Col>
          <Col span={3}>
            <Space.Compact>
              <Button 
                type={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
              >
                表格视图
              </Button>
              <Button 
                type={viewMode === 'map' ? 'primary' : 'default'}
                onClick={() => setViewMode('map')}
                icon={<EnvironmentOutlined />}
              >
                地图视图
              </Button>
            </Space.Compact>
          </Col>
          <Col span={3}>
            <Statistic
              title="意向铺位"
              value={filteredCandidates.length}
              suffix={`/ ${candidates.length}`}
            />
          </Col>
        </Row>
      </Card>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Spin spinning={loading}>
          {viewMode === 'table' ? (
            <Table
              dataSource={filteredCandidates}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
              }}
              scroll={{ y: 'calc(100vh - 200px)' }}
              size="small"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: '600px' }}>
              {/* 地图容器始终渲染，确保ref能正确绑定 */}
              {/* 容器必须始终可见，否则地图无法正确初始化 */}
              <div 
                ref={mapRef}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  minHeight: '600px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1
                }}
              />
              
              {/* 错误提示覆盖层 */}
              {mapError && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  minHeight: '600px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  zIndex: 1000
                }}>
                  <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <h3>地图加载失败</h3>
                  <p>{mapError}</p>
                  <Button type="primary" onClick={() => {
                    setMapError('');
                    setMapLoaded(false);
                    loadAmapScript();
                  }}>
                    重新加载地图
                  </Button>
                </div>
              )}
              
              {/* 加载提示覆盖层 */}
              {!mapLoaded && !mapError && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  minHeight: '600px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(245, 245, 245, 0.95)',
                  color: '#666',
                  zIndex: 1000
                }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16, fontSize: '14px', color: '#666' }}>
                    正在加载地图...
                  </div>
                </div>
              )}
            </div>
          )}
        </Spin>
      </div>

      {/* 铺位详情模态框 */}
      <Modal
        title={selectedCandidate?.shop_name}
        open={!!selectedCandidate}
        onCancel={() => setSelectedCandidate(null)}
        footer={null}
        width={600}
      >
        {selectedCandidate && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Tag color={getStatusColor(selectedCandidate.status)}>
                {selectedCandidate.status === 'analyzed' ? '已分析' : 
                 selectedCandidate.status === 'pending' ? '待分析' : '已拒绝'}
              </Tag>
              <Tag color={getRiskColor(selectedCandidate.risk_level)}>
                {selectedCandidate.risk_level === 'low' ? '低风险' :
                 selectedCandidate.risk_level === 'medium' ? '中风险' : '高风险'}
              </Tag>
            </div>

            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <strong>地址：</strong>{selectedCandidate.shop_address}
            </p>

            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <strong>坐标：</strong>{selectedCandidate.location}
            </p>

            {selectedCandidate.analysis_score && (
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={8}>
                  <Statistic
                    title="选址评分"
                    value={selectedCandidate.analysis_score}
                    precision={1}
                    suffix="分"
                    valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="预测营收"
                    value={selectedCandidate.predicted_revenue}
                    precision={0}
                    suffix="元"
                    valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="置信度"
                    value={selectedCandidate.confidence_score}
                    precision={2}
                    suffix="%"
                    valueStyle={{ fontSize: '16px', color: '#faad14' }}
                  />
                </Col>
              </Row>
            )}

            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>评分依据</h4>
              <Row gutter={16}>
                {[
                  { label: '商圈热度 (POI)', value: selectedCandidate.poi_density_score },
                  { label: '人口密度', value: selectedCandidate.population_score },
                  { label: '交通可达性', value: selectedCandidate.traffic_score },
                  { label: '竞争环境', value: selectedCandidate.competition_score },
                  { label: '租金成本', value: selectedCandidate.rental_cost_score }
                ].map(item => (
                  <Col span={12} key={item.label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {typeof item.value === 'number'
                        ? `${item.value.toFixed(1)} 分`
                        : '暂无数据'}
                    </div>
                  </Col>
                ))}
              </Row>
              <p style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12 }}>
                评分由高德POI密度、人口与学校分布、交通可达性、竞争饱和度及租金成本等多维因子综合计算得出。
              </p>
            </div>

            {selectedCandidate.photo_url && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>现场照片</h4>
                <Image
                  src={selectedCandidate.photo_url}
                  alt={selectedCandidate.shop_name}
                  style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
                  fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='120'><rect width='200' height='120' fill='%23f5f5f5'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='12'>图片加载失败</text></svg>"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GISMapView;