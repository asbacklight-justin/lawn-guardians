"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlantKey =
  | "sunbud"
  | "spitter"
  | "twinvine"
  | "wallroot"
  | "frostfern"
  | "blastberry";
type Tool = PlantKey | "shovel" | null;
type Phase = "ready" | "playing" | "won" | "lost";

type Plant = {
  id: number;
  type: PlantKey;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  timer: number;
};
type Zombie = {
  id: number;
  kind: "wanderer" | "pothead" | "ironhead";
  row: number;
  x: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  slowFor: number;
};
type Bullet = {
  id: number;
  row: number;
  x: number;
  damage: number;
  slow: boolean;
  variant: "seed" | "twin" | "frost";
};
type Sun = { id: number; x: number; y: number; ttl: number };
type Burst = { id: number; row: number; x: number; ttl: number };
type GameState = {
  phase: Phase;
  paused: boolean;
  speed: 1 | 2;
  sun: number;
  score: number;
  plants: Plant[];
  zombies: Zombie[];
  bullets: Bullet[];
  suns: Sun[];
  bursts: Burst[];
  mowers: boolean[];
  cooldowns: Record<PlantKey, number>;
  elapsed: number;
  nextSpawnAt: number;
  nextSunAt: number;
  spawned: number;
  kills: number;
};

const ROWS = 5;
const COLS = 9;
const TOTAL_ENEMIES = 30;
let entityId = 1;
const uid = () => entityId++;

const PLANTS: Record<
  PlantKey,
  {
    name: string;
    icon: string;
    cost: number;
    cooldown: number;
    hp: number;
    interval: number;
    damage: number;
    description: string;
    hotkey: string;
  }
> = {
  sunbud: {
    name: "暖阳花",
    icon: "🌻",
    cost: 50,
    cooldown: 5,
    hp: 180,
    interval: 7.5,
    damage: 0,
    description: "定期结出 25 点阳光",
    hotkey: "1",
  },
  spitter: {
    name: "豆荚藤",
    icon: "🫛",
    cost: 100,
    cooldown: 5,
    hp: 220,
    interval: 1.45,
    damage: 26,
    description: "向本行敌人发射种子",
    hotkey: "2",
  },
  twinvine: {
    name: "双生藤",
    icon: "🌿",
    cost: 200,
    cooldown: 10,
    hp: 240,
    interval: 1.55,
    damage: 23,
    description: "每次连续发射两颗种子",
    hotkey: "3",
  },
  wallroot: {
    name: "岩壳根",
    icon: "🪨",
    cost: 75,
    cooldown: 18,
    hp: 1100,
    interval: 99,
    damage: 0,
    description: "坚硬厚实，阻挡敌人前进",
    hotkey: "4",
  },
  frostfern: {
    name: "霜叶蕨",
    icon: "❄️",
    cost: 175,
    cooldown: 12,
    hp: 210,
    interval: 1.8,
    damage: 18,
    description: "寒霜种子可使敌人减速",
    hotkey: "5",
  },
  blastberry: {
    name: "爆浆果",
    icon: "🌶️",
    cost: 150,
    cooldown: 22,
    hp: 1,
    interval: 99,
    damage: 460,
    description: "瞬间炸伤附近一整片敌人",
    hotkey: "6",
  },
};

const PLANT_ORDER = Object.keys(PLANTS) as PlantKey[];

const freshGame = (): GameState => ({
  phase: "ready",
  paused: false,
  speed: 1,
  sun: 150,
  score: 0,
  plants: [],
  zombies: [],
  bullets: [],
  suns: [],
  bursts: [],
  mowers: Array(ROWS).fill(true),
  cooldowns: {
    sunbud: 0,
    spitter: 0,
    twinvine: 0,
    wallroot: 0,
    frostfern: 0,
    blastberry: 0,
  },
  elapsed: 0,
  nextSpawnAt: 4,
  nextSunAt: 2,
  spawned: 0,
  kills: 0,
});

