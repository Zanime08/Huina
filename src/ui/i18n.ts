import ru from '../locales/ru.json';
import en from '../locales/en.json';
import { bus, Events } from '../core/EventBus';

export type Lang = 'ru' | 'en';

const DICTS: Record<Lang, Record<string, unknown>> = { ru: ru as Record<string, unknown>, en: en as Record<string, unknown> };

class I18n {
  lang: Lang = 'ru';

  setLang(l: Lang): void {
    if (this.lang === l) return;
    this.lang = l;
    document.documentElement.lang = l;
    bus.emit(Events.LANG_CHANGED, l);
  }

  t(key: string, vars?: Record<string, string | number>): string {
    const d = DICTS[this.lang] ?? en;
    let s = (d[key] ?? (en as Record<string, unknown>)[key] ?? key) as string;
    if (typeof s !== 'string') return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    }
    return s;
  }

  arr(key: string): string[] {
    const d = DICTS[this.lang] ?? en;
    const v = (d[key] ?? (en as Record<string, unknown>)[key]) as unknown;
    return Array.isArray(v) ? (v as string[]) : [];
  }
}

export const i18n = new I18n();
