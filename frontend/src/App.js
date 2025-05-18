import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

// Components
import Sidebar from "./components/common/Sidebar";
import Header from "./components/common/Header";
import Dashboard from "./components/dashboard/Dashboard";
import Trading from "./components/trading/Trading";
import Settings from "./components/settings/Settings";
import ApiSetup from "./components/settings/ApiSetup";

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
                  <Route path="/trading" element={<Trading />} />
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
