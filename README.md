# Aria

A modern, real-time AI chatbot powered by Google Gemini with a sleek, responsive interface.

## Live Demo

Check out the live application: [https://aria-web-alpha.vercel.app/](https://aria-web-alpha.vercel.app/)

## Features

- Real-time streaming responses from Google Gemini AI
- Conversational context awareness with chat history
- Modern, responsive UI with Tailwind CSS
- Dark mode interface with gradient backgrounds
- Markdown support for AI responses
- Syntax highlighting for code blocks
- Auto-scrolling chat interface
- Loading animations and status indicators

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **AI Provider:** Google Gemini API (@google/genai)
- **Styling:** Tailwind CSS
- **UI Libraries:**
  - React Markdown
  - React Syntax Highlighter
  - Remark GFM (GitHub Flavored Markdown)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- A Google Gemini API key

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd aria-web
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Google Gemini API key:

```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

You can also use `GEMINI_API_KEY` as an alternative environment variable name.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## Project Structure

```
aria-web/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Chat API endpoint with streaming
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main chat page
├── components/
│   ├── ChatInput.tsx             # Message input component
│   ├── ChatMessage.tsx           # Message display component
│   └── MessageContent.tsx        # Markdown message renderer
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## How It Works

1. Users type messages in the chat input
2. Messages are sent to the `/api/chat` endpoint
3. The API uses Google Gemini's streaming API to generate responses
4. Responses are streamed back in real-time using Server-Sent Events (SSE)
5. The UI updates dynamically as text chunks arrive
6. Chat history is maintained for contextual conversations

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_GEMINI_API_KEY` or `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## License

This project is private and not licensed for public use.

## Deployment

This application is deployed on Vercel. To deploy your own instance:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your `GOOGLE_GEMINI_API_KEY` environment variable
4. Deploy

---

Built with Next.js and Google Gemini

