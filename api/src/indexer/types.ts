export type IndexedMedia = {
  filename: string;
  orderIndex: number;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
};

export type IndexedPost = {
  id: string;
  accountId: string;
  postedAt: Date;
  caption: string | null;
  hasText: boolean;
  textContent: string | null;
  tags: string[];
  media: IndexedMedia[];
};

export type IndexedProfilePicture = {
  id: string;
  accountId: string;
  takenAt: Date;
  filename: string;
};

export type AccountSnapshot = {
  id: string;
  posts: IndexedPost[];
  profilePictures: IndexedProfilePicture[];
};

export type IndexerSnapshot = {
  accounts: AccountSnapshot[];
};
