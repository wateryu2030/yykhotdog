import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin, Button, Space, message, Tag } from 'antd';
import { EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface StoreLocation {
  id: string;
  shopName: string;
  shopAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  approvalState: number;
  approvalRemarks?: string;
  amount?: number;
  recordTime?: string;
  city?: string;
}

interface InteractiveMapProps {
  stores: StoreLocation[];
  city: string;
  onStoreClick?: (store: StoreLocation) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stores,
  city,
  onStoreClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || stores.length === 0) {
      setLoading(false);
      return;
    }

    const initMap = () => {
      try {
        // 创建简单的地图显示
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 2px dashed #91d5ff;
              border-radius: 8px;
              color: #1890ff;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
              <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                地图显示区域
              </div>
              <div style="font-size: 14px; margin-bottom: 16px; color: #666;">
                {city} - {stores.length} 个位置
              </div>
              <div style="
                background: rgba(24, 144, 255, 0.1);
                padding: 12px 16px;
                border-radius: 6px;
                border: 1px solid rgba(24, 144, 255, 0.2);
                font-size: 12px;
                text-align: center;
                max-width: 300px;
              ">
                <div style="margin-bottom: 8px;">📍 位置列表：</div>
                ${stores.slice(0, 5).map(store => 
                  `<div style="margin: 4px 0; padding: 4px 8px; background: white; border-radius: 4px; border: 1px solid #e6f7ff;">
                    ${store.shopName}
                  </div>`
                ).join('')}
                ${stores.length > 5 ? `<div style="color: #999; font-style: italic;">... 还有 ${stores.length - 5} 个位置</div>` : ''}
              </div>
            </div>
          `;
        }
        setLoading(false);
      } catch (err) {
        console.error('地图初始化失败:', err);
        setError('地图初始化失败');
        setLoading(false);
      }
    };

    // 延迟初始化，模拟地图加载
    const timer = setTimeout(initMap, 1000);
    return () => clearTimeout(timer);
  }, [stores, city]);

  if (loading) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <Spin size="large" tip="正在加载地图..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#fff2f0',
        borderRadius: '8px',
        border: '1px solid #ffccc7',
        color: '#ff4d4f'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>地图加载失败</div>
        <div style={{ fontSize: '14px', color: '#666' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ height: '500px', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 位置信息面板 */}
      {stores.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '250px',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#1890ff'
          }}>
            📍 位置信息
          </div>
          {stores.slice(0, 10).map((store, index) => (
            <div 
              key={store.id}
              style={{
                padding: '6px 8px',
                margin: '4px 0',
                background: '#f8f9fa',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid #e9ecef',
                fontSize: '12px'
              }}
              onClick={() => onStoreClick?.(store)}
            >
              <div style={{ fontWeight: 'bold', color: '#333' }}>
                {store.shopName}
              </div>
              <div style={{ color: '#666', fontSize: '11px' }}>
                {store.shopAddress}
              </div>
              <div style={{ color: '#999', fontSize: '10px' }}>
                坐标: {store.location.latitude.toFixed(4)}, {store.location.longitude.toFixed(4)}
              </div>
            </div>
          ))}
          {stores.length > 10 && (
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              textAlign: 'center',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              ... 还有 {stores.length - 10} 个位置
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
