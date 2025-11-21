import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CustomerProfile from './pages/CustomerProfile';
import CustomerCompare from './pages/CustomerCompare';
import ProductProfile from './pages/ProductProfile';
import CityProfile from './pages/CityProfile';
import Operations from './pages/Operations';
import Allocation from './pages/Allocation';
import SiteSelection from './pages/SiteSelection';
import StoreOpening from './pages/StoreOpening';
import Login from './pages/Login';
import SalesComparison from './pages/SalesComparison';
import ETLManagement from './pages/ETLManagement';
import AIInsightsPage from './pages/AIInsightsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import AIIntegrationTest from './pages/AIIntegrationTest';
import IntelligentRecommendations from './components/IntelligentRecommendations';
import SystemManagement from './components/SystemManagement';
import AITestPage from './pages/AITestPage';
import CandidateLocations from './pages/CandidateLocations';
import SiteSelectionDemo from './pages/SiteSelectionDemo';
import APITest from './pages/APITest';
import GISMapView from './pages/GISMapView';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="customer-profile" element={<CustomerProfile />} />
            <Route path="customer-compare" element={<CustomerCompare />} />
            <Route path="product-profile" element={<ProductProfile />} />
            <Route path="city-profile" element={<CityProfile />} />
            <Route path="operations" element={<Operations />} />
            <Route path="allocation" element={<Allocation />} />
            <Route path="site-selection" element={<SiteSelection />} />
            <Route path="store-opening" element={<StoreOpening />} />
            <Route path="sales-comparison" element={<SalesComparison />} />
            <Route path="etl-management" element={<ETLManagement />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="ai-integration-test" element={<AIIntegrationTest />} />
            <Route path="intelligent-recommendations" element={<IntelligentRecommendations />} />
            <Route path="system-management" element={<SystemManagement />} />
            <Route path="ai-test" element={<AITestPage />} />
            <Route path="candidate-locations" element={<CandidateLocations />} />
            <Route path="site-selection-demo" element={<SiteSelectionDemo />} />
            <Route path="api-test" element={<APITest />} />
            <Route path="gis-map" element={<GISMapView />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;