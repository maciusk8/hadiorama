# Home Assistant Diorama 

![HA Diorama](assets/HAdiorama.png)

> [!IMPORTANT]
> **Work In Progress (WIP)**
> The project is under active development. Some features may be subject to change.

## About The Project
Home Assistant Diorama is a web application that acts as an advanced client for Home Assistant. It allows visualizing and controlling smart home devices via an interactive room diorama. It was built with the idea of utilizing AI capabilities to transform photos of rooms into aesthetic diorama views. It features an interactive UI that allows mapping Home Assistant entities onto polygonal clickable areas, making smart home control highly intuitive and visually pleasing.

## Running the Application

### Configuration
Before running the application for development, you need to configure your environment variables. Create a `.env` file in the root directory of the project (or copy the example file) and provide your Home Assistant address:

```bash
cp .env.example .env
```

```env
HA_URL=http://homeassistant.local:8123
```

> [!NOTE]
> Home Assistant Diorama uses OAuth2 to authenticate. You will be redirected to Home Assistant to log in and authorize the application on your first visit. No long-lived access tokens need to be configured!

### Development Mode
To run the application locally for development, you first need to make sure you have [Bun](https://bun.sh/) installed via your system's package manager. Then, execute the start script. It will automatically install dependencies, initialize the database (if necessary), and start both the backend and frontend dev servers:

```bash
./start.sh
```

This starts two processes:
- **Vite dev server** on port `5173` — serves the React frontend with hot reload
- **Elysia backend** on port `3000` — handles the API and database

The application will be accessible at `http://localhost:5173`.

### Docker Deployment (Production)
To deploy the application in production (e.g. on a NAS or home server), simply run the container using Docker. The application is entirely self-contained, but it requires the address of your Home Assistant instance.

#### Quick Start
You can run the pre-built image directly from GitHub Container Registry:

```bash
docker run -d \
  --name ha-diorama \
  -p 3000:3000 \
  -e HA_URL=http://your-ha-ip:8123 \
  -v ./data/ha_dashboard.sqlite:/app/ha_dashboard.sqlite \
  -v ./data/uploads:/app/server/uploads \
  --restart unless-stopped \
  ghcr.io/maciusk8/hadiorama:latest
```

The application will be accessible at `http://localhost:3000` (or your server's IP). You can also explicitly pull the image first with `docker pull ghcr.io/maciusk8/hadiorama:latest`.

#### Docker Compose
If you prefer `docker-compose`, the repository includes a `docker-compose.yml`:

```bash
# Provide your HA URL inline, or define it in a .env file
HA_URL=http://your-ha-ip:8123 docker compose up -d --build
```

#### Persistent Data
The following data is stored outside the container (in `./data/`) and persists across restarts and rebuilds:
- `ha_dashboard.sqlite` — the application database
- `uploads/` — uploaded room images

> [!NOTE]
> The application uses OAuth2 to authenticate with your Home Assistant instance. When you open the application for the first time, you will be redirected to Home Assistant to log in and authorize HA Diorama. No long-lived access tokens need to be configured!

## Home Assistant Integration
The project acts as an advanced client communicating directly with your Home Assistant instance using a WebSocket connection and a Long-Lived Access Token. No external cloud servers mediate this connection.

### Adding as a Custom Web Panel
It is highly recommended to add this application directly to your Home Assistant dashboard. To do this go to Settings → Dashboards → Add Dashboard and select "Webpage" as the type. Then paste the URL of the application in the URL field.

## Supported Entities
The system is built on a flexible pattern that matches the card's appearance and behavior to the device type.

Currently supported:
*   **Switches** 
*   **Lights** (with color/brightness visualization via CSS)

**Planned:**
*   Climate
*   Media Player
*   Covers
*   Sensors

It is incredibly easy to add new supported entities thanks to the `entityRegistry` and `abstractEntityCard`. This abstraction allows you to seamlessly introduce new device types without interfering with the main `RoomView`.

## Database Schema & Extensibility
The extensible architecture extends to the database layer. The database schema is specifically designed with maximum extensibility in mind, particularly regarding the addition of new light types or custom pins (pins that allow defining specific clickable areas). 

Because of this architectural decision, it will be fully possible in the future to add a complete home floor plan/schema on the main page, where these custom pins will represent different rooms and allow navigation between them.

## Directory Structure
```text
src/
├── features/           # Feature modules (rooms, lights, entities, etc.)
├── shared/
│   ├── components/     # Shared UI components (NavBar, ImageUploader, etc.)
│   ├── hooks/          # Shared hooks (useWebSocket, useAuth, useHomeData)
│   └── providers/      # React Context Providers (HomeAssistantProvider)
├── App.tsx             # Main layout and routing
└── main.tsx            # Entry point

server/
├── routes/             # API route handlers (rooms, pins, lights, etc.)
├── db/                 # Database query functions
├── db.ts               # Database connection
├── init-db.ts          # Schema initialization
└── index.ts            # Elysia server entry point
```

## Tech Stack
*   **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Elysia](https://elysiajs.com/) (Bun-native HTTP framework)
*   **Runtime:** [Bun](https://bun.sh/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Database:** SQLite (via Bun's built-in `bun:sqlite`)
*   **Communication:** WebSocket — full bidirectional real-time communication
*   **Styling:** Bootstrap 5 and advanced CSS for state visualizations (e.g., light glow, switch position)

---
