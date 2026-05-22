import { zh } from "./locales/zh";

export type Locale = "zh" | "en";

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type Messages = DeepStringRecord<typeof zh>;
