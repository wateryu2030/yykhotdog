import React,{useEffect,useState} from 'react';
import { Card, Select, Tag, List, Space, Typography } from 'antd';
import { getJSON } from '../utils/api';

const { Option } = Select;

export default function InsightsPanel({defaultScope='city'}:{
  defaultScope?:'city'|'store';
}){
  const [scope,setScope]=useState<'city'|'store'>(defaultScope);
  const [data,setData]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const load=async()=>{
    setLoading(true);
    const res=await getJSON('/api/insights/suggestions',{scope});
    setData(res.suggestions||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[scope]);

  return (
    <Card
      title={<Space><span>AI 经营建议</span>
      <Select value={scope} onChange={setScope} size="small">
        <Option value="city">按城市</Option>
        <Option value="store">按门店</Option>
      </Select></Space>}
      loading={loading}
      style={{width:'100%',height:'100%',overflowY:'auto'}}
    >
      <List
        dataSource={data}
        renderItem={(item:any)=>(
          <List.Item style={{flexDirection:'column',alignItems:'flex-start'}}>
            <Typography.Text strong>{item.dimension}</Typography.Text>
            <div style={{margin:'4px 0'}}>
              <Tag color="blue">收入 ¥{item.revenue?.toFixed(0)}</Tag>
              <Tag color={item.gross_margin>0.5?'green':'orange'}>毛利率 {(item.gross_margin*100).toFixed(1)}%</Tag>
              <Tag color={item.net_profit>=0?'blue':'red'}>净利 ¥{item.net_profit?.toFixed(0)}</Tag>
            </div>
            {item.advice?.length>0 ?
              item.advice.map((a:string,i:number)=>(
                <Typography.Paragraph key={i} style={{marginBottom:0,fontSize:13}}>
                  {a}
                </Typography.Paragraph>
              ))
              : <Typography.Text type="secondary" style={{fontSize:12}}>暂无建议，运营表现良好。</Typography.Text>}
          </List.Item>
        )}
      />
    </Card>
  );
}
