import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardHotdog from './pages/DashboardHotdog';
import InsightsPage from './pages/InsightsPage';
import SiteMap from './pages/SiteMap';
import CompetitorFetch from './pages/CompetitorFetch';
import ManualsPage from './pages/ManualsPage';

export default function App(){
  const navStyle:React.CSSProperties={padding:10,display:'flex',gap:12,flexWrap:'wrap'};
  return (
    <Router>
      <div style={navStyle}>
        <Link to="/">🏠首页</Link>
        <Link to="/dashboard">驾驶舱</Link>
        <Link to="/insights">AI建议</Link>
        <Link to="/map">选址地图</Link>
        <Link to="/competitors">竞争店采集</Link>
        <Link to="/manuals">人工备注管理</Link>
      </div>
      <Routes>
        <Route path="/" element={<div style={{padding:20}}>欢迎使用热狗智能运营系统</div>} />
        <Route path="/dashboard" element={<DashboardHotdog/>} />
        <Route path="/insights" element={<InsightsPage/>} />
        <Route path="/map" element={<SiteMap/>} />
        <Route path="/competitors" element={<CompetitorFetch/>} />
        <Route path="/manuals" element={<ManualsPage/>} />
      </Routes>
    </Router>
  );
}
