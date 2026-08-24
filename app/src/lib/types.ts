export interface Config {
  id: string;
  configName: string;
  creatorsCategory: string;
  analysisInstruction: string;
  newConceptsInstruction: string;
}

export interface Creator {
  id: string;
  username: string;
  category: string;
  profilePicUrl: string;
  followers: number;
  reelsCount30d: number;
  avgViews30d: number;
  lastScrapedAt: string;
}

export interface Video {
  id: string;
  link: string;
  thumbnail: string;
  creator: string;
  views: number;
  likes: number;
  comments: number;
  analysis: string;
  newConcepts: string;
  datePosted: string;
  dateAdded: string;
  configName: string;
  starred: boolean;
}

export interface ContentIdea {
  id: string;
  title: string;
  archetype: string;
  sourceInspiration: string;
  premise: string;
  hook: string;
  script: string;
  createdAt: string;
  starred: boolean;
}

export interface PipelineParams {
  configName: string;
  maxVideos: number;
  nDays: number;
}

export interface ActiveTask {
  id: string;
  creator: string;
  step: string;
  views?: number;
}

export interface PipelineProgress {
  status: "idle" | "running" | "completed" | "error";
  phase: "scraping" | "done";
  activeTasks: ActiveTask[];
  creatorsCompleted: number;
  creatorsTotal: number;
  creatorsScraped: number;
  videosSaved: number;
  errors: string[];
  log: string[];
}