function spawnZombie(spawned: number): Zombie {
  const wave = Math.floor(spawned / 10) + 1;
  const roll = Math.random();
  const kind =
    wave === 1
      ? roll < 0.82
        ? "wanderer"
        : "pothead"
      : wave === 2
        ? roll < 0.5
          ? "wanderer"
          : roll < 0.88
            ? "pothead"
            : "ironhead"
        : roll < 0.28
          ? "wanderer"
          : roll < 0.68
            ? "pothead"
            : "ironhead";
  const stats = {
    wanderer: { hp: 190, speed: 0.2, damage: 58 },
    pothead: { hp: 410, speed: 0.15, damage: 64 },
    ironhead: { hp: 720, speed: 0.115, damage: 72 },
  }[kind];
  return {
    id: uid(),
    kind,
    row: Math.floor(Math.random() * ROWS),
    x: 9.35 + Math.random() * 0.35,
    ...stats,
    maxHp: stats.hp,
    slowFor: 0,
  };
}

function stepGame(previous: GameState, dt: number): GameState {
  if (previous.phase !== "playing" || previous.paused) return previous;

  const g: GameState = {
    ...previous,
    elapsed: previous.elapsed + dt,
    cooldowns: { ...previous.cooldowns },
    plants: previous.plants.map((plant) => ({ ...plant })),
    zombies: previous.zombies.map((zombie) => ({ ...zombie })),
    bullets: previous.bullets.map((bullet) => ({ ...bullet })),
    suns: previous.suns.map((sun) => ({ ...sun, ttl: sun.ttl - dt })),
    bursts: previous.bursts.map((burst) => ({ ...burst, ttl: burst.ttl - dt })),
    mowers: [...previous.mowers],
  };

  for (const key of PLANT_ORDER) {
    g.cooldowns[key] = Math.max(0, g.cooldowns[key] - dt);
  }

  if (g.elapsed >= g.nextSunAt) {
    g.suns.push({
      id: uid(),
      x: 0.8 + Math.random() * 7.4,
      y: 0.55 + Math.random() * 3.9,
      ttl: 10,
    });
    g.nextSunAt = g.elapsed + 5.7 + Math.random() * 1.4;
  }
  g.suns = g.suns.filter((sun) => sun.ttl > 0);
  g.bursts = g.bursts.filter((burst) => burst.ttl > 0);

  if (g.spawned < TOTAL_ENEMIES && g.elapsed >= g.nextSpawnAt) {
    g.zombies.push(spawnZombie(g.spawned));
    g.spawned += 1;
    const wave = Math.floor((g.spawned - 1) / 10) + 1;
    const gap = Math.max(1.7, 4.35 - wave * 0.72);
    g.nextSpawnAt = g.elapsed + gap * (0.78 + Math.random() * 0.48);
  }

  for (const plant of g.plants) {
    plant.timer -= dt;
    if (plant.timer > 0) continue;
    const def = PLANTS[plant.type];
    if (plant.type === "sunbud") {
      if (g.suns.length < 12) {
        g.suns.push({
          id: uid(),
          x: plant.col + 0.5,
          y: plant.row + 0.5,
          ttl: 11,
        });
      }
      plant.timer = def.interval;
      continue;
    }
    if (plant.type === "wallroot" || plant.type === "blastberry") continue;
    const hasTarget = g.zombies.some(
      (zombie) => zombie.row === plant.row && zombie.x > plant.col + 0.35,
    );
    if (!hasTarget) {
      plant.timer = 0.2;
      continue;
    }
    const variant =
      plant.type === "frostfern"
        ? "frost"
        : plant.type === "twinvine"
          ? "twin"
          : "seed";
    g.bullets.push({
      id: uid(),
      row: plant.row,
      x: plant.col + 0.72,
      damage: def.damage,
      slow: plant.type === "frostfern",
      variant,
    });
    if (plant.type === "twinvine") {
      g.bullets.push({
        id: uid(),
        row: plant.row,
        x: plant.col + 0.42,
        damage: def.damage,
        slow: false,
        variant: "twin",
      });
    }
    plant.timer = def.interval;
  }

  const survivingBullets: Bullet[] = [];
  for (const bullet of g.bullets) {
    const nextX = bullet.x + 2.8 * dt;
    const hit = g.zombies
      .filter(
        (zombie) =>
          zombie.row === bullet.row &&
          zombie.hp > 0 &&
          zombie.x >= bullet.x - 0.1 &&
          zombie.x <= nextX + 0.35,
      )
      .sort((a, b) => a.x - b.x)[0];
    if (hit) {
      hit.hp -= bullet.damage;
      if (bullet.slow) hit.slowFor = 3.2;
    } else if (nextX < 9.7) {
      survivingBullets.push({ ...bullet, x: nextX });
    }
  }
  g.bullets = survivingBullets;

  for (const zombie of g.zombies) {
    zombie.slowFor = Math.max(0, zombie.slowFor - dt);
    if (zombie.hp <= 0) continue;
    const target = g.plants
      .filter(
        (plant) =>
          plant.row === zombie.row &&
          zombie.x <= plant.col + 1.02 &&
          zombie.x >= plant.col + 0.02,
      )
      .sort((a, b) => b.col - a.col)[0];
    if (target) {
      target.hp -= zombie.damage * dt;
    } else {
      zombie.x -= zombie.speed * (zombie.slowFor > 0 ? 0.48 : 1) * dt;
    }
  }

  g.plants = g.plants.filter((plant) => plant.hp > 0);

  const defeated = g.zombies.filter((zombie) => zombie.hp <= 0);
  if (defeated.length) {
    g.kills += defeated.length;
    g.score += defeated.reduce(
      (total, zombie) =>
        total +
        (zombie.kind === "ironhead"
          ? 260
          : zombie.kind === "pothead"
            ? 150
            : 90),
      0,
    );
  }
  g.zombies = g.zombies.filter((zombie) => zombie.hp > 0);

  for (let row = 0; row < ROWS; row++) {
    if (!g.zombies.some((zombie) => zombie.row === row && zombie.x <= 0.08))
      continue;
    if (g.mowers[row]) {
      const mowed = g.zombies.filter((zombie) => zombie.row === row).length;
      g.zombies = g.zombies.filter((zombie) => zombie.row !== row);
      g.kills += mowed;
      g.score += mowed * 70;
      g.mowers[row] = false;
      g.bursts.push({ id: uid(), row, x: 0.5, ttl: 1.1 });
    } else {
      g.phase = "lost";
      g.paused = false;
      return g;
    }
  }

  if (g.spawned >= TOTAL_ENEMIES && g.zombies.length === 0) {
    g.phase = "won";
    g.paused = false;
    g.score += Math.max(0, Math.round(2500 - g.elapsed * 12));
  }
  return g;
}

