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
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'user']);
export const userStatusEnum = pgEnum('user_status', ['active', 'pending', 'suspended']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
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
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fileTags = pgTable('file_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').references(() => files.id).notNull(),
  tag: varchar('tag', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull().default('other'),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ocrResults = pgTable('ocr_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: text('file_id').notNull(),
  text: text('text').notNull(),
  confidence: integer('confidence').notNull(),
  language: text('language').notNull(),
  pageCount: integer('page_count').notNull(),
  status: text('status').notNull(),
  error: text('error'),
  processingTime: integer('processing_time').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: json('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  maxRequests: integer('max_requests').notNull(),
  windowMs: integer('window_ms').notNull(),
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