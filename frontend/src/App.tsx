import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CustomerProfile from './pages/CustomerProfile';
import Operations from './pages/Operations';
import Allocation from './pages/Allocation';
import SiteSelection from './pages/SiteSelection';
import NewSiteSelection from './pages/NewSiteSelection';
import StoreOpening from './pages/StoreOpening';
import Login from './pages/Login';
import SalesComparison from './pages/SalesComparison';
import ETLManagement from './pages/ETLManagement';
import AIInsightsPage from './pages/AIInsightsPage';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="customer-profile" element={<CustomerProfile />} />
            <Route path="operations" element={<Operations />} />
            <Route path="allocation" element={<Allocation />} />
            <Route path="site-selection" element={<SiteSelection />} />
            <Route path="new-site-selection" element={<NewSiteSelection />} />
            <Route path="store-opening" element={<StoreOpening />} />
            <Route path="sales-comparison" element={<SalesComparison />} />
            <Route path="etl-management" element={<ETLManagement />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;