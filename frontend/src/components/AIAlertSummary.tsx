import React, { useEffect, useState } from 'react';

interface AIAlertSummaryProps {
  className?: string;
}

interface AlertSummaryData {
  riskLevel: string;
  summary: string;
  anomalyCount: number;
  totalStores: number;
  topAnomalyStores: Array<{
    store_name: string;
    city: string;
    anomaly_count: number;
    avg_deviation: number;
  }>;
  analysisDate: string;
}

export default function AIAlertSummary({ className = '' }: AIAlertSummaryProps) {
  const [alertData, setAlertData] = useState<AlertSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlertSummary();
  }, []);

  const fetchAlertSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/alert/latest');
      const result = await response.json();
      
      if (result.success) {
        setAlertData(result.data);
      } else {
        setError('获取AI预警数据失败');
      }
    } catch (err) {
      setError('网络请求失败');
      console.error('获取AI预警数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case '高': return 'text-red-600 bg-red-50 border-red-200';
      case '中': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case '低': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case '高': return '🚨';
      case '中': return '⚠️';
      case '低': return '✅';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">正在加载AI预警分析...</span>
        </div>
      </div>
    );
  }

  if (error || !alertData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center space-x-3 text-gray-500">
          <span>📊</span>
          <span>AI预警分析暂不可用</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
          <span>🧠</span>
          <span>AI智能预警</span>
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(alertData.riskLevel)}`}>
          {getRiskLevelIcon(alertData.riskLevel)} {alertData.riskLevel}风险
        </div>
      </div>

      <div className="space-y-4">
        {/* 预警摘要 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">📋 预警摘要</h4>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
            {alertData.summary}
          </p>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{alertData.totalStores}</div>
            <div className="text-sm text-gray-500">总门店数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{alertData.anomalyCount}</div>
            <div className="text-sm text-gray-500">异常次数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {alertData.topAnomalyStores?.length || 0}
            </div>
            <div className="text-sm text-gray-500">异常门店</div>
          </div>
        </div>

        {/* 重点关注门店 */}
        {alertData.topAnomalyStores?.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🎯 重点关注门店</h4>
            <div className="space-y-2">
              {alertData.topAnomalyStores?.slice(0, 3).map((store, index) => (
                <div key={store.store_name} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-800">{store.store_name}</div>
                      <div className="text-sm text-gray-500">{store.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">{store.anomaly_count}次异常</div>
                    <div className="text-xs text-gray-500">偏差{store.avg_deviation?.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 更新时间 */}
        <div className="text-xs text-gray-400 text-center">
          最后更新: {alertData.analysisDate ? new Date(alertData.analysisDate).toLocaleString('zh-CN') : '暂无数据'}
        </div>
      </div>
    </div>
  );
}
