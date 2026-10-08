# AI-Adaptive Ephemeral Privacy Communication System 🛡️⚡

> An account-free, temporary real-time communication platform built on a 3-stage privacy lifecycle: pre-send on-device Privacy Guardian analysis, adaptive on-screen Privacy Mode, and authoritative in-memory session expiration.

---

## 1. Problem Statement

Traditional instant messaging platforms rely on persistent accounts, phone numbers, and permanent database storage. When users share sensitive information (such as bank details, payment handles, access tokens, or phone numbers) in transient contexts (e.g., student group work, technical support, one-time credential exchange), that data remains permanently stored and susceptible to database leaks, screenshot surveillance, and account impersonation.

---

## 2. Proposed Solution

AuraPriv introduces an **ephemeral, account-free communication model** where:
- No accounts, phone numbers, or passwords are collected.
- A temporary room exists only for a strict expiration window (e.g., 15–30 minutes).
- Privacy protection is applied across three distinct stages:
  1. **BEFORE SHARING**: An on-device Privacy Guardian inspects outgoing text and warns the user before transmission.
  2. **DURING SESSION**: An optional Privacy Mode reduces accidental on-screen exposure from passersby.
  3. **AFTER SESSION**: Server-authoritative expiration clears all room metadata and message history from active volatile memory (RAM).

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite | Fast, responsive single-page client interface |
| **Styling** | Modern CSS | Dark cybersecurity glassmorphism, fully responsive |
| **Backend** | Node.js, Express | REST API for room creation & status lookup |
| **Real-time** | Socket.IO | Low-latency bi-directional room communication |
| **Privacy Guardian** | Rule-Based Regex / Checksum Engine | Reliable baseline sensitive data detector |
| **Local AI (Optional)** | Ollama (`llama3.2`) | Optional local inference enhancement (graceful fallback) |
| **Storage** | Volatile In-Memory `Map` | 0 database dependencies; instant application-controlled cleanup |

---

## 4. Implementation Status Breakdown

### ✅ IMPLEMENTED (Core MVP)
- [x] Account-free temporary room creation with cryptographically strong IDs (`POST /api/rooms`).
- [x] Room existence & expiration lookup API (`GET /api/rooms/:roomId`).
- [x] Shareable invite URL (`http://localhost:5173?room=XYZ`).
- [x] Real-time bi-directional messaging with Socket.IO (`join_room`, `send_message`, `receive_message`).
- [x] System notices for participants joining and leaving.
- [x] 100% on-device Privacy Guardian baseline detecting:
  - 📧 Email addresses
  - 📞 Phone numbers (international and 10-digit formats)
  - ⚡ UPI payment handles (`@okhdfcbank`, `@paytm`, `@upi`, etc.)
  - 🏦 Bank account numeric sequences with contextual keywords
  - 💳 Credit/debit card patterns with Luhn algorithm validation
  - 🔑 Passwords, API tokens, and bearer keys
  - 🪪 Government IDs (Aadhaar, PAN, SSN)
- [x] Human-in-the-loop warning modal with choices: **[Edit]** (preferred), **[Cancel]**, and **[Send Anyway]**.
- [x] Privacy Mode toggle with hover/click-to-peek visual blurring.
- [x] Server-authoritative expiration countdown timer and 10-second cleanup daemon.
- [x] Post-expiration screen rejecting new joins and messages with memory audit display.
- [x] Automated test suite covering lifecycle, detection rules, and security utilities.
- [x] Development demo bar with safe synthetic data presets.

### ⚙️ OPTIONAL ENHANCEMENT
- [x] **Local AI (Ollama)**: Structured privacy classification via Ollama API. The system continues functioning seamlessly even if Ollama is not installed or offline.

### 🔮 FUTURE ENHANCEMENTS
- [ ] End-to-End Encryption (E2EE) using Web Crypto API (SubtleCrypto ECDH / AES-GCM).
- [ ] Ephemeral P2P file and image sharing via WebRTC.
- [ ] Mobile PWA packaging for native screen capture restriction flags.

---

## 5. Security & Threat Model

### What We Defend Against:
- **Persistent Database Leaks**: No database exists; messages are stored only in volatile memory during active room life.
- **Accidental Accidental Exposures**: Privacy Guardian intercepts careless pasting of card numbers, passwords, and API keys.
- **Shoulder Surfing**: Privacy Mode visually blurs historical message bubbles on screen.
- **Dangling Open Sessions**: Authoritative server timer invalidates access codes and wipes in-memory state.

### Realistic Limitations (Technical Honesty):
- **We do NOT claim 100% security or that the system is unhackable.**
- **Physical Observation**: No software can prevent a third party from photographing the monitor with an external physical camera.
- **Compromised Endpoints**: If a user's operating system has active spyware, malware, or malicious browser extensions, memory can be scraped locally.
- **Physical Erasure**: We guarantee **application-controlled cleanup** from active server RAM; we make no claim of low-level hardware destruction from cloud provider snapshot backups.

