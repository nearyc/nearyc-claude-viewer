import React, { useCallback } from 'react';
import { Moon, Eye, Sun } from 'lucide-react';
import { useTheme, themes, ThemeId } from '../contexts/ThemeContext';

interface ThemeSwitcherProps {
  /** 自定义类名 */
  className?: string;
  /** 切换按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 显示模式: icon-仅图标, label-仅文字, both-图标+文字 */
  mode?: 'icon' | 'label' | 'both';
}

/**
 * 主题切换器组件
 * 支持深色模式和护眼模式切换
 */
export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = '',
  size = 'md',
  mode = 'icon',
}) => {
  const { theme, setTheme, isDark, isEyeCare, isLightEyeCare } = useTheme();

  // 尺寸配置
  const sizeConfig = {
    sm: { button: 'w-7 h-7', icon: 14, text: 'text-xs' },
    md: { button: 'w-9 h-9', icon: 18, text: 'text-sm' },
    lg: { button: 'w-11 h-11', icon: 22, text: 'text-base' },
  };

  const { button, icon, text } = sizeConfig[size];

  // 切换主题
  const toggleTheme = useCallback(() => {
    if (isDark) {
      setTheme('eyeCare');
    } else if (isEyeCare) {
      setTheme('lightEyeCare');
    } else {
      setTheme('dark');
    }
  }, [isDark, isEyeCare, setTheme]);

  // 设置特定主题
  const handleSetTheme = useCallback(
    (newTheme: ThemeId) => {
      setTheme(newTheme);
    },
    [setTheme]
  );

  // 获取当前主题图标
  const getThemeIcon = () => {
    if (isEyeCare) {
      return <Eye size={icon} className="text-[var(--accent-amber)]" />;
    }
    if (isLightEyeCare) {
      return <Sun size={icon} className="text-[var(--accent-amber)]" />;
    }
    return <Moon size={icon} className="text-[var(--accent-blue)]" />;
  };

  // 获取当前主题名称
  const getThemeLabel = () => {
    return themes[theme].name;
  };

  // 图标模式
  if (mode === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${button}
          flex items-center justify-center
          rounded-lg
          bg-[var(--bg-secondary)]
          hover:bg-[var(--bg-tertiary)]
          transition-colors
          ${className}
        `}
        title={getThemeLabel()}
        aria-label={`当前主题: ${getThemeLabel()}, 点击切换`}
      >
        {getThemeIcon()}
      </button>
    );
  }

  // 下拉选择模式
  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-2">
        {mode === 'both' && (
          <button
            onClick={toggleTheme}
            className={`
              ${button}
              flex items-center justify-center
              rounded-lg
              bg-[var(--bg-secondary)]
              hover:bg-[var(--bg-tertiary)]
              transition-colors
            `}
            title={getThemeLabel()}
            aria-label={`当前主题: ${getThemeLabel()}, 点击切换`}
          >
            {getThemeIcon()}
          </button>
        )}

        {(mode === 'both' || mode === 'label') && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSetTheme('dark')}
              className={`
                px-3 py-1.5 rounded-lg ${text}
                transition-colors
                ${isDark
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
            >
              {themes.dark.name}
            </button>
            <button
              onClick={() => handleSetTheme('eyeCare')}
              className={`
                px-3 py-1.5 rounded-lg ${text}
                transition-colors
                ${isEyeCare
                  ? 'bg-[var(--accent-amber)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
            >
              {themes.eyeCare.name}
            </button>
            <button
              onClick={() => handleSetTheme('lightEyeCare')}
              className={`
                px-3 py-1.5 rounded-lg ${text}
                transition-colors
                ${isLightEyeCare
                  ? 'bg-[var(--accent-green)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
            >
              {themes.lightEyeCare.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
