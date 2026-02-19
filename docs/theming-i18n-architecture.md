# Claude Viewer 主题与国际化架构设计

## 项目概述

为 Claude Viewer 项目添加主题切换（深色/护眼）和多语言支持（中文/英文）功能。

---

## 一、主题系统设计

### 1.1 目录结构

```
frontend/src/
├── contexts/
│   ├── ThemeContext.tsx          # 主题上下文（扩展）
│   └── I18nContext.tsx           # 国际化上下文（新建）
├── hooks/
│   ├── useTheme.ts               # 主题 hook（扩展）
│   └── useTranslation.ts         # 翻译 hook（新建）
├── i18n/
│   ├── index.ts                  # i18n 配置
│   ├── locales/
│   │   ├── zh-CN.ts              # 中文语言包
│   │   ├── en.ts                 # 英文语言包
│   │   └── index.ts              # 语言包导出
│   └── keys.ts                   # 翻译 key 类型
├── styles/
│   ├── themes/
│   │   ├── dark.ts               # 深色主题
│   │   ├── eyeCare.ts            # 护眼主题
│   │   └── index.ts              # 主题导出
│   └── themeVariables.css        # CSS 变量（优化 index.css）
└── components/
    ├── ThemeSwitcher.tsx         # 主题切换器
    └── LanguageSwitcher.tsx      # 语言切换器
```

### 1.2 主题配置

#### 深色主题 (Dark)
```typescript
export const darkTheme: Theme = {
  id: 'dark',
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

#### 护眼主题 (Eye Care)
```typescript
export const eyeCareTheme: Theme = {
  id: 'eyeCare',
  name: '护眼模式',
  nameEn: 'Eye Care Mode',
  cssVars: {
    '--bg-primary': '#f5f0e6',           // 暖白背景
    '--bg-secondary': '#ebe4d6',         // 浅暖灰
    '--bg-tertiary': '#ddd5c3',          // 中等暖灰
    '--bg-card': 'rgba(245, 240, 230, 0.9)',
    '--bg-hover': 'rgba(221, 213, 195, 0.5)',
    '--text-primary': '#4a453f',         // 深暖棕
    '--text-secondary': '#6b655b',       // 中等暖棕
    '--text-tertiary': '#8a8476',        // 浅暖棕
    '--text-muted': '#a8a094',           // 更浅暖棕
    '--border-primary': 'rgba(160, 150, 130, 0.5)',
    '--border-secondary': 'rgba(180, 170, 150, 0.5)',
    '--border-accent': 'rgba(140, 130, 110, 0.6)',
    '--scrollbar-track': '#ebe4d6',
    '--scrollbar-thumb': '#c9c0ab',
    '--scrollbar-thumb-hover': '#b0a692',
    '--accent-blue': '#4a7c59',          // 柔和绿
    '--accent-blue-light': '#5a9c6e',
    '--accent-green': '#6b8e5e',         // 自然绿
    '--accent-amber': '#b8860b',         // 深金色
    '--accent-red': '#a0524a',           // 柔和红
    '--accent-purple': '#7a6b8a',        // 柔和紫
  }
};
```

### 1.3 需要替换的颜色（按组件）

| 组件 | 当前颜色 | 建议替换为 |
|------|----------|-----------|
| App.tsx | `#3b82f6`, `#8b5cf6`... (成员颜色) | 使用 CSS 变量 |
| Dashboard.tsx | `rgba(30, 41, 59, 0.5)` | `var(--bg-card)` |
| Dashboard.tsx | `group-hover:text-gray-200` | `group-hover:text-[var(--text-primary)]` |
| MessageItem.tsx | `bg-amber-500/10 text-amber-400` | 使用语义化 CSS 变量 |
| MessageItem.tsx | `text-gray-300`, `text-gray-400` | 使用 `var(--text-secondary)` 等 |
| SessionDetail 子组件 | `border-gray-800/60`, `bg-gray-900/30` | 使用 CSS 变量 |
| TagSelector.tsx | `rgba(59, 130, 246, 0.15)` | 主题化颜色数组 |
| SmartFilterBar.tsx | `placeholder-gray-600` | `placeholder-[var(--text-muted)]` |

---

## 二、国际化系统设计

### 2.1 语言包结构

