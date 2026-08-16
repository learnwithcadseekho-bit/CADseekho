export type UserType = "student" | "engineer" | "working_professional" | "teacher" | "other";

export type ExperienceLevel = "fresher" | "1-2_years" | "3-5_years" | "5+_years";

export type InterestedCourseSlug = "autocad" | "solidworks" | "ansys" | "creo";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_type: UserType;
  experience: ExperienceLevel | null;
  interested_courses: InterestedCourseSlug[];
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

export const USER_TYPE_OPTIONS: { value: UserType; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "engineer", label: "Engineer" },
  { value: "working_professional", label: "Working Professional" },
  { value: "teacher", label: "Teacher" },
  { value: "other", label: "Other" },
];

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "fresher", label: "Fresher" },
  { value: "1-2_years", label: "1–2 years" },
  { value: "3-5_years", label: "3–5 years" },
  { value: "5+_years", label: "5+ years" },
];

export const INTERESTED_COURSE_OPTIONS: { value: InterestedCourseSlug; label: string }[] = [
  { value: "autocad", label: "AutoCAD" },
  { value: "solidworks", label: "SolidWorks" },
  { value: "ansys", label: "ANSYS" },
  { value: "creo", label: "Creo" },
];
