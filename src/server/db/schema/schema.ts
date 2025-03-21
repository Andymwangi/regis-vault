// src/server/db/schema.ts
import { sql } from 'drizzle-orm';
import {
  timestamp,
  text,
  pgTable,
  uuid,
  boolean,
  integer,
  varchar,
  foreignKey,
  json,
  bigint,
  serial,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  departmentId: uuid('department_id').references(() => departments.id),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  allocatedStorage: integer('allocated_storage').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  size: integer('size').notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 255 }),
  userId: uuid('user_id').references(() => users.id).notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  active: boolean('active').notNull().default(true),
  lastActivity: timestamp('last_activity').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sharedFiles = pgTable('shared_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').references(() => files.id).notNull(),
  sharedByUserId: uuid('shared_by_user_id').references(() => users.id).notNull(),
  sharedWithUserId: uuid('shared_with_user_id').references(() => users.id).notNull(),
  permission: varchar('permission', { length: 50 }).notNull().default('view'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fileTags = pgTable('file_tags', {
  id: serial('id').primaryKey(),
  fileId: integer('file_id').references(() => files.id).notNull(),
  tag: varchar('tag', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull().default('other'),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ocrResults = pgTable('ocr_results', {
  id: serial('id').primaryKey(),
  fileId: integer('file_id').references(() => files.id).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: json('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  maxRequests: integer('max_requests').notNull(),
  windowMs: integer('window_ms').notNull(), // Time window in milliseconds
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  files: many(files),
  sharedFiles: many(sharedFiles, { relationName: 'sharedWithUser' }),
  activities: many(activityLogs),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [files.departmentId],
    references: [departments.id],
  }),
  shares: many(sharedFiles),
  tags: many(fileTags),
  ocrResult: one(ocrResults),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  files: many(files),
}));

export const schema = {
  users,
  files,
  departments,
  activities,
  activityLogs,
  settings,
  sharedFiles,
  tags,
  fileTags,
  ocrResults,
  sessions,
  rateLimits,
};

export default schema;