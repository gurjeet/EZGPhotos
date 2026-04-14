export type AlbumEntry = {
  id: string;
  title: string;
};

export type PhotoEntry = {
  id: string;
  title: string;
  previewUrl: string;
  timestamp?: string;
};

export type PhotosAdapter = {
  isSignedIn(): Promise<boolean>;
  getAlbums(): Promise<AlbumEntry[]>;
  getCurrentPhoto(): Promise<PhotoEntry | null>;
  getCurrentMemberships(photoId: string): Promise<string[]>;
  goPrevious(): Promise<void>;
  goNext(): Promise<void>;
  toggleAlbum(albumId: string, photoId: string): Promise<boolean>;
  createAlbum(title: string): Promise<void>;
  renameAlbum(albumId: string, title: string): Promise<void>;
  getSignInUrl(): string;
};
