import React from 'react';
import { SpecificationJson } from '../types/api';

export function SpecificationBlock({ spec }: { spec: SpecificationJson }) {
  return (
    <article className="results__card results__card--wide">
      <div className="results__title">spec_json</div>
      <div className="spec">
        <div className="spec__meta">
          <span>Всего позиций: {spec.items.length}</span>
          <span>
            Итоговая сумма: {spec.total ?? '—'}
            {spec.vat ? ` (НДС ${spec.vat}%)` : ''}
          </span>
          {spec.warning && <span className="spec__warning">{spec.warning}</span>}
        </div>
        <div className="spec__table" role="table">
          <div className="spec__header" role="row">
            <span role="columnheader">Название</span>
            <span role="columnheader">Кол-во</span>
            <span role="columnheader">Ед.</span>
            <span role="columnheader">Цена</span>
            <span role="columnheader">Сумма</span>
            <span role="columnheader">Страна</span>
          </div>
          {spec.items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="spec__row" role="row">
              <span role="cell">{item.name}</span>
              <span role="cell">{item.qty ?? '—'}</span>
              <span role="cell">{item.unit ?? '—'}</span>
              <span role="cell">{item.price ?? '—'}</span>
              <span role="cell">{item.amount ?? '—'}</span>
              <span role="cell">{item.country ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}