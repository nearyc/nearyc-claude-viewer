# 主题与国际化实施任务清单

## 开发分支: `feat/theming-i18n`

---

## 阶段 1: 基础架构搭建 (第 1 轮)

### 任务 1.1: 创建主题配置
**负责人**: theme-creator
**文件**:
- `frontend/src/styles/themes/dark.ts`
- `frontend/src/styles/themes/eyeCare.ts`
- `frontend/src/styles/themes/index.ts`

**代码要求**:
```typescript
// dark.ts
export const darkTheme = {
  id: 'dark' as const,
  name: '深色模式',
  nameEn: 'Dark Mode',
  cssVars: { /* 所有 CSS 变量 */ }
};

// eyeCare.ts
export const eyeCareTheme = {
  id: 'eyeCare' as const,
  name: '护眼模式',
  nameEn: 'Eye Care Mode',
  cssVars: { /* 所有 CSS 变量 */ }
};
```

**验收标准**:
- [ ] 主题配置包含所有必要的 CSS 变量
- [ ] 类型定义完整
- [ ] 护眼主题使用暖色调配色

---

### 任务 1.2: 重构 CSS 变量文件
**负责人**: css-refactor
**文件**: `frontend/src/styles/themeVariables.css` (从 index.css 提取)

**代码要求**:
- 将 index.css 中的 CSS 变量提取到独立文件
- 使用 CSS 自定义属性（variables）而非硬编码值
- 添加主题切换时的过渡动画

**验收标准**:
- [ ] 所有颜色使用 CSS 变量
- [ ] 主题切换有平滑过渡效果
- [ ] 滚动条样式主题化

---

### 任务 1.3: 扩展 ThemeContext
**负责人**: context-updater
**文件**: `frontend/src/contexts/ThemeContext.tsx`

**代码要求**:
```typescript
interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  currentTheme: Theme;
}
```

**验收标准**:
- [ ] 支持主题切换
- [ ] 主题持久化到 localStorage
- [ ] 页面加载时读取保存的主题
- [ ] 提供 toggleTheme 便捷方法

---

### 任务 1.4: 创建中文语言包
**负责人**: zh-translator
**文件**: `frontend/src/i18n/locales/zh-CN.ts`

**翻译清单**:
```typescript
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
  // ... 其他分组
};
```

**验收标准**:
- [ ] 所有中文文本都有对应的 key
- [ ] key 命名规范统一
- [ ] 支持插值参数

---

### 任务 1.5: 创建英文语言包
**负责人**: en-translator
**文件**: `frontend/src/i18n/locales/en.ts`

**要求**: 翻译 zh-CN.ts 中的所有文本为英文

**验收标准**:
- [ ] 所有 key 与 zh-CN.ts 一致
- [ ] 英文翻译准确自然
- [ ] 保持大小写规范

---

### 任务 1.6: 创建 I18nContext
**负责人**: i18n-context-creator
**文件**: `frontend/src/contexts/I18nContext.tsx`

**代码要求**:
```typescript
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}
```

**验收标准**:
- [ ] 支持语言切换
- [ ] 语言持久化到 localStorage
- [ ] 提供 t 翻译函数
- [ ] 页面加载时读取保存的语言

---

### 任务 1.7: 创建 useTranslation Hook
**负责人**: hook-creator
**文件**: `frontend/src/hooks/useTranslation.ts`

**代码要求**:
```typescript
export function useTranslation() {
  const { locale, t: translate } = useI18n();

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      // 实现插值逻辑
    },
    [translate]
  );

  return { t, locale };
}
```

**验收标准**:
- [ ] 支持参数插值
- [ ] 类型安全
- [ ] 性能优化（useCallback）

---

## 阶段 2: 组件改造 (第 2-4 轮)

