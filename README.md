This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Appwrite Configuration

This project uses Appwrite as a backend service. The configuration is split into client-side and server-side:

### Client-Side Configuration

The client-side configuration is in `src/lib/appwrite/config.ts`. It includes:

- Client initialization with endpoint and project ID
- Account, databases, and storage services
- Helper functions for user management, file upload, etc.

```typescript
// Client-side initialization example
const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "");
```

### Server-Side Configuration

The server-side configuration is in `src/lib/appwrite/server-config.ts`. It includes:

- Server client initialization with endpoint, project ID, and API key
- Server-side services like databases, storage, and users
- Helper functions for admin operations

```typescript
// Server-side initialization example
const serverClient = new Client();
serverClient
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");
```

### Important Note

The `setKey()` method is only available in the server-side SDK (`node-appwrite`), not in the client-side SDK. Server-side operations that require an API key must use the server-side configuration.
