import React, { useState, useEffect } from 'react';
import { Card, Space, Button, Spin, Select, message, Row, Col, Typography, Divider } from 'antd';
import { 
  EnvironmentOutlined, 
  ReloadOutlined, 
  CloudOutlined,
  ChromeOutlined,
  CompassOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

interface WeatherData {
  location: string;
  temperature: string;
  weather: string;
  humidity: string;
  windDirection: string;
  windSpeed: string;
  feelsLike: string;
  hourlyForecast: Array<{
    time: string;
    temperature: string;
    weather: string;
    icon: string;
  }>;
  dailyForecast: Array<{
    date: string;
    high: string;
    low: string;
    weather: string;
    icon: string;
  }>;
}

interface MapWeatherProps {
  className?: string;
  style?: React.CSSProperties;
}

// 模拟天气数据生成器
const generateMockWeatherData = (location: string): WeatherData => {
  const baseTemp = Math.floor(Math.random() * 15) + 15; // 15-30°C
  const weatherTypes = ['晴', '多云', '阴', '小雨', '阵雨'];
  const currentWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  
  return {
    location,
    temperature: `${baseTemp}°C`,
    weather: currentWeather,
    humidity: `${Math.floor(Math.random() * 30) + 50}%`,
    windDirection: '东南风',
    windSpeed: `${Math.floor(Math.random() * 5) + 1}级`,
    feelsLike: `${baseTemp + Math.floor(Math.random() * 3)}°C`,
    hourlyForecast: Array.from({ length: 8 }, (_, i) => ({
      time: `${14 + i}:00`,
      temperature: `${baseTemp + Math.floor(Math.random() * 6) - 3}°C`,
      weather: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      icon: getWeatherIcon(weatherTypes[Math.floor(Math.random() * weatherTypes.length)])
    })),
    dailyForecast: Array.from({ length: 5 }, (_, i) => ({
      date: ['今天', '明天', '后天', '周五', '周六'][i],
      high: `${baseTemp + Math.floor(Math.random() * 5) + 2}°C`,
      low: `${baseTemp - Math.floor(Math.random() * 8) - 5}°C`,
      weather: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      icon: getWeatherIcon(weatherTypes[Math.floor(Math.random() * weatherTypes.length)])
    }))
  };
};

// 获取天气图标
const getWeatherIcon = (weather: string): string => {
  if (weather.includes('晴')) return '☀️';
  if (weather.includes('多云')) return '⛅';
  if (weather.includes('阴')) return '☁️';
  if (weather.includes('雨')) return '🌧️';
  if (weather.includes('雪')) return '🌨️';
  if (weather.includes('雾')) return '🌫️';
  return '🌤️';
};

const MapWeather: React.FC<MapWeatherProps> = ({ className, style }) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<string>('北京市');
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [locationError, setLocationError] = useState(false);

  // 使用IP定位获取用户位置
  const getCurrentLocation = async () => {
    setLoading(true);
    setLocationError(false);
    
    try {
      // 使用IP定位服务获取用户位置
      const location = await getLocationByIP();
      setCurrentLocation(location);
      const mockWeatherData = generateMockWeatherData(location);
      setWeatherData(mockWeatherData);
      setLoading(false);
    } catch (error) {
      console.log('IP定位失败，使用默认位置:', error);
      setLocationError(true);
      const defaultLocation = '北京市';
      setCurrentLocation(defaultLocation);
      const mockWeatherData = generateMockWeatherData(defaultLocation);
      setWeatherData(mockWeatherData);
      setLoading(false);
      message.info('位置获取失败，使用默认位置');
    }
  };

  // 使用IP定位服务获取用户位置
  const getLocationByIP = async (): Promise<string> => {
    try {
      // 尝试多个IP定位服务，避免限流问题
      const services = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://api.ipify.org?format=json'
      ];
      
      let locationData = null;
      
      for (const service of services) {
        try {
          const response = await fetch(service, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // 设置较短的超时时间
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // 处理不同的API响应格式
            if (data.city || data.region || data.country) {
              locationData = data;
              break;
            }
          }
        } catch (serviceError) {
          console.log(`服务 ${service} 失败:`, serviceError);
          continue;
        }
      }
      
      if (!locationData) {
        throw new Error('所有IP定位服务都失败');
      }
      
      // 根据返回的城市信息映射到我们的城市列表
      const cityMapping: { [key: string]: string } = {
        // 英文城市名称映射
        'Beijing': '北京市',
        'Shanghai': '上海市',
        'Guangzhou': '广州市',
        'Shenzhen': '深圳市',
        'Chengdu': '成都市',
        'Tianjin': '天津市',
        'Chongqing': '重庆市',
        'Hangzhou': '杭州市',
        'Nanjing': '南京市',
        'Wuhan': '武汉市',
        'Xi\'an': '西安市',
        'Qingdao': '青岛市',
        'Dalian': '大连市',
        'Xiamen': '厦门市',
        'Suzhou': '苏州市',
        'Shenyang': '沈阳市',
        'Harbin': '哈尔滨市',
        'Changchun': '长春市',
        'Jinan': '济南市',
        'Zhengzhou': '郑州市',
        'Shijiazhuang': '石家庄市',
        'Taiyuan': '太原市',
        'Hohhot': '呼和浩特市',
        'Yinchuan': '银川市',
        'Xining': '西宁市',
        'Lanzhou': '兰州市',
        'Urumqi': '乌鲁木齐市',
        'Lhasa': '拉萨市',
        'Kunming': '昆明市',
        'Guiyang': '贵阳市',
        'Nanning': '南宁市',
        'Haikou': '海口市',
        'Fuzhou': '福州市',
        'Nanchang': '南昌市',
        'Changsha': '长沙市',
        'Hefei': '合肥市',
        // 中文城市名称映射
        '北京': '北京市',
        '上海': '上海市',
        '广州': '广州市',
        '深圳': '深圳市',
        '成都': '成都市',
        '天津': '天津市',
        '重庆': '重庆市',
        '杭州': '杭州市',
        '南京': '南京市',
        '武汉': '武汉市',
        '西安': '西安市',
        '青岛': '青岛市',
        '大连': '大连市',
        '厦门': '厦门市',
        '苏州': '苏州市',
        '沈阳': '沈阳市',
        '哈尔滨': '哈尔滨市',
        '长春': '长春市',
        '济南': '济南市',
        '郑州': '郑州市',
        '石家庄': '石家庄市',
        '太原': '太原市',
        '呼和浩特': '呼和浩特市',
        '银川': '银川市',
        '西宁': '西宁市',
        '兰州': '兰州市',
        '乌鲁木齐': '乌鲁木齐市',
        '拉萨': '拉萨市',
        '昆明': '昆明市',
        '贵阳': '贵阳市',
        '南宁': '南宁市',
        '海口': '海口市',
        '福州': '福州市',
        '南昌': '南昌市',
        '长沙': '长沙市',
        '合肥': '合肥市'
      };
      
      // 尝试从城市名称映射
      if (locationData.city && cityMapping[locationData.city]) {
        return cityMapping[locationData.city];
      }
      
      // 尝试从地区名称映射
      if (locationData.region && cityMapping[locationData.region]) {
        return cityMapping[locationData.region];
      }
      
      // 如果都不匹配，返回默认位置
      return '北京市';
    } catch (error) {
      console.error('IP定位失败:', error);
      return '北京市';
    }
  };

  // 模拟位置数据（基于坐标估算）
  const getMockLocation = (lat: number, lng: number): string => {
    if (lat > 39 && lat < 41 && lng > 115 && lng < 117) {
      return '北京市';
    } else if (lat > 31 && lat < 32 && lng > 120 && lng < 122) {
      return '上海市';
    } else if (lat > 23 && lat < 24 && lng > 113 && lng < 115) {
      return '广州市';
    } else if (lat > 30 && lat < 31 && lng > 104 && lng < 106) {
      return '成都市';
    } else if (lat > 22 && lat < 23 && lng > 113 && lng < 115) {
      return '深圳市';
    } else if (lat > 39 && lat < 40 && lng > 116 && lng < 118) {
      return '天津市';
    } else {
      return '北京市'; // 默认返回北京
    }
  };

  // 刷新数据
  const refreshData = () => {
    setLoading(true);
    const newWeatherData = generateMockWeatherData(currentLocation);
    setWeatherData(newWeatherData);
    setLoading(false);
    message.success('天气数据已更新');
  };

  // 手动选择位置
  const handleLocationChange = (value: string) => {
    setCurrentLocation(value);
    setShowLocationSelect(false);
    setLoading(true);
    const newWeatherData = generateMockWeatherData(value);
    setWeatherData(newWeatherData);
    setLoading(false);
    message.success(`已切换到${value}`);
  };

  // 组件挂载时获取位置
  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (loading) {
    return (
      <Card 
        title={
          <Space>
            <EnvironmentOutlined />
            <span>实时位置与天气</span>
          </Space>
        }
        className={className}
        style={style}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>正在获取位置和天气信息...</div>
        </div>
      </Card>
    );
  }

  if (!weatherData) {
    return (
      <Card 
        title={
          <Space>
            <EnvironmentOutlined />
            <span>实时位置与天气</span>
          </Space>
        }
        className={className}
        style={style}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ marginBottom: '16px' }}>无法获取天气信息</div>
          <Button type="primary" onClick={refreshData}>
            <ReloadOutlined />
            重新获取
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <EnvironmentOutlined />
          <span>实时位置与天气</span>
          <Button 
            type="text" 
            size="small" 
            onClick={() => setShowLocationSelect(!showLocationSelect)}
            style={{ marginLeft: 'auto' }}
          >
            切换位置
          </Button>
        </Space>
      }
      className={className}
      style={style}
      extra={
        <Button 
          type="text" 
          size="small" 
          onClick={refreshData}
          icon={<ReloadOutlined />}
        >
          刷新
        </Button>
      }
    >
      {showLocationSelect && (
        <div style={{ marginBottom: '16px' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择城市"
            value={currentLocation}
            onChange={handleLocationChange}
            showSearch
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            <Option value="北京市">北京市</Option>
            <Option value="上海市">上海市</Option>
            <Option value="广州市">广州市</Option>
            <Option value="深圳市">深圳市</Option>
            <Option value="成都市">成都市</Option>
            <Option value="天津市">天津市</Option>
            <Option value="重庆市">重庆市</Option>
            <Option value="杭州市">杭州市</Option>
            <Option value="南京市">南京市</Option>
            <Option value="武汉市">武汉市</Option>
            <Option value="西安市">西安市</Option>
            <Option value="青岛市">青岛市</Option>
            <Option value="大连市">大连市</Option>
            <Option value="厦门市">厦门市</Option>
            <Option value="苏州市">苏州市</Option>
          </Select>
        </div>
      )}

      {/* 当前天气信息 */}
      <div style={{ marginBottom: '20px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                {getWeatherIcon(weatherData.weather)}
              </div>
              <Text strong>{weatherData.weather}</Text>
            </div>
          </Col>
          <Col span={16}>
            <div>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                {weatherData.temperature}
              </Title>
              <Text type="secondary">体感温度 {weatherData.feelsLike}</Text>
              <div style={{ marginTop: '8px' }}>
                <Space>
                  <Text type="secondary">
                    <CloudOutlined /> {weatherData.humidity}
                  </Text>
                  <Text type="secondary">
                    <CompassOutlined /> {weatherData.windDirection} {weatherData.windSpeed}
                  </Text>
                </Space>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <Divider />

      {/* 小时预报 */}
      <div style={{ marginBottom: '20px' }}>
        <Text strong>今日预报</Text>
        <div style={{ marginTop: '12px', overflowX: 'auto' }}>
          <Row gutter={8}>
            {weatherData.hourlyForecast.slice(0, 6).map((hour, index) => (
              <Col key={index} span={4}>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>{hour.time}</div>
                  <div style={{ fontSize: '20px', margin: '4px 0' }}>{hour.icon}</div>
                  <div style={{ fontSize: '12px' }}>{hour.temperature}</div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      <Divider />

      {/* 每日预报 */}
      <div>
        <Text strong>未来5天</Text>
        <div style={{ marginTop: '12px' }}>
          {weatherData.dailyForecast.map((day, index) => (
            <Row key={index} gutter={16} align="middle" style={{ marginBottom: '8px', padding: '8px 0' }}>
              <Col span={4}>
                <Text>{day.date}</Text>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px' }}>{day.icon}</div>
                </div>
              </Col>
              <Col span={8}>
                <Text>{day.weather}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <Text strong style={{ color: '#ff4d4f' }}>{day.high}</Text>
                <Text type="secondary" style={{ marginLeft: '8px' }}>{day.low}</Text>
              </Col>
            </Row>
          ))}
        </div>
      </div>

      {locationError && (
        <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#fff7e6', borderRadius: '4px' }}>
          <Text type="warning">
            <EnvironmentOutlined /> 位置信息为估算数据，如需精确位置请手动选择城市
          </Text>
        </div>
      )}
    </Card>
  );
};

export default MapWeather; 