# Priva-city

Priva-city is a browser prototype for a privacy-focused CTF adventure inspired by explorable security games, but with original privacy education, story, and procedural art.

## Prototype

- Static HTML/CSS/JavaScript
- Phaser 3 for the game loop, camera, movement, collision, and interaction zones
- No backend; progress and timer live in browser memory for this prototype

## Run Locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Game Loop

Move with `WASD` or arrow keys. Press `E` near citizens, terminals, and data shards. Complete three privacy challenges, collect four consent sigils, and enter the final vault code at the Privacy Trust Hub.

## Deployment

The repository is intended to deploy from the `main` branch root through GitHub Pages.
