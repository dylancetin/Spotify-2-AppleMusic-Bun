export interface TrackRow {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  date: string;
  isrc: string;
}

export interface AppleSong {
  id: string;
  type: string;
  href?: string;
  attributes: {
    albumName: string;
    artistName: string;
    name: string;
    trackViewUrl?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ApplePlaylist {
  id: string;
  type: string;
  href?: string;
  attributes: {
    name: string;
    description?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface Stats {
  total: number;
  converted: number;
  failed: number;
  isrcBased: number;
  textBased: number;
}

export interface AppleApiError {
  code: string;
  messageForDisplay: string;
  title: string;
  detail: string;
  status: number;
}