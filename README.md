# Circle Alchemy

> Drag orbs together, watch the universe react. One HTML file. Pure chaos.

---

## Table of Contents

1. [Core Mechanics](#1-core-mechanics)
2. [Battle Modes](#2-battle-modes)
3. [Bosses](#3-bosses)
4. [Orb Categories](#4-orb-categories)
5. [Special Systems](#5-special-systems)
6. [Endgame Content](#6-endgame-content)

---

## 1. Core Mechanics

The foundation of every interaction in the game.

### Orb Fusion

Drag three elemental orbs into the center zone to trigger a fusion reaction. The result depends on which orbs are combined and a touch of randomness.

**Standard fusion outputs:**
| Result | Rarity | Description |
|---|---|---|
| Gold Orb | Common | Stable high-energy fusion |
| Diamond Fusion | Rare (5%) | Crystalline explosion with Diamond Rain |
| Singularity Core | Epic | Micro-gravity field — do not approach |
| Plasma Core | Uncommon | Extreme heat containment |
| Quantum Core | Rare | Superposition flicker — unstable |

### Rare Fusion Events

Certain fusion outcomes trigger dramatic world-altering events:

- **Diamond Rain** — crystalline shards fill the arena after a rare Diamond Fusion
- **Supernova** — a collapsing Singularity detonates in a blinding stellar explosion
- **Black Hole Collapse** — stacking orbs in the center pulls all matter inward; reality warps

### Secret Fusion: The Triastral Event

Align three specific Celestial orbs simultaneously:

**☀ Solar Sovereign + 🌙 Lunar Warden + 🌌 Nebula Monarch → Celestial Awakening**

All three must overlap at the same time. A hidden timer checks for this convergence every frame.

---

## 2. Battle Modes

Seven distinct game modes, each with its own rules and atmosphere.

| Mode | Tab | Summary |
|---|---|---|
| **Fusion** | ✦ FUSION | Core drag-and-fuse loop. Survive meltdowns, build toward Singularity. |
| **Puzzle** | 🧩 PUZZLE | Structured challenges with milestone objectives and boss encounters. |
| **Gravity** | 🌀 GRAVITY | Physics sandbox — orbs orbit, collide, and chain-react under gravity. |
| **Sci-Fi** | ⚡ SCI-FI | Reactor overlay, alien aesthetic, energy-based fusions. |
| **Adventure** | 🗺 ADVENTURE | Zone-based progression. Complete milestones to unlock the next region. |
| **Boss** | 💀 BOSS | Survive escalating boss tiers. Each run increases difficulty. |
| **Orb Fight** | ⚔ ORB FIGHT | Full sandbox battle mode. Spawn any orbs, set up armies, fight bosses. |

### Orb Fight — Detailed

The most feature-rich mode. Players build a Blue team army on the right side and trigger a battle.

**Controls:**
- Spawn panel — select any orb type and click the canvas to place it
- Red Team vs Blue Team — each orb fights autonomously
- Start Battle — locks sides and begins combat
- Zoom Out — shrinks all orbs to 1/3 size; increases army limits (15 Infinities, 3 Prismatics)
- Summon Boss — call a second boss to fight the first mid-battle

**Fight Boss sub-menu:**
- 👾 Mothership → sub-picker: Regular or Oblivion
- 🌌 Omniversal Apex

**Special battle options:**
- Boss vs Boss (e.g. Mothership + Omniversal Apex on opposite sides)
- Infinite Circle battles (high-power endgame orbs)
- Large army battles with hundreds of orbs via randomizers (Simple / Big / Massive presets)

### Adventure Mode — Milestones

Three regions, each ending in a boss fight:

| Region | Final Boss | Reward |
|---|---|---|
| Mars | 🔴 Crimson Core | 100 pts |
| Phobos | ⚡ Iron Sentinel | 130 pts |
| Deep Space | ◉ Void Remnant | 200 pts |

### Boss Mode — Tier Progression

Runs escalate through boss tiers. Each defeated boss increases the next run's difficulty and rewards. Clearing a run unlocks a harder tier.

---

## 3. Bosses

### In-Arena Orb Fight Bosses (spawnable units)

These are large, powerful orbs that can be placed on either team in Orb Fight.

| Name | Key | Traits |
|---|---|---|
| ☠ Gold Tyrant | `boss_tyrant` | Armored, high-damage melee |
| ☠ Void Overlord | `boss_giant` | Massive, gravity pull |
| 🌈 Rainbow Chaos | `boss_rainbow` | Multi-color rapid fire |
| ☠ Void Emperor | `boss_void` | Reality distortion, high HP |
| ⬡ The Ultimate | `boss_ultimate` | Strongest spawnable unit |

### Major Bosses (Fight Boss menu)

---

#### 👾 Mothership

A mechanical sphere fortress. Occupies the left side of the arena. Player spawns their Blue army on the right.

**Abilities:**
- Missile barrages from 8 bay positions on the sphere surface
- 3 rotating defense rings
- Cannon energy beam (horizontal)
- Orb drone deployment
- Arrival portal + cinematic entrance

**Visual design:** Dark metal sphere with hex armor plates, energy veins, central reactor eye, and exhaust thrusters. Damage cracks appear below 50% HP.

---

#### 💀 Oblivion Mothership

The upgraded, harder variant. Selected via the "Which Mothership?" sub-picker.

**Stats:** 200,000 HP

**Abilities (all of the above, plus):**
- Directional laser beam (charges 100 frames before firing)
- Shockwave pulse (knockback + area damage)
- 4 defense rings instead of 3

**Repair Phase System** — triggers at 75%, 50%, and 25% HP:

| Core | Color | Effect while alive |
|---|---|---|
| 🔴 Crimson Repair | Red | Slowly heals the Mothership |
| 🔵 Azure Shield | Blue | Grants full damage immunity |
| 🟢 Emerald Drone | Green | Continuously spawns repair drones |

All three cores must be destroyed to remove the shield. Blue orbs automatically redirect to attack the nearest core during the repair phase.

**Overload Mode** (below 10% HP): attack speed increases, more missiles per salvo.

**Defeat sequence:** Chained explosions, screen darkens, "OBLIVION MOTHERSHIP DESTROYED" banner.

---

#### 🌌 Omniversal Apex

A god-tier cosmic entity. Pure sphere — no mechanical parts.

**Stats:** Scales with canvas (~20% of smaller dimension as radius)

**Abilities:**
- Reality distortion field
- Omnibeam (directional sweep)
- Orbital pull — drags all orbs toward its center
- Cataclysm charge — devastating area burst
- Minion orb creation
- Shrinks all player orbs to 1/5 size on spawn

---

#### Rival Boss System

Any major boss can be summoned as a **rival** mid-battle using the ⚔ SUMMON BOSS button:

- The rival enters from the opposite side
- Supports: Mothership, Oblivion Mothership, Omniversal Apex
- If a battle is already running, the rival auto-starts after its entrance animation

---

## 4. Orb Categories

### Basic Orbs

Standard combat units. Fast to produce, low cost.

| Orb | Team default |
|---|---|
| 🔴 Red Orb | Red |
| 🔵 Blue Orb | Blue |
| 🟢 Green Orb | Either |

### Fusion Orbs

Produced through fusion reactions or directly spawnable in Orb Fight.

| Orb | Notes |
|---|---|
| ✦ Gold | Stable fusion product |
| 💎 Diamond | Rare 5% outcome; triggers Diamond Rain |
| ◉ Singularity | Gravity-warping; triggers Supernova on collapse |
| 🔥 Plasma | High heat, area splash damage |
| ⟨ψ⟩ Quantum | Superposition flickering; unpredictable behavior |

### Celestial Orbs

Extremely powerful cosmic entities. Unlocked in Orb Fight. Can trigger the Triastral secret event.

| Orb | |
|---|---|
| ☀ Solar Sovereign | |
| 🌙 Lunar Warden | |
| 🌌 Nebula Monarch | |
| ⭐ Stellar Titan | |
| ✨ Astral Seraph | |
| 🌟 Celestial Prime | Strongest Celestial |

### Apex-Tier Orbs

Ultra-powerful late-game entities.

| Orb | Notes |
|---|---|
| ∞ Infinite Circle | Annihilation laser activation; 15 max in zoom mode |
| ✦ Prismatic Singularity | Spectrum laser; 3 max; fuses with Infinite for combined beam |
| Test Boss (TB) | Admin-only; tunable arena training dummy |

---

## 5. Special Systems

### Admin Panel

Access via 4-digit code. Unlocks direct spawning of any orb or boss, fusion control, and event triggers.

Spawnable items:
- All fusion orbs (Gold, Diamond, Singularity, Plasma, Quantum)
- All boss orbs (Gold Tyrant → The Ultimate)
- Black Hole, Infinite Circle
- Fusion control override

### Infinity Laser System

When an Infinite Circle or Prismatic Singularity exists on the field, the **ACTIVATE LASER** button appears.

- **∞ Infinity Laser** — fires from each Infinite orb's position
- **✦ Spectrum Laser** — prismatic multi-angle beam
- **⚡ Combined** — both types fire simultaneously in a coordinated burst
- Charge phase (2s) → fire phase → cooldown

### Meltdown System

If fusion energy becomes unstable, a **Meltdown** event triggers:
- Screen warps and distorts
- Meltdown overlay fills with event name (SUPERNOVA, SINGULARITY, etc.)
- Ends in either stabilization or a Black Hole

### Zoom Out System

Available in Orb Fight. Scales all orbs to 1/3 size, expands effective battlefield.

**Effect on limits:**
- Infinite Circles: up to 15 (normally capped lower)
- Prismatics: up to 3
- Boss units scale proportionally
- Mothership and OMS center in their canvas half instead of hugging the edge

---

## 6. Endgame Content

The hardest encounters and most powerful entities in the game. Designed for large armies or carefully built teams.

| Entity | Tier | Notes |
|---|---|---|
| 🌟 Celestial Prime | Celestial | Strongest Celestial orb |
| ∞ Infinite Circle | Apex | Annihilation laser; requires army to support |
| 💀 Oblivion Mothership | Boss | 200k HP; 3 repair phases; overload mode |
| 🌌 Omniversal Apex | Boss | God-tier; shrinks all player orbs; orbital pull |
| Boss vs Boss | Meta | Two major bosses fighting each other simultaneously |

### Recommended Endgame Flow

```
Core Mechanics (learn fusion)
        ↓
Puzzle / Adventure (structured progression, milestone bosses)
        ↓
Boss Mode (escalating tier runs)
        ↓
Orb Fight sandbox (build armies, fight Mothership)
        ↓
Oblivion Mothership (repair phases, multi-phase fight)
        ↓
Omniversal Apex (god-tier encounter)
        ↓
Boss vs Boss + Infinite Circle armies (true endgame)
```

---

## Technical Notes

- **Single file:** The entire game lives in `circles.html` — no build system, no dependencies beyond Google Fonts.
- **Canvas rendering:** Orb Fight uses a `<canvas>` element for all boss and arena drawing. The main fusion mode uses HTML/CSS elements.
- **Audio:** SFX system (`sfx.js`) handles all sound effects via the Web Audio API.
- **Persistence:** Game state uses `localStorage` for mode progress and admin access.
