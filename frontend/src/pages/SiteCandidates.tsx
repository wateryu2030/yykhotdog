import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Row, Col, Typography } from 'antd';
import { getJSON } from '../utils/api';

export default function SiteCandidates() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    getJSON('/api/site-selection/candidates').then((d:any)=> setRows(d.rows||[]));
  }, []);
  const cols = [
    { title:'候选ID', dataIndex:'candidate_id' },
    { title:'城市', dataIndex:'city' },
    { title:'综合分', dataIndex:'total_score', render:(v:number)=> <Tag color={v>=0.7?'green':v>=0.6?'blue':'orange'}>{(v*100).toFixed(1)}%</Tag> },
    { title:'匹配度', dataIndex:'match_score', render:(v:number)=> (v*100).toFixed(0)+'%' },
    { title:'蚕食度', dataIndex:'cannibal_score', render:(v:number)=> (v*100).toFixed(0)+'%' },
    { title:'商圈画像毛利', dataIndex:'gross_margin', render:(v:number)=> v!=null? (v*100).toFixed(1)+'%':'—' },
    { title:'门店数', dataIndex:'stores_cnt' },
    { title:'说明', dataIndex:'rationale' },
  ];
  return (
    <Card title="选店候选榜（重力模型+城市画像）">
      <Typography.Paragraph type="secondary">数据来源：fact_site_score + vw_city_profile</Typography.Paragraph>
      <Table rowKey="candidate_id" dataSource={rows} columns={cols} pagination={{pageSize:20}}/>
    </Card>
  );
}