---

## 6. Directory Structure

```text
/project-root
│
├── server/
│   ├── src/
│   │   ├── config/index.js           # Server configuration & environment parsing
│   │   ├── privacy/
│   │   │   ├── ruleBasedAnalyzer.js  # Baseline regex & checksum PII detector
│   │   │   ├── localAiAnalyzer.js    # Optional Ollama local LLM integration
│   │   │   └── privacyGuardian.js    # Master inspection coordinator
│   │   ├── routes/
│   │   │   └── roomRoutes.js         # REST endpoints for room creation and lookup
│   │   ├── services/
│   │   │   └── roomStore.js          # In-memory storage Map & purge daemon
│   │   ├── socket/
│   │   │   └── chatSocket.js         # Socket.IO event handlers and rate limiting
│   │   ├── utils/
│   │   │   └── security.js           # Crypto ID generator, sanitizer, safe logger
│   │   └── server.js                 # Express server entry point
│   ├── tests/                        # Automated test suite (node:test)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/               # Header, PrivacyModal, PrivacyModeToggle, DemoBar
│   │   ├── hooks/                    # useCountdown, useSocketChat
│   │   ├── pages/                    # LandingPage, ChatRoomPage, ExpiredPage
│   │   ├── services/                 # api.js, socket.js
│   │   ├── styles/                   # main.css, components.css
│   │   ├── utils/                    # clientPrivacyGuardian.js, session.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── run-all.bat                       # 1-Click launcher for Windows
├── run-backend.bat                   # Backend launcher
├── run-frontend.bat                  # Frontend launcher
├── .gitignore
├── .env.example
├── package.json
└── README.md
```

---

## 7. How to Install & Run

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### Step 1: Install Dependencies
From the project root:
```bash
npm run install:all
```
*(Or navigate into `server` and `client` and run `npm install` in each).*

### Step 2: Run Automated Tests
```bash
npm test
```
Runs 17 automated tests verifying room lifecycle, Privacy Guardian detection, and security utilities.

### Step 3: Start the Application

#### Option A: 1-Click Launch (Windows)
Double-click [`run-all.bat`](./run-all.bat). Both servers will launch in separate terminal windows.

#### Option B: Manual Command Line
**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
```
> Server starts on `http://localhost:5000`

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```
> Frontend starts on `http://localhost:5173`

---

## 8. Optional Ollama Local AI Setup

The baseline rule-based Privacy Guardian is completely independent and always active. To enable local LLM enrichment:

1. Install [Ollama](https://ollama.ai/).
2. Pull a small, fast model:
   ```bash
   ollama pull llama3.2
   ```
3. Start the Ollama server:
   ```bash
   ollama serve
   ```
4. In `server/.env` (or environment), set:
   ```env
   OLLAMA_ENABLED=true
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```
If Ollama is not running or takes more than 3 seconds to respond, AuraPriv automatically falls back to the deterministic rule analyzer without interrupting communication.

---

## 9. Step-by-Step Judge Demo Walkthrough

1. **Open Landing Page**: Visit `http://localhost:5173`.
2. **Observe 3 Pillars**: Highlight the 3 stages: BEFORE (Guardian), DURING (Privacy Mode), AFTER (Authoritative purge).
3. **Create Room**: Select **2 Minutes** (demo duration) $\rightarrow$ click **"Create Temporary Room"**.
4. **Copy Link & Open Second Window**:
   - Click **"📋 Copy Room Link"**.
   - Open an **Incognito Window** or second tab and paste the URL.
   - Both users are connected without needing accounts.
5. **Send Normal Message**:
   - In User A: Click `"Can we meet tomorrow at 5?"` on the demo bar $\rightarrow$ **Send**.
   - Delivered immediately with no warnings.
6. **Trigger Privacy Guardian**:
   - Click `"Demo Bank"` or `"Demo UPI"` on the demo bar $\rightarrow$ click **Send**.
   - ⚠️ **The Privacy Guardian alert modal appears immediately before sending.**
   - Demonstrate the 3 user choices:
     - **[Edit]**: Returns to text input so the user can refine.
     - **[Cancel]**: Discards the message.
     - **[Send Anyway]**: User exercises final human agency to transmit.
7. **Demonstrate Privacy Mode**:
   - Toggle **Privacy Mode ON** in the header.
   - Observe message text blurring on screen. Hover or tap to peek.
8. **Demonstrate Ephemeral Expiry & Purge**:
   - Watch the server-authoritative countdown reach `00:00`.
   - The UI automatically transitions to the **"Room Expired & Cleared"** screen.
   - New messages and joins are rejected, and active RAM is wiped.
