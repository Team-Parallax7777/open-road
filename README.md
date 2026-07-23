# Open Road

**Drive without a destination. The journey is the destination.**

A relaxing 3D browser-based open-world driving experience built with Next.js, React Three Fiber, and Three.js. No timers, no scores, no missions — only the road, the weather, and the rhythm of the journey.

## Features

- 6 real drivable vehicles (VW Golf GTI, VW New Beetle, BMW M5 CS, Dodge Challenger SRT, Land Rover Defender, Toyota Hilux) loaded from GLB models
- 1.2 km² procedural valley with forest, Indian village, river, bridge, waterfall, farmland, and campsite
- Arcade driving physics with per-vehicle handling, fuel, cruise control, and weather-affected grip
- 6 camera modes: Chase, Hood, Cockpit, Orbit, Drone, Cinematic
- Dynamic day/night cycle with golden hour, blue hour, and starry night sky
- 4 weather conditions: Clear, Fog, Rain, Snow — each affects visibility and grip
- Camping mechanic with stargazing, sleep-to-dawn/dusk, and slow refuel
- Synthesized ambient audio (tanpura-inspired drone + wind + engine hum) via WebAudio
- Minimal HUD: speed, fuel, compass, time, weather

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **3D:** React Three Fiber + Three.js + @react-three/drei
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State:** Zustand
- **Audio:** WebAudio API (synthesized, no samples)
- **Animations:** Framer Motion

## Quick Start (Local Development)

```bash
# Install dependencies
bun install

# Set up the database (Prisma SQLite — used for future features)
bun run db:push

# Start the dev server
bun run dev
```

Open http://localhost:3000 in your browser.

### Requirements
- Node.js 18+ or Bun 1.0+
- A WebGL-capable browser (Chrome, Firefox, Safari, Edge)
- ~100 MB free RAM for the dev server

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake / Reverse |
| A / ← | Turn left |
| D / → | Turn right |
| Space | Brake |
| Shift | Handbrake (drift) |
| C | Cycle camera mode |
| L | Toggle headlights |
| V | Toggle wipers |
| Q / E | Left / right indicators |
| R | Cruise control |
| P | Pause time of day |
| B | Cycle weather |
| T | Rest at campsite (when near) |
| X | Reset position |
| Esc | Return to menu |

## Deployment

### Frontend → Vercel

The Next.js app deploys to Vercel in one click.

**Option A: CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Deploy to production
vercel --prod
```

**Option B: GitHub integration (recommended)**
1. Push this repo to GitHub (instructions below)
2. Go to https://vercel.com/new
3. Import your GitHub repo
4. Vercel auto-detects Next.js — just click Deploy
5. Your site goes live at `https://your-project.vercel.app`

**Note:** The `vercel.json` in this repo configures long-cache headers for the GLB model files so returning visitors load instantly.

### Backend → Render

The game is currently 100% client-side — no backend required. However, a placeholder API service is included for future multiplayer / save-game features.

1. Push this repo to GitHub
2. Go to https://dashboard.render.com → New → Blueprint
3. Select your repo. Render reads `render.yaml` automatically
4. Click Apply. You'll get `https://open-road-api.onrender.com`
5. The placeholder returns `{ "status": "ok" }` at `/health`

To connect the frontend to the backend later, add the Render URL to your Vercel environment variables as `NEXT_PUBLIC_API_URL`.

## Publishing to GitHub

```bash
# 1. Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: Open Road driving game"

# 2. Create a repo on GitHub
#    Go to https://github.com/new
#    Name it "open-road" (or whatever you like)
#    Don't initialize with README (you already have one)

# 3. Connect and push
git remote add origin https://github.com/YOUR_USERNAME/open-road.git
git branch -M main
git push -u origin main
```

Your code is now on GitHub. To deploy:
- **Vercel:** https://vercel.com/new → import the repo
- **Render:** https://dashboard.render.com → New → Blueprint → select the repo

## Project Structure

```
open-road/
├── public/
│   └── models/              # 6 GLB vehicle models
├── server/                  # Placeholder Render backend
│   ├── index.js
│   └── package.json
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Main entry (menu/driving/camping)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── game/
│   │   ├── vehicles.ts      # 6 vehicle specs
│   │   ├── store.ts         # Zustand game state
│   │   ├── hooks/
│   │   │   └── useKeyboard.ts
│   │   ├── lib/
│   │   │   └── audio.ts     # WebAudio ambient engine
│   │   ├── world/
│   │   │   └── terrain.ts   # Procedural world geometry
│   │   └── components/
│   │       ├── GameScene.tsx
│   │       ├── Environment.tsx
│   │       ├── Vehicle.tsx
│   │       ├── CameraRig.tsx
│   │       ├── SkyAndLights.tsx
│   │       ├── Hud.tsx
│   │       ├── StartMenu.tsx
│   │       ├── VehicleBadge3D.tsx
│   │       ├── CampingOverlay.tsx
│   │       └── CampDetector.tsx
│   └── components/ui/       # shadcn/ui components
├── prisma/
│   └── schema.prisma
├── vercel.json
├── render.yaml
├── package.json
└── README.md
```

## Vehicle Models

| Vehicle | Category | Source |
|---------|----------|--------|
| 1992 VW Golf GTI Mk2 | Hatchback | GLB |
| 1998 VW New Beetle | Hatchback | GLB |
| 2022 BMW M5 CS | Sedan | GLB |
| Dodge Challenger SRT | Sedan | GLB |
| Land Rover Defender | SUV | GLB |
| 2022 Toyota Hilux | Truck | GLB |

Models live in `public/models/` and are loaded via `useGLTF` from `@react-three/drei`. Each has per-model scale, rotation, and offset normalization in `src/game/vehicles.ts`.

## Performance Notes

- GLB models range from 2.4 MB (Golf) to 40 MB (Hilux). For production, consider Draco-compressing them:
  ```bash
  npx gltf-transform optimize public/models/2022_toyota_hilux.glb public/models/2022_toyota_hilux_compressed.glb --texture-compress webp
  ```
- The terrain uses a 200×200 vertex grid with vertex coloring (single draw call)
- Trees, bushes, and rocks use InstancedMesh (4 draw calls total for 320+ objects)
- Dev target: 60 FPS on desktop, 30 FPS on mobile

## Troubleshooting

**"Oops, something went wrong" in dev**
The Next.js 16 Turbopack dev server can crash under memory pressure (4GB RAM). If this happens:
```bash
# Kill the dev server
pkill -f "next dev"

# Clear cache and restart
rm -rf .next
bun run dev
```
This does NOT affect production — Vercel builds have plenty of RAM.

**3D scene is black**
You need a WebGL-capable browser. Most modern browsers support it. If you're on Linux, ensure your GPU drivers are installed.

**Models don't load**
Check that `public/models/*.glb` files exist. The game falls back to a CSS car silhouette in the menu if WebGL is unavailable.

## License

MIT — see [LICENSE](LICENSE)

## Credits

- Vehicle models: Various artists (see original sources)
- Tagline inspired by the open-road driving game tradition
- Built with Next.js, React Three Fiber, Three.js, and shadcn/ui
