# SGT Frontend

React frontend for a fantasy golf competition where friends compete by drafting PGA Tour golfers each week.

![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![React Query](https://img.shields.io/badge/React_Query-5.x-FF4154)

---

## Prerequisites

- Node.js 18+
- npm or yarn

---

## Environment Variables

Create a `.env` file in the project root:

```bash
# Local development
REACT_APP_API_URL=http://localhost:8080

# Production
REACT_APP_API_URL=https://your-api.railway.app
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start
# Runs on http://localhost:3000
```

---

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests once (CI mode)
npm test -- --watchAll=false
```

**Test Count**: 93+ tests across all components

---

## Production Build

```bash
# Build for production
npm run build
# Output: /build directory

# Deploy to Vercel
vercel --prod
```

---

## Project Structure

```
src/
├── components/              # React components
│   ├── __tests__/          # Component tests
│   ├── Admin.js            # Admin panel
│   ├── CurrentSeason.js    # Season standings
│   ├── CurrentTournament.js # Live tournament scores
│   ├── Dashboard.js        # Home page
│   ├── Draft.js            # Draft interface (pick/edit/review modes)
│   ├── ForgotPassword.js   # Password reset request
│   ├── FullLeaderboard.js  # All 150+ tournament players
│   ├── Login.js            # Authentication
│   └── ResetPassword.js    # Password reset form
├── services/               # API clients
│   ├── api.js              # Axios instance with auth headers
│   ├── auth.js             # Authentication service
│   └── tournament.js       # Tournament API service
├── __mocks__/              # Jest mocks
│   └── react-router-dom.js # Router mock
├── App.js                  # Routes and providers
├── App.css                 # Global styles
└── index.css               # Tailwind directives
```

---

## Component Overview

| Component | Tests | Description |
|-----------|-------|-------------|
| Login | 13 | Email/password form with golf aesthetic |
| Draft | 28 | 8-golfer selection grid with staggered animations |
| CurrentTournament | 23 | Live scores, draft status, cut detection |
| CurrentSeason | 17 | Cumulative season standings with user highlighting |
| FullLeaderboard | 20 | All tournament players with drafted badges |
| ForgotPassword | 10 | Password reset email request |
| ResetPassword | 15 | Token-based password reset |
| Admin | 11 | User and data management |

---

## Design System

### Colors

- **Augusta Green**: Primary actions, links, user highlighting
- **Clubhouse Tones**: Backgrounds (cream, beige), text (brown, mahogany)
- **Trophy Gold**: Highlights, premium features
- **Error Red**: Error states, cut players

### Typography

- **Playfair Display**: Headings (serif, elegant)
- **Lato**: UI elements (sans-serif, clean)
- **Merriweather**: Body text (serif, readable)

### Animations

- **fade-in**: Page entrance (0.6s)
- **slide-up**: Component reveals (0.5s)
- **stagger-1 to stagger-8**: Sequential row animations

---

## Key Features

- **Responsive Design**: Mobile-first with desktop enhancements
- **User Highlighting**: Current user's row highlighted in standings
- **Draft Status**: Countdown timers for draft window open/close
- **Cut Detection**: Proactive cut line detection after Round 2
- **Auto-Refresh**: React Query refetches data every 5 minutes
- **Loading States**: Spinners and skeleton loading
- **Error Recovery**: Retry buttons on API failures

---

## Available Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Home page with tournament and season info |
| `/login` | Login | Authentication |
| `/draft` | Draft | Golfer selection interface |
| `/forgot-password` | ForgotPassword | Request password reset |
| `/reset-password` | ResetPassword | Set new password |
| `/admin` | Admin | Admin panel (requires admin role) |

---

## License

Private project - All rights reserved.
