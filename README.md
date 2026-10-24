# Zombie Survival: Last Stand

A turn-based, text-based survival game written in standard C++17. Survive three
nights, manage health and ammunition, fight normal and armored infected, craft
supplies from scrap, and try to make the evacuation zone.

## Game rules and controls

- Choose **New game** to start, **Load saved game** to continue, or **Leaderboard**
  to see the ten highest scores. At any text prompt, type a number and press Enter.
- Each daylight phase offers rest (+20 health), crafting, inventory inspection,
  saving, and the option to start the night. A medkit heals up to 35 health;
  an ammo pack restores 10 rounds. Rest and healing never exceed maximum health.
- In combat, shoot (one bullet, randomized damage), use heavy melee (no ammunition,
  lower damage), use a medkit or ammo pack, defend, inspect inventory, or save
  and return to the main menu. A normal zombie deals less damage; an armored
  zombie halves incoming damage and can hit harder.
- Defeated zombies award score and scrap. Craft a medkit for 4 scrap or an ammo
  pack for 3 scrap. Loot is awarded after each cleared night.
- Survive all three nights for a 500-point victory bonus. Death records a
  completed run as well. Save and leaderboard files are created in the program's
  current working directory.

## Prerequisites and build

Requires a C++17 compiler (GCC 7+, Clang 5+, or a Visual Studio compiler with
C++17 support). No external libraries are needed.

### Windows (PowerShell, MinGW-w64)

From the project root:

```powershell
g++ -std=c++17 -Wall -Wextra -pedantic -I include main.cpp src/Game.cpp -o zombie_survival.exe
.\zombie_survival.exe
```

### Windows (Developer Command Prompt for Visual Studio)

```bat
cl /std:c++17 /W4 /EHsc /I include main.cpp src\Game.cpp /Fe:zombie_survival.exe
zombie_survival.exe
```

### Linux

```sh
g++ -std=c++17 -Wall -Wextra -pedantic -I include main.cpp src/Game.cpp -o zombie_survival
./zombie_survival
```

## Project structure

```text
ZombieSurvival/
|-- include/
|   `-- Game.h       Character, survivor, zombie, item, inventory, combat,
|                    persistence, and game interfaces
|-- src/
|   `-- Game.cpp     Implementations and game loop
|-- main.cpp         Program entry point and fatal-error boundary
|-- README.md
`-- .gitignore
```

## Class overview

- `Character` is the abstract polymorphic base for game actors.
- `Survivor` encapsulates player health, ammunition, scrap, score, and kills.
- `Zombie` provides the common enemy behavior; `ArmoredZombie` overrides damage
  mitigation and its attack behavior.
- `Item` is an abstract item effect. `Medkit`, `AmmoPack`, and `Scrap` implement
  their own effects. `Inventory` safely owns these objects with `unique_ptr`.
- `CombatSystem` handles attacks, damage, enemy turns, and kill rewards.
- `SaveManager` validates versioned save data and reads/writes leaderboard runs.
- `Game` controls the menu, daylight, three-night campaign, and combat flow.

## Syllabus concept mapping

1. **Constructors/destructors:** constructors initialize `Character`, `Survivor`,
   `Zombie`, and `Inventory`; virtual destructors on `Character` and `Item`
   ensure safe destruction through base pointers. `Inventory` uses `unique_ptr`
   for cleanup.
2. **Encapsulation:** player resources are private in `Survivor`; controlled
   methods such as `heal`, `spendAmmo`, `addScrap`, and `spendScrap` enforce limits.
3. **Abstraction:** `Character` and `Item` declare pure virtual behavior.
4. **Inheritance:** `Survivor` and `Zombie` derive from `Character`;
   `ArmoredZombie` specializes `Zombie`; concrete items derive from `Item`.
5. **Polymorphism:** virtual `Character::attack` and `takeDamage` are overridden
   by survivors and zombies; combat also dispatches specialized zombie attacks
   and armor behavior. Inventory invokes item effects through `Item`.
6. **Function overloading:** `Survivor::attack(Zombie&)` and
   `Survivor::attack(Zombie&, bool)` provide normal/heavy attack variants.
7. **Operator overloading:** `operator<<` formats `Survivor` and `Inventory`.
8. **File handling:** `SaveManager` uses `ifstream` to load/display records,
   `ofstream` to save/append, and formatted stream operators for records.
9. **Exception handling:** `SaveManager` throws descriptive exceptions for
   invalid/corrupt saves and I/O failures; input and action errors are handled
   with `try`/`catch` and retried or reported.

## Sample gameplay

```text
1. New game
Enter your survivor name: Riley

DAYLIGHT: NIGHT 1
Riley | HP 100/100 | Ammo 12 | Scrap 0 | Score 0 | Kills 0
1. Rest  2. Craft  3. Inventory  4. Save  5. Begin the night

