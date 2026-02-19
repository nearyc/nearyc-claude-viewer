import React, { useCallback } from 'react';
import { Globe, Check } from 'lucide-react';
import { Language, availableLocales, Language as LocaleId } from '../i18n';
import { useI18n } from '../contexts/I18nContext';
import { LANGUAGE_CONFIG } from '../i18n/types';

interface LanguageSwitcherProps {
  /** 自定义类名 */
  className?: string;
  /** 切换按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 显示模式: icon-仅图标, label-仅文字, both-图标+文字, dropdown-下拉菜单 */
  mode?: 'icon' | 'label' | 'both' | 'dropdown';
  /** 是否显示国旗 */
  showFlag?: boolean;
}

/**
 * 语言切换器组件
 * 支持中文和英文切换
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  size = 'md',
  mode = 'dropdown',
  showFlag = true,
}) => {
  const { locale, setLocale, toggleLocale, isZhCN, isEn } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);

  // 尺寸配置
  const sizeConfig = {
    sm: { button: 'w-7 h-7', icon: 14, text: 'text-xs', padding: 'px-2 py-1' },
    md: { button: 'w-9 h-9', icon: 18, text: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { button: 'w-11 h-11', icon: 22, text: 'text-base', padding: 'px-4 py-2' },
  };

  const { button, icon, text, padding } = sizeConfig[size];

  // 切换语言
  const handleToggle = useCallback(() => {
    toggleLocale();
  }, [toggleLocale]);

  // 设置特定语言
  const handleSetLocale = useCallback(
    (newLocale: Language) => {
      setLocale(newLocale);
      setIsOpen(false);
    },
    [setLocale]
  );

  // 获取当前语言配置
  const currentConfig = LANGUAGE_CONFIG[locale];

  // 图标模式
  if (mode === 'icon') {
    return (
      <button
        onClick={handleToggle}
        className={`
          ${button}
          flex items-center justify-center
          rounded-lg
          bg-[var(--bg-secondary)]
          hover:bg-[var(--bg-tertiary)]
          transition-colors
          ${className}
        `}
        title={currentConfig.name}
        aria-label={`当前语言: ${currentConfig.name}, 点击切换`}
      >
        <Globe size={icon} className="text-[var(--text-secondary)]" />
      </button>
    );
  }

  // 文字模式
  if (mode === 'label') {
    return (
      <button
        onClick={handleToggle}
        className={`
          ${padding} ${text}
          rounded-lg
          bg-[var(--bg-secondary)]
          hover:bg-[var(--bg-tertiary)]
          text-[var(--text-secondary)]
          transition-colors
          ${className}
        `}
        aria-label={`当前语言: ${currentConfig.name}, 点击切换`}
      >
        {showFlag && <span className="mr-1.5">{currentConfig.flag}</span>}
        {currentConfig.name}
      </button>
    );
  }

  // 图标+文字模式
  if (mode === 'both') {
    return (
      <button
        onClick={handleToggle}
        className={`
          ${padding} ${text}
          flex items-center gap-1.5
          rounded-lg
          bg-[var(--bg-secondary)]
          hover:bg-[var(--bg-tertiary)]
          text-[var(--text-secondary)]
          transition-colors
          ${className}
        `}
        aria-label={`当前语言: ${currentConfig.name}, 点击切换`}
      >
        <Globe size={icon} />
        {showFlag && <span>{currentConfig.flag}</span>}
        <span>{currentConfig.name}</span>
      </button>
    );
  }

  // 下拉菜单模式
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${padding} ${text}
          flex items-center gap-1.5
          rounded-lg
          bg-[var(--bg-secondary)]
          hover:bg-[var(--bg-tertiary)]
          text-[var(--text-secondary)]
          transition-colors
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe size={icon} />
        {showFlag && <span>{currentConfig.flag}</span>}
        <span>{currentConfig.name}</span>
      </button>

      {isOpen && (
        <>
          {/* 点击外部关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 下拉菜单 */}
          <div
            className="
              absolute right-0 mt-1 py-1
              min-w-[140px]
              bg-[var(--bg-card)]
              border border-[var(--border-primary)]
              rounded-lg
              shadow-lg
              z-50
            "
            role="listbox"
          >
            {availableLocales.map(({ id, name, flag }) => (
              <button
                key={id}
                onClick={() => handleSetLocale(id as Language)}
                className={`
                  w-full ${padding} ${text}
                  flex items-center justify-between
                  text-left
                  hover:bg-[var(--bg-hover)]
                  transition-colors
                  ${locale === id
                    ? 'text-[var(--accent-blue)]'
                    : 'text-[var(--text-primary)]'
                  }
                `}
                role="option"
                aria-selected={locale === id}
              >
                <span className="flex items-center gap-2">
                  {showFlag && <span>{flag}</span>}
                  <span>{name}</span>
                </span>
                {locale === id && (
                  <Check size={14} className="text-[var(--accent-blue)]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
