# 🏛️ AI Petition Hub

**AI Petition Hub** is a state-of-the-art, AI-driven civic governance platform that bridges the gap between citizens and local government. By leveraging AI Vision, Text Intelligence, and Gamification, it ensures transparent, efficient, and accountable grievance redressal.

![Logo](src/assets/logo.png)

## 🌟 Key Features

### 🤖 AI-Powered Intelligence
- **AI Vision Verification**: Automatically verifies petition images to ensure authenticity and prevent spam.
- **Urgency Detection**: Uses Natural Language Processing (NLP) to classify petitions and detect high-priority issues instantly.
- **Smart Official Replies**: Provides AI-generated formal response suggestions for government officials to speed up communication.

### 🎮 Civic Gamification
- **Citizen Hero Leaderboard**: Rewards active citizens with points and badges (Gold, Silver, Bronze) for their contributions.
- **Petition Upvoting**: Community-driven prioritization allowing citizens to "Support" critical issues.

### 🛡️ Accountability & Transparency
- **48-Hour Auto-Escalation**: Automatically flags petitions to senior admins if they are ignored for over 48 hours.
- **Live Impact Map**: Interactive heatmap and location-based tracking for urban problem identification.
- **Status Timeline**: Real-time tracking of petition progress from "Submitted" to "Resolved".

### 📊 Advanced Analytics
- **Trends & Hotspots**: Visualizes petition submission trends and identifies geographical hotspots for better city management.
- **Verified Proofs**: Digital Acknowledgment Receipt (PDF) generation for every submitted petition.

---

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS, Framer Motion, Lucide React, Shadcn/UI.
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL (Supabase/Neon).
- **AI Integration**: Google Gemini AI (Multi-modal Text & Vision).
- **Mapping**: Leaflet.js / OpenStreetMap.
- **Localization**: React-i18next (Full Tamil & English support).

---

## 🚀 Getting Started

To run this project locally, follow these steps:

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL Database

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ai-petition-hub.git
   ```

2. **Install Dependencies:**
   ```bash
   # Root (Frontend)
   npm install

   # Server (Backend)
   cd server
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the `server` directory and add the following:
   ```env
   PORT=5001
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_HOST=your_host
   DB_PORT=5432
   DB_NAME=postgres
   JWT_SECRET=your_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the Application:**

   **Start Backend:**
   ```bash
   cd server
   npm run dev
   ```

   **Start Frontend (New Terminal):**
   ```bash
   npm run dev
   ```

5. **Access the App:**
   Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🤝 Contributing
Contributions are welcome! Feel free to open issues or submit pull requests to improve the platform.

## 📄 License
This project is licensed under the MIT License.

---
*Built with ❤️ for the future of digital governance.*
