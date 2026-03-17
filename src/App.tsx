import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Scissors, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Search,
  ArrowRight,
  Kanban as KanbanIcon,
  BarChart3,
  List as ListIcon,
  AlertCircle,
  TrendingUp,
  Filter,
  ChevronDown,
  X,
  CalendarDays,
  Tag,
  User,
  ExternalLink,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Project, 
  ProjectStatus, 
  Priority, 
  VideoType, 
  STATUS_FLOW 
} from './types';
import { 
  format, 
  parseISO, 
  isAfter, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  subWeeks,
  differenceInDays
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEY = 'short_video_workflow_v2';

const VIDEO_TYPES: { id: VideoType; label: string }[] = [
  { id: 'knowledge', label: '知識型' },
  { id: 'sales', label: '銷售型' },
  { id: 'behind_scenes', label: '花絮' },
  { id: 'unboxing', label: '開箱' },
  { id: 'other', label: '其他' },
];

const PLATFORMS = ['IG', 'TikTok', 'YouTube Shorts', 'Facebook Reels'];

const PRIORITY_MAP: Record<Priority, { label: string; color: string }> = {
  high: { label: '高', color: 'text-red-600 bg-red-50 border-red-100' },
  medium: { label: '中', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  low: { label: '低', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
};

const STATUS_MAP: Record<ProjectStatus, { label: string; color: string; icon: any }> = {
  pending_plan: { label: '待企劃', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
  plan_confirming: { label: '企劃確認中', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  pending_edit: { label: '待剪輯', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Scissors },
  edit_completed: { label: '已剪輯完成', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: CheckCircle2 },
  final_version: { label: '終版', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: LayoutDashboard },
  scheduled: { label: '已排程', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Calendar },
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<'list' | 'kanban' | 'stats'>('kanban');
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'estimated' | 'created'>('estimated');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initial dummy data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      const initial: Project[] = [
        {
          id: '1',
          title: '2024 春季穿搭指南',
          type: 'knowledge',
          platforms: ['IG', 'TikTok'],
          planner: 'Alice',
          editor: 'Bob',
          status: 'pending_plan',
          priority: 'high',
          estimatedPublishDate: format(new Date(), 'yyyy-MM-dd'),
          notes: '需要強調色彩搭配',
          createdAt: Date.now(),
        },
        {
          id: '2',
          title: 'iPhone 15 Pro 開箱',
          type: 'unboxing',
          platforms: ['YouTube Shorts'],
          planner: 'Charlie',
          editor: 'Dave',
          status: 'pending_edit',
          priority: 'medium',
          estimatedPublishDate: format(new Date(), 'yyyy-MM-dd'),
          notes: '著重在相機測試',
          createdAt: Date.now() - 86400000,
        }
      ];
      setProjects(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesTab = activeTab === 'all' || p.status === activeTab;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.planner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             p.editor.toLowerCase().includes(searchQuery.toLowerCase());
        
        const isDelayed = isAfter(new Date(), parseISO(p.estimatedPublishDate)) && p.status !== 'scheduled';
        const matchesDelayed = !showDelayedOnly || isDelayed;

        return matchesTab && matchesSearch && matchesDelayed;
      })
      .sort((a, b) => {
        if (sortBy === 'estimated') {
          return a.estimatedPublishDate.localeCompare(b.estimatedPublishDate);
        }
        return b.createdAt - a.createdAt;
      });
  }, [projects, activeTab, searchQuery, sortBy, showDelayedOnly]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisWeek = { start: startOfWeek(now), end: endOfWeek(now) };
    
    const weeklyOutput = projects.filter(p => 
      p.status === 'scheduled' && 
      p.scheduleCompletedTime && 
      isWithinInterval(parseISO(p.scheduleCompletedTime), thisWeek)
    ).length;

    const bottleneckCounts = STATUS_FLOW.reduce((acc, status) => {
      acc[status] = projects.filter(p => p.status === status).length;
      return acc;
    }, {} as Record<ProjectStatus, number>);

    const delayedItems = projects.filter(p => {
      if (p.status === 'scheduled') return false;
      return isAfter(now, parseISO(p.estimatedPublishDate));
    });

    return { weeklyOutput, bottleneckCounts, delayedItems };
  }, [projects]);

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newProject: Project = {
      id: Math.random().toString(36).substring(2, 11),
      title: formData.get('title') as string,
      type: formData.get('type') as VideoType,
      platforms: formData.getAll('platforms') as string[],
      planner: formData.get('planner') as string,
      editor: formData.get('editor') as string,
      status: 'pending_plan',
      priority: formData.get('priority') as Priority,
      estimatedPublishDate: formData.get('estimatedPublishDate') as string,
      actualPublishDate: '',
      planCompletedTime: '',
      confirmCompletedTime: '',
      editCompletedTime: '',
      finalCompletedTime: '',
      scheduleCompletedTime: '',
      notes: (formData.get('notes') as string) || '',
      createdAt: Date.now(),
    };

    setProjects(prev => [newProject, ...prev]);
    setIsAddModalOpen(false);
    console.log('Project added successfully:', newProject);
  };

  const handleUpdateProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const formData = new FormData(e.currentTarget);
    const newStatus = formData.get('status') as ProjectStatus;
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    
    const updatedProject: Project = {
      ...selectedProject,
      title: formData.get('title') as string,
      type: formData.get('type') as VideoType,
      platforms: Array.from(formData.getAll('platforms')) as string[],
      planner: formData.get('planner') as string,
      editor: formData.get('editor') as string,
      priority: formData.get('priority') as Priority,
      estimatedPublishDate: formData.get('estimatedPublishDate') as string,
      notes: formData.get('notes') as string,
      status: newStatus,
    };

    // If status changed, update timestamps
    if (newStatus !== selectedProject.status) {
      if (newStatus === 'plan_confirming' && !updatedProject.planCompletedTime) updatedProject.planCompletedTime = now;
      if (newStatus === 'pending_edit' && !updatedProject.confirmCompletedTime) updatedProject.confirmCompletedTime = now;
      if (newStatus === 'edit_completed' && !updatedProject.editCompletedTime) updatedProject.editCompletedTime = now;
      if (newStatus === 'final_version' && !updatedProject.finalCompletedTime) updatedProject.finalCompletedTime = now;
      if (newStatus === 'scheduled') {
        if (!updatedProject.scheduleCompletedTime) updatedProject.scheduleCompletedTime = now;
        if (!updatedProject.actualPublishDate) updatedProject.actualPublishDate = format(new Date(), 'yyyy-MM-dd');
      }
    }
    
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
    setIsEditing(false);
  };

  const moveProject = (id: string, newStatus: ProjectStatus) => {
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const updated = { ...p, status: newStatus };
      if (newStatus === 'plan_confirming') updated.planCompletedTime = now;
      if (newStatus === 'pending_edit') updated.confirmCompletedTime = now;
      if (newStatus === 'edit_completed') updated.editCompletedTime = now;
      if (newStatus === 'final_version') updated.finalCompletedTime = now;
      if (newStatus === 'scheduled') {
        updated.scheduleCompletedTime = now;
        updated.actualPublishDate = format(new Date(), 'yyyy-MM-dd');
      }
      return updated;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#1E293B] font-sans">
      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isMobileMenuOpen || true) && (
          <motion.aside 
            initial={false}
            animate={{ x: isMobileMenuOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -256 : 0) }}
            className={cn(
              "fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform lg:translate-x-0",
              !isMobileMenuOpen && "max-lg:-translate-x-full"
            )}
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <LayoutDashboard className="text-white w-6 h-6" />
                </div>
                <span className="font-bold text-lg tracking-tight">短影音管理</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
              {[
                { id: 'kanban', label: '看板視圖', icon: KanbanIcon },
                { id: 'list', label: '列表清單', icon: ListIcon },
                { id: 'stats', label: '數據統計', icon: BarChart3 },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                    view === item.id 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-6 mt-auto border-t border-gray-100">
              <div className="bg-indigo-600 rounded-2xl p-4 text-white">
                <p className="text-xs opacity-80 mb-1">本週產出</p>
                <p className="text-2xl font-bold">{stats.weeklyOutput} 支影片</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] bg-white/20 rounded-lg p-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>較上週增長 12%</span>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <ListIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold hidden sm:block">
              {view === 'kanban' ? '看板視圖' : view === 'list' ? '列表清單' : '數據統計'}
            </h2>
            <div className="h-6 w-[1px] bg-gray-200 mx-2 hidden sm:block" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜尋影片主題或負責人..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all w-40 sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新增企劃</span>
              <span className="sm:hidden">新增</span>
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {/* Filters & Sorting Bar */}
          {view !== 'stats' && (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                    activeTab === 'all' ? "bg-indigo-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-indigo-300"
                  )}
                >
                  全部
                </button>
                {STATUS_FLOW.map(status => (
                  <button 
                    key={status}
                    onClick={() => setActiveTab(status)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                      activeTab === status ? "bg-indigo-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-indigo-300"
                    )}
                  >
                    {STATUS_MAP[status].label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowDelayedOnly(!showDelayedOnly)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                    showDelayedOnly ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-gray-500 border-gray-200"
                  )}
                >
                  <AlertCircle className="w-4 h-4" />
                  僅看延遲
                </button>

                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1">
                  <button 
                    onClick={() => setSortBy('estimated')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      sortBy === 'estimated' ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    按日期
                  </button>
                  <button 
                    onClick={() => setSortBy('created')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      sortBy === 'created' ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    按建立
                  </button>
                </div>
              </div>
            </div>
          )}
          {view === 'kanban' && (
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
              {STATUS_FLOW.map((status) => (
                <div key={status} className="flex-shrink-0 w-80 snap-start">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", STATUS_MAP[status].color.split(' ')[0])} />
                      <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">
                        {STATUS_MAP[status].label}
                      </h3>
                      <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {projects.filter(p => p.status === status).length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 min-h-[calc(100vh-250px)] bg-gray-100/50 rounded-2xl p-3 border border-dashed border-gray-300">
                    <AnimatePresence mode="popLayout">
                      {projects
                        .filter(p => p.status === status)
                        .map((project) => (
                          <motion.div
                            key={project.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 group hover:border-indigo-300 transition-all cursor-pointer"
                            onClick={() => setSelectedProject(project)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", PRIORITY_MAP[project.priority].color)}>
                                {PRIORITY_MAP[project.priority].label}
                              </span>
                              <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600" title={`企劃: ${project.planner}`}>
                                  {project.planner[0]}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-purple-600" title={`剪輯: ${project.editor}`}>
                                  {project.editor[0]}
                                </div>
                              </div>
                            </div>

                            <h4 className="font-bold text-sm mb-2 group-hover:text-indigo-600 transition-colors">{project.title}</h4>
                            
                            <div className="flex flex-wrap gap-1 mb-4">
                              {project.platforms.map(p => (
                                <span key={p} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {p}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                <CalendarDays className="w-3 h-3" />
                                <span className={cn(
                                  isAfter(new Date(), parseISO(project.estimatedPublishDate)) && project.status !== 'scheduled' 
                                    ? "text-red-500 font-bold" 
                                    : ""
                                )}>
                                  {project.estimatedPublishDate}
                                </span>
                              </div>
                              
                              <div className="flex gap-1">
                                {STATUS_FLOW.indexOf(status) > 0 && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveProject(project.id, STATUS_FLOW[STATUS_FLOW.indexOf(status) - 1]);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-400"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {STATUS_FLOW.indexOf(status) < STATUS_FLOW.length - 1 && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveProject(project.id, STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1]);
                                    }}
                                    className="p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'list' && (
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">影片主題</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">類型</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">負責人</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">狀態</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">優先級</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">預計發佈</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{p.title}</span>
                            <div className="flex gap-1 mt-1">
                              {p.platforms.map(plat => (
                                <span key={plat} className="text-[9px] text-gray-400">{plat}</span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-600">
                            {VIDEO_TYPES.find(t => t.id === p.type)?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">企劃: {p.planner}</span>
                              <span className="text-[10px] text-gray-400">剪輯: {p.editor}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", STATUS_MAP[p.status].color)}>
                            {STATUS_MAP[p.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", PRIORITY_MAP[p.priority].color)}>
                            {PRIORITY_MAP[p.priority].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-xs font-medium",
                              isAfter(new Date(), parseISO(p.estimatedPublishDate)) && p.status !== 'scheduled' ? "text-red-500" : ""
                            )}>
                              {p.estimatedPublishDate}
                            </span>
                            {p.actualPublishDate && (
                              <span className="text-[10px] text-emerald-500">實: {p.actualPublishDate}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setSelectedProject(p)}
                            className="p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'stats' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-500 text-sm">本週產出</h3>
                  </div>
                  <p className="text-4xl font-black">{stats.weeklyOutput}</p>
                  <p className="text-xs text-gray-400 mt-2">支影片已排程發佈</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-500 text-sm">延遲項目</h3>
                  </div>
                  <p className="text-4xl font-black text-red-500">{stats.delayedItems.length}</p>
                  <p className="text-xs text-gray-400 mt-2">超過預計發佈日期</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-500 text-sm">總專案數</h3>
                  </div>
                  <p className="text-4xl font-black">{projects.length}</p>
                  <p className="text-xs text-gray-400 mt-2">目前系統內所有專案</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold mb-8 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    各階段卡關數量
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={STATUS_FLOW.map(s => ({ name: STATUS_MAP[s].label, count: stats.bottleneckCounts[s] }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                        <Tooltip 
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                          {STATUS_FLOW.map((s, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366F1' : '#818CF8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold mb-8 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-600" />
                    影片類型分佈
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={VIDEO_TYPES.map(t => ({ 
                            name: t.label, 
                            value: projects.filter(p => p.type === t.id).length 
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {VIDEO_TYPES.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Project Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black tracking-tight">建立新影片企劃</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">影片主題 <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        name="title"
                        type="text" 
                        placeholder="輸入吸引人的影片標題..."
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">影片類型</label>
                      <select name="type" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium">
                        {VIDEO_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">優先順序</label>
                      <select name="priority" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">企劃負責人 <span className="text-red-500">*</span></label>
                      <input required name="planner" type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">剪輯負責人 <span className="text-red-500">*</span></label>
                      <input required name="editor" type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">預計發佈日期 <span className="text-red-500">*</span></label>
                      <input required name="estimatedPublishDate" type="date" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">發佈平台 (複選)</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PLATFORMS.map(p => (
                          <label key={p} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all">
                            <input type="checkbox" name="platforms" value={p} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-xs font-bold">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">備註 / 回饋</label>
                      <textarea name="notes" rows={3} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium" />
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      取消
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                    >
                      確認建立
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Detail Sidebar */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold border", STATUS_MAP[selectedProject.status].color)}>
                  {STATUS_MAP[selectedProject.status].label}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      isEditing ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-500"
                    )}
                  >
                    {isEditing ? <X className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { setSelectedProject(null); setIsEditing(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProject} className="space-y-6">
                  <h2 className="text-2xl font-black mb-6">編輯專案</h2>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">影片主題</label>
                    <input 
                      required 
                      name="title"
                      type="text" 
                      defaultValue={selectedProject.title}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">影片類型</label>
                      <select name="type" defaultValue={selectedProject.type} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm">
                        {VIDEO_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">當前狀態</label>
                      <select name="status" defaultValue={selectedProject.status} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm">
                        {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">優先順序</label>
                      <select name="priority" defaultValue={selectedProject.priority} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">預計發佈日期</label>
                      <input required name="estimatedPublishDate" type="date" defaultValue={selectedProject.estimatedPublishDate} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">企劃負責人</label>
                      <input required name="planner" type="text" defaultValue={selectedProject.planner} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">剪輯負責人</label>
                      <input required name="editor" type="text" defaultValue={selectedProject.editor} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">發佈平台</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PLATFORMS.map(p => (
                        <label key={p} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all">
                          <input type="checkbox" name="platforms" value={p} defaultChecked={selectedProject.platforms.includes(p)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-xs font-bold">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">備註 / 回饋</label>
                    <textarea name="notes" rows={3} defaultValue={selectedProject.notes} className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium" />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">取消</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100">儲存修改</button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="text-2xl font-black mb-2">{selectedProject.title}</h2>
                  <p className="text-gray-500 text-sm mb-8">{selectedProject.notes}</p>

                  <div className="space-y-6">
                    <section>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">流程時間紀錄</h3>
                      <div className="space-y-4">
                        {[
                          { label: '企劃完成', time: selectedProject.planCompletedTime },
                          { label: '確認完成', time: selectedProject.confirmCompletedTime },
                          { label: '剪輯完成', time: selectedProject.editCompletedTime },
                          { label: '終版完成', time: selectedProject.finalCompletedTime },
                          { label: '排程完成', time: selectedProject.scheduleCompletedTime },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              item.time ? "bg-indigo-500" : "bg-gray-200"
                            )} />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-600">{item.label}</span>
                              <span className="text-xs text-gray-400 font-mono">
                                {item.time ? format(parseISO(item.time), 'yyyy/MM/dd HH:mm') : '尚未完成'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="pt-6 border-t border-gray-100">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">專案資訊</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-2xl">
                          <p className="text-[10px] text-gray-400 font-bold mb-1">預計發佈</p>
                          <p className="text-sm font-bold">{selectedProject.estimatedPublishDate}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl">
                          <p className="text-[10px] text-gray-400 font-bold mb-1">實際發佈</p>
                          <p className="text-sm font-bold text-emerald-600">{selectedProject.actualPublishDate || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl">
                          <p className="text-[10px] text-gray-400 font-bold mb-1">延遲天數</p>
                          <p className="text-sm font-bold text-red-500">
                            {selectedProject.actualPublishDate 
                              ? Math.max(0, differenceInDays(parseISO(selectedProject.actualPublishDate), parseISO(selectedProject.estimatedPublishDate)))
                              : isAfter(new Date(), parseISO(selectedProject.estimatedPublishDate)) && selectedProject.status !== 'scheduled'
                                ? differenceInDays(new Date(), parseISO(selectedProject.estimatedPublishDate))
                                : 0
                            } 天
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl">
                          <p className="text-[10px] text-gray-400 font-bold mb-1">影片類型</p>
                          <p className="text-sm font-bold">{VIDEO_TYPES.find(t => t.id === selectedProject.type)?.label}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="mt-12">
                    <button 
                      onClick={() => {
                        setProjects(projects.filter(p => p.id !== selectedProject.id));
                        setSelectedProject(null);
                      }}
                      className="w-full py-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-2xl transition-all"
                    >
                      刪除此專案
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
