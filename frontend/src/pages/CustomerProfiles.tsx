import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Input, Select, Space, Button, Row, Col } from 'antd';
import { getJSON } from '../utils/api';

function segLabel(code:number){
  if(!code) return '—';
  const r=Math.floor(code/100), f=Math.floor((code%100)/10), m=code%10;
  return `R${r} F${f} M${m}`;
}

export default function CustomerProfiles(){
  const [rows, setRows] = useState<any[]>([]);
  const [filteredRows, setFilteredRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    segment: '',
    minSpent: '',
    maxSpent: ''
  });
  
  useEffect(()=>{ 
    getJSON('/api/profiles/customers').then((d:any)=> {
      setRows(d.rows||[]);
      setFilteredRows(d.rows||[]);
    }); 
  },[]);
  
  // 筛选逻辑
  useEffect(() => {
    let filtered = rows;
    
    if (filters.search) {
      filtered = filtered.filter(r => 
        r.customer_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.store_name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.segment) {
      filtered = filtered.filter(r => segLabel(r.segment_code) === filters.segment);
    }
    
    if (filters.minSpent) {
      filtered = filtered.filter(r => (r.total_spent || 0) >= Number(filters.minSpent));
    }
    
    if (filters.maxSpent) {
      filtered = filtered.filter(r => (r.total_spent || 0) <= Number(filters.maxSpent));
    }
    
    setFilteredRows(filtered);
  }, [rows, filters]);
  
  // 获取所有RFM分段
  const segments = Array.from(new Set(rows.map(r => segLabel(r.segment_code)))).filter(s => s !== '—');
  
  const cols = [
    { title:'客户ID', dataIndex:'customer_id' },
    { title:'常购门店', dataIndex:'store_name' },
    { title:'RFM', dataIndex:'segment_code', render:(v:number)=> <Tag color="blue">{segLabel(v)}</Tag> },
    { title:'订单数', dataIndex:'orders_cnt' },
    { title:'消费额', dataIndex:'total_spent', render:(v:number)=>v?.toFixed(2) },
    { title:'首次', dataIndex:'first_date_key' },
    { title:'末次', dataIndex:'last_date_key' }
  ];
  
  return (
    <Card title="客群画像">
      {/* 筛选区域 */}
      <Row gutter={16} style={{marginBottom:16}}>
        <Col span={6}>
          <Input 
            placeholder="搜索客户ID或门店" 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </Col>
        <Col span={4}>
          <Select 
            placeholder="RFM分段" 
            value={filters.segment}
            onChange={(v) => setFilters({...filters, segment: v})}
            allowClear
            style={{width: '100%'}}
          >
            {segments.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
        </Col>
        <Col span={4}>
          <Input 
            placeholder="最小消费额" 
            value={filters.minSpent}
            onChange={(e) => setFilters({...filters, minSpent: e.target.value})}
          />
        </Col>
        <Col span={4}>
          <Input 
            placeholder="最大消费额" 
            value={filters.maxSpent}
            onChange={(e) => setFilters({...filters, maxSpent: e.target.value})}
          />
        </Col>
        <Col span={6}>
          <Space>
            <Button onClick={() => setFilters({search: '', segment: '', minSpent: '', maxSpent: ''})}>
              重置
            </Button>
            <span>共 {filteredRows.length} 条记录</span>
          </Space>
        </Col>
      </Row>
      
      <Table dataSource={filteredRows} columns={cols} rowKey="customer_id" pagination={{pageSize:50}}/>
    </Card>
  );
}
