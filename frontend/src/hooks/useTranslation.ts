import { useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { InterpolationValues, TranslationKey } from '../i18n/types';

/**
 * 获取嵌套对象值的辅助函数
 */
function getNestedValue<T>(obj: T, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * 插值替换辅助函数
 * 将 {{variable}} 替换为实际值
 */
function interpolate(template: string, values: InterpolationValues): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * 翻译 Hook
 * 提供翻译函数和语言相关功能
 *
 * 使用示例:
 * const { t, locale, setLocale } = useTranslation();
 * t('common.save'); // -> '保存'
 * t('session.deleteConfirm', { count: 5 }); // -> '确定要删除选中的 5 个会话吗？'
 */
export function useTranslation() {
  const { t, locale, setLocale, toggleLocale, isZhCN, isEn } = useI18n();

  /**
   * 翻译函数
   * @param key - 翻译键，支持点号分隔的嵌套路径
   * @param values - 可选的插值变量
   * @returns 翻译后的字符串
   */
  const translate = useCallback(
    (key: TranslationKey, values?: InterpolationValues): string => {
      const translation = getNestedValue(t, key);

      if (!translation) {
        console.warn(`[i18n] Missing translation key: ${key}`);
        return key;
      }

      if (values) {
        return interpolate(translation, values);
      }

      return translation;
    },
    [t]
  );

  return {
    /** 翻译函数 */
    t: translate,
    /** 当前语言 */
    locale,
    /** 设置语言 */
    setLocale,
    /** 切换语言 (zh-CN <-> en) */
    toggleLocale,
    /** 是否为中文 */
    isZhCN,
    /** 是否为英文 */
    isEn,
    /** 完整的翻译对象 */
    translations: t,
  };
}

export default useTranslation;
