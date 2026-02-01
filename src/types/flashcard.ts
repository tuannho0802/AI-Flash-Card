export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  topic: string;
  cards: Flashcard[];
  created_at: string;
  user_id?: string | null;
}

export interface Profile {
  id: string;
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
  email: string | null;
}
