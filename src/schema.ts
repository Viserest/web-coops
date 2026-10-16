import { Uuid } from "./uuid";

export interface Subscriber {
  id: Uuid;
	created_at: number;
	deleted_at?: number;
  email: string;
  name: string;
  ip_addr?: string;
}

export interface Message {
  id: Uuid;
  created_at: number;
	updated_at?: number;
	deleted_at?: number;
  views: number;
  sent: number;
  subject: string;
  text: string;
  file_id?: string;
}

export interface Link {
  id: Uuid;
  created_at: number;
  views: number;
  subscriber_id: Uuid;
  message_id: Uuid;
}

export interface Admin {
  id: Uuid;
  username: string;
  password: string;
  sessions: Array<Uuid>;
  role: string;
  createdAt: number;
}

export interface Session {
  id: Uuid;
  adminId: Uuid;
  createdAt: number;
  expiresAt: number;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  items: Array<object>;
}
