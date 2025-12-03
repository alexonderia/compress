import React from 'react';
import { Hero } from '../components/Hero';
import { Page } from '../types/navigation';

interface HomePageProps {
  slicerBaseUrl: string;
  aiBaseUrl: string;
  onSelectPage: (page: Page) => void;
}

export function HomePage({ slicerBaseUrl, aiBaseUrl, onSelectPage }: HomePageProps) {
  return (
    <div className="page">
      <Hero
        title="Фронтенд проверки сервисов"
        subtitle="Выберите сервис слева: Document Slicer разбивает документ на части, AI Lawyer формирует адаптированный отчёт. Фронтенд запускается отдельно и обращается к API только по клику."
      />
      <div className="home__cards">
        <div className="home__card">
          <h3>Document Slicer</h3>
          <p>Работает с эндпойнтами /api/sections/split и /api/specification/parse.</p>
          <p className="home__note">Базовый URL: {slicerBaseUrl}</p>
          <button onClick={() => onSelectPage('slicer')}>Перейти</button>
        </div>
        <div className="home__card">
          <h3>AI Legal</h3>
          <p>Принимает JSON с part_0–part_16 от Document Slicer и возвращает отчёт.</p>
          <p className="home__note">Базовый URL: {aiBaseUrl}</p>
          <button onClick={() => onSelectPage('ai-legal')}>Перейти</button>
        </div>
      </div>
    </div>
  );
}