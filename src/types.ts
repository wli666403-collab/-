export type ProjectStatus = 
  | 'pending_plan'     // 待企劃
  | 'plan_confirming'  // 企劃確認中
  | 'pending_edit'     // 待剪輯
  | 'edit_completed'   // 已剪輯完成
  | 'final_version'    // 終版
  | 'scheduled';       // 已排程

export type Priority = 'high' | 'medium' | 'low';
export type VideoType = 'knowledge' | 'sales' | 'behind_scenes' | 'unboxing' | 'other';

export interface Project {
  id: string;
  title: string;
  type: VideoType;
  platforms: string[];
  planner: string;
  editor: string;
  status: ProjectStatus;
  priority: Priority;
  estimatedPublishDate: string;
  actualPublishDate?: string;
  
  // Timestamps
  planCompletedTime?: string;
  confirmCompletedTime?: string;
  editCompletedTime?: string;
  finalCompletedTime?: string;
  scheduleCompletedTime?: string;
  
  notes: string;
  createdAt: number;
}

export const STATUS_FLOW: ProjectStatus[] = [
  'pending_plan',
  'plan_confirming',
  'pending_edit',
  'edit_completed',
  'final_version',
  'scheduled'
];
