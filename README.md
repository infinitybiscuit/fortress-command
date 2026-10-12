# Slop Wars: The Next Generation

A side-scrolling platformer / RTS crossover. Build bases, train armies, construct defences, and conquer the opposing forces across a procedurally generated battlefield. It was originally called *Fortress Command*.

**Play it:** <https://infinitybiscuit.github.io/fortress-command/> (works best on a phone in portrait; add it to your home screen).

## About the name

*Slop Wars: The Next Generation* is a deliberate mash-up of *Star Wars* and *Star Trek: The Next Generation*, with a couple of nods built in:

- **"Slop":** the game was made with heavy help from AI, and we know that kind of work can be dismissed as "AI slop". The name owns that, and shows that humans were involved too. It could not have happened on its own.
- **"The Next Generation":** a nod to the AI *generation* used to create it.

## The game

A no-build HTML5 game in `web/`, tuned for iPhone portrait play, with a widescreen layout and mouse and keyboard controls on a PC. Features:

- online play for up to 4 players
- twelve themes: Classic, Rise of the Robots, Medieval, Gangsters, Warring States, Steam Shogun, Winter War, Cartel Wars, Trade Wars, Civil War, Ghost Wars and Alien Wars
- a choice of side in every theme except Classic

How to play, the controls, every theme and the code layout are in [`web/README.md`](web/README.md).

## Roadmap and ideas

- **Planned work and ideas:** tracked as [issues](https://github.com/infinitybiscuit/fortress-command/issues) on the Slop Wars Roadmap board.
- **Loose thoughts:** go in [Discussions](https://github.com/infinitybiscuit/fortress-command/discussions).

## Project structure

```
.
├── web/                ← the game (HTML5 canvas, no build step); deployed to GitHub Pages
├── relay/              ← Cloudflare Worker: matchmaking + TURN relay credentials for online play
├── archive/
│   └── godot-era/      ← the retired Godot 4 prototype and early design notes (read-only)
├── .github/workflows/  ← Pages deploy (web/) and Cloudflare deploy (relay/)
├── README.md           ← this file
└── LICENSE             ← all rights reserved
```

## Development

There's nothing to build or install. Serve `web/` from any static server:

```bash
cd web && python3 -m http.server 8000
```

Then open http://localhost:8000, or your computer's LAN address on a phone. Pushing to `main` deploys `web/` to GitHub Pages automatically. Each release bumps `VERSION` in `web/js/config.js` and `CACHE` in `web/sw.js`.

## History

The game began as **Fortress Command**, a Godot 4 prototype. It was ported to the browser and has grown there ever since. The Godot project was retired and moved to [`archive/godot-era/`](archive/godot-era/).

## Credits

Slop Wars: The Next Generation (originally Fortress Command): inspired by Rick Dangerous, Lemmings and Command & Conquer. Made by humans and AI together.

## Licence

Copyright © 2026 Tim Coles / infinitybiscuit. **All rights reserved.** You're welcome to play the game, but the code, art and content may not be copied, modified or redistributed without written permission. See [LICENSE](LICENSE). Bundled third-party components (PeerJS, the Press Start 2P font) keep their own licences.
