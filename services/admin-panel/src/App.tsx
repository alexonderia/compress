import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { SlicerPage } from './pages/SlicerPage';
import { AiLegalPage } from './pages/AiLegalPage';
import { Page } from './types/navigation';
import { DispatchResponse } from './types/api';

const DEFAULT_SLICER_BASE_URL = 'http://localhost:8090';
const DEFAULT_AI_BASE_URL = 'http://localhost:8092';

export default function App() {
  const slicerBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_SLICER_API_BASE_URL as string | undefined;
    return envUrl?.trim() || DEFAULT_SLICER_BASE_URL;
  }, []);

  const aiBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_AI_LAWYER_API_BASE_URL as string | undefined;
    return envUrl?.trim() || DEFAULT_AI_BASE_URL;
  }, []);

  const [activePage, setActivePage] = useState<Page>('home');
  

  return (
    <div className="layout">
      <Sidebar activePage={activePage} onChange={setActivePage} />

      <main className="content">
        {activePage === 'home' && (
          <HomePage slicerBaseUrl={slicerBaseUrl} aiBaseUrl={aiBaseUrl} onSelectPage={setActivePage} />
        )}
        {activePage === 'slicer' && <SlicerPage baseUrl={slicerBaseUrl} />}
        {activePage === 'ai-legal' && <AiLegalPage baseUrl={aiBaseUrl} />}
      </main>
    </div>
  )
}