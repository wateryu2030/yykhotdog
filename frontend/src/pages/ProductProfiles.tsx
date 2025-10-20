import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Input, Select, Space, Button, Row, Col } from 'antd';
import { getJSON } from '../utils/api';

export default function ProductProfiles(){
  const [rows, setRows] = useState<any[]>([]);
  const [filteredRows, setFilteredRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    marginRange: '',
    minSales: '',
    maxSales: ''
  });
  
  useEffect(()=>{ 
    getJSON('/api/profiles/products').then((d:any)=> {
      setRows(d.rows||[]);
      setFilteredRows(d.rows||[]);
    }); 
  },[]);
  
  // 筛选逻辑
  useEffect(() => {
    let filtered = rows;
    
    if (filters.search) {
      filtered = filtered.filter(r => 
        r.product_name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.marginRange) {
      const [min, max] = filters.marginRange.split('-').map(Number);
      filtered = filtered.filter(r => {
        const margin = r.gross_margin || 0;
        return margin >= min && margin <= max;
      });
    }
    
    if (filters.minSales) {
      filtered = filtered.filter(r => (r.sales_amount || 0) >= Number(filters.minSales));
    }
    
    if (filters.maxSales) {
      filtered = filtered.filter(r => (r.sales_amount || 0) <= Number(filters.maxSales));
    }
    
    setFilteredRows(filtered);
  }, [rows, filters]);
  
  // 导出CSV
  const exportCSV = () => {
    const headers = ['商品ID', '商品名', '销量', '销售额', '成本', '毛利率', '购买人数'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(row => [
        row.product_id,
        `"${row.product_name || ''}"`,
        row.qty_sold || 0,
        row.sales_amount || 0,
        row.cogs || 0,
        ((row.gross_margin || 0) * 100).toFixed(1) + '%',
        row.buyers_cnt || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `商品画像_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };
  
  const cols = [
    { title:'商品ID', dataIndex:'product_id' },
    { title:'商品名', dataIndex:'product_name' },
    { title:'销量', dataIndex:'qty_sold' },
    { title:'销售额', dataIndex:'sales_amount', render:(v:number)=>v?.toFixed(2) },
    { title:'成本', dataIndex:'cogs', render:(v:number)=>v?.toFixed(2) },
    { title:'毛利率', dataIndex:'gross_margin', render:(v:number)=> <Tag color={v>=0.6?'green':v>=0.45?'blue':'orange'}>{(v*100).toFixed(1)}%</Tag> },
    { title:'购买人数', dataIndex:'buyers_cnt' },
  ];
  
  return (
    <Card title="商品画像">
      {/* 筛选区域 */}
      <Row gutter={16} style={{marginBottom:16}}>
        <Col span={6}>
          <Input 
            placeholder="搜索商品名称" 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </Col>
        <Col span={4}>
          <Select 
            placeholder="毛利率范围" 
            value={filters.marginRange}
            onChange={(v) => setFilters({...filters, marginRange: v})}
            allowClear
            style={{width: '100%'}}
          >
            <Select.Option value="0-0.3">0-30%</Select.Option>
            <Select.Option value="0.3-0.6">30-60%</Select.Option>
            <Select.Option value="0.6-1">60-100%</Select.Option>
          </Select>
        </Col>
        <Col span={4}>
          <Input 
            placeholder="最小销售额" 
            value={filters.minSales}
            onChange={(e) => setFilters({...filters, minSales: e.target.value})}
          />
        </Col>
        <Col span={4}>
          <Input 
            placeholder="最大销售额" 
            value={filters.maxSales}
            onChange={(e) => setFilters({...filters, maxSales: e.target.value})}
          />
        </Col>
        <Col span={6}>
          <Space>
            <Button onClick={() => setFilters({search: '', marginRange: '', minSales: '', maxSales: ''})}>
              重置
            </Button>
            <Button type="primary" onClick={exportCSV}>
              导出CSV
            </Button>
            <span>共 {filteredRows.length} 条记录</span>
          </Space>
        </Col>
      </Row>
      
      <Table dataSource={filteredRows} columns={cols} rowKey="product_id" pagination={{pageSize:50}}/>
    </Card>
  );
}
