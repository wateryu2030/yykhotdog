import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Space, Button } from 'antd';
import { getJSON } from '../utils/api';

export default function SiteAISuggest() {
  const [rows, setRows] = useState<any[]>([]);
  const [city, setCity] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0.6);

  const search = () => getJSON('/api/site-selection/ai-suggest', { city, minScore }).then((d:any)=> setRows(d.rows||[]));
  useEffect(()=> { search(); }, []);

  const cols = [
    { title:'候选ID', dataIndex:'candidate_id' },
    { title:'城市', dataIndex:'city' },
    { title:'综合分', dataIndex:'total_score' },
    { title:'匹配度', dataIndex:'match_score' },
    { title:'蚕食度', dataIndex:'cannibal_score' },
    { title:'城市毛利率', dataIndex:'gross_margin', render:(v:number)=> v!=null? (v*100).toFixed(1)+'%':'—' },
  ];
  return (
    <Card title="智能选店建议">
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="城市（可留空）" value={city} onChange={(e)=>setCity(e.target.value)} style={{width:200}}/>
        <Input placeholder="最低综合分(0~1)" value={minScore} onChange={(e)=>setMinScore(Number(e.target.value)||0)} style={{width:160}}/>
        <Button type="primary" onClick={search}>查询</Button>
      </Space>
      <Table rowKey="candidate_id" dataSource={rows} columns={cols}/>
    </Card>
  );
}
