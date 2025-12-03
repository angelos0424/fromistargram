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
  type: string;
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
  highlights: IndexedHighlight[];
};

export type IndexedHighlightMedia = {
  filename: string;
  orderIndex: number;
  mime: string;
};

export type IndexedHighlight = {
  title: string;
  media: IndexedHighlightMedia[];
  coverMedia: IndexedHighlightMedia | null;
};

export type IndexerSnapshot = {
  accounts: AccountSnapshot[];
};
