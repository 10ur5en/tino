export interface PostAttachment {
  type: "image" | "video" | "pdf";
  data: string;
  mimeType: string;
  name: string;
}

export interface PostContent {
  title: string;
  content: string;
  timestamp: number;
  attachments?: PostAttachment[];
}

export interface CommentContent {
  content: string;
  timestamp: number;
  attachments?: PostAttachment[];
}

export interface PostRecord {
  index: number;
  author: string;
  blobName: string;
  timestamp: number;
  title?: string;
  content?: string;
  attachments?: PostAttachment[];
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
  attachments?: PostAttachment[];
}
