# Slop Wars: The Next Generation — Web (phone and PC)

*Slop Wars: The Next Generation* (originally *Fortress Command*). The name is a mash-up of *Star Wars* and *Star Trek: The Next Generation*, with a nod to "AI slop" and to the AI generation used to make it. It was made by humans and AI together. See the [main README](../README.md#about-the-name).

A browser port of the original Godot prototype (now retired, in [`../archive/godot-era/godot`](../archive/godot-era/godot)). It's plain HTML5 Canvas and ES modules with
no build step, laid out for an **iPhone 16 Pro Max in portrait** (440×956 pt, 3× display).
It also runs in any modern desktop or mobile browser, and on a **PC** (any window at least
900 px wide and wider than it is tall) it switches to a widescreen layout with full mouse and
keyboard controls: see [Controls (PC)](#controls-pc).

## Play

Serve this folder from any static host and open it in Safari:

```bash
cd web
python3 -m http.server 8000
# then open http://<your-computer's-LAN-IP>:8000 on the iPhone
```

For a full-screen, app-like experience tap **Share → Add to Home Screen**. The page ships a
web manifest and service worker, so the game launches without browser chrome and keeps working
offline after the first load. When served over HTTPS (e.g. GitHub Pages, see
`.github/workflows/pages.yml`), the service worker caches the assets.

## Look and feel

The art style is a homage to early-90s home-computer war games: chunky, crisp pixel art in a bright palette.
- **Sharp pixels:** the battlefield is drawn as real pixel art. One art pixel is 2 world units, and zoom snaps so each art pixel covers a whole number of screen pixels. Nothing is smoothed or blurred, and scrolling stays smooth.
- **Sprites:** every sprite is pixel art built in code with a shared palette and dark outlines, and pre-rendered once per team:
  - Big-headed soldiers with role-specific gear.
  - Vehicles and aircraft.
  - Buildings: a sandbagged HQ bunker, a corrugated barracks hut, a sandbag gun nest, a sandbag-and-barbed-wire wall, a mine pithead, a workshop garage, and an airbase hangar with a control tower.
  - Grass, dirt and rock tiles, jungle trees and clouds.
- **Life and damage:** buildings rise behind scaffolding while under construction, smoke and burn when damaged, and have small animations (flag, pithead wheel, chimney smoke, tower beacon).
- **2D or isometric:** the title screen picks the view for the next game. **Isometric** is a Syndicate-style diorama seen from above at an angle, played on its own map: a square field (96 tiles each way) with no platforms or player-built bridges, and a fresh landscape every game: rolling hills, a river with bridges where the roads cross it, roads joining the bases, forests and rocks. Wading the river halves a unit's speed, roads speed it up by a fifth, and forests slow it a little; nothing can be built in the water. Hills are scenery only (buildings sit on a soil foundation where the ground slopes). The landscape comes from a seed in the game mode, so online players all get the host's. HQs start in the corners (opposite corners in 1 vs 1, round a pentagon in a five-player online game), units move anywhere across the field, and buildings are solid 3D shapes with square footprints, built inside a square zone around your base. Each one is carved from its art: the side-on picture is its front, the same picture mirrored is its side, and whatever fits both makes the building, so roofs slope, towers stand up and rooftop details are real blocks. The side wall isn't a copy of the front: it repeats the stretch of the front with no door. Units and vehicles are small 3D models too, made the same way from their sprites (soldiers slim, vehicles wide, aircraft round, aeroplanes with wings), and they turn smoothly to face where they're going or what they're shooting at. Units behind a building show through it faintly, and aircraft cast a shadow on the ground. Every mode works, including online, where the host's choice (shown in the lobby) is used by everyone. The minimap shows the field as a diamond, the same way round as the view.
- **UI:** the olive/khaki interface uses the bundled [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) pixel font (SIL Open Font License, see `vendor/fonts/`).

## Music and sound

An original chiptune soundtrack and sound effects in the style of 8-bit NES war games, synthesised live
with the Web Audio API (no audio files), in [`js/audio.js`](js/audio.js). Like the NES sound chip it
uses two pulse-wave channels (lead melody and fast arpeggios), a triangle-wave bass and a noise drum kit.
- **Music:** every theme has its own tune, played on the menus (it changes as you flick through the themes) and in battle; Classic has a separate title theme and battle theme. Short victory and defeat jingles end the game, and the music plays quieter behind the pause menu. The theme tunes are in [`js/songs.js`](js/songs.js), written as chords, a melody and drum patterns:

  | Theme | Style |
  | --- | --- |
  | Classic | heroic D-minor title anthem and a driving battle march |
  | Rise of the Robots | cold, clipped E-minor machine march with high arpeggios |
  | Medieval | Dorian lute-and-tabor marching song with a galloping bass |
  | Gangsters | swinging 1930s speakeasy tune with a walking bass |
  | Warring States | pentatonic flute over war drums and a gong |
  | Steam Shogun | Japanese *in* scale over a chugging train beat |
  | Winter War | breakneck Finnish humppa (oom-pah accordion) |
  | Cartel Wars | mariachi trumpet ranchera |
  | Trade Wars | pompous brass-band march |
  | Civil War | fife and drum |
  | Ghost Wars | wailing theremin over a haunted music box |
  | Alien Wars | wobbling, off-kilter alien signals |
- **Effects:** gunfire, tank shells, artillery, falling bombs, explosions, soldiers falling, buildings collapsing, placing and finishing buildings, new units, orders, selections, error buzzes, button clicks and a klaxon when your HQ is under fire. Battle sounds only play for what's on or near the screen, and each is rate-limited so big fights don't turn into noise.
- **Switches:** *Music* and *Sound FX* on the title screen and pause menu, remembered on the device. <kbd>M</kbd> toggles music on a PC.
- Browsers only allow sound after a tap or key press, so the music starts on the first touch. On iPhone the game also plays a silent audio track from that tap, so it is heard even with the ring/silent switch on silent. Online, each player hears their own game.

## Themes

Tap **Theme** on the title screen to switch between looks. The choice is remembered on the device. Themes are cosmetic only: the units, buildings and rules are identical. Online, the host's theme is the room's war, and everyone plays in it.

- **Classic:** the original early-90s jungle war, described above.
- **Rise of the Robots:** a rain-soaked future war at night.
  - **Setting:** rain falls over a smoggy neon skyline under a red moon, with searchlights sweeping the clouds. The battlefield is rubble and ash, with the odd skull, and the platforms are steel girders.
  - **Infantry**, human and machine:
    - **Rebels** with bandanas and plasma rifles (Soldier).
    - Chrome **Endo** skeletons with red eyes (Heavy).
    - **Runners** in shades (Scout).
    - **Techs** in welding goggles (Engineer).
    - Armoured cyborg **Enforcers** (Sniper).
  - **Vehicles:**
    - **Cruiser:** a hovering police spinner with a flashing light bar (Jeep).
    - **Hunter:** a hulking tracked killing machine with a red-eyed sensor head and twin plasma cannons (Tank).
    - **Walker:** a two-legged enforcement mech with arm cannons and a missile pod (Artillery).
  - **Aircraft:**
    - **Drone:** a twin-turbine aerial hunter-killer with a searchlight (Helicopter).
    - **Dropship:** a heavy VTOL with glowing engine pods (Bomber).
  - **Buildings:** Command tower, Bunker, Pulse Gun, Barrier, Reactor, Factory, Skyport, Girder and Ramp.
  - **Effects:** buildings go up behind a holographic frame, shots are plasma bolts and missiles, and fallen machines leave chrome scrap.
  - **Menus:** the interface switches to dark steel and neon, and units appear as their own pixel-art sprites.
  - **Sides:** the army is split in two.
    - **The Resistance** (Humans) has:
      - **Rebel**, a taped-up **Gunner**, **Runner**, **Tech** and **Enforcer**.
      - The spinner **Cruiser**, a **Scrap Truck**, a **Rocket Pickup**, a **Gunship** and a **Patchwork VTOL**.
      - A ruined-block **Bunker HQ** with a barking guard dog, a **Sewer Den**, a coughing **Scrap Generator** and a **Scrapyard**.
      - A frankly worrying amount of duct tape.
    - **The Machines** have:
      - Chrome **Troopers**, the **Endo**, **Spider-Bots**, **Repair-Bots** and the **Infiltrator**, whose human disguise (wig, sunglasses at night, moustache, coat too short for its chrome shins) fools nobody.
      - A **Prowler** bike, the **Hunter**, **Walker**, **Drone** and **Dropship**.
      - **The Core** (a server ziggurat with a throbbing red eye), an **Assembly Line**, a **Power Plant**, a **Sensor Tower**, a **Firewall** that is literally on fire, and a **Robot Factory**.
      - Machines fall as chrome scrap.

- **Medieval:** castles and siege engines on rolling green hills, with blue mountains, distant castles, a village with turning windmills, and birds overhead.
  - **Infantry:**
    - **Men-at-Arms** with spears and team tabards (Soldier).
    - **Knights** in plate with plumed helms and heraldic shields (Heavy).
    - Sickly **Plague Carriers** ringing their bells (Scout).
    - **Peasants** in straw hats who mend your buildings (Engineer).
    - **Longbow** archers (Sniper).
  - **Siege and mounts:**
    - **Horseman:** a lancer (Jeep).
    - **Catapult** (Tank).
    - **Trebuchet** (Artillery).
  - **Air:**
    - **Griffin** riders (Helicopter).
    - Fire-dropping **Dragons** in team colours (Bomber).
  - **Buildings:** Castle, Barracks, Tower, Wall, Well (with a bucket going up and down), Siege Works, Aerie, Bridge and Steps.
  - **Effects:** arrows, boulders and fireballs, and timber scaffolding while building.
  - **Menus:** oak, parchment and royal red.
  - **Sides:** play as **the Kingdom** (Knights: everything above) or **the Vikings**. Historians say real Vikings never wore horned helmets; nobody told these ones. The Vikings have:
    - **Shieldmaidens**, **Berserkers**, a **Speedy Skald** singing as he runs, a **Shipwright** and an **Axe Flinger**.
    - A **Goat Cart**, a **Landlubber Longship** on wheels, the **Mead-a-Pult**, a **Raven Rider** and a **Flying Longship** whose crew rows thin air.
    - A dragon-gabled **Mead Hall**, a turf-roofed **Longhouse**, a frothing **Mead Brewery**, a **Shield Wall** and a **Boathouse**.
    - Ammunition is spinning hand-axes, mead barrels and herring.

- **Gangsters:** 1930s Chicago at dusk with a Bugsy Malone-style twist: the guns splurge custard, and nobody gets hurt, they just get splatted.
  - **Setting:** an art-deco skyline under a premiere spotlight, brick tenements with water towers and billboards, an elevated railway with a train rattling past, and streetlamps. The pavement has fire hydrants and dropped newspapers, and the platforms are L-train girders.
  - **Infantry:**
    - **Hoods** in pinstripes and fedoras with custard tommy guns (Soldier).
    - **Muscle** with a custard blunderbuss (Heavy).
    - **Newsies** with a pie to throw (Scout).
    - **Mechanics** (Engineer).
    - Trench-coated **Hitmen** (Sniper).
  - **Vehicles:**
    - **Getaway Car** with whitewall tyres (Jeep).
    - **Pie Wagon** with a custard cannon on the roof (Tank).
    - **Pie Lobber**, a truck-mounted pie catapult (Artillery).
  - **Air:**
    - **Autogyro** (Helicopter).
    - **Blimp** dropping pies (Bomber).
  - **Buildings:**
    - A **Speakeasy** with a neon sign and chasing marquee lights (HQ).
    - **Pool Hall**, a water-tower **Lookout**, stacked **Crates**, a **Bakery** for income, a **Garage**, a blimp **Air Dock**, a **Fire Escape** and **Stairs**.
  - **Effects:** shots are custard blobs, cream pies and cakes that land with a SPLAT, and splatted gangsters sit in a puddle of custard.
  - **Menus:** art-deco black, gold and burgundy.
  - **Sides:** play as **the Mob** (everything above) or **the Feds**, who fire custard too. The Feds have:
    - **G-Men** in trench coats, a **Dry Agent** with a seized-barrel custard cannon, a **Stool Pigeon** in a tiny fedora, the **Accountant** (the Feds' secret weapon: the Mob always slips up on the tax forms) and a **Marksman**.
    - A **Squad Car**, a barred **Paddy Wagon**, a **Pie Trebuchet**, a float **Seaplane** and the **Bureau Blimp**.
    - The marble **Bureau**, an **Academy**, a **Tax Office** that spits out forms, a **Roadblock**, an **Evidence Locker** and a **Searchlight** tower.

- **Warring States:** China, c. 475–221 BC: seven kingdoms fighting across loess plains.
  - **Setting:** ink-wash karst peaks in layers of mist, a red sun, cranes, bamboo groves and gnarled pines. The ground is layered yellow loess, and the platforms are grey cliff ledges.
  - **Infantry:**
    - Terracotta-army-style **Halberdiers** with dagger-axes (Soldier).
    - Bronze-helmed **Guardsmen** with painted shields (Heavy).
    - **Spies** in conical straw hats (Scout).
    - **Mohist** engineers with mallets (Engineer).
    - **Crossbow**men (Sniper).
  - **Vehicles:**
    - **Chariot** with a horse, a big spoked wheel, a driver, an archer and a team banner (Jeep).
    - **Bolt Cart**, a giant crossbow on wheels (Tank).
    - **Stone Thrower**, a traction trebuchet (Artillery).
  - **Air:**
    - **War Kite**, a wooden bird with an archer slung below (Helicopter).
    - **Sky Lantern** dropping fire pots (Bomber).
  - **Buildings:**
    - A **Palace** with two-tier upturned roofs on red pillars (HQ).
    - **Garrison** (Barracks).
    - **Watchtower** (Turret).
    - Rammed-earth **Rampart** (Wall).
    - **Foundry** with a glowing furnace and bronze spade coins (Mine).
    - **Arsenal** (Workshop).
    - Bamboo **Kite Tower** (Airbase).
    - **Bridge** with a vermilion rail, and stone **Steps** (Ramp).
  - **Effects:** shots are crossbow bolts, great bolts, stones and fire pots.
  - **Menus:** black lacquer, vermilion and gold.
  - **Sides:** all seven kingdoms, each with its own colours, headgear, signature units, palace, barracks and income building. Online games with three or more players can field several.
    - **Qin** (everything above): standard axles, standard coins, a Terracotta Guard and a Coin Foundry. Even the jokes are regulation length.
    - **Chu:** black-and-red lacquer, an antlered **Shaman**, a **Dragon Boat** on wheels, a **Zongzi Lobber** and a steaming Zongzi Kitchen.
    - **Qi:** salt and iron by the sea. A **Debater** who fires speech bubbles, a **Land Junk**, Salt Pans and the **Jixia Academy**, where two tiny scholars argue forever.
    - **Zhao:** King Wuling's trousers reform. **Horse Archers**, a **Not-a-Chariot**, Stables and a **Trouser Tailor**.
    - **Yan:** the frozen north. Fur hats, a **Horse Sled**, a **Snowball Engine**, its own Northern Wall and a Snow Palace with a snowman.
    - **Wei:** Wuzu infantry in full iron with three days' food on their backs, a **Ration Runner**, the **Iron Tortoise** and a Canal Toll.
    - **Han:** the smallest kingdom and nervous about it. A **Nervous Lookout**, the **Best Crossbow**, a **Triple Crossbow** cart and a **Tiny Palace** squeezed between two huge walls.

- **Steam Shogun:** Japanese steampunk: an Edo-period Japan powered by brass boilers and clockwork.
  - **Setting:** a sunset sky with a great red sun, Mount Fuji, koi airships drifting past, and a far town of pagodas and smoking factories. Cherry trees and torii gates stand in front, and blossom petals drift across everything. Brass pipes run through the earth, and the platforms are brass girders.
  - **Infantry:**
    - **Ashigaru** in jingasa hats with back banners and brass rifles (Soldier).
    - **Steam Samurai** with boiler backpacks and katanas (Heavy).
    - **Ninja** (Scout).
    - **Tinkerer**s with wrenches (Engineer).
    - **Teppo** marksmen (Sniper).
  - **Vehicles:**
    - Steam-driven **Rickshaw** (Jeep).
    - **Kabuto Tank**, a walking beetle (Tank).
    - **Hanabi Mortar**, which fires fireworks (Artillery).
  - **Air:**
    - **Tengu Flyer** with flapping wings (Helicopter).
    - **Koi Airship** (Bomber).
  - **Buildings:**
    - A **Castle** on stone walls with gold finials and a great gear (HQ).
    - **Dojo** (Barracks).
    - **Yagura** gatling tower (Turret).
    - **Ishigaki** stone wall (Wall).
    - **Boiler** with pressure gauges (Mine).
    - **Karakuri Works** (Workshop).
    - **Sky Dock** flying koinobori (Airbase).
    - Red **Taiko Bridge** and **Steps** (Ramp).
  - **Effects:** shots are brass slugs, fused bombs, firework shells and cannonballs. Explosions burst like hanabi fireworks.
  - **Menus:** black lacquer, brass and vermilion.
  - **Sides:** play as **the Shogunate** (everything above) or **the Sky Pirates**, a rowdy crew of goggled air-pirates. The pirates have:
    - **Deckhands** with propeller tricorns, a **Boiler-Belly** brute, a clockwork **Robo-Parrot**, a **Grease Monkey** (an actual monkey) and a **Spyglass** sharpshooter.
    - A pig-nosed **Steam Hog**, a **Land Galleon** on cog wheels, the **Broadside Wagon**, the **Gyro-Gull** and a **Patchwork Zeppelin**.
    - A crashed-zeppelin **Pirate Cove**, the **Grog Hall** (ginger beer only), a **Crow's Nest**, a **Barrel Stack**, a **Plunder Pile**, a **Salvage Yard** and a **Sky Harbour**.

- **Winter War:** Finland, 1939–40: ski troops in white snowsuits fighting at minus forty in the spruce forests, where motti tactics, Molotov cocktails and sisu held off a giant.
  - **Setting:** a starry night under shimmering northern lights and a crescent moon. Snowy hills and dark spruce forest roll away, birches and snow-laden spruces stand in front, and now and then a little sauna cabin puffs smoke. Snow falls steadily. The ground is frozen earth under deep snow, and the platforms are snow-capped granite ledges.
  - **Infantry:**
    - **Ski Trooper**s in hooded white snowsuits with Suomi submachine guns (Soldier).
    - **Tank Hunter**s in fur hats with a satchel charge and a lit Molotov cocktail held high (Heavy).
    - **Ski Patrol** on long wooden skis with poles (Scout).
    - **Sapper**s with an axe and a log for jamming tank tracks (Engineer).
    - The **White Death**, a snowsuited marksman with an iron-sighted rifle and a scarf over the face (Sniper).
  - **Vehicles:**
    - **Reindeer Sled**, a pulka with a machine gunner, hauled by a reindeer in a team-coloured blanket (Jeep).
    - **Trophy Tank**, a captured tank whitewashed, repainted in its new owners' colours, and fitted with a stovepipe for the cold (Tank).
    - **Motti Mortar**, a mortar on a ski sledge with a "motti" of firewood stacked behind (Artillery).
  - **Air:**
    - **Ski Fokker**, a fighter on skis (Helicopter).
    - **Blenheim**, a bomber also on skis (Bomber).
  - **Buildings:**
    - A log **Korsu** command post under a deep blanket of snow, with warm windows, a radio mast and a flag (HQ).
    - The **Sauna**, puffing steam from the chimney and the door, with a birch whisk on the wall (Barracks). Every soldier starts here.
    - **Maxim Nest** (Turret).
    - **Granite Line** anti-tank rocks (Wall).
    - **Soup Cannon** field kitchen with the coffee pot on (Mine).
    - **Trophy Yard**, with a tally of captured tanks painted on the wall (Workshop).
    - **Ice Airfield** on a frozen lake with a camouflaged hangar and a windsock (Airbase).
    - **Log Bridge**, and a **Ski Jump** (Ramp).
  - **Effects:** shots are tracers, mortar bombs and tank shells. Every blast throws up a fountain of snow.
  - **Menus:** midnight blue, snow white and Finnish blue.
  - **Sides:** play as **Finland** (everything above) or **the Soviet Union**, who arrived in summer uniforms (in winter) with a brass band packed for the victory parade:
    - **Comrade**s in khaki greatcoats and pointy budenovka hats, with rosy cold noses (Soldier).
    - A **Commissar** in a leather coat with a megaphone (Heavy).
    - The **Brass Band**: a tuba player (Scout).
    - **Sapper** with a pickaxe (Engineer).
    - **Marksman** (Sniper).
    - **Aerosan** propeller sledge (Jeep).
    - **T-28 (3 Turrets)** (Tank).
    - **Howitzer** (Artillery).
    - **Ishak (Donkey)**, the stubby I-16 fighter's real nickname (Helicopter).
    - **Bread Basket** bomber (Bomber).
    - A **Command Izba** with an onion-domed cupola (HQ).
    - A **Loudspeaker Tent** broadcasting surrender appeals (Barracks).
    - **Barbed Wire** (Wall).
    - A **Samovar Cart** (Mine).
    - A **Tank Depot**, with no tally of captured tanks to paint (Workshop).
    - The Maxim Nest and Ice Airfield are shared, and the ramp becomes the **Slippery Slope**.

- **Cartel Wars:** an 80s action-movie turf war on the border, with fictional outfits only. No real cartels or people appear, and the only "product" on show is tacos.
  - **Setting:** a neon synthwave sunset with a big striped sun, mesas and buttes, and a border town with a domed church and a water tower. A helicopter silhouette drifts past, palms and saguaros stand in front, and desert dust drifts in the heat. The ground is red earth under sand, and the platforms are rusty shipping containers.
  - **Infantry:**
    - **Gunman** in an open Hawaiian shirt, aviators and a gold chain (Soldier).
    - **Enforcer** in a balaclava and plate carrier with a belt-fed gun (Heavy).
    - **Lookout** with a team cap and a walkie-talkie (Scout).
    - **Mechanic** in greasy overalls with a big wrench (Engineer).
    - **Sicario** in a white suit and sunglasses with a scoped rifle (Sniper).
  - **Vehicles:**
    - **Technical**, a pickup with a machine gun in the bed (Jeep).
    - **Monstruo**, a homemade armoured truck of welded plate (Tank).
    - **Rocket Truck** with a rack of improvised rockets (Artillery).
  - **Air:**
    - **Narco Chopper** (Helicopter).
    - **Smuggler Plane** (Bomber).
  - **Buildings:**
    - A **Hacienda** with terracotta roofs, arches, a bell tower, golden gates and palms (HQ).
    - **Safe House** of cinderblock (Barracks).
    - **Watchtower** with a sweeping spotlight (Turret).
    - **Sandbags** (Wall).
    - A perfectly legitimate **Taco Stand** with a green neon "$" in the window (Mine).
    - **Chop Shop** (Workshop).
    - **Airstrip** (Airbase).
    - **Plank Bridge** and **Loading Ramp** (Ramp).
  - **Effects:** shots are tracers, tank shells, improvised rockets and bombs.
  - **Menus:** neon pink, teal and sunset gold.
  - **Sides:** play as **the Cartel** (everything above) or **the Cops**, straight out of an 80s cop show:
    - **Vice Cop**s in pastel blazers and aviators (Soldier).
    - **SWAT** with a riot shield (Heavy).
    - **K-9**, a police dog in a team vest (Scout).
    - **Forensics** in white coveralls with a camera (Engineer).
    - **Sharpshooter** (Sniper).
    - **Police Cruiser** with a lightbar (Jeep).
    - **SWAT Truck** (Tank).
    - **Riot Van** (Artillery).
    - **Police Chopper** (Helicopter).
    - **Police Blimp** (Bomber).
    - A brick **Precinct** with blinking blue lamps (HQ).
    - The **Police Academy** (Barracks).
    - A **Checkpoint** (Turret).
    - **Barricade** (Wall).
    - A **Donut Shop** with a giant glowing donut on the roof (Mine).
    - An **Impound Lot** (Workshop).
    - The airstrip, bridge and ramp are shared.

- **Trade Wars:** a political satire of Donald Trump's tariffs and how they backfired. He appears as a caricature (orange tan, swoop of yellow hair, pale goggle marks and an endless red tie) on the HQ billboard, and as a floating baby balloon. He is never a combat unit. Fallen units are just knocked flat, with no blood.
  - **Setting:** a bright Washington sky with the baby balloon bobbing over a skyline of a domed capitol, towers, and stock boards whose line only goes down. The ground is immaculate striped golf turf with topiary and water hazards, and the water hazards hold ice floes of tariffed penguins. Price tags flutter down from the sky. The platforms are gilded marble ledges.
  - **Infantry:**
    - **Tariff Agent**s in navy customs uniforms (Soldier).
    - **Steel Tariff** steelworkers with I-beam cannons (Heavy).
    - **Penguin**s from the islands that got tariffed, in team scarves (Scout).
    - **Lobbyist**s with briefcases (Engineer).
    - **Economist**s who saw it all coming from miles away (Sniper).
  - **Vehicles:**
    - **Golf Cart** with a golf-ball gun (Jeep).
    - **Golden Tank** with spinner rims (Tank).
    - **Tariff Launcher**, which lobs giant percentage signs (Artillery).
  - **Air:**
    - **Spin Copter** (Helicopter).
    - **Hot Air Blimp** wearing a yellow comb-over (Bomber).
  - **Buildings:**
    - The **Golden Tower**, whose billboard tie reaches all the way to the door and whose eyes shift about (HQ).
    - **Rally Tent** (Barracks).
    - **Tariff Booth** (Turret).
    - The **Beautiful Wall**, with a slightly taller ladder leaning on it (Wall).
    - The **Golf Resort**, which is where the money actually comes from (Mine).
    - **Factory (Soon)**, boarded up under a "coming soon" clock banner (Workshop).
    - **Gilded Helipad** (Airbase).
    - **Burned Bridge** (Bridge) and **Price Ramp**, where everything only goes up (Ramp).
  - **Effects:** blasts burst into red, white, blue and gold confetti.
  - **Menus:** gold, red and navy. Tagline: "The other countries pay. Believe me."
  - **Sides:** a six-way trade war, made for online games with several players. Only the USA has a caricature: the other sides satirise policies and products, not people.
    - **The USA:** everything above.
    - **China:**
      - **Dock Hands**, a **Magnet Gunner** firing rare-earth magnets, a **Panda**, a **Solar Fitter** and a **Bullet Trainer**.
      - An **EV Runabout**, a **Container Crawler**, the **Soy Return Catapult** (soybeans, returned to sender), a **Delivery Drone** and a **Dragon Kite**.
      - A **Mega Factory**, a **Night Shift Dorm**, a **Solar Sentry**, a **Container Wall**, a **Rare Earth Mine**, an **EV Gigaplant** and a **Container Port**.
    - **Canada** (elbows up):
      - **Mounties**, a **Goalie**, a **Moose**, a **Lumberjack** and a **Slapshooter**.
      - A **Zamboni**, a **Syrup Tanker**, a **Puck Launcher**, the **Honk Patrol** (a goose) and a **Bush Beaver** plane.
      - **Maple Parliament**, a **Log Cabin**, a **Goal Net**, a **Beaver Dam**, the **Syrup Reserve**, the **Bourbon-Free Shop** and a **Borrowed Helipad**.
    - **The EU:**
      - **Eurocrats**, a **Rubber Stamper**, a rolling **Brie Runner**, a **Regulator** and a **Sommelier**.
      - A **Vespa Patrol**, a filing-cabinet **Regulation Tank**, a **Champagne Cannon**, a **Red Tape Copter** and a paper-plane **Directive Glider**.
      - The **Berlaymont**, ringed with gold-star flags, a **Committee Room**, an **Approval Desk**, **Red Tape**, a **Fines Office**, a **Factory (Pending)** and a **Shared Helipad**.
    - **Mexico**:
      - **Frontera Agents**, a masked **Luchador**, a **Chihuahua** on patrol, an **Albañil** and a **Coyote**.
      - A **Lowrider**, a **Taco Truck** with a chilli-pepper gun, the **Avocado Launcher**, a **Chupacabra** and a **Piñata Blimp** dropping candy.
      - A **Palacio Federal**, a **Cantina**, a **Frontera Watchtower**, the **Invoiced Wall** (sent back, twice), an **Avocado Grove** and a **Lowrider Garage**.
    - **The UK** (the special relationship is ringing, but nobody answers):
      - **Border Force Officers**, a **Beefeater**, a rolling **Cuppa**, a **Flat Cap** and **Sherlock**.
      - A **Black Cab**, a **Double Decker** on tracks, **Big Ben** lobbing bongs, a **Spitfire** and the **Brexit Blimp** trailing the border queue.
      - **The Special Relationship**, **The King's Head** pub, a gun-toting **Phone Box**, a **Queue Barrier** wall, a **Tea Room** and a **Jaguar Plant**.

- **Civil War:** 1861–65, played for laughs, and the first theme where you **choose a side**. The Confederate battle flag is left out: both sides fly flags in their team colour. Fallen soldiers are just knocked flat, with their hat beside them.
  - **Setting:** a summer sky over rolling Virginia farmland with red barns, white churches and zig-zag split-rail fences. Distant cannon smoke puffs up, and picnickers watch from the hill with a parasol and a hamper, as spectators really did at Bull Run. Gunsmoke drifts across the field. The ground is grassy earth, and the platforms are rocky ridges.
  - **The Union** (blue coats, sky-blue trousers, kepis):
    - **Bluecoat** (Soldier).
    - **Zouave** in a red fez and baggy red trousers (Heavy).
    - **Cavalry** (Scout).
    - **Pioneer** with a shovel (Engineer).
    - **Sharpshooter** in Berdan green (Sniper).
    - **Gatling Wagon** (Jeep).
    - **Land Monitor**, a cheesebox turret on a raft on wheels (Tank).
    - **The Dictator**, a huge mortar on a railway flatcar (Artillery).
    - **Balloon Corps** (Helicopter).
    - **Aereon Airship** (Bomber).
    - The **Capitol (Unfinished)**, its dome half-built under a crane as it really was (HQ).
    - **Breastworks** (Wall).
    - **Greenback Press** (Mine).
    - **Foundry** (Workshop).
  - **The Confederacy** (grey coats, butternut trousers, slouch hats):
    - **Greyback** (Soldier).
    - **Tiger Zouave** in striped trousers (Heavy).
    - **Plumed Cavalry** (Scout).
    - **Sapper** (Engineer).
    - **Whitworth Marksman** with a scope as long as his arm (Sniper).
    - **Mule Howitzer** (Jeep).
    - **Land Merrimack**, a sloping iron shed with a smokestack (Tank).
    - **Napoleon** bronze field gun (Artillery).
    - **Silk Dress Balloon**, patched together from donated dresses (Helicopter).
    - **Flying Hunley**, a hand-cranked submarine dangling under a balloon (Bomber).
    - A grey stone **Statehouse** (HQ).
    - **Stone Wall** (Wall).
    - **Paper Money Press**, which prints ever more money (Mine).
    - **Tredegar Works** (Workshop).
  - **Shared buildings:** Sibley-tent **Muster Tents**, an earthwork **Battery**, a **Balloon Yard**, a **Pontoon Bridge** and a **Plank Ramp**.
  - **Effects:** Minié balls, cannonballs, fused bombs and mortar shells under clouds of gunsmoke.
  - **Menus:** Union blue, grey and gold. Tagline: "Brother against brother. Beard against beard." Each side has its own victory and defeat one-liners.
- **Ghost Wars:** a haunted night out at the movies, loosely after Ghostbusters, Poltergeist, The Sixth Sense and The Ring. Nobody is named: it's all nods.
  - **Setting:** a starry night under a full moon, with little ghosts drifting across it. A city skyline glows on the horizon, and a beam of light now and then shoots up from the temple on top of one tower. Haunted houses and dead trees line the hills, with iron railings, leaning headstones and a glowing well in front. Fog rolls low over the field and will-o'-the-wisps bob about. The ground is graveyard soil under dead grass (with the odd bone), the platforms are mossy crypt masonry, and the surface has tiny headstones, candles and glowing toadstools.
  - **The Busters** (beige jumpsuits and proton packs):
    - **Buster** with a proton wand (Soldier).
    - **Proton Heavy** with a bigger pack and a hard hat (Heavy).
    - **Kid Who Sees**, with a torch and very wide eyes (Scout).
    - **Parapsychologist** with a meter, its arms up (Engineer).
    - **Psychic Medium** in pearls with a crystal ball (Sniper).
    - **Spook Wagon**, a tail-finned 1959 ambulance (Jeep).
    - **Containment Truck** hauling a tank of trapped ghosts (Tank).
    - **Slime Mortar** (Artillery).
    - **Spook Copter** (Helicopter).
    - **Trap Blimp**, which drops ghost traps (Bomber).
    - The **Old Firehouse** (HQ), a **Recruiting Office** whose phone never stops ringing (Barracks), a crackling **Proton Tower** (Turret), a **Laser Fence** (Wall), the **Containment Unit**, billed by the ghost (Mine), a **Gadget Garage** with a Tesla coil (Workshop), a **Rooftop Pad** (Airbase) and a **Steel Gantry** (Bridge).
  - **The Ghosts:**
    - **Sheet Ghost** (Soldier).
    - **Glutton**, a green blob of slime (Heavy).
    - **Headless Horseman** with his jack-o'-lantern (Scout).
    - **Poltergeist**, with a chair floating beside it (Engineer).
    - **Girl in the Well** (Sniper).
    - **Phantom Hearse** with a see-through driver (Jeep).
    - **Marshmallow Giant** in a sailor's collar (Tank).
    - **Cursed TV** on a squeaky trolley, which lobs videotapes (Artillery).
    - **Clown Doll**, floating (Helicopter).
    - **Ghost Ship**, a spectral galleon dropping jack-o'-lanterns (Bomber).
    - The **Haunted Mansion**, where a face sometimes appears at the attic window (HQ), a **Graveyard** with a hand coming up for air (Barracks), a **Grabbing Tree** (Turret), a **Headstone** (Wall), the **Cursed Well** (Mine), a **Video Store** (Workshop), a **Bell Tower** with bats (Airbase) and **Rotten Planks** (Bridge).
  - **Effects:** proton streams and slime globs, and blasts splash green. Fallen Busters lie slimed; fallen ghosts leave an empty sheet (or a puddle).
  - **Menus:** night purple and slime green under a full moon. Tagline: "I see dead people. Lots of them. In formation." Each side has its own victory and defeat one-liners.
- **Alien Wars:** a stormy colony moon, loosely after Aliens, with Mars Attacks and ALF thrown in to keep it comic.
  - **Setting:** a ringed gas giant hangs in a murky sky, storm clouds roll past and lightning flickers. Saucers lurk in the distance, and the colony's atmosphere processors puff steam and blink on the horizon behind rock spires, crates and pipes. Rain drives sideways. The ground is volcanic rock under ash, the platforms are steel deck plating with hazard edges, and once in a while a nervous cat sits on the surface.
  - **The Colonial Marines** (olive armour, helmets with headlamps):
    - **Marine** with a pulse rifle (Soldier).
    - **Smartgunner** with a red eyepiece (Heavy).
    - **Tracker** with a beeping motion tracker (Scout).
    - **Synthetic** in white, doing the knife trick (Engineer).
    - **Marksman** (Sniper).
    - **Recon Buggy** (Jeep).
    - **APC** (Tank).
    - **Power Loader**, which throws cargo crates (Artillery).
    - **Gunship** (Helicopter).
    - **Dropship** (Bomber).
    - The **Ops Centre** (HQ), a **Cryo Bay** (Barracks), a remote **Sentry Gun** whose ammo counter ticks down (Turret), a **Blast Door** (Wall), an **Atmosphere Processor** (Mine), a **Vehicle Bay** (Workshop), a **Landing Pad** (Airbase) and a **Catwalk** (Bridge).
  - **The Aliens**, a hive that has teamed up with the Martians:
    - **Martian Trooper**, a big brain in a glass dome with a ray gun (Soldier).
    - **Xeno Warrior** (Heavy).
    - **Facehugger** (Scout).
    - **Melmacian**, a furry engineer with a wrench (Engineer).
    - **Spitter**, which spits acid (Sniper).
    - **Hover Scooter** (Jeep).
    - **Hive Queen** (Tank).
    - **Egg Launcher** (Artillery).
    - **Flying Saucer** (Helicopter).
    - **Mothership** (Bomber).
    - **The Hive**, with a Martian flag planted on top (HQ), an **Egg Chamber** (Barracks), a **Ray Gun Tower** (Turret), a **Resin Wall** (Wall), a **Cow Abductor** (Mine), a **Brain Lab** (Workshop), a **Saucer Dock** (Airbase) and a **Resin Bridge** (Bridge).
  - **Effects:** pulse-rifle tracers and ray-gun zaps, thrown crates and lobbed eggs, and acid globs. Nobody bleeds: fallen marines lie flat beside their helmet, Martians leave a cracked dome and xenos leave a fizzing puddle.
  - **Menus:** olive, gunmetal and hazard yellow. Tagline: "They mostly come at night. Mostly. Ack ack!" Each side has its own victory and defeat one-liners.

Each theme is one file in `js/themes/`. A theme can also replace the explosion drawing (`explode`). It supplies the palette, sprites, tiles, backdrop, effects and unit names, so adding another theme means adding a file and listing it in `THEMES` in `js/render.js`.

## Choosing sides

Some themes split their armies into **sides**: the Union or the Confederacy in Civil War, Finns or Soviets in Winter War, the Cartel or the Cops in Cartel Wars, the Mob or the Feds in Gangsters, Knights or Vikings in Medieval, Humans or Machines in Rise of the Robots, the USA, China, Canada, the EU, Mexico or the UK in Trade Wars, the Shogunate or the Sky Pirates in Steam Shogun, any of the seven kingdoms in Warring States, the Busters or the Ghosts in Ghost Wars, and the Colonial Marines or the Aliens in Alien Wars. Under the **Theme** button, the title screen shows which sides a theme has.

- **Offline:** tapping a mode opens **Choose your side**. Each card previews that side's troops and vehicles in your team colour. **🎲 Surprise me** picks at random. In **1 vs 1 Local**, Blue picks first and then Red, and Red is steered towards the other side. CPUs take whichever sides are left. Your last pick is remembered for each theme, and **Restart** keeps everyone's sides.
- **Online:** the host's theme is the room's war for everyone, shown at the top of the lobby, and the host can change it with **Change ▸**. Each seat shows its side. Tap your own side to switch it; the host can also set each CPU's side. Guests see the host's war while they're in the room, and their own theme comes back when they leave.
- **Cosmetic only:** sides look, sound and are named differently, but every side has the same units, costs and stats. Your **team colour** (Blue, Red, Green or Yellow) still marks your army, so two players can fight on the same side and still tell each other apart.

**For theme authors:** list `sides: [{ id, name, short, blurb, names?, icons?, win?, lose?, preview? }]` (`preview` picks which units the side's picker card shows) on the theme. Sprite and building painters call `sideOf(f)` (from `pixel.js`) to draw a faction's side, building painters receive the faction as a third argument, and `background` receives the viewing player's side. A theme with fewer than two sides never shows the picker.

## Looping map (multiplayer, 3–5 players)

In online games with three or more players, the battlefield is a loop. Walk, drive or fly off one edge and you come back on the other, and the camera pans endlessly. HQs are spaced evenly around the loop, so every player has a neighbour on each side and nobody gets a safe corner. Units, shots, artillery, aircraft, the minimap and build zones all work across the seam. Orders take the short way round. In 1 vs 1 modes the map still has edges.

Every player in every mode starts with two soldiers in front of their HQ.

## Multiplayer (2–5 players, online)

Play friends on their own devices, anywhere with internet:

1. Everyone opens the game, taps **🌐 Multiplayer (2–5 players)** and types a name.
2. One player taps **Host a game** and gets a 5-letter room code. **Share invite** opens the iOS share sheet with a link that drops friends straight into the lobby.
3. The others type the code and tap **Join**, or open the invite link.

**Lobby.** The lobby has five seats. The host sits in the first one, and each player who joins takes the next **Open** seat. The host can tap an empty seat to switch it between **Open**, **CPU** and **Closed**, and can remove a player with ✕. Each guest taps **Ready**. **Start game** lights up once there are at least two players (people or CPU) and every guest is ready.

**The battle.** The map depends on how many seats are filled:
- 2 players get the normal 1 vs 1 map.
- 3, 4 or 5 players get the looping map.
- In isometric view everyone gets the square field: two in opposite corners, three or four round the corners, five round a pentagon.

Colours follow seat order: Blue, Red, Green, Yellow, Purple. Everyone uses the normal controls. Online games can't be paused. ⏸ opens the menu, but the battle keeps going. The latency shows under your name; the host sees their slowest guest. If your HQ falls while others fight on, you can keep watching. When the battle ends, the host taps **Back to lobby** to bring everyone back for another round. New players can join then too.

**How it works.** The phones connect directly to each other (WebRTC, via the bundled [PeerJS](https://peerjs.com) library). A matchmaking server only introduces them: our own Cloudflare Worker (see [`../relay`](../relay/README.md)), or PeerJS's free public server if ours doesn't answer. The host's phone runs the game, and each guest connects to the host. Guests send their orders and receive the battlefield state about 12 times a second, smoothed between updates. Both players must be on the same app version; the menu shows it.

**Dropped connections.** Phones lose signal, switch between Wi-Fi and mobile data, and lock their screens, so a guest who drops mid-battle keeps their seat:
- Their phone reconnects by itself, for up to a minute, and puts them back where they were. Everyone sees "… lost connection — reconnecting…" and then "… reconnected".
- If they're gone for more than 45 seconds, the CPU looks after their army until they're back, then hands it over again.
- If iOS reloads the page (it does this to apps left in the background), **Rejoin game** on the online menu gets them back in.
- Both ends send a heartbeat every 2 seconds, so a dead link is noticed within about 8 seconds instead of hanging. A phone that was briefly in the background gets a few seconds' grace.
- The screen is kept awake during online battles, because auto-lock is a common cause of drops.
- If a guest's connection is slow, the host skips updates for them rather than piling up a backlog.

**Limits.**
- If a guest leaves on purpose mid-battle, the CPU takes over their army and the game carries on. If the host leaves, the game ends for everyone.
- Players can only join from the lobby, not once a battle has started.
- The host's phone runs the battle, so if the host switches away from the app, the game freezes until they come back. The best phone to host on is one on steady Wi-Fi.
- Some mobile carriers and strict networks block direct connections. With the optional Cloudflare relay set up (see [`../relay`](../relay/README.md)), those games are routed through Cloudflare instead. Without it, put one or both phones on Wi-Fi. The label under your name shows whether a match is `direct` or going through the `relay`.
- Several tabs on one device can play each other without the internet by adding `?net=local` to the URL, which is handy for testing.

## Controls (touch)

| Action | Gesture |
|---|---|
| Pan the battlefield | Drag (with momentum) |
| Zoom | Pinch, or the ＋ / － buttons. Zoom out well past the map height (about 40% of the map in view on a phone) for an overview, with sky above |
| Jump the camera | Tap or drag the minimap |
| Select a unit | Tap it |
| Select all units of a type on screen | Double-tap a unit |
| Select your whole army | **All units** |
| Move | With units selected, tap the ground |
| Attack | With units selected, tap an enemy unit or building |
| Repair | Select engineers, tap a damaged friendly building or vehicle |
| Hold / Charge / Retreat | Buttons in the unit panel |
| Train | Tap your Barracks/Workshop, then tap a unit type |
| Sell | Tap your structure, then **Sell** twice: a full refund while it's still being built, otherwise 50% of its cost scaled by remaining health, plus any queued units. The HQ can't be sold |
| Build | Tap a structure, tap the map to preview (green = valid), tap again or press **Place** |

**Build zone.** New structures must go within 8 tiles (sideways) of one of your HQ, Barracks, Turret, Mine, Workshop or Airbase. While you're placing a structure, the zone is outlined in green (and shaded on the minimap), and everything outside it is dimmed. Walls, bridges and ramps can be built inside the zone but don't extend it, so you can't chain cheap pieces across the map. Turrets do extend it, so you can push your front line forward. The CPU plays by the same rule, and in online games the host checks every placement.

Placement snaps to the surface under your finger. Bridges and ramps stay in placement mode
after each block, so you can lay several in a row.


## Controls (PC)

On a wide window the battlefield fills the screen, the minimap sits under it, and the command
panel runs down the right-hand side, like a 90s PC war game. With a mouse, hints say "click",
every panel button shows its keyboard shortcut, and the build menu ends with a controls reminder.

| Action | Mouse / keyboard |
|---|---|
| Select a unit or building | Left-click it |
| Select a group | Drag a box with the left button |
| Add or remove a unit | Shift-click it (shift-drag adds a box) |
| Select all units of a type on screen | Double-click a unit |
| Select your whole army | <kbd>Q</kbd> |
| Move / attack / repair | Right-click the ground / an enemy / a damaged friendly building or vehicle (left-click works for orders too, as on a phone) |
| Hold / Charge / Retreat / Find | <kbd>H</kbd> / <kbd>C</kbd> / <kbd>R</kbd> / <kbd>F</kbd> |
| Pan | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys, drag with the right or middle button, or scroll sideways on a trackpad |
| Zoom | Mouse wheel (or trackpad pinch), <kbd>+</kbd> / <kbd>-</kbd> |
| Back to your HQ | <kbd>Space</kbd> or <kbd>Home</kbd> |
| Build | <kbd>1</kbd>–<kbd>8</kbd> (or click a structure), point at the battlefield (the preview follows the mouse) and click once. Right-click or <kbd>Esc</kbd> cancels |
| Train | Select a Barracks/Workshop/Airbase, then <kbd>1</kbd>–<kbd>4</kbd> |
| Sell | <kbd>X</kbd> twice |
| Switch player (1 vs 1 Local) | <kbd>Tab</kbd> |
| Deselect, then pause | <kbd>Esc</kbd>; <kbd>P</kbd> pauses, and <kbd>Esc</kbd> or <kbd>P</kbd> resumes |

## HQ keeps

On the side-on map every HQ starts up in a **keep**: a platform on the top row, with a switchback stair of three flights down to the ground on the side facing the middle of the map (always the right-hand side on looping maps). Nobody can rush an HQ across open ground any more: attackers have to climb the stair, so there's time to fortify it. The keep has room for a turret or missile site beside the HQ and a wall across the top of the stair. The stair is part of the map, so it can't be knocked down or sold. Units ordered to attack something up high find their way up stairs and bridges to get it in range. The CPU puts a turret and a wall in its own keep. The isometric field is unchanged: its hills are scenery only, so HQs stay in the corners.

## Walls

Walls (💰50, 1000 HP) block enemy units, and your own troops walk straight through them. Bullets do half damage to walls; tank shells and artillery do full damage. Enemies that run into a wall stop and attack it, then carry on with their orders once it falls. Walls also stop direct fire: bullets and tank shells aimed past a wall hit the wall instead. Lobbed artillery shells arc over walls.

## Unit behaviour

- **Aggressive:** idle units notice enemies 120px beyond their weapon range (220px minimum) and attack them. Units on a move order fight anything that comes into range, then carry on to their destination. Units heading for a building turn on enemy units that come into range.
- **Defensive:** units that get shot hit back. When a unit or building is hit, nearby idle friendlies rally to it. After a chase, idle units return to the spot they left, and they give up a chase after 450px. Idle engineers repair damaged buildings and vehicles nearby.
- **Hold** keeps units in place, and they still fire at anything in range. **Retreat** heads home without stopping to fight.
- Units climb stairs and bridges to reach targets up high. They give up on targets they can't reach at all (for example, something on a platform with no way up) or that they've been stuck trying to reach for 2 seconds.
- **CPU:** units defend their base when it's raided. Otherwise they march on the nearest enemy HQ and fight whatever gets in the way.

## Vehicles (Workshop)

| Vehicle | Cost | Build | Role |
|---|---|---|---|
| 🚙 Jeep | 120 | 6s | Fast raider (240 speed), rapid machine gun |
| Tank | 300 | 12s | 450 HP armour; cannon shells do splash damage (40px), ×1.25 vs buildings |
| Artillery | 260 | 10s | 340 range; lobbed shells land where the target *was*, with big splash (60px), ×1.75 vs buildings. Fragile, so keep it behind your lines |

Vehicles climb ramps just like infantry, and engineers can repair them. From about 90 seconds in, the CPU builds its own Workshop and mixes jeeps, tanks and artillery into its attacks.

## Aircraft (Airbase)

The Airbase costs 300, takes 10s to build and has 300 HP. It's **locked for the first 4 minutes** of a game: its build button shows a 🔒 countdown until then.

| Aircraft | Cost | Build | Role |
|---|---|---|---|
| 🚁 Helicopter | 260 | 10s | Gunship, 220 HP. Flies over walls and terrain and hovers over its target. It can attack ground units and other aircraft. |
| ✈️ Bomber | 400 | 15s | 320 HP. Cruises above the battlefield and makes bombing runs, dropping a splash bomb (110 damage, ×1.6 vs buildings) each time it passes over its target. It can only hit ground targets. |

**Anti-air:** only bullets can hit aircraft, so use infantry, jeeps, helicopters and turrets. Tanks and artillery can't hit aircraft, and ground blasts don't reach them. Bombers fly too high for ground units, so you need turrets (420px anti-air range, 30 damage per shot against aircraft) or helicopters to bring them down. Aircraft take off from the airbase when they're built.

**Missile site (🚀 SAM):** 💰175, 6s, 160 HP. Fires guided surface-to-air missiles at enemy aircraft up to 560px away (75 damage each, one every 2.4s). Missiles leave the rail straight up, then speed up and curve in after their target. It ignores ground units, so pair it with turrets and walls. Every theme and side has its own (a Katyusha battery, a firework stand, Hale rockets, a puck launcher and so on).

Once the airbase unlocks at 4 minutes the CPU builds one and adds helicopters and bombers to its army. It puts up a missile site by its HQ when enemy aircraft appear, and a second if they keep coming.

## Layout

On a phone:

```
┌──────────── safe area (Dynamic Island) ────────────┐
│ 💰 credits  +income/s     YOU · mode         ⏸     │  HUD
├────────────────────────────────────────────────────┤
│                                                    │
│            scrolling battlefield (canvas)          │
│                                          ＋ －     │
├────────────────────────────────────────────────────┤
│ ▬▬ minimap (tap / drag to jump) ▬▬                 │
├────────────────────────────────────────────────────┤
│ Context panel: build grid │ unit orders │ training │
└──────────── safe area (home indicator) ────────────┘
```

On a PC (900 px or wider, landscape):

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 credits  +income/s        YOU · mode           ⏸         │  HUD
├────────────────────────────────────────┬────────────────────┤
│                                        │ Context panel      │
│ scrolling battlefield (canvas)         │ build grid,        │
│                                        │ unit orders or     │
│                                + -       │ training           │
├────────────────────────────────────────┤                    │
│ minimap (click / drag to jump)         │ controls reminder  │
└────────────────────────────────────────┴────────────────────┘
```

## Code map

The `.gd` paths are in the retired Godot project, under `archive/godot-era/godot/scripts/`.

| File | Ported from |
|---|---|
| `js/config.js` | `autoload/game_config.gd` + the stats tables in `unit.gd` / `building.gd` |
| `js/tilemap.js` | `game/tilemap.gd` |
| `js/entities.js` | `entities/unit.gd`, `building.gd`, `projectile.gd` (same AABB physics and ramp step-up) |
| `js/game.js` | `game/game_scene.gd` (economy, AI, spawning, win check) |
| `js/render.js` | `autoload/game_renderer.gd`, `minimap_renderer.gd` (now theme-driven) |
| `js/iso.js` | new: the isometric view (projection, solid 3D buildings and turning 3D units made from the art, draw order, picking, the square field and its minimap) |
| `js/terrain.js` | new: the isometric field's random landscape (hills, river, roads, forests) from a seed |
| `js/pixel.js` | new: pixel-art toolkit and the active palette |
| `js/themes/*.js` | new: Classic, Rise of the Robots, Medieval, Gangsters, Warring States, Steam Shogun, Winter War, Cartel Wars, Trade Wars, Civil War, Ghost Wars and Alien Wars artwork |
| `js/main.js` | new: camera, touch input, HUD and panels, overlays, main loop |

### Differences from the Godot build
- **1 vs 1 Local** is real hot-seat play: the ⇄ button hands control to the other player.
- Game over: you lose when your HQ falls, and you win when every rival HQ is gone. When a
  player's HQ is destroyed, the rest of their units and buildings go with it.
- Buildings can't overlap. The Godot version never recorded building footprints, so
  overlapping was possible there.
- Units measure range to the nearest edge of a building, not to its top-left corner, so you
  can attack a building from either side. Engineers repair friendly buildings.
- The CPU builds toward the middle of the map and adds Heavies to its army after 2 minutes.
