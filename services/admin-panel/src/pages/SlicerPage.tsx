import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { SpecificationBlock } from '../components/SpecificationBlock';
import {
  DispatchResponse,
  DispatchServiceResult,
  SpecificationJson,
  SplitResponse,
  SpecificationResponse,
} from '../types/api';
import { downloadJson } from '../utils/download';

interface SlicerPageProps {
  baseUrl: string;
}

export function SlicerPage({ baseUrl }: SlicerPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SplitResponse | null>(null);
  const [dispatchFile, setDispatchFile] = useState<File | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<DispatchResponse | null>(null);
  const [dispatchDuration, setDispatchDuration] = useState<number | null>(null);
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

  const formatDuration = (value: number | null) => {
    if (typeof value !== 'number') return '—';
    const totalSeconds = Math.floor(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} мин ${seconds.toString().padStart(2, '0')} сек`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError('Пожалуйста, выберите файл договора.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const sectionsResponse = await fetch(`${baseUrl}/api/sections/split`, {
        method: 'POST',
        body: formData,
      });

      if (!sectionsResponse.ok) {
        const message = await sectionsResponse.text();
        throw new Error(message || 'Не удалось обработать файл');
      }

      const sectionsJson = (await sectionsResponse.json()) as SplitResponse;

      let specJson: SpecificationResponse | null = null;
      try {
        const specResponse = await fetch(`${baseUrl}/api/specification/parse`, {
          method: 'POST',
          body: formData,
        });

        if (specResponse.ok) {
          specJson = (await specResponse.json()) as SpecificationResponse;
        }
      } catch (specError) {
        console.warn('Не удалось получить спецификацию:', specError);
      }

      setResult({ ...sectionsJson, ...(specJson ?? {}) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDispatchError(null);
    setDispatchResult(null);
    setDispatchDuration(null);
    setExpandedServices({});

    if (!dispatchFile) {
      setDispatchError('Пожалуйста, выберите файл для отправки в сервисы.');
      return;
    }

    const formData = new FormData();
    formData.append('file', dispatchFile);

    const startedAt = performance.now();
    try {
      setDispatchLoading(true);
      const response = await fetch(`${baseUrl}/api/sections/dispatch`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Не удалось получить ответы от сервисов');
      }

      const json = (await response.json()) as DispatchResponse;
      setDispatchResult(json);
      setDispatchDuration(performance.now() - startedAt);
      setExpandedServices(
        Object.keys(json).reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setDispatchError(message);
    } finally {
      setDispatchLoading(false);
      setDispatchDuration(performance.now() - startedAt);
    }
  };

  return (
    <div className="page">
      <Hero
        title="Проверка сервиса нарезки документов"
        subtitle="Подгрузите файл договора, чтобы получить секции part_0 – part_16 и извлечённую спецификацию через отдельный эндпойнт."
      />

      <form className="upload" onSubmit={handleSubmit}>
        <label className="upload__field">
          <span>Файл договора</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.rtf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button className="upload__button" type="submit" disabled={loading}>
          {loading ? 'Обработка…' : 'Отправить'}
        </button>
      </form>

      <section className="results">
        <div className="results__header">
          <h2>Отправка секций в сервисы</h2>
          <p className="results__subtitle">
            После разбиения договора данные уходят в несколько сервисов параллельно.
          </p>
        </div>

        <form className="upload" onSubmit={handleDispatchSubmit}>
          <label className="upload__field">
            <span>Файл договора</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf"
              onChange={(event) => setDispatchFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <button className="upload__button" type="submit" disabled={dispatchLoading}>
            {dispatchLoading ? 'Отправка…' : 'Отправить в сервисы'}
          </button>

        </form>
      </section>

      {dispatchError && <div className="alert alert--error">{dispatchError}</div>}

      {error && <div className="alert alert--error">{error}</div>}

      {result && (
        <section className="results">
          <div className="results__header">
            <h2>Результат секционирования</h2>
            <div className="results__actions">
              <button type="button" onClick={() => setResult(null)}>
                Очистить
              </button>
              <button type="button" onClick={() => downloadJson(result, 'sections.json')}>
                Скачать JSON
              </button>
            </div>
          </div>

          <div className="results__grid">
            {Object.entries(result)
              .filter(([key]) => key.startsWith('part_'))
              .map(([key, value]) => (
                <article key={key} className="results__card">
                  <div className="results__title">{key}</div>
                  <pre className="results__text">{typeof value === 'string' ? value || '—' : '—'}</pre>
                </article>
              ))}

            {(() => {
              const specJsonValue = (result as { spec_json?: SpecificationJson | null }).spec_json;
              return specJsonValue ? <SpecificationBlock spec={specJsonValue} /> : null;
            })()}
          </div>
        </section>
      )}

      {dispatchResult && (
        <section className="results">
          <div className="results__header">
            <h2>Ответы сервисов</h2>
            <div className="results__subtitle">
              Время ответа сервера: {formatDuration(dispatchDuration)}
            </div>
            <div className="results__actions">
              <button type="button" onClick={() => setDispatchResult(null)}>
                Очистить
              </button>
              <button type="button" onClick={() => downloadJson(dispatchResult, 'dispatch.json')}>
                Скачать JSON
              </button>
            </div>
          </div>

          <div className="results__grid">
            {Object.entries(dispatchResult).map(([service, payload]) => {
              const typedPayload = payload as DispatchServiceResult | null;
              const resultBody = typedPayload?.response ?? typedPayload;
              const isExpanded = expandedServices[service] ?? true;

              return (
                <article key={service} className="results__card">
                  <div className="results__title-row">
                    <div className="results__title">{service}</div>
                    <button
                      type="button"
                      className="results__toggle"
                      onClick={() =>
                        setExpandedServices((prev) => ({
                          ...prev,
                          [service]: !isExpanded,
                        }))
                      }
                    >
                      {isExpanded ? 'Свернуть' : 'Развернуть'}
                    </button>
                  </div>
                  <pre className={`results__text ${isExpanded ? 'results__text--expanded' : ''}`}>
                    {resultBody ? JSON.stringify(resultBody, null, 2) : '—'}
                  </pre>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}