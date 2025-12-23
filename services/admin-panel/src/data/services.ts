import { ServiceDescriptor } from '../types/services';

export const services: ServiceDescriptor[] = [
  {
    key: 'aggregator',
    name: 'Aggregator',
    summary: 'Оркеструет запросы и собирает ответы из всех сервисов.',
    focus: 'Принимает задания от Gateway, раскладывает их по исполнителям и возвращает единый ответ.',
    endpoints: [
      {
        id: 'aggregator-health',
        method: 'GET',
        path: '/health',
        description: 'Быстрая проверка готовности агрегатора.',
      },
      {
        id: 'aggregator-dispatch',
        method: 'POST',
        path: '/dispatch',
        description: 'Отправляет задание сразу в несколько сервисов и возвращает task_id.',
        sampleBody: {
          task_id: 'demo-task',
          services: ['ai_legal', 'ai_econom', 'contract_extractor'],
          payload: { text: 'Проверьте, что договор корректен' },
        },
      },
      {
        id: 'aggregator-tasks',
        method: 'GET',
        path: '/tasks/demo-task',
        description: 'Получает статус задачи и ответы по конкретному task_id.',
      },
    ],
    notes: [
      'Можно использовать с task_id из Gateway, чтобы проверить прогресс.',
      'Сервис возвращает полную трассировку задержек по каждому исполнителю.',
    ],
  },
  {
    key: 'ai_legal',
    name: 'AI Legal',
    summary: 'Юридическая проверка договоров и документов.',
    focus: 'Анализирует риски, проверяет корректность формулировок и формирует HTML‑отчёт.',
    endpoints: [
      {
        id: 'ai-legal-health',
        method: 'GET',
        path: '/legal/health',
        description: 'Возвращает, готов ли сервис к анализу.',
      },
      {
        id: 'ai-legal-evaluate',
        method: 'POST',
        path: '/legal/evaluate',
        description: 'Запускает юридическую экспертизу текста или файла.',
        sampleBody: {
          contract_text: 'Укажите ключевые условия договора для проверки',
          language: 'ru',
          include_score: true,
        },
      },
    ],
    notes: [
      'Сервис возвращает score и HTML‑отчёт при необходимости.',
      'Сохраняет UID задачи, чтобы сопоставлять отчёты с исходными файлами.',
    ],
  },
  {
    key: 'ai_econom',
    name: 'AI Econom',
    summary: 'Финансовые и экономические проверки.',
    focus: 'Проверяет бюджетные рамки, согласованность сумм и экономические риски.',
    endpoints: [
      {
        id: 'ai-econom-health',
        method: 'GET',
        path: '/econom/health',
        description: 'Сигнал здоровья сервиса.',
      },
      {
        id: 'ai-econom-score',
        method: 'POST',
        path: '/econom/score',
        description: 'Расчёт финансового скоринга и выявление отклонений.',
        sampleBody: {
          contract_total: 1500000,
          currency: 'RUB',
          customer: 'ООО «Вектор»',
          include_recommendations: true,
        },
      },
    ],
    notes: ['Рекомендуется передавать сумму в базовой валюте и заполнять customer для логирования.'],
  },
  {
    key: 'ai_accountant',
    name: 'AI Accountant',
    summary: 'Бухгалтерские проверки и сверка спецификаций.',
    focus: 'Сверяет позиции спецификаций, НДС, валюту и формирует JSON с итогами.',
    endpoints: [
      {
        id: 'ai-accountant-health',
        method: 'GET',
        path: '/accountant/health',
        description: 'Убедитесь, что бухгалтерские проверки доступны.',
      },
      {
        id: 'ai-accountant-validate',
        method: 'POST',
        path: '/accountant/validate',
        description: 'Проверяет корректность позиций спецификации и возвращает сверку.',
        sampleBody: {
          spec_json: {
            items: [
              { name: 'Поставка серверов', qty: 2, unit: 'шт', price: 250000, amount: 500000, country: 'RU' },
            ],
            total: 500000,
            vat: 0.2,
          },
        },
      },
    ],
    notes: ['Для больших спецификаций отправляйте только изменённые строки, чтобы ускорить обработку.'],
  },
  {
    key: 'ai_sb',
    name: 'AI SB',
    summary: 'Проверка служебной безопасности и KYC.',
    focus: 'Сверяет контрагентов по санкционным листам и валидирует паспорта.',
    endpoints: [
      {
        id: 'ai-sb-health',
        method: 'GET',
        path: '/sb/health',
        description: 'Служебное состояние сервиса.',
      },
      {
        id: 'ai-sb-kyc',
        method: 'POST',
        path: '/sb/kyc',
        description: 'Проверка контрагента по базам KYC/AML.',
        sampleBody: {
          company_name: 'ООО «Вектор»',
          inn: '7708123456',
          passport: '1234 567890',
        },
      },
    ],
    notes: ['Чувствительные данные не логируются — ответ содержит обезличенные ссылки на источники.'],
  },
  {
    key: 'contract_extractor',
    name: 'Contract Extractor',
    summary: 'Достаёт факты из договоров.',
    focus: 'Извлекает сроки, суммы и ключевые атрибуты из договоров и актов.',
    endpoints: [
      {
        id: 'contract-extractor-health',
        method: 'GET',
        path: '/extractor/health',
        description: 'Быстрая диагностика доступности.',
      },
      {
        id: 'contract-extractor-run',
        method: 'POST',
        path: '/extractor/run',
        description: 'Извлечение структурированных данных из текста.',
        sampleBody: {
          contract_text: 'Поставщик передает оборудование в течение 30 дней...',
          expected_fields: ['dates', 'parties', 'payments'],
        },
      },
    ],
    notes: ['Вернёт извлечённые атрибуты и confidence по каждому полю.'],
  },
  {
    key: 'document_slicer',
    name: 'Document Slicer',
    summary: 'Нарезка документов на логические сегменты.',
    focus: 'Подготавливает текст для других моделей, сохраняя контекст.',
    endpoints: [
      {
        id: 'document-slicer-health',
        method: 'GET',
        path: '/slicer/health',
        description: 'Проверка готовности сервиса.',
      },
      {
        id: 'document-slicer-split',
        method: 'POST',
        path: '/slicer/split',
        description: 'Разбивает текст по смысловым блокам и возвращает массив фрагментов.',
        sampleBody: {
          text: 'Длинный документ...',
          language: 'ru',
          max_chunk_size: 800,
        },
      },
    ],
    notes: ['Учитывайте, что max_chunk_size задаётся в символах.'],
  },
  {
    key: 'budget_service',
    name: 'Budget Service',
    summary: 'Расчёт бюджетов и проверка лимитов.',
    focus: 'Сверяет проект с лимитами и сигнализирует о превышениях.',
    endpoints: [
      {
        id: 'budget-service-health',
        method: 'GET',
        path: '/budget/health',
        description: 'Служебная проверка доступности.',
      },
      {
        id: 'budget-service-check',
        method: 'POST',
        path: '/budget/check',
        description: 'Проверка бюджета по проекту и подразделению.',
        sampleBody: {
          project_code: 'PRJ-42',
          department: 'R&D',
          amount: 1200000,
          currency: 'RUB',
        },
      },
    ],
    notes: ['Возвращает превышения и рекомендуемые корректировки.'],
  },
];