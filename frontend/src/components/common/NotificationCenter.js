import React, { useState, useEffect } from 'react';

// NotificationCenter component for displaying and managing notifications
const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications (in a real app, this would come from a backend/service)
  useEffect(() => {
    // Mock notifications for demo
    const mockNotifications = [
      {
        id: 'notif-1',
        type: 'trade',
        title: 'Trade Executed',
        message: 'BTC-PERP long position opened at $58,350',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        read: false
      },
      {
        id: 'notif-2',
        type: 'alert',
        title: 'Stop Loss Triggered',
        message: 'ETH-PERP stop loss triggered at $3,175',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        read: false
      },
      {
        id: 'notif-3',
        type: 'profit',
        title: 'Take Profit Reached',
        message: 'SOL-PERP take profit reached at $148.50',
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        read: true
      },
      {
        id: 'notif-4',
        type: 'system',
        title: 'System Update',
        message: 'Trading engine updated to version 1.2.0',
        timestamp: new Date(Date.now() - 240 * 60 * 1000),
        read: true
      }
    ];

    setNotifications(mockNotifications);
    
    // Count unread notifications
    setUnreadCount(mockNotifications.filter(notif => !notif.read).length);
    
    // Listen for new notifications
    if (window.electronAPI) {
      // In a real app, we would set up listeners for events from the main process
      // For demo, we'll just add a new notification every minute
      const interval = setInterval(() => {
        addMockNotification();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, []);
  
  // Add a mock notification for demo purposes
  const addMockNotification = () => {
    const types = ['trade', 'alert', 'profit', 'system'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const titles = {
      trade: 'Trade Executed',
      alert: 'Price Alert',
      profit: 'Profit Target Reached',
      system: 'System Notification'
    };
    
    const messages = {
      trade: [
        'BTC-PERP long position opened at $' + (58000 + Math.floor(Math.random() * 2000)).toLocaleString(),
        'ETH-PERP short position opened at $' + (3200 + Math.floor(Math.random() * 200)).toLocaleString(),
        'SOL-PERP long position opened at $' + (145 + Math.floor(Math.random() * 10)).toLocaleString()
      ],
      alert: [
        'BTC-PERP approaching support at $' + (56000 + Math.floor(Math.random() * 1000)).toLocaleString(),
        'ETH-PERP approaching resistance at $' + (3300 + Math.floor(Math.random() * 100)).toLocaleString(),
        'Market volatility increasing - adjust risk parameters'
      ],
      profit: [
        'BTC-PERP position closed with 2.5% profit',
        'ETH-PERP position closed with 3.1% profit',
        'SOL-PERP position closed with 4.2% profit'
      ],
      system: [
        'Trading engine synchronized with Hyperliquid',
        'Network connection stable - latency 45ms',
        'New market data available for analysis'
      ]
    };
    
    const newNotification = {
      id: `notif-${Date.now()}`,
      type,
      title: titles[type],
      message: messages[type][Math.floor(Math.random() * messages[type].length)],
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show a native notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/logo192.png'
      });
    }
  };
  
  // Toggle notification panel
  const togglePanel = () => {
    setIsOpen(!isOpen);
    
    // Mark all as read when opening
    if (!isOpen) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    }
  };
  
  // Format time relative to now (e.g. "5 min ago")
  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };
  
  // Get icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'trade':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'alert':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'profit':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button 
        className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
        onClick={togglePanel}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium">Notifications</h3>
            <button
              className="text-gray-400 hover:text-white"
              onClick={() => setNotifications([])}
            >
              Clear All
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No notifications
              </div>
            ) : (
              <ul>
                {notifications.map(notification => (
                  <li 
                    key={notification.id}
                    className={`p-4 border-b border-gray-700 ${!notification.read ? 'bg-gray-700' : ''}`}
                  >
                    <div className="flex">
                      <div className="mr-3">
                        {getIcon(notification.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-300">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(notification.timestamp)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;