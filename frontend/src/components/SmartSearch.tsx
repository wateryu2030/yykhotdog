import React, { useState, useEffect, useRef } from 'react';
import { Input, AutoComplete, Card, List, Typography, Tag, Space, Button, Tooltip } from 'antd';
import { SearchOutlined, HistoryOutlined, StarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

interface SearchResult {
  id: string;
  title: string;
  type: 'customer' | 'order' | 'product' | 'store' | 'city';
  description: string;
  value: string;
  tags?: string[];
  score?: number;
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
  count?: number;
}

interface SmartSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const SmartSearch: React.FC<SmartSearchProps> = ({ 
  onResultSelect, 
  placeholder = "搜索客户、订单、产品...",
  style 
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // 模拟搜索建议数据
  const mockSuggestions: SearchSuggestion[] = [
    { text: '客户C001', type: 'recent' },
    { text: '热狗套餐', type: 'recent' },
    { text: '沈阳市', type: 'recent' },
    { text: '订单2025', type: 'popular', count: 156 },
    { text: '核心客户', type: 'popular', count: 89 },
    { text: '销售分析', type: 'suggestion' },
    { text: '库存管理', type: 'suggestion' },
  ];

  // 模拟搜索结果数据
  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      title: '客户C001 - 张三',
      type: 'customer',
      description: '核心客户，累计消费¥2,580',
      value: 'C001',
      tags: ['核心客户', '高价值'],
      score: 0.95
    },
    {
      id: '2',
      title: '订单ORD20251026001',
      type: 'order',
      description: '2025-10-26 14:30，金额¥58.00',
      value: 'ORD20251026001',
      tags: ['已完成', '热狗套餐'],
      score: 0.88
    },
    {
      id: '3',
      title: '热狗套餐',
      type: 'product',
      description: '经典热狗+薯条+饮料，价格¥28',
      value: '热狗套餐',
      tags: ['热销', '套餐'],
      score: 0.82
    },
    {
      id: '4',
      title: '沈阳市和平店',
      type: 'store',
      description: '沈阳市和平区，今日销售额¥1,280',
      value: '沈阳市和平店',
      tags: ['营业中', '高销量'],
      score: 0.79
    },
    {
      id: '5',
      title: '沈阳市',
      type: 'city',
      description: '辽宁省沈阳市，19家门店，总销售额¥15,680',
      value: '沈阳市',
      tags: ['辽宁省', '19家门店'],
      score: 0.75
    }
  ];

  useEffect(() => {
    // 从本地存储加载最近搜索
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // 处理搜索输入
  const handleSearch = async (value: string) => {
    setSearchValue(value);
    
    if (!value.trim()) {
      setSearchResults([]);
      setShowSuggestions(true);
      return;
    }

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器，延迟搜索
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 过滤搜索结果
        const filteredResults = mockSearchResults.filter(result =>
          result.title.toLowerCase().includes(value.toLowerCase()) ||
          result.description.toLowerCase().includes(value.toLowerCase()) ||
          result.value.toLowerCase().includes(value.toLowerCase())
        );

        setSearchResults(filteredResults);
        setShowSuggestions(false);
        
        // 保存到最近搜索
        if (value.trim() && !recentSearches.includes(value.trim())) {
          const newRecentSearches = [value.trim(), ...recentSearches.slice(0, 4)];
          setRecentSearches(newRecentSearches);
          localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
        }
        
      } catch (error) {
        console.error('搜索失败:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  // 处理结果选择
  const handleResultSelect = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
    setSearchValue(result.title);
    setSearchResults([]);
    setShowSuggestions(false);
  };

  // 处理建议选择
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchValue(suggestion.text);
    handleSearch(suggestion.text);
  };

  // 清除搜索
  const handleClear = () => {
    setSearchValue('');
    setSearchResults([]);
    setShowSuggestions(false);
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return '👤';
      case 'order': return '📋';
      case 'product': return '🍔';
      case 'store': return '🏪';
      case 'city': return '🏙️';
      default: return '📄';
    }
  };

  // 获取类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'blue';
      case 'order': return 'green';
      case 'product': return 'orange';
      case 'store': return 'purple';
      case 'city': return 'cyan';
      default: return 'default';
    }
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      <AutoComplete
        value={searchValue}
        onChange={handleSearch}
        onSearch={handleSearch}
        placeholder={placeholder}
        style={{ width: '100%' }}
        options={[]}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // 延迟隐藏建议，允许点击
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      >
        <Input
          size="large"
          prefix={<SearchOutlined />}
          suffix={
            searchValue && (
              <Button 
                type="text" 
                size="small" 
                onClick={handleClear}
                style={{ padding: 0 }}
              >
                ✕
              </Button>
            )
          }
          // loading={isLoading}
        />
      </AutoComplete>

      {/* 搜索结果下拉框 */}
      {searchResults.length > 0 && (
        <Card
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: 4,
            maxHeight: 400,
            overflow: 'auto'
          }}
          bodyStyle={{ padding: 0 }}
        >
          <List
            dataSource={searchResults}
            renderItem={(result) => (
              <List.Item
                style={{ 
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onClick={() => handleResultSelect(result)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ fontSize: '20px' }}>
                      {getTypeIcon(result.type)}
                    </span>
                  }
                  title={
                    <Space>
                      <Text strong>{result.title}</Text>
                      <Tag color={getTypeColor(result.type)}>
                        {result.type}
                      </Tag>
                      {result.score && (
                        <Tag color="gold">
                          {Math.round(result.score * 100)}%
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">{result.description}</Text>
                      {result.tags && (
                        <Space size={4}>
                          {result.tags.map((tag, index) => (
                            <Tag key={index} color="blue">
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 搜索建议下拉框 */}
      {showSuggestions && searchResults.length === 0 && (
        <Card
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: 4,
            maxHeight: 300,
            overflow: 'auto'
          }}
          bodyStyle={{ padding: 0 }}
        >
          <List
            dataSource={mockSuggestions}
            renderItem={(suggestion) => (
              <List.Item
                style={{ 
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onClick={() => handleSuggestionSelect(suggestion)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <List.Item.Meta
                  avatar={
                    suggestion.type === 'recent' ? <HistoryOutlined /> :
                    suggestion.type === 'popular' ? <StarOutlined /> :
                    <ClockCircleOutlined />
                  }
                  title={
                    <Space>
                      <Text>{suggestion.text}</Text>
                      {suggestion.count && (
                        <Tag color="green">
                          {suggestion.count}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    suggestion.type === 'recent' ? '最近搜索' :
                    suggestion.type === 'popular' ? '热门搜索' :
                    '搜索建议'
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default SmartSearch;
