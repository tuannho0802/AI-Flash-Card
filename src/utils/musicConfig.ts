export type Mood = string; // Support dynamic IDs from DB

export interface MoodConfig {
  id: Mood;
  icon: string;
  label: string;
  urls: string[];
  type: "youtube_video" | "mp3" | "none";
}

export const FALLBACK_MOODS: MoodConfig[] = [
  {
    id: "Lo-Fi",
    icon: "Headphones",
    label: "Lo-Fi Beats",
    urls: ["jfKfPfyJRdk", "u5_AAbUvN-U", "S_MOd4v7s7g"],
    type: "youtube_video",
  },
  {
    id: "Rain",
    icon: "CloudRain",
    label: "Rainy Focus",
    urls: ["mPZkdNFqePs", "W7mazS-l-4A", "q76bMs-NwRk"],
    type: "youtube_video",
  },
  {
    id: "Forest",
    icon: "Trees",
    label: "Deep Forest",
    urls: ["M0AWBnAv8VE", "nmS7v_7R3To", "B_C-v6K-O4M"],
    type: "youtube_video",
  },
  {
    id: "Cafe",
    icon: "Coffee",
    label: "Coffee Shop",
    urls: ["c0_ejQQcrwI", "gaGrsh_Tof4", "h2zkVmtr7Yg"],
    type: "youtube_video",
  },
  {
    id: "Discover",
    icon: "Zap",
    label: "Discover",
    urls: ["jfKfPfyJRdk", "u5_AAbUvN-U", "4xDzrJKXOOY"],
    type: "youtube_video",
  },
];

export const SPECIAL_MOODS: MoodConfig[] = [
  {
    id: "Custom",
    icon: "Link",
    label: "Custom URL",
    urls: [],
    type: "mp3",
  },
  {
    id: "Silence",
    icon: "VolumeX",
    label: "Silent",
    urls: [],
    type: "none",
  },
];
