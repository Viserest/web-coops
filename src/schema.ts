import { Uuid } from "./uuid";

/*
 * User system
 */

export interface User {
	// ids
	id: Uuid;
	sessions: Array<Uuid>;
	// details
	name: string;
  email: string;
  password: string;
	role: string;
	orders: Array<Uuid>;
	addresses: Array<Uuid>;
  // timestamps
	created_at: number;
	accessed_at?: number;
	updated_at?: number;
  deleted_at?: number;
}

export interface Session {
  id: Uuid;
	user_id: Uuid;
  ip_addr?: string;
  created_at: number;
  expires_at: number;
}

/*
 * Newsletter system
 */

export interface Message {
	id: Uuid;
  // counts
  views: number;
	sent: number;
  // details
  subject: string;
  text: string;
  file_id?: string;
  // timestamps
  created_at: number;
	updated_at?: number;
	deleted_at?: number;
}

export interface Link {
  id: Uuid;
  subscriber_id: Uuid;
  message_id: Uuid;
  views: number;
  created_at: number;
}

/*
 * Order system
 */

export interface Address {
	id: Uuid;
	street_number: number;
	code: string;
	street: string;
	city: string;
	state: string;
}

export interface ItemOptionSelection {
	items: Array<Uuid>
}
export interface ItemOptionBoolean {
	question: string;
	price: number;
}
export interface ItemOptionRepeating {
	question: string;
	min: number;
	max: number;
	price: number;
}
type ItemOption = ItemOptionSelection | ItemOptionBoolean | ItemOptionRepeating;

export interface MenuItem {
	id: Uuid;
	name: string;
	description: string;
	price: number;
	// List of item options
	options: Array<Uuid>;
}

export interface OrderItem {
	id: Uuid;
	menu_id: Uuid;
	quantity: number;
	unit_price: number;
	// List of item options
	options: Array<Uuid>;
	instructions: Array<string>;
}

/*
 * Pagination results for returning lists
 */

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  items: Array<object>;
}
