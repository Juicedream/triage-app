import {
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
  boolean,
  integer,
  text,
} from "drizzle-orm/pg-core";
import {
  relations,
  type InferSelectModel,
  type InferInsertModel,
} from "drizzle-orm";

/**
 * Enums for all the schemas
 */
export const roleEnum = pgEnum("user_role", ["admin", "customer", "agent"]);
export const categoryEnum = pgEnum("ticket_category", [
  "account",
  "payment",
  "transfer",
  "card",
  "technical",
  "compliant",
  "other",
]);
export const priorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const statusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_for_customer",
  "escalated",
  "resolved",
  "closed",
]);
export const messageSenderEnum = pgEnum("message_sender", [
  "customer",
  "agent",
  "admin",
  "ai",
  "system",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "ticket_created",
  "ticket_updated",
  "ticket_assigned",
  "ticket_resolved",
  "new_message",
  "system",
]);

/**
 * Users Table
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  isEmailVerified: boolean("is_email_verified").default(false),
  role: roleEnum("role").default("customer").notNull(),
  avatarUrl: varchar("avatar_url", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Tickets Table
 */
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 255 }).notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  category: categoryEnum("category").notNull(),
  priority: priorityEnum("priority").default("high").notNull(),
  status: statusEnum("status").default("open").notNull(),
  assignedAgentId: integer("assigned_agent_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

/**
 * Messages Table
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .references(() => tickets.id, {
      onDelete: "cascade",
    })
    .notNull(),
  senderId: integer("sender_id")
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),
  content: text("content").notNull(),
  senderType: messageSenderEnum("sender_type").default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Notifications Table
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  body: varchar("body", { length: 255 }).notNull(),
  type: notificationTypeEnum("type").default("ticket_created").notNull(),
  hasRead: boolean("has_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Sessions Table
 */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull(),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Ticket = InferSelectModel<typeof tickets>;
export type NewTicket = InferInsertModel<typeof tickets>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

/**
 * Relationships
 */

export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets, { relationName: "user_tickets" }),
  assignedTickets: many(tickets, { relationName: "agent_tickets" }),
  messages: many(messages),
  notifications: many(notifications),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
    relationName: "user_tickets",
  }),
  agent: one(users, {
    fields: [tickets.assignedAgentId],
    references: [users.id],
    relationName: "agent_tickets",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [messages.ticketId],
    references: [tickets.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
