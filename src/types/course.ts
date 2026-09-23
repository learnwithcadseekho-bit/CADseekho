export type CourseLevel = "beginner" | "intermediate" | "advanced";

export const COURSE_LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export type CourseFormat = "live" | "self_paced";

export const COURSE_FORMAT_LABEL: Record<CourseFormat, string> = {
  live: "Live, Instructor-Led",
  self_paced: "Self-Paced, Online",
};

export interface Course {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  level: CourseLevel | null;
  software: string | null;
  prerequisites: string | null;
  image: string | null;
  format: CourseFormat;
  price: number | null;
  original_price: number | null;
  next_batch_date: string | null;
  registration_count: number;
  manual_enrolled_count: number | null;
  seat_capacity: number | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseWithCategory extends Course {
  category: { name: string; slug: string } | null;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_number: number;
  /** Static picture for the chapter; also the 3D viewer's poster. */
  image: string | null;
  /** .glb file for an interactive, rotatable 3D model. */
  model3d: string | null;
  /** What the image/model shows — alt text for both. */
  media_alt: string | null;
}

export interface CourseSkill {
  id: string;
  course_id: string;
  skill_name: string;
}

export interface CourseFaq {
  id: string;
  course_id: string;
  question: string;
  answer: string;
  order_number: number;
}

export interface CourseTestimonial {
  id: string;
  course_id: string;
  student_name: string;
  student_photo: string | null;
  testimonial: string;
  order_number: number;
}

export interface CourseDetail extends CourseWithCategory {
  course_modules: CourseModule[];
  course_skills: CourseSkill[];
  course_faqs: CourseFaq[];
  course_testimonials: CourseTestimonial[];
}
