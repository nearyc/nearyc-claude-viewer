# 主题系统设计文档

## 主题配置

### 深色主题 (Dark)

```typescript
export const darkTheme = {
  id: 'dark' as const,
  name: '深色模式',
  nameEn: 'Dark Mode',
  cssVars: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--bg-card': 'rgba(30, 41, 59, 0.8)',
    '--bg-hover': 'rgba(51, 65, 85, 0.5)',
    '--text-primary': 'rgba(255, 255, 255, 0.95)',
    '--text-secondary': 'rgba(255, 255, 255, 0.75)',
    '--text-tertiary': 'rgba(255, 255, 255, 0.55)',
    '--text-muted': 'rgba(255, 255, 255, 0.4)',
    '--border-primary': 'rgba(51, 65, 85, 0.8)',
    '--border-secondary': 'rgba(71, 85, 105, 0.8)',
    '--border-accent': 'rgba(100, 116, 139, 0.8)',
    '--scrollbar-track': '#1e293b',
    '--scrollbar-thumb': '#475569',
    '--scrollbar-thumb-hover': '#64748b',
    '--accent-blue': '#3b82f6',
    '--accent-blue-light': '#60a5fa',
    '--accent-green': '#10b981',
    '--accent-amber': '#f59e0b',
    '--accent-red': '#ef4444',
    '--accent-purple': '#8b5cf6',
  }
};
```

### 护眼主题 (Eye Care)

```typescript
export const eyeCareTheme = {
  id: 'eyeCare' as const,
  name: '护眼模式',
  nameEn: 'Eye Care Mode',
  cssVars: {
    '--bg-primary': '#1a1814',
    '--bg-secondary': '#242220',
    '--bg-tertiary': '#2e2c28',
    '--bg-card': 'rgba(36, 34, 32, 0.9)',
    '--bg-hover': 'rgba(46, 44, 40, 0.5)',
    '--text-primary': '#e8e2d9',
    '--text-secondary': '#c9c3ba',
    '--text-tertiary': '#a8a294',
    '--text-muted': '#8a847c',
    '--border-primary': 'rgba(120, 114, 104, 0.5)',
    '--border-secondary': 'rgba(140, 134, 124, 0.5)',
    '--border-accent': 'rgba(100, 94, 84, 0.6)',
    '--scrollbar-track': '#242220',
    '--scrollbar-thumb': '#4a4640',
    '--scrollbar-thumb-hover': '#5a5650',
    '--accent-blue': '#5a7c6e',
    '--accent-blue-light': '#6a9c8e',
    '--accent-green': '#6b8e6e',
    '--accent-amber': '#a08040',
    '--accent-red': '#a06050',
    '--accent-purple': '#7a6b8a',
  }
};
```

## 无闪烁初始化策略

在 `index.html` 中添加内联脚本，在 React 渲染前同步应用主题：

```html
<script>
  (function() {
    const saved = localStorage.getItem('claude-viewer-theme');
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```
