export type ResourceType =
  | "calculator"
  | "cheat_sheet"
  | "tutorial"
  | "solved_problem"
  | "practice_model"
  | "interview_qa"
  | "guide";
export type ResourceLevel = "beginner" | "intermediate" | "advanced";
export type ResourceAccess = "free" | "partial" | "paid";
export type ResourceStatus = "draft" | "published";
export type ResourceRelation = "same_topic_other_software" | "next_level" | "prerequisite";

export interface Software {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  description: string | null;
  course_url: string | null;
  sort_order: number;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  /** Slugs of the software this topic applies to (topic_software). */
  software: string[];
}

export interface TagRef {
  slug: string;
  name: string;
}

export interface SoftwareRef extends TagRef {
  short_name: string;
}

/** One row of the resource_cards view / search_resources RPC. */
export interface ResourceCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: ResourceType;
  level: ResourceLevel;
  access: ResourceAccess;
  component_key: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  software: SoftwareRef[];
  topics: TagRef[];
}

export interface CourseCta {
  label: string;
  url: string;
}

export interface Resource {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  type: ResourceType;
  level: ResourceLevel;
  access: ResourceAccess;
  required_entitlement: string | null;
  component_key: string | null;
  component_props: Record<string, unknown>;
  thumbnail_url: string | null;
  file_path: string | null;
  course_cta: CourseCta | null;
  status: ResourceStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatedResource extends ResourceCard {
  relation: ResourceRelation;
}

export interface ResourceDetail extends Resource {
  software: SoftwareRef[];
  topics: TagRef[];
  related: RelatedResource[];
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  software_id: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface LearningPathWithItems extends LearningPath {
  software: SoftwareRef | null;
  items: ResourceCard[];
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  calculator: "Calculator",
  cheat_sheet: "Cheat sheet",
  tutorial: "Tutorial",
  solved_problem: "Solved problem",
  practice_model: "Practice model",
  interview_qa: "Interview Q&A",
  guide: "Guide",
};

/** Plural labels for type landing pages (/resources/type/<type>). */
export const RESOURCE_TYPE_PLURALS: Record<ResourceType, string> = {
  calculator: "Calculators",
  cheat_sheet: "Cheat sheets",
  tutorial: "Tutorials",
  solved_problem: "Solved problems",
  practice_model: "Practice models",
  interview_qa: "Interview Q&A",
  guide: "Guides",
};

export const RESOURCE_LEVEL_LABELS: Record<ResourceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const RESOURCE_ACCESS_LABELS: Record<ResourceAccess, string> = {
  free: "Free",
  partial: "Partial",
  paid: "Paid",
};

export const RESOURCE_RELATION_LABELS: Record<ResourceRelation, string> = {
  same_topic_other_software: "Same topic in other software",
  next_level: "Next level",
  prerequisite: "Do this first",
};

export const RESOURCE_TYPES = Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[];
export const RESOURCE_LEVELS = Object.keys(RESOURCE_LEVEL_LABELS) as ResourceLevel[];
export const RESOURCE_ACCESSES = Object.keys(RESOURCE_ACCESS_LABELS) as ResourceAccess[];
export const RESOURCE_RELATIONS = Object.keys(RESOURCE_RELATION_LABELS) as ResourceRelation[];

/** Simulation tools get the "Hand calc ↔ software" block on resource pages. */
export const SIMULATION_SOFTWARE = ["ansys", "solidworks-simulation", "hypermesh", "creo-simulation"];
