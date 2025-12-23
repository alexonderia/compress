import React, { useMemo, useState } from 'react';
import { EndpointDescriptor } from '../types/services';
import { downloadJson } from '../utils/download';

interface EndpointCardProps {
  endpoint: EndpointDescriptor;
  gatewayUrl: string;
  serviceName: string;
}

type ResponseState = {
  status: number;
  ok: boolean;
  elapsedMs: number;
  body: unknown;
};

export function EndpointCard({ endpoint, gatewayUrl, serviceName }: EndpointCardProps) {
  const [path, setPath] = useState(endpoint.path);
  const [payload, setPayload] = useState(() =>
    endpoint.sampleBody ? JSON.stringify(endpoint.sampleBody, null, 2) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponseState | null>(null);

  const isGet = endpoint.method === 'GET';

  const prettyBody = useMemo(() => {
    if (!response) return '';
    return JSON.stringify(response.body, null, 2);
  }, [response]);

  const handleSend = async () => {
    setError(null);
    setResponse(null);

    if (!path.trim()) {
      setError('Укажите путь запроса.');
      return;
    }

    let parsedBody: unknown = undefined;
    if (!isGet && payload.trim()) {
      try {
        parsedBody = JSON.parse(payload);
      } catch (err) {
        setError('Не удалось распарсить JSON в теле запроса.');
        return;
      }
    }

    try {
      setLoading(true);
      const started = performance.now();
      const res = await fetch(`${gatewayUrl}${path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(parsedBody ?? {}),
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch (err) {
        body = text;
      }

      setResponse({
        status: res.status,
        ok: res.ok,
        elapsedMs: Math.round(performance.now() - started),
        body,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="endpoint-card">
      <div className="endpoint-card__header">
        <div className="method" data-method={endpoint.method}>{endpoint.method}</div>
        <div>
          <p className="muted">{serviceName}</p>
          <h3>{endpoint.description}</h3>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Путь</span>
        <input
          className="field__input"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/service/path"
        />
      </label>

      {!isGet && (
        <label className="field">
          <span className="field__label">Тело запроса (JSON)</span>
          <textarea
            className="field__textarea"
            rows={6}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="{ }"
          />
        </label>
      )}

      <div className="endpoint-card__actions">
        <div className="callout callout--inline">
          <p className="callout__title">curl</p>
          <p className="mono">{endpoint.method} {gatewayUrl}{path}</p>
        </div>
        <div className="endpoint-card__buttons">
          <button type="button" onClick={() => downloadJson(endpoint, `${endpoint.id}.json`)}>
            Скачать описание
          </button>
          <button type="button" className="primary" onClick={handleSend} disabled={loading}>
            {loading ? 'Отправляем…' : 'Выполнить запрос'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {response && (
        <div className="response">
          <div className="response__meta">
            <span className={`badge ${response.ok ? 'badge--success' : 'badge--error'}`}>
              {response.ok ? 'OK' : 'Ошибка'} {response.status}
            </span>
            <span className="muted">{response.elapsedMs} мс</span>
            <button className="button" type="button" onClick={() => downloadJson(response.body as Record<string, unknown>, `${endpoint.id}_response.json`)}>
              Скачать JSON
            </button>
          </div>
          <pre className="response__body">{prettyBody}</pre>
        </div>
      )}
    </article>
  );
}