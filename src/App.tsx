import { useState } from 'react';
import { AppProvider } from './store/AppContext';
import HomePage from './pages/HomePage';
import LearnPage from './pages/LearnPage';
import ReviewPage from './pages/ReviewPage';
import NotebookPage from './pages/NotebookPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import WordListPage from './pages/WordListPage';
import type { WordTab } from './pages/WordListPage';

type Page = 'home' | 'learn' | 'review' | 'notebook' | 'stats' | 'settings' | 'import' | 'words';

const tabs: { key: Page; icon: string; label: string }[] = [
  { key: 'home', icon: '🏠', label: '首页' },
  { key: 'notebook', icon: '📖', label: '生词本' },
  { key: 'stats', icon: '📊', label: '统计' },
  { key: 'settings', icon: '⚙️', label: '设置' },
];

function AppContent() {
  const [page, setPage] = useState<Page>('home');
  const [wordTab, setWordTab] = useState<WordTab>('new');

  const navigate = (p: string) => {
    if (p.startsWith('words:')) {
      setWordTab(p.slice(6) as WordTab);
      setPage('words');
      return;
    }
    setPage(p as Page);
  };

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={navigate} />;
      case 'learn': return <LearnPage onBack={() => setPage('home')} />;
      case 'review': return <ReviewPage onBack={() => setPage('home')} />;
      case 'notebook': return <NotebookPage />;
      case 'stats': return <StatsPage />;
      case 'settings': return <SettingsPage />;
      case 'import': return <ImportPage onBack={() => setPage('home')} />;
      case 'words': return <WordListPage initialTab={wordTab} onBack={() => setPage('home')} />;
    }
  };

  const showTabBar = !['learn', 'review', 'import', 'words'].includes(page);

  return (
    <>
      {renderPage()}
      {showTabBar && (
        <nav className="tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-item ${page === tab.key ? 'active' : ''}`}
              onClick={() => setPage(tab.key)}
            >
              <span className="icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
