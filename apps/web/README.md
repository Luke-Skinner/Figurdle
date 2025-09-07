# Figurdle Web App

A daily historical character guessing game built with Next.js and React. Players guess historical characters based on AI-generated progressive hints.

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

Make sure your FastAPI backend is running on port 8080 for local development, or set `NEXT_PUBLIC_API_URL` to point to your deployed API.

## Features

- Daily historical character puzzles
- Progressive hint system
- Clean, responsive UI with Tailwind CSS
- Real-time guess validation

## Tech Stack

- Next.js 15 with App Router
- React with TypeScript
- Tailwind CSS
- FastAPI backend integration

## Project Structure

```
src/
├── app/
│   ├── page.tsx      # Main game interface
│   └── layout.tsx    # Root layout
└── lib/
    └── api.ts        # API integration
```

## Environment Variables

For local development, create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
```

For production deployment on Vercel:

```bash
NEXT_PUBLIC_API_URL=https://your-api-service.run.app
```

## Deploy on Vercel

1. **Connect Repository**: Import your GitHub repo in Vercel dashboard
2. **Set Root Directory**: `apps/web`
3. **Environment Variables**: Set `NEXT_PUBLIC_API_URL` to your API endpoint
4. **Deploy**: Vercel will automatically build and deploy

See the main [DEPLOYMENT.md](../../DEPLOYMENT.md) for complete deployment instructions including API setup.

## API Integration

The app communicates with the FastAPI backend through:

- `GET /puzzle/today` - Fetch daily puzzle metadata
- `POST /guess` - Submit guesses and receive feedback

All API requests are handled in `src/lib/api.ts` with proper error handling and TypeScript types.
