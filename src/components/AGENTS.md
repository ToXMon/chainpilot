# UI Components Module

## Module Purpose
React UI components for the chat interface. Pure presentation layer with no business logic.

## Standards
- Functional components (no class components)
- Tailwind CSS for all styling (dark terminal/IDE aesthetic)
- Props typed via types from src/lib/types.ts
- No direct API calls from components — data flows through page.tsx
- Responsive design with mobile sidebar toggle

## Components

| File | Purpose |
|------|---------|
| ChatMessage.tsx | Renders individual chat messages — handles user/assistant/tool roles, markdown-like formatting, safe content rendering (no dangerouslySetInnerHTML) |
| Sidebar.tsx | Conversation list sidebar — shows all conversations, create new, delete existing, responsive toggle |
| ChatInput.tsx | User input field — text input with submit button, handles Enter key, disabled state |
