import React from 'react';

interface HtmlPreviewModalProps {
  html: string;
  onClose: () => void;
}

export default function HtmlPreviewModal({ html, onClose }: HtmlPreviewModalProps) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__content">
        <button className="modal__close" onClick={onClose} aria-label="Закрыть предпросмотр">
          ✕
        </button>
        <div className="modal__body" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}