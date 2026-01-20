export const PROJECT_TYPES = [
  { value: "commission", label: "Commission" },
  { value: "collaboration", label: "Collaboration" },
  { value: "technical", label: "Technical" },
  { value: "consultation", label: "Consultation" },
  { value: "workshop", label: "Workshop / Teaching" },
] as const;

export const CLIENT_TYPES = [
  { value: "global-brand", label: "Global Brand" },
  { value: "big-brand", label: "Big Brand (National)" },
  { value: "small-brand", label: "Small Brand / Startup" },
  { value: "institution", label: "Institution / Museum" },
  { value: "festival", label: "Festival" },
  { value: "musician", label: "Musician / Artist" },
  { value: "exhibition", label: "Exhibition" },
  { value: "agency", label: "Agency" },
  { value: "private", label: "Private Client" },
  { value: "other", label: "Other" },
] as const;

export const PROJECT_LENGTHS = [
  { value: "one-off", label: "One-off (Single Event)" },
  { value: "short", label: "Short Term (1-2 weeks)" },
  { value: "medium", label: "Medium Term (1-2 months)" },
  { value: "long", label: "Long Term (3+ months)" },
  { value: "performance", label: "Performance / Show" },
  { value: "tour", label: "Tour (Multiple Dates)" },
  { value: "installation-temp", label: "Temporary Installation" },
  { value: "installation-perm", label: "Permanent Installation" },
] as const;

export const EXPERTISE_LEVELS = [
  { value: "junior", label: "Junior (1-3 years)" },
  { value: "mid", label: "Mid-level (3-6 years)" },
  { value: "senior", label: "Senior (6-10 years)" },
  { value: "expert", label: "Expert (10+ years)" },
] as const;

export const SKILLS = [
  "TouchDesigner",
  "Notch",
  "Unreal Engine",
  "Unity",
  "VVVV",
  "Processing",
  "openFrameworks",
  "Max/MSP",
  "Ableton Live",
  "Resolume",
  "MadMapper",
  "LED Mapping",
  "Projection Mapping",
  "Motion Graphics",
  "3D Modeling",
  "Shader Programming",
  "Hardware Integration",
  "Audio Reactive",
  "Generative Art",
  "Interactive Installation",
  "VJing",
  "Live Performance",
  "Kinect / Depth Sensors",
  "AR / VR",
  "AI / ML Integration",
] as const;

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Canada",
  "Netherlands",
  "Australia",
  "Japan",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "South Korea",
  "China",
  "India",
  "Sweden",
  "Norway",
  "Denmark",
  "Belgium",
  "Switzerland",
  "Austria",
  "Poland",
  "Portugal",
  "Other",
] as const;

export interface ProjectSubmission {
  id?: string;
  projectType: string;
  clientType: string;
  projectLength: string;
  clientCountry: string;
  projectLocation: string;
  skills: string[];
  expertiseLevel: string;
  totalBudget: number;
  yourBudget: number;
  teamSize: number;
  yearCompleted: number;
  description?: string;
  createdAt?: string;
}