### 任务 2.1: 改造核心布局组件
**负责人**: layout-refactor
**文件**:
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/ResizablePanel.tsx`

**改造内容**:
1. 替换所有 Tailwind 颜色类为 CSS 变量
2. 提取所有文本到翻译 key
3. 添加 useTheme 和 useTranslation hook

**验收标准**:
- [ ] 无硬编码颜色
- [ ] 无硬编码文本
- [ ] 主题切换正常
- [ ] 语言切换正常

---

### 任务 2.2: 改造会话列表组件
**负责人**: session-list-refactor
**文件**: `frontend/src/components/SessionList.tsx`

**颜色替换清单**:
| 行号 | 原值 | 替换为 |
|-----|------|-------|
| ~179 | title="刷新列表" | t('session.refreshList') |
| ~194 | title={showOnlyStarred ? '显示所有会话' : '只显示已收藏会话'} | t('session.showAll') / t('session.showStarredOnly') |
| ~203 | {showOnlyStarred ? '已收藏' : '全部'} | t('common.starred') / t('common.all') |
| ~305 | 清除筛选 | t('filter.clear') |
| ~534 | title="删除会话" | t('session.delete') |
| ~553 | 删除确认文本 | t('session.deleteConfirm', { name }) |

**验收标准**:
- [ ] 所有中文文本国际化
- [ ] 所有颜色主题化

---

### 任务 2.3: 改造团队列表组件
**负责人**: team-list-refactor
**文件**: `frontend/src/components/TeamList.tsx`

**改造清单**:
- [ ] 替换中文文本
- [ ] 替换颜色值
- [ ] 删除确认对话框文本

---

### 任务 2.4: 改造会话详情组件
**负责人**: session-detail-refactor
**文件**:
- `frontend/src/components/SessionDetail.tsx`
- `frontend/src/components/SessionDetail/components/*.tsx`

**详细改造点**:

#### SessionHeader.tsx
- [ ] "Session Details" → t('session.title')

#### SessionMeta.tsx
- [ ] "Project" → t('meta.project')
- [ ] "Messages" → t('meta.messages')
- [ ] "Last Active" → t('meta.lastActive')
- [ ] "Session ID" → t('meta.sessionId')
- [ ] 按钮 tooltip 文本

#### SessionActions.tsx
- [ ] "收藏" → t('common.star')
- [ ] "标签" → t('tag.title')
- [ ] "添加标签..." → t('tag.addTag')
- [ ] placeholder 文本

#### MessageItem.tsx
- [ ] 消息类型样式 → 使用 CSS 变量
- [ ] "New Task" → t('message.newTask')

**验收标准**:
- [ ] 所有子组件改造完成
- [ ] 无遗漏的硬编码文本

---

### 任务 2.5: 改造功能组件
**负责人**: feature-components-refactor
**文件**:
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/BatchActionBar.tsx`
- `frontend/src/components/ExportDialog.tsx`
- `frontend/src/components/SmartFilterBar.tsx`
- `frontend/src/components/TagSelector.tsx`
- `frontend/src/components/ConfirmDialog.tsx`

**CommandPalette.tsx**:
- [ ] "Type a command or search..." → t('commandPalette.placeholder')
- [ ] "Navigation", "Sessions", "Teams", "Actions", "Other" → t('commandPalette.*')
- [ ] "to navigate", "to select" → t('commandPalette.navigate'), t('commandPalette.select')

**BatchActionBar.tsx**:
- [ ] "{count} selected" → t('batch.selected', { count })
- [ ] "Select All" → t('batch.selectAll')
- [ ] "Export" / "Exporting..." → t('batch.export') / t('batch.exporting')
- [ ] "Delete" / "Deleting..." → t('batch.delete') / t('batch.deleting')
- [ ] "Clear selection" → t('batch.clearSelection')

**ExportDialog.tsx**:
- [ ] 所有中文文本
- [ ] 格式描述文本
- [ ] "已复制", "复制到剪贴板", "下载文件" 等

**SmartFilterBar.tsx**:
- [ ] 所有中文文本（大量）
- [ ] placeholder 文本
- [ ] 筛选条件相关文本

**TagSelector.tsx**:
- [ ] "最多 {max} 个标签" → t('tag.maxTags', { max })
- [ ] "创建标签 \"{name}\"" → t('tag.createTag', { name })
- [ ] "已有标签", "输入创建新标签"

---

### 任务 2.6: 改造可视化组件
**负责人**: viz-components-refactor
**文件**:
- `frontend/src/components/ActivityHeatmap.tsx`
- `frontend/src/components/ActivityTimeline.tsx`
- `frontend/src/components/TrendChart.tsx`
- `frontend/src/components/Dashboard.tsx`

**Dashboard.tsx**:
- [ ] "Total Sessions" → t('dashboard.totalSessions')
- [ ] "Total Projects" → t('dashboard.totalProjects')
- [ ] "Total Teams" → t('dashboard.totalTeams')
- [ ] "Total Messages" → t('dashboard.totalMessages')
- [ ] "Recent Sessions" → t('dashboard.recentSessions')
- [ ] "Recent Teams" → t('dashboard.recentTeams')
- [ ] "View all" → t('dashboard.viewAll')
- [ ] "Loading dashboard..." → t('dashboard.loading')
- [ ] "No recent sessions" → t('dashboard.noRecentSessions')
- [ ] "No teams yet" → t('dashboard.noTeams')
- [ ] "Empty Session" → t('session.emptySession')

**ActivityHeatmap.tsx**:
- [ ] "会话活跃度" → t('heatmap.title')
- [ ] "{count} 会话" → t('heatmap.sessions', { count })
- [ ] "{count} 活跃天数" → t('heatmap.activeDays', { count })
- [ ] "最多 {count}/天" → t('heatmap.maxPerDay', { count })
- [ ] "少", "多" → t('heatmap.less'), t('heatmap.more')

**ActivityTimeline.tsx**:
- [ ] "今天", "昨天", "本周", "更早" → t('timeline.*')
- [ ] "实时活动" → t('timeline.title')
- [ ] "暂无活动记录" → t('timeline.noActivity')
- [ ] "最近 {count} 条" → t('timeline.recentItems', { count })

**TrendChart.tsx**:
- [ ] "会话趋势" → t('trend.title')
- [ ] "总计: {count}" → t('trend.total', { count })
- [ ] "平均: {count}/天" → t('trend.average', { count })

---

### 任务 2.7: 改造 App.tsx
**负责人**: app-refactor
**文件**: `frontend/src/App.tsx`

**改造点**:
- [ ] 删除确认文本 → t('session.batchDeleteConfirm', { count })
- [ ] 批量删除错误 → t('session.batchDeleteError')
- [ ] 导出错误 → t('session.exportError')

---

## 阶段 3: 切换器组件 (第 5 轮)

### 任务 3.1: 创建主题切换器
**负责人**: theme-switcher-creator
**文件**: `frontend/src/components/ThemeSwitcher.tsx`

**设计要求**:
- 放置在 Sidebar 底部或设置面板
- 显示当前主题名称
- 点击展开主题选项
- 支持图标显示（深色/护眼图标）

**代码要求**:
```typescript
export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, currentTheme } = useTheme();

  return (
    <div className="theme-switcher">
      {/* 实现主题切换 UI */}
    </div>
  );
};
```

---

### 任务 3.2: 创建语言切换器
**负责人**: language-switcher-creator
**文件**: `frontend/src/components/LanguageSwitcher.tsx`

**设计要求**:
- 放置在 Sidebar 底部或设置面板
- 显示当前语言名称
- 点击展开语言选项
- 显示语言图标或缩写

---

## 阶段 4: 集成与测试 (第 6 轮)

### 任务 4.1: 在应用中集成切换器
**负责人**: integration-engineer
**文件**: `frontend/src/components/Sidebar.tsx` (修改)

**集成点**:
- [ ] 在 Sidebar 底部添加主题切换器
- [ ] 在 Sidebar 底部添加语言切换器
- [ ] 或者创建独立的 Settings 面板

---

### 任务 4.2: 性能优化
**负责人**: performance-optimizer

**优化点**:
- [ ] 使用 React.memo 避免不必要的重渲染
- [ ] 语言包按需加载（如果添加更多语言）
- [ ] CSS 变量避免重排重绘

---

### 任务 4.3: 编写测试
**负责人**: test-writer
**文件**:
- `frontend/src/contexts/__tests__/ThemeContext.test.tsx`
- `frontend/src/contexts/__tests__/I18nContext.test.tsx`
- `frontend/src/hooks/__tests__/useTranslation.test.ts`

**测试用例**:
- [ ] 主题切换测试
- [ ] 语言切换测试
- [ ] 翻译插值测试
- [ ] 持久化测试（localStorage）

---

### 任务 4.4: 端到端测试
**负责人**: e2e-tester
**文件**: `frontend/e2e/theming-i18n.spec.ts` (新建)

**测试场景**:
- [ ] 切换主题后所有组件颜色正确
- [ ] 切换语言后所有文本正确
- [ ] 刷新页面后设置保持
- [ ] 主题/语言切换器交互正常

---

## 阶段 5: 文档 (第 7 轮)

### 任务 5.1: 更新 README
**负责人**: doc-writer
**文件**: `README.md`

**添加内容**:
- [ ] 主题切换功能说明
- [ ] 语言切换功能说明
- [ ] 如何添加新主题
- [ ] 如何添加新语言

---

### 任务 5.2: 编写开发者文档
**负责人**: doc-writer
**文件**: `docs/i18n-guide.md`

**内容**:
- [ ] 翻译 key 命名规范
- [ ] 如何添加新的翻译文本
- [ ] 如何支持插值
- [ ] 类型安全最佳实践

---

## 依赖关系图

```
阶段 1: 基础架构
├── 1.1 主题配置
├── 1.2 CSS 变量
├── 1.3 ThemeContext
├── 1.4 中文语言包
├── 1.5 英文语言包
├── 1.6 I18nContext
└── 1.7 useTranslation
    │
    ▼
