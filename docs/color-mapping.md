# 颜色映射表

## CSS 变量定义

### 背景色
| 变量名 | 深色主题 | 护眼主题 | 用途 |
|--------|---------|---------|------|
| `--bg-primary` | `#0f172a` | `#f5f0e6` | 主背景 |
| `--bg-secondary` | `#1e293b` | `#ebe4d6` | 次背景 |
| `--bg-tertiary` | `#334155` | `#ddd5c3` | 第三级背景 |
| `--bg-card` | `rgba(30, 41, 59, 0.8)` | `rgba(245, 240, 230, 0.9)` | 卡片背景 |
| `--bg-hover` | `rgba(51, 65, 85, 0.5)` | `rgba(221, 213, 195, 0.5)` | 悬停背景 |

### 文本色
| 变量名 | 深色主题 | 护眼主题 | 用途 |
|--------|---------|---------|------|
| `--text-primary` | `rgba(255, 255, 255, 0.95)` | `#4a453f` | 主要文本 |
| `--text-secondary` | `rgba(255, 255, 255, 0.75)` | `#6b655b` | 次要文本 |
| `--text-tertiary` | `rgba(255, 255, 255, 0.55)` | `#8a8476` | 第三级文本 |
| `--text-muted` | `rgba(255, 255, 255, 0.4)` | `#a8a094` | 弱化文本 |

### 边框色
| 变量名 | 深色主题 | 护眼主题 | 用途 |
|--------|---------|---------|------|
| `--border-primary` | `rgba(51, 65, 85, 0.8)` | `rgba(160, 150, 130, 0.5)` | 主边框 |
| `--border-secondary` | `rgba(71, 85, 105, 0.8)` | `rgba(180, 170, 150, 0.5)` | 次边框 |
| `--border-accent` | `rgba(100, 116, 139, 0.8)` | `rgba(140, 130, 110, 0.6)` | 强调边框 |

### 强调色
| 变量名 | 深色主题 | 护眼主题 | 用途 |
|--------|---------|---------|------|
| `--accent-blue` | `#3b82f6` | `#4a7c59` | 蓝色/主色 |
| `--accent-blue-light` | `#60a5fa` | `#5a9c6e` | 浅蓝 |
| `--accent-green` | `#10b981` | `#6b8e5e` | 绿色 |
| `--accent-amber` | `#f59e0b` | `#b8860b` | 琥珀色 |
| `--accent-red` | `#ef4444` | `#a0524a` | 红色 |
| `--accent-purple` | `#8b5cf6` | `#7a6b8a` | 紫色 |

### 滚动条
| 变量名 | 深色主题 | 护眼主题 |
|--------|---------|---------|
| `--scrollbar-track` | `#1e293b` | `#ebe4d6` |
| `--scrollbar-thumb` | `#475569` | `#c9c0ab` |
| `--scrollbar-thumb-hover` | `#64748b` | `#b0a692` |

---

## Tailwind 类映射

### 背景色
| Tailwind 类 | 替换为 |
|-------------|-------|
| `bg-gray-950` | `bg-[var(--bg-primary)]` |
| `bg-gray-900` | `bg-[var(--bg-secondary)]` |
| `bg-gray-800` | `bg-[var(--bg-tertiary)]` |
| `bg-gray-700` | `bg-[var(--bg-hover)]` |

### 文本色
| Tailwind 类 | 替换为 |
|-------------|-------|
| `text-gray-100` | `text-[var(--text-primary)]` |
| `text-gray-200` | `text-[var(--text-secondary)]` |
| `text-gray-300` | `text-[var(--text-secondary)]` |
| `text-gray-400` | `text-[var(--text-tertiary)]` |
| `text-gray-500` | `text-[var(--text-muted)]` |
| `text-gray-600` | `text-[var(--text-muted)]` |

### 边框色
| Tailwind 类 | 替换为 |
|-------------|-------|
| `border-gray-800` | `border-[var(--border-primary)]` |
| `border-gray-700` | `border-[var(--border-secondary)]` |
| `border-gray-600` | `border-[var(--border-accent)]` |

### 强调色（保持不变，通过 CSS 变量覆盖）
| Tailwind 类 | 替换为 |
|-------------|-------|
| `text-blue-400` | `text-[var(--accent-blue)]` |
| `text-green-400` | `text-[var(--accent-green)]` |
| `text-amber-400` | `text-[var(--accent-amber)]` |
| `text-red-400` | `text-[var(--accent-red)]` |
| `text-purple-400` | `text-[var(--accent-purple)]` |

---

## 组件颜色替换清单

### App.tsx
| 位置 | 当前值 | 替换为 |
|------|--------|-------|
| 成员颜色数组 | 硬编码 hex | 使用语义化 CSS 变量 |

### Dashboard.tsx
| 行号 | 当前值 | 替换为 |
|------|--------|-------|
| ~62 | `rgba(30, 41, 59, 0.5)` | `var(--bg-card)` |
| ~120 | `group-hover:text-gray-200` | `group-hover:text-[var(--text-primary)]` |
| ~170 | `group-hover:text-gray-200` | `group-hover:text-[var(--text-primary)]` |

