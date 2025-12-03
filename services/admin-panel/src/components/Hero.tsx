import React from "react";

interface HeroProps {
  title: string;
  subtitle: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  return (
    <header className="page__header">
      <div>
        <h1>{title}</h1>
        <p className="page__subtitle">{subtitle}</p>
      </div>
    </header>
  );
}