阶段 2: 组件改造
├── 2.1 布局组件
├── 2.2 会话列表
├── 2.3 团队列表
├── 2.4 会话详情
├── 2.5 功能组件
├── 2.6 可视化组件
└── 2.7 App.tsx
    │
    ▼
阶段 3: 切换器
├── 3.1 主题切换器
└── 3.2 语言切换器
    │
    ▼
阶段 4: 集成测试
├── 4.1 集成切换器
├── 4.2 性能优化
├── 4.3 单元测试
└── 4.4 E2E 测试
    │
    ▼
阶段 5: 文档
├── 5.1 README 更新
└── 5.2 开发者文档
```

---

## 时间估算

| 阶段 | 任务数 | 预估时间 |
|------|-------|---------|
| 阶段 1 | 7 | 2-3 天 |
| 阶段 2 | 7 | 4-5 天 |
| 阶段 3 | 2 | 1 天 |
| 阶段 4 | 4 | 2-3 天 |
| 阶段 5 | 2 | 1 天 |
| **总计** | **22** | **10-13 天** |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 颜色替换遗漏 | 中 | 建立颜色映射表，逐组件检查 |
| 翻译 key 不一致 | 中 | 使用 TypeScript 类型约束 |
| 主题切换闪烁 | 高 | 使用 CSS 变量 + transition |
| 语言切换重渲染 | 低 | 使用 React.memo 优化 |
| 测试覆盖不足 | 中 | 每个组件改造后补充测试 |
