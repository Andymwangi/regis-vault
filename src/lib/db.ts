'use server';

// This is a stub file created for build purposes only
// It provides a minimal implementation of database functionality

export const db = {
  query: {
    users: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    files: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    departments: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  },
  select: () => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          orderBy: async () => []
        }),
      }),
      leftJoin: () => ({
        where: () => ({
          orderBy: async () => [],
          groupBy: () => ({
            limit: async () => []
          })
        }),
      }),
    }),
  }),
  insert: () => ({
    values: () => ({
      returning: async () => [{ id: 'stub-id' }]
    })
  }),
  update: () => ({
    set: () => ({
      where: () => ({
        returning: async () => [{ id: 'stub-id', updatedAt: new Date() }]
      })
    })
  }),
  delete: () => ({
    where: () => ({
      returning: async () => [{ id: 'stub-id' }]
    })
  }),
};

// Drizzle ORM exports
export const eq = () => true;
export const ne = () => false;
export const gt = () => false;
export const gte = () => false;
export const lt = () => false;
export const lte = () => false;
export const isNull = () => false;
export const isNotNull = () => true;
export const inArray = () => true;
export const notInArray = () => false;
export const like = () => true;
export const notLike = () => false;
export const between = () => true;
export const notBetween = () => false;
export const and = () => true;
export const or = () => true;
export const sql = () => ({ as: () => ({}) });

// Schema exports
export const users = {};
export const files = {};
export const departments = {};
export const activities = {}; 