NIGHT 1 COMBAT
1. Walker 1 [Normal] HP 37
2. Walker 2 [Normal] HP 37
1. Shoot  2. Heavy melee  3. Use medkit  4. Defend ...
```

The random damage, enemy mix, and post-night supplies make each playthrough
different. The game intentionally uses plain text and has no external assets.

## Viva preparation

- **Why an abstract `Character`?** It gives survivors and zombies a shared actor
  contract while requiring each kind to define health, attacks, and life state.
- **Why private player fields?** All resource changes go through methods that
  enforce health/ammo/material rules rather than allowing arbitrary edits.
- **Where is runtime polymorphism used?** Combat and inventory call overridden
  virtual methods through base-class references/pointers.
- **Why smart pointers?** `unique_ptr` makes inventory/enemy ownership explicit
  and guarantees cleanup when objects leave scope.
- **Why overload `attack`?** The same survivor attack operation supports both a
  default strike and a heavy-strike option with a different parameter list.
- **How is save corruption handled?** The loader verifies a format version,
  ranges, record shape, and enemy fields; malformed data raises an error.
- **How does loading resume?** The save contains the night, player resources,
  inventory, combat phase, and remaining enemy kinds/health; the game restores
  those values and returns to the corresponding phase.
- **How are leaderboard scores ordered?** Runs are loaded, validated, sorted by
  score (then kills), and only the top ten are printed.

## Known limitations

- Save and leaderboard records are plain text and intended for a single local
  player; they are validated but not encrypted.
- ANSI color is omitted for broad terminal compatibility.
- Random combat balance is deliberately simple for a small console project.

## Browser real-time shooter

`frontend/` contains a separate, playable, top-down shooter. The battlefield is
drawn and updated on an HTML Canvas using a `requestAnimationFrame` loop,
delta-time movement, mouse aiming, projectiles, enemy pursuit, collision, loot,
and five-wave progression. The browser game is a **JavaScript simulation**; it
does **not** call or connect to the C++ game engine. Its localStorage saves,
settings, and leaderboard are separate from the C++ text files. The C++ project
and its nine syllabus concepts remain in `main.cpp`, `include/`, and `src/`.

### Run the browser game

Requires Node.js; no npm packages or external assets are required. From the
project root, run:

```powershell
node .\frontend\server.js
```

Open <http://127.0.0.1:4173>. Stop the server with `Ctrl+C`. Alternatively,
open `frontend/index.html` with the VS Code Live Server extension.

### Controls and gameplay

Start a new run, enter a callsign, and select Recruit, Survivor, or Nightmare.
The player moves freely through a scrolling city arena and must survive five
increasingly difficult waves. Walkers, runners, armored infected, and brutes
pursue and attack in real time. Eliminate every enemy in a wave to earn salvage
and ammunition, recover health, craft supplies, and unlock weapons during the
intermission. A completed fifth wave wins; zero health loses.

| Input | Action |
| --- | --- |
| W / A / S / D | Move; arrow keys also move |
| Mouse movement | Aim |
| Left mouse button | Fire continuously while held |
| R | Reload the equipped weapon |
| Space | Dodge, spend stamina, and briefly avoid damage |
| E | Pick up nearby loot |
| 1 / 2 / 3 | Equip pistol / rifle / shotgun (after unlocking) |
| I / Tab | Open or close the inventory |
| Escape | Pause or resume |
| Enter | Begin the next wave during intermission |

The screen also provides pointer-accessible Fire, Reload, Medkit, Ammo Pack,
Inventory, Settings, and Pause controls. The inventory overlay offers crafting
and weapon unlocks during intermission. The pause menu allows resuming, saving
and returning to the title screen, settings, or abandoning the run. Active runs
resume from the same browser/device using localStorage. Completed runs are
recorded in the local leaderboard. Settings persist interface scale and reduced
motion. Sound is not implemented, so no sound controls are presented.

### Browser architecture and verification notes

- `frontend/js/shooter.js` owns browser-game state, Canvas rendering, input,
  collision, combat, enemies, pickups, wave progression, and local persistence.
- `frontend/js/app.js` handles screens, overlays, settings, and save/resume flow.
- `frontend/js/ui.js` renders menus, HUD, inventory, mission briefing, and results.
- `frontend/styles/shooter.css` styles the real-time shooter HUD and battlefield.
- `frontend/server.js` serves the static frontend without a C++ API.

The frontend has no C++ bridge or authoritative backend. Treat it as a separate
browser prototype and the C++ console game as the syllabus implementation. A
future integration would require a real local API and server-side validation.
This is a small prototype: enemy pathfinding uses local steering around
obstacles, and it has no audio or network/multiplayer mode.

### Verification performed

- Checked every `.js` file with `node --check`.
- Compiled every project `.cpp` file together with GCC using
  `-std=c++17 -Wall -Wextra -pedantic`; the build completed without warnings.
- Launched the C++ executable and confirmed the menu appears, rejects
  non-numeric/out-of-range selections, and exits normally.
- Launched the browser app from a clean localStorage state. Confirmed the title,
  setup, mission briefing, leaderboard, settings, and Canvas battlefield render.
- Played a live combat segment: WASD movement changed player position, held
  mouse fire consumed pistol rounds and hit/defeated a zombie, Space consumed
  stamina, and R reloaded using reserve ammunition.
- Exercised loot pickup, medkit use and health clamping, ammo-pack use, both
  crafting recipes, rifle/shotgun unlocks, insufficient-scrap disabled states,
  save-and-return, page refresh, and Continue restore.
- Verified wave advancement and the victory/results/leaderboard path with
  deterministic browser-state fixtures. A complete five-wave victory by
  manually defeating every enemy was not play-tested end to end.
- Verified the defeat/results path with a deterministic near-zero-health
  fixture. Also checked the 390px-wide layout, no horizontal document
  overflow, reduced-motion/interface-scale settings, and keyboard scrolling.
- No browser console or page errors were observed in the exercised flows.
