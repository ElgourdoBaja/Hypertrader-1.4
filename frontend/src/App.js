import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

// Components
import Sidebar from "./components/common/Sidebar";
import Header from "./components/common/Header";
import Dashboard from "./components/dashboard/Dashboard";
import PerformanceAnalysis from "./components/dashboard/PerformanceAnalysis";
import TechnicalAnalysis from "./components/dashboard/TechnicalAnalysis";
import Trading from "./components/trading/Trading";
import PositionManagement from "./components/trading/PositionManagement";
import Backtesting from "./components/trading/Backtesting";
import StrategyManager from "./components/trading/StrategyManager";
import StrategyEditor from "./components/trading/StrategyEditor";
import Settings from "./components/settings/Settings";
import ApiSetup from "./components/settings/ApiSetup";

// Create mock electronAPI for web-based testing
if (!window.electronAPI) {
  console.log("No electronAPI detected. Using mock implementation for web testing.");
  window.electronAPI = {
    saveApiCredentials: async (credentials) => {
      console.log("Mock saveApiCredentials:", credentials);
      localStorage.setItem('hyperliquid_credentials', JSON.stringify(credentials));
      return { success: true };
    },
    
    getApiCredentials: async () => {
      console.log("Mock getApiCredentials");
      const stored = localStorage.getItem('hyperliquid_credentials');
      return stored ? JSON.parse(stored) : { apiKey: null, apiSecret: null };
    },
    
    saveTradingConfig: async (config) => {
      console.log("Mock saveTradingConfig:", config);
      localStorage.setItem('hyperliquid_config', JSON.stringify(config));
      return { success: true };
    },
    
    getTradingConfig: async () => {
      console.log("Mock getTradingConfig");
      const stored = localStorage.getItem('hyperliquid_config');
      return stored ? JSON.parse(stored) : {};
    },
    
    onTradingControl: (callback) => {
      console.log("Mock onTradingControl setup");
      window._mockTradingControlCallback = callback;
    },
    
    onOpenSettings: (callback) => {
      console.log("Mock onOpenSettings setup");
      window._mockOpenSettingsCallback = callback;
    },
    
    onShowAbout: (callback) => {
      console.log("Mock onShowAbout setup");
      window._mockShowAboutCallback = callback;
    }
  };
  
  // Add mock trigger functions
  window.triggerTradingControl = (command) => {
    if (window._mockTradingControlCallback) {
      window._mockTradingControlCallback(command);
    }
  };
  
  window.triggerOpenSettings = () => {
    if (window._mockOpenSettingsCallback) {
      window._mockOpenSettingsCallback();
    }
  };
  
  window.triggerShowAbout = () => {
    if (window._mockShowAboutCallback) {
      window._mockShowAboutCallback();
    }
  };
}

function App() {
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check if API is configured on startup
  useEffect(() => {
    const checkApiCredentials = async () => {
      try {
        // For Electron app
        if (window.electronAPI) {
          const credentials = await window.electronAPI.getApiCredentials();
          setIsApiConfigured(credentials && credentials.apiKey && credentials.apiSecret);
        }
      } catch (error) {
        console.error("Failed to check API credentials:", error);
        setIsApiConfigured(false);
      }
    };

    checkApiCredentials();
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="App bg-gray-900 text-white min-h-screen">
      <BrowserRouter>
        {isApiConfigured ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar isOpen={sidebarOpen} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <Header toggleSidebar={toggleSidebar} />
              <main className="flex-1 overflow-y-auto p-4">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/performance" element={<PerformanceAnalysis />} />
                  <Route path="/trading" element={<Trading />} />
                  <Route path="/positions" element={<PositionManagement />} />
                  <Route path="/backtesting" element={<Backtesting />} />
                  <Route path="/strategies" element={<StrategyManager />} />
                  <Route path="/strategy-editor" element={<StrategyEditor />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </div>
        ) : (
          <ApiSetup onSetupComplete={() => setIsApiConfigured(true)} />
        )}
      </BrowserRouter>
    </div>
  );
}

export default App;