```typescript
// i18n/locales/zh-CN.ts
export default {
  common: {
    confirm: '确认',
    cancel: '取消',
    delete: '删除',
    export: '导出',
    copy: '复制',
    save: '保存',
    edit: '编辑',
    add: '添加',
    remove: '移除',
    search: '搜索',
    filter: '筛选',
    clear: '清除',
    close: '关闭',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    refresh: '刷新',
    selectAll: '全选',
    selected: '已选择',
    empty: '暂无数据',
    more: '更多',
    less: '收起',
    expand: '展开',
    collapse: '折叠',
  },

  nav: {
    dashboard: '仪表盘',
    sessions: '会话',
    teams: 'Agent Teams',
    projects: '项目',
  },

  dashboard: {
    title: '仪表盘',
    totalSessions: '总会话数',
    totalProjects: '总项目数',
    totalTeams: '总团队数',
    totalMessages: '总消息数',
    recentSessions: '最近会话',
    recentTeams: '最近团队',
    viewAll: '查看全部',
    noRecentSessions: '暂无最近会话',
    noTeams: '暂无团队',
    loading: '加载仪表盘...',
  },

  session: {
    title: '会话详情',
    emptySession: '空会话',
    inputCount: '{{count}} 个输入',
    deleteConfirm: '确定要删除会话 "{{name}}" 吗？此操作不可恢复。',
    batchDeleteConfirm: '确定要删除选中的 {{count}} 个会话吗？此操作不可恢复。',
    deleteError: '删除会话失败，请重试',
    batchDeleteError: '批量删除失败，请重试',
    exportError: '导出失败，请重试',
    copyId: '复制 Session ID',
    copied: '已复制',
    openInClaudeCode: '在 Claude Code 中打开',
    openInVSCode: '在 VS Code 中打开',
    exportSession: '导出会话',
    refreshList: '刷新列表',
    showAll: '显示所有会话',
    showStarredOnly: '只显示已收藏会话',
    clearFilter: '清除筛选',
  },

  team: {
    title: '团队',
    memberCount: '{{count}} 个成员',
    messageCount: '{{count}} 条消息',
    deleteConfirm: '确定要删除团队 "{{name}}" 吗？此操作将删除该团队的所有成员和消息，不可恢复。',
    deleteError: '删除团队失败，请重试',
    refreshList: '刷新列表',
    showAll: '显示所有团队',
    showStarredOnly: '只显示已收藏团队',
    editName: '编辑名称',
    addCustomName: '添加自定义名称',
  },

  filter: {
    searchPlaceholder: '搜索会话、标签...',
    saved: '已保存',
    noSavedFilters: '暂无保存的筛选条件',
    saveFilter: '保存当前筛选条件',
    saveFilterTitle: '保存筛选条件',
    filterNamePlaceholder: '输入筛选条件名称...',
    willSave: '将保存以下筛选条件:',
    searchLabel: '搜索',
    tagLabel: '标签',
    projectLabel: '项目',
    starredOnly: '仅显示已收藏',
    save: '保存',
    clear: '清除',
    filtered: '已筛选',
    allProjects: '所有项目',
    applyFilterHint: '点击应用筛选条件',
    alreadyExists: '已存在相同的筛选条件',
    setFilterFirst: '先设置筛选条件',
    moreTags: '+{{count}} 更多',
  },

  export: {
    title: '导出会话',
    selectFormat: '选择格式',
    options: '导出选项',
    includeMetadata: '包含会话元数据（ID、项目、统计信息）',
    includeTimestamps: '包含时间戳',
    preview: '预览',
    previewTruncated: '... (预览已截断)',
    copyClipboard: '复制到剪贴板',
    copied: '已复制',
    download: '下载文件',
    exporting: '导出中...',
    formats: {
      markdown: {
        name: 'Markdown',
        description: '格式化为可读的 Markdown 文档',
      },
      json: {
        name: 'JSON',
        description: '导出完整的数据结构',
      },
      html: {
        name: 'HTML',
        description: '带样式的网页格式',
      },
    },
  },

  tag: {
    addTag: '添加标签...',
    maxTags: '最多 {{max}} 个标签',
    createTag: '创建标签 "{{name}}"',
    existingTags: '已有标签',
    typeToCreate: '输入创建新标签',
  },

  commandPalette: {
    placeholder: '输入命令或搜索...',
    noResults: '未找到命令',
    navigation: '导航',
    sessions: '会话',
    teams: '团队',
    actions: '操作',
    other: '其他',
    navigate: '导航',
    select: '选择',
    commandCount: '{{count}} 个命令',
  },

  batch: {
    selected: '{{count}} 已选择',
    selectAll: '全选',
    export: '导出',
    exporting: '导出中...',
    delete: '删除',
    deleting: '删除中...',
    clearSelection: '清除选择',
  },

  heatmap: {
    title: '会话活跃度',
    sessions: '{{count}} 会话',
    activeDays: '{{count}} 活跃天数',
    maxPerDay: '最多 {{count}}/天',
    less: '少',
    more: '多',
  },

  timeline: {
    title: '实时活动',
    noActivity: '暂无活动记录',
    recentItems: '最近 {{count}} 条',
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    earlier: '更早',
  },

  trend: {
    title: '会话趋势',
    total: '总计: {{count}}',
    average: '平均: {{count}}/天',
  },

  connection: {
    connected: '已连接',
    disconnected: '未连接',
  },

  resizablePanel: {
    expand: '展开面板',
    collapse: '折叠面板',
  },

  confirmDialog: {
    confirm: '确认',
    cancel: '取消',
  },

  meta: {
    messages: '消息数',
    lastActive: '最后活跃',
    project: '项目',
    sessionId: 'Session ID',
  },

  search: {
    placeholder: '搜索...',
    matches: '{{count}} 个匹配',
    noMatches: '无匹配',
    previous: '上一个',
    next: '下一个',
    close: '关闭搜索',
  },

  bookmarks: {
    title: '书签',
  },

  conversation: {
    title: '对话',
    bookmarkCount: '{{count}} 个书签',
  },

  rawInputs: {
    title: '原始输入',
    noInputs: '暂无原始输入',
    inputNumber: '#{{number}}',
  },

  activity: {
    title: '活动',
  },
};
```

