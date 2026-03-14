export interface PostContent {
  title: string;
  content: string;
  timestamp: number;
}

export interface CommentContent {
  content: string;
  timestamp: number;
}

export interface PostRecord {
  index: number;
  author: string;
  blobName: string;
  timestamp: number;
  title?: string;
  content?: string;
  likeCount?: number;
  commentCount?: number;
  hasLiked?: boolean;
}

export interface CommentRecord {
  postIndex: number;
  commenter: string;
  blobName: string;
  timestamp: number;
  content?: string;
}