### MessageItem.tsx
| 行号 | 当前值 | 替换为 |
|------|--------|-------|
| ~140 | `bg-amber-500/10 text-amber-400` | 使用语义化变量 |
| ~142-147 | 各种颜色类 | 使用语义化变量 |
| ~245 | `text-gray-300` | `text-[var(--text-secondary)]` |
| ~252 | `text-blue-400` | `text-[var(--accent-blue)]` |
| ~297 | `text-gray-500` | `text-[var(--text-muted)]` |

### SessionDetail 子组件
| 组件 | 位置 | 当前值 | 替换为 |
|------|------|--------|-------|
| ConversationView | ~43 | `border-gray-800/60` | `border-[var(--border-primary)]` |
| BookmarksList | ~19 | `bg-yellow-900/10` | 使用语义化变量 |
| NavButton | ~17 | `bg-blue-600/20` | 使用语义化变量 |
| NavigationBar | ~28 | `border-gray-800/60` | `border-[var(--border-primary)]` |
| SearchBar | ~23 | `border-gray-800/60` | `border-[var(--border-primary)]` |
| SessionMeta | ~118 | `border-gray-800/40` | `border-[var(--border-primary)]` |
| SessionActions | ~62 | `bg-gray-800` | `bg-[var(--bg-tertiary)]` |
| TimeDensityChart | ~44 | `border-gray-800/60` | `border-[var(--border-primary)]` |

### TagSelector.tsx
| 行号 | 当前值 | 替换为 |
|------|--------|-------|
| ~67-78 | rgba 颜色数组 | 主题化颜色数组 |

---

## 语义化颜色变量（新增建议）

```css
/* 状态色 */
--color-success: var(--accent-green);
--color-warning: var(--accent-amber);
--color-error: var(--accent-red);
--color-info: var(--accent-blue);

/* 消息类型背景 */
--bg-message-user: rgba(59, 130, 246, 0.1);
--bg-message-assistant: rgba(139, 92, 246, 0.1);
--bg-message-system: rgba(100, 116, 139, 0.1);

/* 消息类型文本 */
--text-message-user: var(--accent-blue);
--text-message-assistant: var(--accent-purple);
--text-message-system: var(--text-tertiary);

/* 标签颜色 */
--tag-blue-bg: rgba(59, 130, 246, 0.15);
--tag-blue-text: var(--accent-blue);
--tag-green-bg: rgba(16, 185, 129, 0.15);
--tag-green-text: var(--accent-green);
--tag-amber-bg: rgba(245, 158, 11, 0.15);
--tag-amber-text: var(--accent-amber);
--tag-red-bg: rgba(239, 68, 68, 0.15);
--tag-red-text: var(--accent-red);
--tag-purple-bg: rgba(139, 92, 246, 0.15);
--tag-purple-text: var(--accent-purple);
```

---

## 快速替换命令

### 使用 VS Code 全局替换

1. **背景色替换**
```regex
查找: bg-gray-950\b
替换: bg-[var(--bg-primary)]

查找: bg-gray-900\b
替换: bg-[var(--bg-secondary)]

查找: bg-gray-800\b
替换: bg-[var(--bg-tertiary)]
```

2. **文本色替换**
```regex
查找: text-gray-100\b
替换: text-[var(--text-primary)]

查找: text-gray-300\b
替换: text-[var(--text-secondary)]

查找: text-gray-400\b
替换: text-[var(--text-tertiary)]

查找: text-gray-500\b
替换: text-[var(--text-muted)]
```

3. **边框色替换**
```regex
查找: border-gray-800\b
替换: border-[var(--border-primary)]

查找: border-gray-700\b
替换: border-[var(--border-secondary)]

查找: border-gray-600\b
替换: border-[var(--border-accent)]
```

4. **强调色替换**
```regex
查找: text-blue-400\b
替换: text-[var(--accent-blue)]

查找: text-green-400\b
替换: text-[var(--accent-green)]

查找: text-amber-400\b
替换: text-[var(--accent-amber)]

查找: text-red-400\b
替换: text-[var(--accent-red)]

查找: text-purple-400\b
替换: text-[var(--accent-purple)]
```

---

## 注意事项

1. **透明度处理**：Tailwind 的 `bg-gray-900/80` 需要改为 `bg-[var(--bg-secondary)]/80`

2. **渐变和阴影**：保持使用 CSS 变量，例如：
   ```css
   background: linear-gradient(to right, var(--bg-primary), var(--bg-secondary));
   box-shadow: 0 2px 8px var(--border-primary);
   ```

3. **hover 状态**：使用 CSS 变量配合透明度
   ```css
   .hover-lift:hover {
     background-color: var(--bg-hover);
   }
   ```

4. **成员颜色**：建议使用固定颜色数组，但每个颜色应适配当前主题
