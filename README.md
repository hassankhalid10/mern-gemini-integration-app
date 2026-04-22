# MERN Gemini Integration App

A conversational AI application built with the MERN (MongoDB, Express, React, Node.js) stack. This app features a persistent chat interface with memory, allowing users to maintain context across multi-turn interactions. 

## Features
- **Conversational AI**: Maintains context over multiple messages using Google Gemini.
- **Persistent Chat Sessions**: Chat history is saved and can be resumed later.
- **Settings Panel**: Customize AI behavior with tone selection (Neutral, Professional, Casual, Creative, Concise, Angry, Romantic) and adjustable max tokens (50-8192).
- **Message Actions**:
  - **Copy**: One-click copy of AI responses to clipboard
  - **Regenerate**: Get alternative responses for the last AI message
  - **Edit**: Modify previous user messages and regenerate the conversation from that point
- **Modern UI**: Clean, scrolling chat flow with a sidebar for session navigation and hover-based message actions.

## Prerequisites
Before you begin, ensure you have met the following requirements:
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local instance or MongoDB Atlas cluster)
- **API Key** for your preferred AI provider (e.g., OpenAI API Key, Gemini API Key, etc.)

## Installation & Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd mern-gemini-integration-app
   ```

2. **Backend Setup**:
   Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=4000
   MONGO_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=your_jwt_secret_here
   ```

3. **Frontend Setup**:
   Open a new terminal, navigate to the frontend directory, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
   *(Optional)* Create a `.env` file in the `frontend` directory if your frontend requires specific configuration (e.g., `REACT_APP_API_URL=http://localhost:4000/api`).

## Running the App

You will need to run both the frontend and backend servers simultaneously.

**Terminal 1 (Backend):**
```bash
cd backend
npm start
# or npm run dev (if nodemon is configured)
```
The backend should be running on `http://localhost:4000`.

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
# or npm run dev (if using Vite)
```
The frontend should open in your browser at `http://localhost:3000` (or `http://localhost:5173` for Vite).

## Testing the Features

1. **Authentication**: 
   - Sign up with a new account or log in with existing credentials.
   
2. **Start a New Chat**: 
   - Click the "New Chat" button in the sidebar to start a fresh conversation.
   
3. **Settings Panel**:
   - Click the ⚙ Settings button in the sidebar.
   - Select a tone (e.g., Creative, Professional) and adjust the max tokens slider.
   - Settings are saved automatically and persist across sessions.
   
4. **Test Context & Memory**:
   - Send a message asking the AI to remember a specific detail (e.g., "My favorite color is blue").
   - Send a follow-up message asking about that detail (e.g., "What is my favorite color?").
   - Verify that the AI responds correctly, demonstrating memory within the session.
   
5. **Message Actions**:
   - **Copy**: Hover over an AI response and click the 📋 button to copy it to your clipboard.
   - **Regenerate**: Hover over the last AI response and click the 🔁 button to get an alternative answer.
   - **Edit**: Hover over any of your messages and click the ✏️ button to edit and resubmit it. Note: This will discard all messages after the edited one.
   
6. **Session Navigation**:
   - Create multiple chat sessions.
   - Click between the sessions in the sidebar to ensure the correct chat history loads for each specific session.
   
7. **Data Persistence**:
   - Refresh the page and verify that your previous chat sessions are still visible in the sidebar and that the chat history is retained.

## Built With
- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **AI Provider**: Google Gemini Flash
