export type Mood = "Lo-Fi" | "Rain" | "Forest" | "Cafe" | "Silence";

export interface MoodConfig {
  id: Mood;
  icon: string; // Lucide icon name, to be mapped in component
  label: string;
  url: string; // audio source URL
}

export const MOODS: MoodConfig[] = [
  { 
    id: "Lo-Fi", 
    icon: "Headphones", 
    label: "Lo-Fi Beats", 
    url: "https://streams.ilovemusic.de/iloveradio17.mp3" // I Love Radio - Chill Hop
  },
  { 
    id: "Rain", 
    icon: "CloudRain", 
    label: "Rainy Focus", 
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg" 
  },
  { 
    id: "Forest", 
    icon: "Trees", 
    label: "Deep Forest", 
    url: "https://actions.google.com/sounds/v1/environment/woodland_bat_roost.ogg" 
  },
  { 
    id: "Cafe", 
    icon: "Coffee", 
    label: "Coffee Shop", 
    url: "https://actions.google.com/sounds/v1/crowds/restaurant_ambience.ogg" 
  },
  { 
    id: "Silence", 
    icon: "VolumeX", 
    label: "Silent", 
    url: "" 
  },
];
