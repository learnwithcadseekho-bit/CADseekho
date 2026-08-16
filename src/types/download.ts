export interface Download {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  thumbnail: string | null;
  requires_login: boolean;
  is_published: boolean;
  download_count: number;
  created_at: string;
}

export interface DownloadLog {
  id: string;
  user_id: string;
  download_id: string;
  downloaded_at: string;
}
