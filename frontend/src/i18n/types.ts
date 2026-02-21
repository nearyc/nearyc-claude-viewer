// 翻译 Schema 类型定义
export interface TranslationSchema extends Record<string, unknown> {
  common: {
    confirm: string;
    cancel: string;
    delete: string;
    save: string;
    clear: string;
    search: string;
    copy: string;
    copied: string;
    download: string;
    export: string;
    exporting: string;
    deleting: string;
    loading: string;
    refresh: string;
    edit: string;
    add: string;
    create: string;
    close: string;
    selectAll: string;
    clearSelection: string;
    viewAll: string;
    more: string;
    less: string;
    all: string;
    none: string;
    hide: string;
    show: string;
    project: string;
    name: string;
  };
  navigation: {
    dashboard: string;
    sessions: string;
    agentTeams: string;
    projects: string;
    connected: string;
    disconnected: string;
    top: string;
    bottom: string;
    prevInput: string;
    nextOutput: string;
    newMessages: string;
  };
  session: {
    title: string;
    emptySession: string;
    deleteConfirm: string;
    deleteSingleConfirm: string;
    deleteError: string;
    batchDeleteError: string;
    exportError: string;
    copySessionId: string;
    openInClaude: string;
    openInVSCode: string;
    customName: {
      add: string;
      edit: string;
      placeholder: string;
      save: string;
      star: string;
    };
    inputs: string;
    inputsWithCount: string;
    messages: string;
    sessionDetails: string;
    partialDataNotice: string;
    updating: string;
    receivingUpdates: string;
    conversation: string;
    noInputs: string;
    empty: string;
    selectSession: string;
    loadFullConversation: string;
    showingRecentMessages: string;
  };
  team: {
    title: string;
    members: string;
    messages: string;
    deleteConfirm: string;
    deleteError: string;
    noTeams: string;
    customNamePlaceholder: string;
    editName: string;
    starTeam: string;
    deleteTeam: string;
    deleteTitle: string;
    deleteConfirmMessage: string;
    membersWithCount: string;
  };
  filter: {
    title: string;
    searchPlaceholder: string;
    saved: string;
    noSavedFilters: string;
    saveFilter: string;
    saveFilterTitle: string;
    filterNamePlaceholder: string;
    willSaveFilters: string;
    clearFilters: string;
    filtered: string;
    allProjects: string;
    search: string;
    tag: string;
    project: string;
    showOnlyStarred: string;
    showAll: string;
    setFiltersFirst: string;
    alreadyExists: string;
    clickToApply: string;
  };
  export: {
    title: string;
    selectFormat: string;
    options: string;
    includeMetadata: string;
    includeTimestamps: string;
    copyToClipboard: string;
    downloadFile: string;
    format: {
      markdown: string;
      markdownDesc: string;
      json: string;
      jsonDesc: string;
      html: string;
      htmlDesc: string;
    };
    preview: string;
    previewTruncated: string;
  };
  tag: {
    title: string;
    add: string;
    createTag: string;
    existingTags: string;
    createNewTag: string;
    maxTags: string;
    tags: string;
  };
  commandPalette: {
    placeholder: string;
    navigation: string;
    actions: string;
    other: string;
    sessions: string;
    teams: string;
    toNavigate: string;
    toSelect: string;
    commandCount: string;
    noResults: string;
  };
  activity: {
    title: string;
    realTime: string;
    trend: string;
    total: string;
    average: string;
    sessionsCount: string;
    activeDays: string;
    maxPerDay: string;
    less: string;
    more: string;
    today: string;
    yesterday: string;
    thisWeek: string;
    earlier: string;
    noActivity: string;
    recentCount: string;
    activity: string;
  };
  dashboard: {
    totalSessions: string;
    totalProjects: string;
    totalTeams: string;
    totalMessages: string;
    recentSessions: string;
    recentTeams: string;
  };
  empty: {
    noSessions: string;
    noTeams: string;
    noRecentSessions: string;
    noSearchResults: string;
    loadingDashboard: string;
  };
  table: {
    messages: string;
    lastActive: string;
    project: string;
    sessionId: string;
  };
  status: {
    selected: string;
    connected: string;
    disconnected: string;
  };
  panel: {
    expand: string;
    collapse: string;
  };
  message: {
    title: string;
    user: string;
    assistant: string;
    system: string;
    emptyTitle: string;
    emptyDescription: string;
    selectTeam: string;
    selectMember: string;
    noMessages: string;
    noMatchFilters: string;
    clearFilters: string;
    filter: string;
    searchPlaceholder: string;
    messagesCount: string;
    showingCount: string;
    allTypes: string;
    typeStatus: string;
    typeUpdates: string;
    typeTasks: string;
    typeSystem: string;
    typeMessages: string;
    agentIsNow: string;
    shutdownApproved: string;
    newTask: string;
    now: string;
    showMore: string;
    showLess: string;
  };
  time: {
    today: string;
    yesterday: string;
    day: string;
  };
  settings: {
    theme: string;
    language: string;
  };
  theme: {
    dark: string;
    eyeCare: string;
    lightEyeCare: string;
  };
}

// 语言类型
export type Language = 'zh-CN' | 'en';

// 语言配置
export const LANGUAGE_CONFIG: Record<Language, { name: string; flag: string }> = {
  'zh-CN': { name: '简体中文', flag: '🇨🇳' },
  'en': { name: 'English', flag: '🇺🇸' },
};

// 递归生成所有路径的类型
export type TranslationKey<T extends Record<string, unknown> = TranslationSchema> =
  T extends object
    ? {
        [K in keyof T]: K extends string
          ? T[K] extends Record<string, unknown>
            ? `${K}.${TranslationKey<T[K]>}`
            : K
          : never;
      }[keyof T]
    : never;

// 翻译函数参数类型
export type InterpolationValues = Record<string, string | number>;
