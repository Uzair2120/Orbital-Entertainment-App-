export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  genres?: { id: number; name: string }[];
  runtime?: number;
  budget?: number;
  revenue?: number;
  status?: string;
  tagline?: string;
  production_companies?: { id: number; name: string; logo_path: string | null }[];
}

export interface Series {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  overview: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: { id: number; name: string }[];
  status?: string;
  last_air_date?: string;
  networks?: { id: number; name: string; logo_path: string | null }[];
  created_by?: { id: number; name: string }[];
}

export interface Game {
  id: number;
  name: string;
  background_image: string | null;
  released: string;
  rating: number;
  description_raw?: string;
  website?: string;
  developers?: { id: number; name: string }[];
  publishers?: { id: number; name: string }[];
  platforms?: { platform: { id: number; name: string } }[];
  genres?: { id: number; name: string }[];
  metacritic?: number;
  playtime?: number;
}

export interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
  collectionName?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  country?: string;
  collectionPrice?: number;
  trackViewUrl?: string;
}

export interface Book {
  key: string;
  id_book?: string;
  title: string;
  cover_i: number | null;
  author_name?: string[];
  first_publish_year?: number;
  description?: string | { value: string };
  subjects?: string[];
  number_of_pages_median?: number;
  first_sentence?: string[];
  publish_date?: string[];
  publisher?: string[];
  language?: string[];
}

export type AppMode = 'movies' | 'series' | 'games' | 'music' | 'books' | 'moods' | 'wishlist' | 'recommendations' | 'profile';
