import React, { useState } from "react";

interface SlicerPageProps {
  baseUrl: string; // например: http://localhost:8099
}

export function SlicerPage({ baseUrl }: SlicerPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // состояние модалки предпросмотра HTML ai_legal
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Выберите файл");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || "Ошибка загрузки файла");
      }

      const json = await response.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function openAiLegalHtml() {
    if (!result?.ai_legal?.html) {
      setError("HTML из ai_legal отсутствует");
      return;
    }

    setHtmlContent(result.ai_legal.html);
    setShowHtmlModal(true);
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Загрузка документа</h1>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <br/>
        <button type="submit" disabled={loading}>
          {loading ? "Загрузка…" : "Отправить"}
        </button>
      </form>

      {error && <div style={{ color: "red", marginTop: 20 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 30 }}>
          <h2>Ответ Gateway</h2>

          {/* Кнопка показа HTML ai_legal */}
          {result?.ai_legal?.html && (
            <button
              onClick={openAiLegalHtml}
              style={{
                marginBottom: 20,
                padding: "8px 16px",
                background: "#4a80f0",
                color: "white",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
              }}
            >
              Открыть HTML ai_legal
            </button>
          )}

          <pre
            style={{
              background: "#f0f0f0",
              padding: 15,
              borderRadius: 5,
              maxWidth: "100%",
              whiteSpace: "pre-wrap",     // ← перенос строк
              wordBreak: "break-word",    // ← ломает длинные слова / URL / base64
              overflowX: "visible",       // ← убираем горизонтальный скролл
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Модалка предпросмотра */}
      {showHtmlModal && (
        <HtmlPreviewModal
          html={htmlContent}
          onClose={() => setShowHtmlModal(false)}
        />
      )}
    </div>
  );
}

/* ------------------------ *
 *  МОДАЛЬНОЕ ОКНО HTML
 * ------------------------ */
function HtmlPreviewModal({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "white",
          width: "90%",
          height: "90%",
          borderRadius: 8,
          padding: 20,
          overflow: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            padding: "6px 12px",
            background: "#ff4d4d",
            border: "none",
            color: "white",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Закрыть
        </button>

        <div
          style={{
            padding: 10,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
