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

- **Daily Famous Figures**: AI-generated puzzles featuring any famous person with OpenAI GPT-4o-mini
- **Complete No-Repeats System**: Database tracking ensures no character appears twice
- **Daily Play Restriction**: Cookie-based session system enforces one play per day
- **Automated Daily Updates**: New puzzles automatically generated at 12:01 AM PST
- **Progressive Hint System**: Get hints one by one as you make incorrect guesses
- **Dark/Light Mode**: Complete theme system with localStorage persistence
- **Custom Backgrounds**: Theme-specific PNG background support
- **Component Architecture**: Modular React components for maintainability
- **Integrated Feedback**: Streamlined feedback within hints area
- **Resilient Error Handling**: Graceful fallbacks for development issues
- **Clean, Responsive UI**: Built with advanced Tailwind CSS for all screen sizes
- **Real-time Validation**: Instant feedback on guesses with HMAC security

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
│   ├── layout.tsx    # Root layout with ThemeProvider
│   └── globals.css   # Global styles with animations
├── components/
│   ├── GameHeader.tsx         # Title, theme toggle, rules
│   ├── PuzzleInfo.tsx         # Date, attempts, question mark
│   ├── HintsList.tsx          # Progressive hints with feedback
│   ├── GuessForm.tsx          # Input form with animations
│   ├── ThemeToggle.tsx        # Dark/light mode switcher
│   ├── RulesModal.tsx         # Game rules modal
│   └── GameOverMessage.tsx    # End game states
├── contexts/
│   └── ThemeContext.tsx       # Theme management
└── lib/
    └── api.ts                 # API integration with session handling
```

## Environment Variables

For local development, create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
```

For production deployment on Vercel:

```bash
NEXT_PUBLIC_API_URL=https://figurdle-api-577822725712.us-central1.run.app
```

## Live Application

**Production**: [https://figurdle.vercel.app](https://figurdle.vercel.app)

The app automatically deploys to Vercel when changes are pushed to the main branch.

## Deploy on Vercel

1. **Connect Repository**: Import your GitHub repo in Vercel dashboard
2. **Set Root Directory**: `apps/web`
3. **Environment Variables**: Set `NEXT_PUBLIC_API_URL` to your API endpoint
4. **Deploy**: Vercel will automatically build and deploy on every git push

See the main [DEPLOYMENT.md](../../DEPLOYMENT.md) for complete deployment instructions including API setup.

## API Integration

The app communicates with the FastAPI backend through:

- `GET /puzzle/today` - Fetch daily puzzle metadata
- `POST /guess` - Submit guesses and receive feedback
- `GET /session/status` - Check session and play status
- `POST /session/complete` - Mark session as completed
- `POST /session/update-progress` - Update session progress

All API requests are handled in `src/lib/api.ts` with:
- Proper error handling and TypeScript types
- Cookie-based session management
- Resilient fallbacks for development environment issues
- HMAC signature validation for security
