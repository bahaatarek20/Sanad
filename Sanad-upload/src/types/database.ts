export interface Category {
  id: string
  title: string
  slug: string
  description: string | null
  icon: string
  sort_order: number
  created_at: string
}

export interface Instructor {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  level: 'beginner' | 'intermediate' | 'advanced'
  category_id: string | null
  instructor_id: string | null
  is_published: boolean
  created_at: string
  category?: Category
  instructor?: Instructor
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  youtube_video_id: string
  audio_url: string | null
  pdf_url: string | null
  duration_seconds: number
  order_index: number
  created_at: string
}

export interface StudentProgress {
  id: string
  user_id: string
  lesson_id: string
  is_completed: boolean
  last_played_seconds: number
  updated_at: string
}

export interface StudentNote {
  id: string
  user_id: string
  lesson_id: string
  timestamp_seconds: number
  content: string
  created_at: string
}