export type SpecificationItem = {
  name: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  amount: number | null;
  country: string | null;
};

export type SpecificationJson = {
  items: SpecificationItem[];
  total: number | null;
  vat: number | null;
  warning: string | null;
};

export type SplitResponse = Record<string, string | SpecificationJson | null>;
export type SpecificationResponse = { spec_json: SpecificationJson | null };

export type SectionReview = {
  number: number | null;
  title: string;
  resume: string;
  risks: string;
  score: string;
};

export type AiLegalResponse = {
  docx_text?: string;
  specification_text?: string;
  overall_score?: number;
  inaccuracy?: string;
  red_flags: string;
  html: string;
  debug?: {
    prompt: { role: string; content: string }[];
    prompt_formatted: string;
    response: Record<string, unknown>;
    response_formatted: string;
  };
  debug_message?: string;
  sections?: SectionReview[];
};

export type DispatchServiceResult = {
  url: string | null | undefined;
  status: number | null | undefined;
  response?: unknown;
  error?: string | null;
  elapsed_ms: number | null | undefined;
};

export type DispatchResponse = Record<string, DispatchServiceResult>;