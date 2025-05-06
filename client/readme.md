# ChatApp Frontend Build Guide

This guide walks you through building the ChatApp frontend step-by-step using **Next.js**, **TypeScript**, **Tailwind CSS**, and **Ant Design**.

---

## 1. Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v14.x or higher) and **npm** or **yarn**
2. **Git** (for cloning the repo)
3. **.env support** in your shell (for environment variables)

---

## 2. Initialize the Project

If you already have an existing project folder, you can initialize Next.js in place. From within your project directory, run:

```bash
npx create-next-app@latest . --typescript
```

---

## 3. Install Dependencies

Install core libraries:

```bash
npm install antd axios socket.io-client
```

> The TypeScript template includes `typescript`, `@types/react`, and `@types/node`. To add socket client types:

```bash
npm install -D @types/socket.io-client
```

---

## 4. Configure TypeScript

Next.js’ TypeScript setup already creates a `tsconfig.json`. Verify or customize it:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "moduleResolution": "node",
    "target": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "resolveJsonModule": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Create a `types/` directory for shared interfaces:

```ts
// types/index.d.ts
export interface User {
  _id: string;
  username: string;
  email: string;
}
```

Rename any `.js`/`.jsx` files to `.ts`/`.tsx` under `pages/` and `components/` as needed.

---

## 5. Configure Tailwind CSS

1. **Initialize** Tailwind config:

   ```bash
   npx tailwindcss init -p
   ```

2. **Edit** `tailwind.config.js`:

   ```js
   module.exports = {
     content: [
       './pages/**/*.{ts,tsx}',
       './components/**/*.{ts,tsx}'
     ],
     theme: { extend: {} },
     plugins: []
   };
   ```

3. **Import** in `styles/globals.css`:

   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

---

## 6. Configure Ant Design

1. **Import** Ant Design CSS in `_app.tsx`:

   ```tsx
   import 'antd/dist/antd.css';
   import '../styles/globals.css';
   import type { AppProps } from 'next/app';
   ```

2. **Optional**: Customize theme via Less variables or CSS overrides.

---

## 7. Set Up Environment Variables

1. **Create** `.env.local` at project root:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_WS_URL=http://localhost:3000
   ```

2. **Expose** vars in `next.config.js`:

   ```js
   module.exports = {
     env: {
       NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
       NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL
     }
   };
   ```

---

## 8. Directory Structure

```
/chat-frontend
├── components/      # Reusable UI components (.tsx)
├── context/         # React Context for auth (.tsx)
├── pages/           # Next.js pages & routes (.tsx)
├── styles/          # Global CSS (Tailwind)
├── types/           # Shared TypeScript interfaces
├── utils/           # API & socket helpers (.ts)
├── public/          # Static assets
├── .env.local       # Environment variables
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

---

## 9. Authentication Context

Implement `context/AuthContext.tsx` with proper typing:

```ts
import { createContext, ReactNode, useState, useEffect } from 'react';
import api from '../utils/api';
import { User } from '../types';

interface AuthContextProps {
  user: User | null;
  login: (creds: { username: string; password: string }) => Promise<void>;
  register: (info: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  /* state, effects, methods */
};
```

Wrap `_app.tsx`:

```tsx
import { AuthProvider } from '../context/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
```

---

## 10. API & Socket Utilities

### 10.1 Axios Instance (`utils/api.ts`)

```ts
import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### 10.2 Socket.IO Client (`utils/socket.ts`)

```ts
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token: localStorage.getItem('token') }
    });
  }
  return socket;
};
```

---

## 11. Core Components

Type all component props and API data:

- `components/Layout.tsx`
- `components/MessageList.tsx`
- `components/MessageInput.tsx`
- `components/ChatWindow.tsx`

Use interfaces for props and responses.

---

## 12. Pages

Use `.tsx` files:

- `pages/login.tsx`
- `pages/register.tsx`
- `pages/index.tsx`
- `pages/rooms/[id].tsx`

Ensure forms, routing, and data fetching are fully typed.

---

## 13. Running & Deployment

- **Development**: `npm run dev`
- **Production Build**: `npm run build && npm start`

**Optional**: Dockerize with a `Dockerfile` and `docker-compose.yml`.

---

## 14. Next Steps

- **User Search & Friend Management** UI
- **Typing Indicators** (socket events)
- **Read Receipts** with UI badges
- **Dark Mode** and theme customization
- **Tests** with Jest & React Testing Library