function PlantSprite({ type }: { type: PlantKey }) {
  return (
    <span className={`plant-sprite plant-${type}`} aria-hidden="true">
      <span className="plant-glow" />
      <span className="plant-emoji">{PLANTS[type].icon}</span>
    </span>
  );
}

function ZombieSprite({ kind }: { kind: Zombie["kind"] }) {
  return (
    <span className={`zombie-sprite zombie-${kind}`} aria-hidden="true">
      <span className="zombie-hat">
        {kind === "ironhead" ? "▰" : kind === "pothead" ? "▽" : ""}
      </span>
      <span className="zombie-head">◉</span>
      <span className="zombie-body" />
      <span className="zombie-arm" />
    </span>
  );
}

export default function Home() {
  const [game, setGame] = useState<GameState>(() => freshGame());
  const [selected, setSelected] = useState<Tool>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState("");
  const [bestScore, setBestScore] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);

  const tone = useCallback(
    (frequency: number, duration = 0.08, type: OscillatorType = "sine") => {
      if (muted || typeof window === "undefined") return;
      try {
        const AudioCtor =
          window.AudioContext ??
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtor) return;
        const audio = audioRef.current ?? new AudioCtor();
        audioRef.current = audio;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.08, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + duration,
        );
        osc.connect(gain).connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + duration);
      } catch {
        // Audio is an optional enhancement; gameplay should never depend on it.
      }
    },
    [muted],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGame((current) => stepGame(current, 0.05 * current.speed));
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("lawn-guardians-best") || 0);
    setBestScore(stored);
  }, []);

  useEffect(() => {
    if (game.phase !== "won" && game.phase !== "lost") return;
    if (game.score > bestScore) {
      setBestScore(game.score);
      window.localStorage.setItem("lawn-guardians-best", String(game.score));
    }
  }, [game.phase, game.score, bestScore]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key >= "1" && event.key <= "6") {
        setSelected(PLANT_ORDER[Number(event.key) - 1]);
      }
      if (event.key === "Escape") setSelected(null);
      if (event.code === "Space" && game.phase === "playing") {
        event.preventDefault();
        setGame((current) => ({ ...current, paused: !current.paused }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.phase]);

  const wave = Math.min(3, Math.floor(game.spawned / 10) + 1);
  const progress = Math.min(
    100,
    ((game.spawned + game.kills * 0.15) / TOTAL_ENEMIES) * 100,
  );
  const selectedPlant = selected && selected !== "shovel" ? PLANTS[selected] : null;

  const startGame = () => {
    const next = freshGame();
    next.phase = "playing";
    setGame(next);
    setSelected(null);
    setToast("第一波正在靠近……");
    tone(440, 0.12);
    window.setTimeout(() => tone(660, 0.16), 90);
  };

  const chooseTool = (tool: Tool) => {
    setSelected((current) => (current === tool ? null : tool));
    tone(tool === "shovel" ? 210 : 520, 0.05, "triangle");
  };

  const placeAt = (row: number, col: number) => {
    if (game.phase !== "playing" || game.paused) return;
    if (!selected) {
      setToast("先选择一张植物卡片");
      return;
    }
    const occupied = game.plants.find(
      (plant) => plant.row === row && plant.col === col,
    );
    if (selected === "shovel") {
      if (!occupied) {
        setToast("这里没有植物");
        return;
      }
      setGame((current) => ({
        ...current,
        plants: current.plants.filter((plant) => plant.id !== occupied.id),
      }));
      tone(190, 0.08, "sawtooth");
      return;
    }
    const def = PLANTS[selected];
    if (occupied) {
      setToast("这个位置已经种有植物");
      return;
    }
    if (game.sun < def.cost) {
      setToast("阳光不够");
      tone(130, 0.12, "square");
      return;
    }
    if (game.cooldowns[selected] > 0) {
      setToast(`${def.name}还在休息`);
      return;
    }

    const type = selected;
    setGame((current) => {
      if (
        current.sun < def.cost ||
        current.cooldowns[type] > 0 ||
        current.plants.some((plant) => plant.row === row && plant.col === col)
      )
        return current;
      const next = {
        ...current,
        sun: current.sun - def.cost,
        cooldowns: { ...current.cooldowns, [type]: def.cooldown },
        plants: [...current.plants],
        zombies: current.zombies.map((zombie) => ({ ...zombie })),
        bursts: [...current.bursts],
      };
      if (type === "blastberry") {
        let hits = 0;
        for (const zombie of next.zombies) {
          if (zombie.row === row && Math.abs(zombie.x - (col + 0.5)) <= 2.15) {
            zombie.hp -= def.damage;
            hits += 1;
          }
        }
        next.bursts.push({ id: uid(), row, x: col + 0.5, ttl: 0.82 });
        window.setTimeout(() => tone(92, 0.34, "sawtooth"), 0);
        if (!hits) window.setTimeout(() => setToast("爆浆果炸了个空"), 0);
      } else {
        next.plants.push({
          id: uid(),
          type,
          row,
          col,
          hp: def.hp,
          maxHp: def.hp,
          timer: type === "sunbud" ? 4.3 : 0.35,
        });
        window.setTimeout(() => tone(610, 0.08, "triangle"), 0);
      }
      return next;
    });
  };

  const collectSun = (id: number) => {
    setGame((current) => {
      if (!current.suns.some((sun) => sun.id === id)) return current;
      return {
        ...current,
        sun: current.sun + 25,
        score: current.score + 10,
        suns: current.suns.filter((sun) => sun.id !== id),
      };
    });
    tone(880, 0.09, "sine");
    window.setTimeout(() => tone(1180, 0.08, "sine"), 55);
  };

  const cardList = useMemo(
    () =>
      PLANT_ORDER.map((key) => {
        const def = PLANTS[key];
        const cooldown = game.cooldowns[key];
        const disabled = game.sun < def.cost || cooldown > 0;
        return (
          <button
            className={`seed-card ${selected === key ? "selected" : ""} ${disabled ? "unavailable" : ""}`}
            key={key}
            onClick={() => chooseTool(key)}
            aria-pressed={selected === key}
            aria-label={`${def.name}，消耗 ${def.cost} 阳光。${def.description}`}
            title={`${def.hotkey} · ${def.description}`}
          >
            <span className="card-hotkey">{def.hotkey}</span>
            <span className="card-icon" aria-hidden="true">
              {def.icon}
            </span>
            <span className="card-name">{def.name}</span>
            <span className="card-cost">☀ {def.cost}</span>
            {cooldown > 0 && (
              <span
                className="card-cooldown"
                style={{ height: `${(cooldown / def.cooldown) * 100}%` }}
              />
            )}
          </button>
        );
      }),
    [game.cooldowns, game.sun, selected],
  );

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-leaf">✦</span>
          <div>
            <strong>草坪守卫战</strong>
            <small>LAWN GUARDIANS</small>
          </div>
        </div>
        <div className="wave-meter" aria-label={`第 ${wave} 波`}>
          <div className="wave-copy">
            <span>第 {wave} 波 / 3</span>
            <span>{game.kills} 击退</span>
          </div>
          <div className="meter-track">
            <span style={{ width: `${progress}%` }} />
            <i style={{ left: "33.33%" }} />
            <i style={{ left: "66.66%" }} />
          </div>
        </div>
        <div className="top-actions">
          <span className="score-chip">得分 {game.score}</span>
          <button
            className="round-button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "开启音效" : "关闭音效"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            className="round-button"
            onClick={() =>
              setGame((current) => ({
                ...current,
                speed: current.speed === 1 ? 2 : 1,
              }))
            }
            aria-label="切换游戏速度"
          >
            ×{game.speed}
          </button>
          <button
            className="round-button pause-button"
            onClick={() =>
              setGame((current) => ({ ...current, paused: !current.paused }))
            }
            aria-label={game.paused ? "继续游戏" : "暂停游戏"}
          >
            {game.paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </header>

      <section className="plant-tray" aria-label="植物卡片">
        <div className="sun-bank">
          <span className="sun-orb">☀</span>
          <strong>{game.sun}</strong>
          <small>阳光</small>
        </div>
        <div className="seed-scroll">{cardList}</div>
        <button
          className={`shovel-card ${selected === "shovel" ? "selected" : ""}`}
          onClick={() => chooseTool("shovel")}
          aria-pressed={selected === "shovel"}
          title="铲除已经种下的植物"
        >
          <span>♠</span>
          <small>铲子</small>
        </button>
      </section>

      <section className="board-frame">
        <div className="board-scroll">
          <div className="battlefield">
            <aside className="house-zone" aria-hidden="true">
              <div className="house-roof" />
              <div className="house-window">✦</div>
              <div className="house-door" />
              {game.mowers.map((ready, row) => (
                <span
                  key={row}
                  className={`mower ${ready ? "" : "spent"}`}
                  style={{ top: `${(row + 0.5) * 20}%` }}
                >
                  ▰
                </span>
              ))}
            </aside>
            <div className="lawn-stage">
              <div className="lawn-grid">
                {Array.from({ length: ROWS * COLS }, (_, index) => {
                  const row = Math.floor(index / COLS);
                  const col = index % COLS;
                  return (
                    <button
                      key={`${row}-${col}`}
                      className={`lawn-cell ${selectedPlant ? "plantable" : ""}`}
                      onClick={() => placeAt(row, col)}
                      aria-label={`第 ${row + 1} 行，第 ${col + 1} 列`}
                    />
                  );
                })}
              </div>

              {game.plants.map((plant) => (
                <button
                  key={plant.id}
                  className="plant-unit"
                  style={{
                    left: `${((plant.col + 0.5) / COLS) * 100}%`,
                    top: `${((plant.row + 0.5) / ROWS) * 100}%`,
                  }}
                  onClick={() => placeAt(plant.row, plant.col)}
                  aria-label={`${PLANTS[plant.type].name}，生命值 ${Math.ceil(plant.hp)}`}
                >
                  <span className="hp-track">
                    <i style={{ width: `${(plant.hp / plant.maxHp) * 100}%` }} />
                  </span>
                  <PlantSprite type={plant.type} />
                </button>
              ))}

              {game.zombies.map((zombie) => (
                <div
                  key={zombie.id}
                  className={`zombie-unit ${zombie.slowFor > 0 ? "slowed" : ""}`}
                  style={{
                    left: `${(zombie.x / COLS) * 100}%`,
                    top: `${((zombie.row + 0.5) / ROWS) * 100}%`,
                  }}
                  aria-label={`入侵者，生命值 ${Math.ceil(zombie.hp)}`}
                >
                  <span className="hp-track enemy-hp">
                    <i style={{ width: `${(zombie.hp / zombie.maxHp) * 100}%` }} />
                  </span>
                  <ZombieSprite kind={zombie.kind} />
                </div>
              ))}

              {game.bullets.map((bullet) => (
                <span
                  key={bullet.id}
                  className={`bullet bullet-${bullet.variant}`}
                  style={{
                    left: `${(bullet.x / COLS) * 100}%`,
                    top: `${((bullet.row + 0.5) / ROWS) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              ))}

              {game.suns.map((sun) => (
                <button
                  key={sun.id}
                  className="sun-token"
                  style={{
                    left: `${(sun.x / COLS) * 100}%`,
                    top: `${(sun.y / ROWS) * 100}%`,
                  }}
                  onClick={() => collectSun(sun.id)}
                  aria-label="收集 25 点阳光"
                >
                  ☀
                </button>
              ))}

              {game.bursts.map((burst) => (
                <span
                  key={burst.id}
                  className="burst"
                  style={{
                    left: `${(burst.x / COLS) * 100}%`,
                    top: `${((burst.row + 0.5) / ROWS) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              ))}

              <div className="right-fog" aria-hidden="true">
                <span>♱</span>
                <span>♱</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="game-footer">
        <span>
          {selected === "shovel"
            ? "点击草坪上的植物将其铲除"
            : selectedPlant
              ? `已选择 ${selectedPlant.name} · 点击空草格种植`
              : "按 1–6 选植物 · 空格暂停 · Esc 取消选择"}
        </span>
        <span>最高分 {Math.max(bestScore, game.score)}</span>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      {game.phase === "ready" && (
        <section className="game-overlay intro-overlay">
          <div className="intro-art" />
          <div className="intro-vignette" />
          <div className="intro-panel">
            <span className="eyebrow">原创网页塔防游戏</span>
            <h1>
              草坪
              <br />
              守卫战
            </h1>
            <p>
              收集阳光，布置植物防线，在三波越来越强的夜行入侵者面前守住五条草坪。
            </p>
            <button className="primary-button" onClick={startGame}>
              <span>开始守卫</span>
              <b>▶</b>
            </button>
            <div className="intro-tips">
              <span>☀ 点击收集阳光</span>
              <span>🌿 选择卡片后种植</span>
              <span>🏁 击退全部 3 波</span>
            </div>
          </div>
        </section>
      )}

      {game.paused && game.phase === "playing" && (
        <section className="game-overlay pause-overlay">
          <div className="modal-card">
            <span className="modal-icon">🌙</span>
            <h2>花园暂停中</h2>
            <p>植物们正在喘口气。按空格键也可以继续。</p>
            <button
              className="primary-button compact"
              onClick={() =>
                setGame((current) => ({ ...current, paused: false }))
              }
            >
              继续战斗
            </button>
          </div>
        </section>
      )}

      {(game.phase === "won" || game.phase === "lost") && (
        <section className="game-overlay result-overlay">
          <div className={`modal-card result-card ${game.phase}`}>
            <span className="modal-icon">
              {game.phase === "won" ? "🏆" : "🌘"}
            </span>
            <span className="eyebrow">
              {game.phase === "won" ? "花园守住了！" : "防线被突破"}
            </span>
            <h2>{game.phase === "won" ? "黎明到来" : "再试一次"}</h2>
            <div className="result-stats">
              <div>
                <strong>{game.score}</strong>
                <small>本局得分</small>
              </div>
              <div>
                <strong>{game.kills}</strong>
                <small>击退敌人</small>
              </div>
              <div>
                <strong>{Math.floor(game.elapsed)}s</strong>
                <small>坚持时间</small>
              </div>
            </div>
            <button className="primary-button compact" onClick={startGame}>
              再来一局
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
