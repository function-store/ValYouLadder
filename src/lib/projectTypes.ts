export const PROJECT_TYPES = [
  { value: "commission", label: "Commission" },
  { value: "collaboration", label: "Collaboration" },
  { value: "technical", label: "Technical / R&D" },
  { value: "consultation", label: "Consultation" },
  { value: "workshop", label: "Workshop / Teaching" },
  { value: "live-performance", label: "Live Performance / Show" },
  { value: "tour", label: "Tour (Multiple Dates)" },
  { value: "installation-temp", label: "Temporary Installation" },
  { value: "installation-perm", label: "Permanent Installation" },
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
  { value: "day", label: "Single day" },
  { value: "2-5-days", label: "2–5 days" },
  { value: "1-2-weeks", label: "1–2 weeks" },
  { value: "1-3-months", label: "1–3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "6plus-months", label: "6+ months" },
] as const;

export const RATE_TYPES = [
  { value: "project", label: "Project fee (flat rate)" },
  { value: "daily", label: "Day rate" },
  { value: "hourly", label: "Hourly rate" },
  { value: "retainer", label: "Monthly retainer" },
] as const;

export const YOUR_ROLES = [
  { value: "solo", label: "Solo (full project)" },
  { value: "lead", label: "Lead creative" },
  { value: "key-contributor", label: "Key contributor" },
  { value: "subcontractor", label: "Subcontractor / hired in" },
] as const;

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "CHF",
  "NOK",
  "SEK",
  "DKK",
  "JPY",
  "BRL",
  "MXN",
  "Other",
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
  clientCountry?: string;
  projectLocation: string;
  skills: string[];
  expertiseLevel: string;
  totalBudget?: number | null;
  yourBudget: number;
  daysOfWork?: number;
  currency: string;
  rateType: string;
  yourRole: string;
  yearCompleted: number;
  description?: string;
  createdAt?: string;
}
