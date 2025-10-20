import React from 'react';
import { Card, Progress, Typography, Tag, Input, Button } from 'antd';
const { Paragraph } = Typography;

export default function SiteInfoCard({site,onOverride}:{site:any,onOverride?:(note:string)=>void}){
  const [text,setText]=React.useState("");
  
  React.useEffect(() => {
    if (site?.note) {
      setText(site.note);
    }
  }, [site]);
  
  if(!site) return <Card title="选址信息">点击地图上的候选点查看详情</Card>;
  const {candidate_id,city,match_score,cannibal_score,total_score,gross_margin,revenue,note}=site;
  return (
    <Card title={`候选点 #${candidate_id}`} bordered style={{width:'100%'}}>
      <Paragraph><Tag color="blue">{city}</Tag></Paragraph>
      <Paragraph>综合评分：</Paragraph>
      <Progress percent={Number((total_score*100).toFixed(1))} status="active" />
      <Paragraph>匹配度 {(match_score*100).toFixed(1)}%，蚕食度 {(cannibal_score*100).toFixed(1)}%</Paragraph>
      <Paragraph>城市毛利率 {(gross_margin*100).toFixed(1)}%</Paragraph>
      <Paragraph>城市收入 ¥{revenue?.toFixed(0)||'--'}</Paragraph>
      <Paragraph>备注：</Paragraph>
      <Input.TextArea rows={3} value={text} onChange={(e)=>setText(e.target.value)} placeholder="添加人工备注..." />
      <Button style={{marginTop:8}} type="primary" size="small" onClick={()=>onOverride?.(text)}>保存备注</Button>
    </Card>
  );
}
