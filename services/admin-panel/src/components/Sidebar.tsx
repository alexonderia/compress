import React from 'react';
import { Page } from '../types/navigation';

interface SidebarProps {
  activePage: Page;
  onChange: (page: Page) => void;
}

const links: { key: Page; label: string }[] = [
  { key: 'home', label: 'Главная' },
  { key: 'slicer', label: 'Document Slicer' },
  { key: 'ai-legal', label: 'AI Legal' },
];

export function Sidebar({ activePage, onChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__title">Документ-сервисы</div>
      {links.map((link) => (
        <button
          key={link.key}
          className={`sidebar__link ${activePage === link.key ? 'sidebar__link--active' : ''}`}
          onClick={() => onChange(link.key)}
        >
          {link.label}
        </button>
      ))}
      <div className="sidebar__hint">Фронтенд статичный и не зависит от сервисов до момента запроса.</div>
    </aside>
  );
}