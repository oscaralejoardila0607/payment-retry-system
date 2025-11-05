import { useState, useEffect } from 'react';
import { Moon, Sun, CreditCard, TrendingUp, History as HistoryIcon } from 'lucide-react';
import { PaymentProvider } from './context/PaymentContext';
import PaymentSimulator from './components/PaymentSimulator';
import RetryIntelligence from './components/RetryIntelligence';
import PaymentHistory from './components/PaymentHistory';

type TabType = 'simulator' | 'intelligence' | 'history';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('simulator');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const tabs = [
    { id: 'simulator' as TabType, label: 'Payment Simulator', icon: CreditCard },
    { id: 'intelligence' as TabType, label: 'Retry Intelligence', icon: TrendingUp },
    { id: 'history' as TabType, label: 'History', icon: HistoryIcon },
  ];

  return (
    <PaymentProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Novo Retry Intelligence</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Payment Retry Analysis Dashboard</p>
                </div>
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1 -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'simulator' && <PaymentSimulator onAnalyze={() => setActiveTab('intelligence')} />}
          {activeTab === 'intelligence' && <RetryIntelligence />}
          {activeTab === 'history' && <PaymentHistory />}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Novo Retry Intelligence API v1.1.0
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <a href="/api/v1/health" target="_blank" className="hover:text-blue-600 dark:hover:text-blue-400">
                  API Health
                </a>
                <span>•</span>
                <span>Port 4000</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PaymentProvider>
  );
}

export default App;
