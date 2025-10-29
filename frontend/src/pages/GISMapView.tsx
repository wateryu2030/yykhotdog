import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Select, Input, Button, Tag, Statistic, Spin, message, Modal, Table, Space } from 'antd';
import { EnvironmentOutlined, CarOutlined, ShopOutlined, HomeOutlined, BankOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Search } = Input;

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
  predicted_revenue: number;
  confidence_score: number;
  risk_level: string;
  status: string;
}

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

  // 获取意向铺位数据
  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/site-selection/candidates', {
        params: { page: 1, limit: 1000 }
      });
      
      if (response.data.success) {
        const candidatesData = response.data.data.records.map((item: any) => ({
          ...item,
          location: item.location || '121.6,38.9' // 默认位置
        }));
        setCandidates(candidatesData);
        setFilteredCandidates(candidatesData);
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

    // 城市筛选
    if (cityFilter !== 'all') {
      filtered = filtered.filter(item => item.city === cityFilter);
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
    
    // 解析坐标
    const [longitude, latitude] = candidate.location.split(',').map(Number);
    if (longitude && latitude && amapRef.current) {
      // 移动地图中心
      amapRef.current.setCenter([longitude, latitude]);
      amapRef.current.setZoom(15);
    }
  };

  // 初始化地图
  const initMap = () => {
    try {
      if (typeof window !== 'undefined' && window.AMap && mapRef.current) {
        console.log('开始初始化高德地图');
        
        const map = new window.AMap.Map(mapRef.current, {
          center: [121.6, 38.9], // 大连市中心
          zoom: 11,
          mapStyle: 'amap://styles/normal'
        });
        
        amapRef.current = map;
        setMapLoaded(true);
        setMapError('');
        
        console.log('高德地图初始化成功');
        
        // 延迟添加标记
        setTimeout(() => {
          addMarkersToMap(map);
        }, 1000);
      } else {
        console.warn('高德地图初始化条件不满足');
        setMapError('地图初始化条件不满足');
      }
    } catch (error) {
      console.error('高德地图初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMapError('地图初始化失败: ' + errorMessage);
      message.error('地图初始化失败，请刷新页面重试');
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
          const [longitude, latitude] = candidate.location.split(',').map(Number);
          if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
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
      return;
    }

    console.log('开始加载高德地图脚本');
    
    const script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=6b338665ad02b0d321b851b35fc39acc&plugin=AMap.Scale,AMap.ToolBar,AMap.Geocoder,AMap.PlaceSearch';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('高德地图脚本加载成功');
      setTimeout(() => {
        initMap();
      }, 500);
    };
    
    script.onerror = (error) => {
      console.error('高德地图脚本加载失败:', error);
      setMapError('地图服务加载失败，请检查网络连接');
      message.error('地图服务加载失败，请检查网络连接');
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
    if (mapLoaded && amapRef.current) {
      addMarkersToMap(amapRef.current);
    }
  }, [filteredCandidates, mapLoaded]);

  useEffect(() => {
    // 延迟加载地图脚本，确保组件完全挂载
    const timer = setTimeout(() => {
      loadAmapScript();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
            >
              <Option value="all">全部城市</Option>
              <Option value="大连">大连</Option>
              <Option value="沈阳">沈阳</Option>
              <Option value="北京">北京</Option>
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
              <Option value="analyzed">已分析</Option>
              <Option value="pending">待分析</Option>
              <Option value="rejected">已拒绝</Option>
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
        <Spin spinning={loading} tip="加载数据中...">
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
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {mapError ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  color: '#666'
                }}>
                  <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <h3>地图加载失败</h3>
                  <p>{mapError}</p>
                  <Button type="primary" onClick={() => window.location.reload()}>
                    刷新页面
                  </Button>
                </div>
              ) : (
                <div 
                  ref={mapRef}
                  style={{ width: '100%', height: '100%' }}
                />
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GISMapView;