export type UserRole =
  | 'CENTER_MANAGER'
  | 'ADMIN'
  | 'TEAM_LEAD'
  | 'COUNSELLOR'
  | 'FACULTY'
  | 'STUDENT';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  role_id: number;
  mobile?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  last_login?: string;
}

export interface Role {
  id: number;
  role_name: UserRole;
}

export interface Course {
  id: number;
  course_name: string;
  course_code: string;
  description: string;
  duration: string;
  status: 'ACTIVE' | 'INACTIVE';
  batch_count?: number;
  student_count?: number;
  exam_count?: number;
  created_at?: string;
}

export interface Batch {
  id: number;
  batch_name: string;
  batch_code: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  trainer_id: number;
  trainer_name?: string;
  trainer_email?: string;
  start_date: string;
  end_date?: string;
  timing: string;
  status: 'ACTIVE' | 'COMPLETED' | 'INACTIVE';
  student_count?: number;
  created_at?: string;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  email: string;
  mobile: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  batch_id: number;
  batch_name?: string;
  batch_code?: string;
  timing?: string;
  joining_date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  address?: string;
  registration_no: string;
  created_at?: string;
}

export interface Trainer {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile?: string;
  status: 'ACTIVE' | 'INACTIVE';
  active_batches_count?: number;
  exam_uploads_count?: number;
  created_at?: string;
  last_login?: string;
  assignedCourses?: {
    id: number;
    course_name: string;
    course_code: string;
  }[];
}

export interface Examination {
  id: number;
  exam_id: string;
  title: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  batch_id: number;
  batch_name?: string;
  batch_code?: string;
  timing?: string;
  trainer_id: number;
  trainer_name?: string;
  trainer_email?: string;
  trainer_mobile?: string;
  subject: string;
  exam_type: string;
  exam_date: string;
  duration: string;
  total_marks: number;
  number_of_questions: number;
  instructions?: string;
  additional_notes?: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  updated_at?: string;
}

export interface NotificationItem {
  id: number;
  user_id?: number;
  target_role: string;
  examination_id?: number;
  exam_id?: string;
  exam_title?: string;
  title: string;
  message: string;
  is_read: number; // 0 or 1
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  action: string;
  description: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  role: UserRole;
  totalStudents?: number;
  totalTrainers?: number;
  totalCourses?: number;
  totalBatches?: number;
  totalExaminations?: number;
  uploadedPapers?: number;
  activeBatches?: number;
  recentUploads?: Examination[];
  recentActivities?: ActivityLog[];
  courseStats?: {
    id: number;
    course_name: string;
    course_code: string;
    student_count: number;
    exam_count: number;
  }[];
  assignedCourses?: Course[];
  assignedBatches?: Batch[];
}

export interface ReportData {
  courseReports: {
    id: number;
    course_name: string;
    course_code: string;
    duration: string;
    total_students: number;
    total_batches: number;
    total_examinations: number;
  }[];
  batchReports: {
    id: number;
    batch_name: string;
    batch_code: string;
    timing: string;
    start_date: string;
    status: string;
    course_name: string;
    trainer_name: string;
    student_count: number;
    exam_count: number;
  }[];
  trainerReports: {
    id: number;
    trainer_name: string;
    email: string;
    mobile: string;
    status: string;
    assigned_batches: number;
    total_uploaded_exams: number;
    last_exam_upload?: string;
  }[];
  monthlyUploads: {
    month: string;
    count: number;
  }[];
}


export interface OnlineExamQuestion {
  id?: number;
  topic: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option?: string;
  marks: number;
  question_order?: number;
}

export interface OnlineExamAssignment {
  id: number;
  student_id: number;
  student_code: string;
  student_name: string;
  student_email: string;
  student_mobile: string;
  access_token: string;
  exam_link: string;
  attempt_status?: string;
  score?: number;
}

export interface OnlineExam {
  id: number;
  exam_code: string;
  title: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  batch_id: number;
  batch_name?: string;
  batch_code?: string;
  trainer_id: number;
  trainer_name?: string;
  topics: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  instructions?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  question_count?: number;
  assignment_count?: number;
  completed_count?: number;
  created_at: string;
  assignments?: OnlineExamAssignment[];
}