### 2.2 类型定义

```typescript
// i18n/keys.ts
export type TranslationKey =
  | `common.${keyof typeof import('./locales/zh-CN').default.common}`
  | `nav.${keyof typeof import('./locales/zh-CN').default.nav}`
  | `dashboard.${keyof typeof import('./locales/zh-CN').default.dashboard}`
  | `session.${keyof typeof import('./locales/zh-CN').default.session}`
  | `team.${keyof typeof import('./locales/zh-CN').default.team}`
  | `filter.${keyof typeof import('./locales/zh-CN').default.filter}`
  | `export.${keyof typeof import('./locales/zh-CN').default.export}`
  | `tag.${keyof typeof import('./locales/zh-CN').default.tag}`
  | `commandPalette.${keyof typeof import('./locales/zh-CN').default.commandPalette}`
  | `batch.${keyof typeof import('./locales/zh-CN').default.batch}`
  | `heatmap.${keyof typeof import('./locales/zh-CN').default.heatmap}`
  | `timeline.${keyof typeof import('./locales/zh-CN').default.timeline}`
  | `trend.${keyof typeof import('./locales/zh-CN').default.trend}`
  | `connection.${keyof typeof import('./locales/zh-CN').default.connection}`
  | `resizablePanel.${keyof typeof import('./locales/zh-CN').default.resizablePanel}`
  | `confirmDialog.${keyof typeof import('./locales/zh-CN').default.confirmDialog}`
  | `meta.${keyof typeof import('./locales/zh-CN').default.meta}`
  | `search.${keyof typeof import('./locales/zh-CN').default.search}`
  | `bookmarks.${keyof typeof import('./locales/zh-CN').default.bookmarks}`
  | `conversation.${keyof typeof import('./locales/zh-CN').default.conversation}`
  | `rawInputs.${keyof typeof import('./locales/zh-CN').default.rawInputs}`
  | `activity.${keyof typeof import('./locales/zh-CN').default.activity}`;

export type Locale = 'zh-CN' | 'en';
```

---

## 三、实施任务清单

### 阶段 1：基础架构搭建

1. **创建主题系统**
   - [ ] 创建 `styles/themes/dark.ts`
   - [ ] 创建 `styles/themes/eyeCare.ts`
   - [ ] 创建 `styles/themes/index.ts`
   - [ ] 重构 `styles/themeVariables.css`
   - [ ] 扩展 `contexts/ThemeContext.tsx`
   - [ ] 创建 `components/ThemeSwitcher.tsx`

2. **创建国际化系统**
   - [ ] 创建 `i18n/locales/zh-CN.ts`
   - [ ] 创建 `i18n/locales/en.ts`
   - [ ] 创建 `i18n/locales/index.ts`
   - [ ] 创建 `i18n/keys.ts`
   - [ ] 创建 `i18n/index.ts`
   - [ ] 创建 `contexts/I18nContext.tsx`
   - [ ] 创建 `hooks/useTranslation.ts`
   - [ ] 创建 `components/LanguageSwitcher.tsx`

