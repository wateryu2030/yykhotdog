import React,{useEffect,useState} from 'react';
import { Card, Input, Button, Rate, message, List } from 'antd';
import { getJSON } from '../utils/api';

export default function ManualNoteCard({ module, refId, operator }:{
  module:string; refId:number; operator?:string;
}){
  const [note,setNote]=useState('');
  const [score,setScore]=useState<number|null>(null);
  const [records,setRecords]=useState<any[]>([]);

  const load=()=>getJSON('/api/manual/list',{module,ref_id:refId}).then(d=>setRecords(d.rows||[]));
  const save=async()=>{
    await fetch('/api/manual/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      module,ref_id:refId,operator:operator||'user',note,score_manual:score
    })});
    message.success('已保存人工备注');
    setNote('');setScore(null);load();
  };

  useEffect(()=>{ if(refId) load(); },[refId]);

  return (
    <Card title="人工备注 / 打分" size="small">
      <Rate value={score||0} onChange={setScore}/>
      <Input.TextArea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="写下你的观察或建议..." style={{marginTop:8}}/>
      <Button type="primary" size="small" onClick={save} style={{marginTop:8}}>保存</Button>
      <List size="small" dataSource={records} style={{marginTop:8,maxHeight:150,overflowY:'auto'}}
        renderItem={(r:any)=>(<List.Item><b>{r.operator}</b> {r.score_manual!=null?`评分:${r.score_manual}`:''} {r.note}</List.Item>)} />
    </Card>
  );
}
