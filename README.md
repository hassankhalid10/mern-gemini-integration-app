# MERN Gemini Integration App

A conversational AI application built with the MERN (MongoDB, Express, React, Node.js) stack. This app features a persistent chat interface with memory, allowing users to maintain context across multi-turn interactions. 

## Features
- **Conversational AI**: Maintains context over multiple messages.
- **Persistent Chat Sessions**: Chat history is saved and can be resumed later.
- **Modern UI**: Clean, scrolling chat flow with a sidebar for session navigation.

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
   # Add your AI provider key here (adjust based on your implementation)
   AI_API_KEY=your_api_key_here
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

1. **Start a New Chat**: 
   Open the web app in your browser. Look for a "New Chat" button in the sidebar or the main interface. Click it to start a fresh conversation.
2. **Test Context & Memory**:
   - Send a message asking the AI to remember a specific detail (e.g., "My favorite color is blue").
   - Send a follow-up message asking about that detail (e.g., "What is my favorite color?").
   - Verify that the AI responds correctly, demonstrating memory within the session.
3. **Session Navigation**:
   - Create multiple chat sessions.
   - Click between the sessions in the sidebar to ensure the correct chat history loads for each specific session.
4. **Data Persistence**:
   - Refresh the page and verify that your previous chat sessions are still visible in the sidebar and that the chat history is retained.

## Built With
- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
