# Turbo Relay

A portrait arcade relay with two rocket couriers and one shared battery. Tap GO LIVE, then SWITCH POWER to send the other courier. Open green gates are passable. A closed gate costs one of three fuses. BRAKE waits when both approaches are red or one bot has docked. A hit stops both bots, so the next move is yours. Dock both to win. Earn three stars by finishing on par without losing a fuse.

Six authored circuits, best scores, earned paint variants and resumable local checkpoints. Space also switches power. Escape pauses. Original procedural Canvas artwork and a 168 BPM synthesized drum and bass track are embedded in both index.html and standalone.html. No remote runtime dependencies.

To rebuild: node build.cjs. Modular development entry: index-source.html. Tests: node tests.mjs, node sdk-tests.mjs, and node controller-tests.mjs.

Reference: Combos ALMOST! by ライム, https://combos.game/zh-CN/play/c1cad8f9fe2569274a66ec02cf850a34 . Its Normal mode Spot Differences and timed transitions were played for short instruction and feedback cadence. Turbo Relay has its own gameplay, art and audio.

Optional GameWave integration uses real committed starts, completed or abandoned rounds, and positive like and direct comment events for paint. Cloud saves store this game's progression, reward flags and preferences. Active round checkpoints use the game's own local key turbo-relay-v1.
