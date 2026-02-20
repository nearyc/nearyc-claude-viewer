# Claude Viewer 移动端适配开发计划

## 分支
`feat/mobile-adaptation`

## 技术栈分析
- **框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4.x
- **构建**: Vite 7.x
- **状态**: React Hooks (useState, useContext)
- **WebSocket**: 实时数据更新

## 当前布局结构
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (15%)  │  Middle Panel (35-45%)  │  Right Panel   │
│  - Navigation   │  - SessionList          │  - SessionDetail│
│  - Projects     │  - TeamList             │  - Dashboard   │
│  - Stats        │  - MemberList           │  - MessagePanel│
└─────────────────────────────────────────────────────────┘
```

## 移动端适配方案

### 断点定义
```css
/* Tailwind 默认断点 */
sm: 640px   /* 小屏手机 */
md: 768px   /* 大屏手机/平板 */
lg: 1024px  /* 平板/小桌面 */
xl: 1280px  /* 桌面 */
```

### Phase 1: 核心布局改造 (最高优先级)

#### Task 1.1: Mobile Layout 组件
**文件**: `src/components/Layout.tsx`
**描述**: 创建响应式布局，移动端使用单栏 + 底部导航
**改动**:
- 添加 `isMobile` 状态检测 (useMediaQuery 或 window.matchMedia)
- 桌面端：保持三栏布局
- 移动端：
  - 单栏显示当前激活面板
  - 底部固定导航栏 (Dashboard/Sessions/Teams)
  - 侧边栏变为抽屉式 (从左侧滑出)

#### Task 1.2: Mobile Navigation 组件
**新文件**: `src/components/MobileBottomNav.tsx`
**描述**: 移动端底部导航栏
**功能**:
- 4个标签: Dashboard, Sessions, Teams, More
- 当前选中高亮
- 徽章显示 (未读消息数)

#### Task 1.3: Mobile Drawer 组件
**新文件**: `src/components/MobileDrawer.tsx`
**描述**: 移动端侧边抽屉 (替代 Sidebar)
**功能**:
- 从左侧滑出
- 遮罩层点击关闭
- 包含: 导航、项目选择、主题切换、语言切换

### Phase 2: 页面组件适配

#### Task 2.1: SessionList 移动端适配
**文件**: `src/components/SessionList.tsx`
**改动**:
- 缩小列表项高度 (从 py-3 到 py-2)
- 简化元信息显示 (只显示时间和消息数)
- 添加滑动删除手势
- 批量选择模式改为浮动按钮

#### Task 2.2: SessionDetail 移动端适配
**文件**: `src/components/SessionDetail.tsx`
**改动**:
- 添加返回按钮 (返回 SessionList)
- 全屏显示
- 消息气泡优化宽度 (max-w-[85%])
- 底部输入区域固定

#### Task 2.3: Dashboard 移动端适配
**文件**: `src/components/Dashboard.tsx`
**改动**:
- 统计卡片改为2列网格 (md:grid-cols-2)
- 图表高度减少
- 最近会话列表简化

#### Task 2.4: Teams 页面移动端适配
**文件**: `src/components/TeamList.tsx`, `MemberList.tsx`, `MessagePanel.tsx`
**改动**:
- 三栏布局改为三级导航
- TeamList → 选择 Team → 显示 MemberList → 选择 Member → 显示 MessagePanel
- 添加面包屑导航

### Phase 3: 交互优化

#### Task 3.1: Touch 手势支持
**新文件**: `src/hooks/useSwipe.ts`
**功能**:
- 左滑返回
- 右滑打开抽屉
- 列表项滑动操作

#### Task 3.2: 触摸优化
**全局样式**:
- 按钮最小点击区域 44x44px
- 增加间距防止误触
- 禁用 hover 效果 (移动端用 active)

#### Task 3.3: 视口优化
**文件**: `index.html`
**改动**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### Phase 4: 主题和细节

#### Task 4.1: 移动端主题变量
**文件**: `src/styles/themes/*.ts`
**改动**:
- 调整移动端字体大小
- 调整间距变量

#### Task 4.2: 安全区域适配
**文件**: `src/index.css`
**改动**:
```css
/* 适配刘海屏 */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

## 文件创建清单

### 新文件
1. `src/components/MobileBottomNav.tsx` - 底部导航
2. `src/components/MobileDrawer.tsx` - 侧边抽屉
3. `src/hooks/useMediaQuery.ts` - 响应式断点检测
4. `src/hooks/useSwipe.ts` - 滑动手势
5. `src/contexts/MobileContext.tsx` - 移动端状态管理

### 修改文件
1. `src/components/Layout.tsx` - 核心布局
2. `src/components/Sidebar.tsx` - 适配移动端隐藏
3. `src/components/SessionList.tsx` - 列表适配
4. `src/components/SessionDetail.tsx` - 详情适配
5. `src/components/Dashboard.tsx` - 仪表板适配
6. `src/components/TeamList.tsx` - 团队列表适配
7. `src/components/MemberList.tsx` - 成员列表适配
8. `src/components/MessagePanel.tsx` - 消息面板适配
9. `src/index.css` - 全局样式
10. `index.html` - viewport 配置

## 开发顺序

### Wave 1: 基础布局 (并行)
- Agent A: Layout + MobileBottomNav + useMediaQuery
- Agent B: MobileDrawer + MobileContext

### Wave 2: 页面适配 (并行)
- Agent C: SessionList + SessionDetail
- Agent D: Dashboard + Teams (TeamList, MemberList, MessagePanel)

### Wave 3: 交互优化 (并行)
- Agent E: Touch gestures + 样式优化
- Agent F: 主题适配 + 测试修复

## 测试要点
- [ ] iOS Safari 测试
- [ ] Android Chrome 测试
- [ ] 横竖屏切换
- [ ] 手势操作流畅度
- [ ] 底部导航固定性
- [ ] 抽屉滑出流畅度