### 阶段 2：组件颜色主题化

按优先级逐步替换组件中的硬编码颜色：

1. **核心布局组件**
   - [ ] Layout.tsx
   - [ ] Sidebar.tsx
   - [ ] ResizablePanel.tsx

2. **列表组件**
   - [ ] SessionList.tsx
   - [ ] TeamList.tsx
   - [ ] MemberList.tsx

3. **详情组件**
   - [ ] SessionDetail/index.tsx
   - [ ] SessionDetail/components/*.tsx
   - [ ] MessagePanel.tsx
   - [ ] MessageItem.tsx

4. **功能组件**
   - [ ] Dashboard.tsx
   - [ ] CommandPalette.tsx
   - [ ] BatchActionBar.tsx
   - [ ] ExportDialog.tsx
   - [ ] SmartFilterBar.tsx
   - [ ] TagSelector.tsx
   - [ ] ConfirmDialog.tsx

5. **可视化组件**
   - [ ] ActivityHeatmap.tsx
   - [ ] ActivityTimeline.tsx
   - [ ] TrendChart.tsx

### 阶段 3：组件文本国际化

1. **核心组件**
   - [ ] App.tsx
   - [ ] Sidebar.tsx
   - [ ] Dashboard.tsx

2. **列表组件**
   - [ ] SessionList.tsx
   - [ ] TeamList.tsx

3. **详情组件**
   - [ ] SessionDetail/components/*.tsx
   - [ ] MessagePanel.tsx
   - [ ] MessageItem.tsx

4. **功能组件**
   - [ ] CommandPalette.tsx
   - [ ] BatchActionBar.tsx
   - [ ] ExportDialog.tsx
   - [ ] SmartFilterBar.tsx
   - [ ] TagSelector.tsx
   - [ ] ConfirmDialog.tsx
   - [ ] ResizablePanel.tsx

5. **可视化组件**
   - [ ] ActivityHeatmap.tsx
   - [ ] ActivityTimeline.tsx
   - [ ] TrendChart.tsx

### 阶段 4：集成与优化

- [ ] 在 Header/Settings 中添加主题和语言切换器
- [ ] 确保主题切换时无闪烁
- [ ] 确保语言切换时组件正确重渲染
- [ ] 测试所有组件在不同主题下的显示效果
- [ ] 测试所有文本的翻译完整性
- [ ] 添加系统主题检测（prefers-color-scheme）
- [ ] 添加浏览器语言检测

### 阶段 5：测试与文档

- [ ] 编写主题切换测试
- [ ] 编写语言切换测试
- [ ] 更新 README.md 添加主题和国际化说明
- [ ] 编写开发者文档（如何添加新主题/语言）

---

## 四、关键代码示例

### 4.1 useTranslation Hook

```typescript
// hooks/useTranslation.ts
import { useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import type { TranslationKey } from '../i18n/keys';

export function useTranslation() {
  const { locale, t: translate } = useI18n();

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      let text = translate(key);

      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, String(v));
        });
      }

      return text;
    },
    [translate]
  );

  return { t, locale };
}
```

### 4.2 主题切换 Hook

```typescript
// hooks/useTheme.ts
import { useCallback } from 'react';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import type { ThemeId } from '../styles/themes';

export function useTheme() {
  const { theme, setTheme } = useThemeContext();

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'eyeCare' : 'dark'));
  }, [setTheme]);

  const isDark = theme === 'dark';
  const isEyeCare = theme === 'eyeCare';

  return { theme, setTheme, toggleTheme, isDark, isEyeCare };
}
```

---

## 五、注意事项

1. **颜色替换原则**：
   - 使用 CSS 变量而非 Tailwind 工具类
   - 避免内联样式中的硬编码颜色
   - 语义化命名（如 `--accent-primary` 而非 `--blue`）

2. **翻译 key 设计原则**：
   - 使用嵌套结构，按功能模块分组
   - key 名清晰表达用途
   - 支持插值参数
   - 避免重复定义

3. **性能考虑**：
   - 主题切换通过 CSS 变量实现，避免重渲染
   - 语言包按需加载（当前仅两种语言，可全部加载）
   - 使用 React Context 的 `useMemo` 优化

4. **兼容性**：
   - 保留现有 CSS 变量作为 fallback
   - 主题切换器在设置中提供，不强制用户选择
