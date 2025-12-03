import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { AiLegalResponse } from '../types/api';
import { downloadHtml, downloadJson } from '../utils/download';

interface AiLegalPageProps {
  baseUrl: string;
}

export function AiLegalPage({ baseUrl }: AiLegalPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiLegalResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError('Загрузите JSON, полученный из Document Slicer.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const tryCall = async (path: string) => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Не удалось обработать файл');
        }

        return (await response.json()) as AiLegalResponse;
      };

      try {
        const data = await tryCall('/api/sections/full-prepared');
        setResult(data);
      } catch (err) {
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Hero
        title="AI Legal — проверка адаптированного эндпойнта"
        subtitle="Эндпойнт адаптирован от /sections/full: принимает JSON с part_0–part_16 (результат Document Slicer) и возвращает отчёт."
      />

      <form className="upload" onSubmit={handleSubmit}>
        <label className="upload__field">
          <span>Файл секций (JSON из Document Slicer)</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <p className="upload__hint">
          Сначала загрузите договор на странице <strong>Document Slicer</strong>, скачайте полученный sections.json и отправьте его сюда.
        </p>

        <button className="upload__button" type="submit" disabled={loading}>
          {loading ? 'Обработка…' : 'Отправить'}
        </button>
      </form>

      {error && <div className="alert alert--error">{error}</div>}

      {result && (
        <section className="results">
          <div className="results__header">
            <h2>Результат AI Legal</h2>
            <div className="results__actions">
              <button type="button" onClick={() => setResult(null)}>
                Очистить
              </button>
              <button type="button" onClick={() => downloadJson(result, 'ai_lawyer.json')}>
                Скачать JSON
              </button>
              <button type="button" onClick={() => downloadHtml(result.html, 'ai_lawyer_report.html')}>
                Скачать HTML отчёт
              </button>
            </div>
          </div>

          <div className="results__grid">
            {result.html && (
              <article className="results__card results__card--wide">
                <div className="results__title">HTML отчёт</div>
                <div className="results__html" dangerouslySetInnerHTML={{ __html: result.html }} />
              </article>
            )}

            {result.docx_text && (
              <article className="results__card results__card--wide">
                <div className="results__title">Полный текст договора</div>
                <div className="results__html" dangerouslySetInnerHTML={{ __html: result.docx_text }} />
              </article>
            )}

            {result.specification_text && (
              <article className="results__card results__card--wide">
                <div className="results__title">specification_text</div>
                <pre className="results__text">{result.specification_text}</pre>
              </article>
            )}

            {result.debug?.prompt_formatted && (
              <article className="results__card results__card--wide">
                <div className="results__title">Промпт</div>
                <pre className="results__text">{result.debug.prompt_formatted}</pre>
              </article>
            )}

            {result.debug?.response_formatted && (
              <article className="results__card results__card--wide">
                <div className="results__title">Ответ модели</div>
                <pre className="results__text">{result.debug.response_formatted}</pre>
              </article>
            )}
          </div>
        </section>
      )}
    </div>
  );
}