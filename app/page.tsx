"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlantKey =
  | "sunbud"
  | "spitter"
  | "twinvine"
  | "wallroot"
  | "frostfern"
  | "blastberry"
  | "mooncap";
type Tool = PlantKey | "shovel" | null;
type Phase = "ready" | "playing" | "won" | "lost";
type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type GameMode = "campaign" | "gauntlet";

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
  echo: boolean;
};
type Bullet = {
  id: number;
  row: number;
  x: number;
  damage: number;
  slow: boolean;
  pierce: number;
  hitIds: number[];
  variant: "seed" | "twin" | "frost" | "moon";
};
type Sun = { id: number; x: number; y: number; ttl: number };
type Burst = { id: number; row: number; x: number; ttl: number };
type Tombstone = { id: number; row: number; col: number };
type GameState = {
  level: LevelId;
  mode: GameMode;
  journeyStage: number;
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
  tombstones: Tombstone[];
  mowers: boolean[];
  cooldowns: Record<PlantKey, number>;
  elapsed: number;
  nextSpawnAt: number;
  nextSunAt: number;
  spawned: number;
  kills: number;
  totalKills: number;
  runElapsed: number;
  tideRow: number | null;
  tideUntil: number;
  nextTideAt: number;
  windDirection: -1 | 1;
  lastWindDirection: -1 | 1;
  nextWindAt: number;
  windUntil: number;
  meteorColumn: number | null;
  meteorCursor: number;
  meteorStrikeAt: number;
  nextMeteorAt: number;
  meteorFlashUntil: number;
  nextEchoAt: number;
  echoPulseUntil: number;
  eclipseActive: boolean;
  nextSkyPhaseAt: number;
  skyPhasePulseUntil: number;
  transitionText: string;
  transitionUntil: number;
};

const ROWS = 5;
const COLS = 9;
let entityId = 1;
const uid = () => entityId++;

const LEVELS: Record<
  LevelId,
  {
    name: string;
    kicker: string;
    description: string;
    waves: number;
    totalEnemies: number;
    initialSun: number;
    skySunBase: number;
    skySunJitter: number;
    graves: Array<[number, number]>;
  }
> = {
  1: {
    name: "夕照前院",
    kicker: "第一关 · 熟悉防线",
    description: "三波入侵者将从夕阳下靠近。阳光充足，适合熟悉植物搭配。",
    waves: 3,
    totalEnemies: 30,
    initialSun: 150,
    skySunBase: 5.7,
    skySunJitter: 1.4,
    graves: [],
  },
  2: {
    name: "月雾墓园",
    kicker: "第二关 · 月夜挑战",
    description: "墓碑占据五个草格，自然阳光变慢；守住四波敌人并善用月芒菇。",
    waves: 4,
    totalEnemies: 40,
    initialSun: 175,
    skySunBase: 7.2,
    skySunJitter: 1.8,
    graves: [
      [0, 5],
      [1, 3],
      [2, 6],
      [3, 4],
      [4, 5],
    ],
  },
  3: {
    name: "潮汐玻璃屋",
    kicker: "第三关 · 潮线轮转",
    description:
      "潮水会依次淹过五条路线：水中敌人显著减速，但该行植物会暂时休眠。守住五波潮汐攻势。",
    waves: 5,
    totalEnemies: 50,
    initialSun: 200,
    skySunBase: 6.2,
    skySunJitter: 1.4,
    graves: [],
  },
  4: {
    name: "风暴钟楼",
    kicker: "第四关 · 风向突变",
    description:
      "钟楼阵风会定时把所有敌人卷向相邻路线，风向每次反转。均衡守住五路，击退六波最终攻势。",
    waves: 6,
    totalEnemies: 60,
    initialSun: 225,
    skySunBase: 6.5,
    skySunJitter: 1.2,
    graves: [],
  },
  5: {
    name: "星陨天台",
    kicker: "第五关 · 星轨天灾",
    description:
      "红色轨道会提前四秒锁定整列，随后陨星同时重创植物与敌人。借天灾清场，守住七波终章攻势。",
    waves: 7,
    totalEnemies: 70,
    initialSun: 250,
    skySunBase: 7.1,
    skySunJitter: 1.3,
    graves: [],
  },
  6: {
    name: "镜像回廊",
    kicker: "第六关 · 幽影终局",
    description:
      "镜面每隔十八秒复制所有普通敌人，在对称路线生成高速幽影。看懂镜像关系，守住八波最终防线。",
    waves: 8,
    totalEnemies: 80,
    initialSun: 275,
    skySunBase: 7.8,
    skySunJitter: 1.4,
    graves: [],
  },
  7: {
    name: "蚀光天文台",
    kicker: "第七关 · 昼夜决战",
    description:
      "白昼与日蚀交替：蚀中阳光停产、敌人加速，但月芒菇伤害翻倍。掌握节律，守住九波终极攻势。",
    waves: 9,
    totalEnemies: 90,
    initialSun: 300,
    skySunBase: 5.5,
    skySunJitter: 1.1,
    graves: [],
  },
};

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
  mooncap: {
    name: "月芒菇",
    icon: "🍄",
    cost: 125,
    cooldown: 8,
    hp: 190,
    interval: 1.85,
    damage: 22,
    description: "月光孢子最多穿透三名敌人",
    hotkey: "7",
  },
};

const PLANT_ORDER = Object.keys(PLANTS) as PlantKey[];

const freshGame = (
  level: LevelId = 1,
  mode: GameMode = "campaign",
): GameState => ({
  level,
  mode,
  journeyStage: 1,
  phase: "ready",
  paused: false,
  speed: 1,
  sun: LEVELS[level].initialSun,
  score: 0,
  plants: [],
  zombies: [],
  bullets: [],
  suns: [],
  bursts: [],
  tombstones: LEVELS[level].graves.map(([row, col]) => ({
    id: uid(),
    row,
    col,
  })),
  mowers: Array(ROWS).fill(true),
  cooldowns: {
    sunbud: 0,
    spitter: 0,
    twinvine: 0,
    wallroot: 0,
    frostfern: 0,
    blastberry: 0,
    mooncap: 0,
  },
  elapsed: 0,
  nextSpawnAt: 4,
  nextSunAt: 2,
  spawned: 0,
  kills: 0,
  totalKills: 0,
  runElapsed: 0,
  tideRow: null,
  tideUntil: 0,
  nextTideAt: 7,
  windDirection: 1,
  lastWindDirection: 1,
  nextWindAt: 8,
  windUntil: 0,
  meteorColumn: null,
  meteorCursor: 2,
  meteorStrikeAt: 0,
  nextMeteorAt: 6,
  meteorFlashUntil: 0,
  nextEchoAt: 10,
  echoPulseUntil: 0,
  eclipseActive: false,
  nextSkyPhaseAt: 12,
  skyPhasePulseUntil: 0,
  transitionText: "",
  transitionUntil: 0,
});

function stageEnemyTotal(game: GameState) {
  return LEVELS[game.level].totalEnemies;
}

function spawnZombie(
  spawned: number,
  level: LevelId,
): Zombie {
  const wave = Math.floor(spawned / 10) + 1;
  const roll = Math.random();
  const kind =
    level === 2 && wave >= 4
      ? roll < 0.18
        ? "wanderer"
        : roll < 0.52
          ? "pothead"
          : "ironhead"
      : level === 7 && wave >= 4
        ? roll < 0.03
          ? "wanderer"
          : roll < 0.28
            ? "pothead"
            : "ironhead"
      : level === 6 && wave >= 4
        ? roll < 0.04
          ? "wanderer"
          : roll < 0.32
            ? "pothead"
            : "ironhead"
      : level === 5 && wave >= 4
        ? roll < 0.05
          ? "wanderer"
          : roll < 0.36
            ? "pothead"
            : "ironhead"
      : level === 4 && wave >= 4
        ? roll < 0.08
          ? "wanderer"
          : roll < 0.42
            ? "pothead"
            : "ironhead"
      : level === 3 && wave >= 4
        ? roll < 0.12
          ? "wanderer"
          : roll < 0.48
            ? "pothead"
            : "ironhead"
      : wave === 1
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
  const multiplier =
    level === 2
      ? 1.08
      : level === 3
        ? 1.14
        : level === 4
          ? 1.2
          : level === 5
            ? 1.28
            : level === 6
              ? 1.36
              : level === 7
                ? 1.44
                : 1;
  return {
    id: uid(),
    kind,
    row: Math.floor(Math.random() * ROWS),
    x: 9.35 + Math.random() * 0.35,
    hp: Math.round(stats.hp * multiplier),
    speed: stats.speed * Math.min(1.45, multiplier),
    damage: Math.round(stats.damage * multiplier),
    maxHp: Math.round(stats.hp * multiplier),
    slowFor: 0,
    echo: false,
  };
}

function stepGame(previous: GameState, dt: number): GameState {
  if (previous.phase !== "playing" || previous.paused) return previous;

  const level = LEVELS[previous.level];
  const g: GameState = {
    ...previous,
    elapsed: previous.elapsed + dt,
    runElapsed: previous.runElapsed + dt,
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

  if (g.level === 3 && g.elapsed >= g.nextTideAt) {
    g.tideRow = g.tideRow === null ? 0 : (g.tideRow + 1) % ROWS;
    g.tideUntil = g.elapsed + 7;
    g.nextTideAt = g.elapsed + 13;
  }

  if (g.level === 4 && g.elapsed >= g.nextWindAt) {
    const gust = g.windDirection;
    for (const zombie of g.zombies) {
      const shifted = zombie.row + gust;
      zombie.row =
        shifted < 0 || shifted >= ROWS ? zombie.row - gust : shifted;
    }
    g.lastWindDirection = gust;
    g.windDirection = gust === 1 ? -1 : 1;
    g.windUntil = g.elapsed + 2.2;
    g.nextWindAt = g.elapsed + 14;
  }

  if (
    g.level === 5 &&
    g.meteorColumn === null &&
    g.elapsed >= g.nextMeteorAt
  ) {
    g.meteorColumn = g.meteorCursor;
    g.meteorStrikeAt = g.elapsed + 4;
  } else if (
    g.level === 5 &&
    g.meteorColumn !== null &&
    g.elapsed >= g.meteorStrikeAt
  ) {
    const strikeColumn = g.meteorColumn;
    for (const plant of g.plants) {
      if (plant.col === strikeColumn) plant.hp -= 180;
    }
    for (const zombie of g.zombies) {
      if (Math.abs(zombie.x - (strikeColumn + 0.5)) <= 0.72) {
        zombie.hp -= 280;
      }
    }
    for (let row = 0; row < ROWS; row++) {
      g.bursts.push({
        id: uid(),
        row,
        x: strikeColumn + 0.5,
        ttl: 0.9,
      });
    }
    g.meteorCursor = (strikeColumn + 4) % COLS;
    g.meteorColumn = null;
    g.meteorFlashUntil = g.elapsed + 0.9;
    g.nextMeteorAt = g.elapsed + 14;
  }

  if (g.level === 6 && g.elapsed >= g.nextEchoAt) {
    const originals = g.zombies.filter(
      (zombie) => !zombie.echo && zombie.hp > 0 && zombie.x > 0.8,
    );
    const echoes = originals.map((zombie) => {
      const maxHp = Math.max(70, Math.round(zombie.maxHp * 0.35));
      const mirroredRow =
        zombie.row === 2
          ? zombie.id % 2 === 0
            ? 1
            : 3
          : ROWS - 1 - zombie.row;
      return {
        ...zombie,
        id: uid(),
        row: mirroredRow,
        x: Math.min(9.55, zombie.x + 0.18),
        hp: Math.min(maxHp, Math.max(45, Math.round(zombie.hp * 0.35))),
        maxHp,
        speed: zombie.speed * 1.18,
        damage: Math.round(zombie.damage * 0.72),
        slowFor: 0,
        echo: true,
      };
    });
    g.zombies.push(...echoes);
    g.echoPulseUntil = g.elapsed + 1.6;
    g.nextEchoAt = g.elapsed + 18;
  }

  if (g.level === 7 && g.elapsed >= g.nextSkyPhaseAt) {
    g.eclipseActive = !g.eclipseActive;
    g.skyPhasePulseUntil = g.elapsed + 1.8;
    g.nextSkyPhaseAt = g.elapsed + (g.eclipseActive ? 10 : 14);
  }

  if (g.elapsed >= g.nextSunAt && !(g.level === 7 && g.eclipseActive)) {
    g.suns.push({
      id: uid(),
      x: 0.8 + Math.random() * 7.4,
      y: 0.55 + Math.random() * 3.9,
      ttl: 10,
    });
    g.nextSunAt =
      g.elapsed + level.skySunBase + Math.random() * level.skySunJitter;
  }
  g.suns = g.suns.filter((sun) => sun.ttl > 0);
  g.bursts = g.bursts.filter((burst) => burst.ttl > 0);

  const totalEnemies = stageEnemyTotal(g);
  if (g.spawned < totalEnemies && g.elapsed >= g.nextSpawnAt) {
    g.zombies.push(spawnZombie(g.spawned, g.level));
    g.spawned += 1;
    const wave = Math.floor((g.spawned - 1) / 10) + 1;
    const minimumGap =
      g.level === 7
        ? 0.82
        : g.level === 6
          ? 0.9
          : g.level === 5
            ? 0.95
            : g.level === 4
              ? 1.1
              : g.level === 3
                ? 1.25
                : g.level === 2
                  ? 1.45
                  : 1.7;
    const baseGap =
      g.level === 7
        ? 3.1
        : g.level === 6
          ? 3.25
          : g.level === 5
            ? 3.4
            : g.level === 4
              ? 3.6
              : g.level === 3
                ? 3.85
                : g.level === 2
                  ? 4.05
                  : 4.35;
    const gap = Math.max(
      minimumGap,
      baseGap - wave * 0.72,
    );
    g.nextSpawnAt = g.elapsed + gap * (0.78 + Math.random() * 0.48);
  }

  for (const plant of g.plants) {
    if (plant.hp <= 0) continue;
    const dormantByTide =
      g.level === 3 &&
      g.tideRow === plant.row &&
      g.elapsed < g.tideUntil;
    if (dormantByTide) continue;
    plant.timer -= dt;
    if (plant.timer > 0) continue;
    const def = PLANTS[plant.type];
    if (plant.type === "sunbud") {
      if (g.level === 7 && g.eclipseActive) {
        plant.timer = 0.25;
        continue;
      }
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
        : plant.type === "mooncap"
          ? "moon"
        : plant.type === "twinvine"
          ? "twin"
          : "seed";
    g.bullets.push({
      id: uid(),
      row: plant.row,
      x: plant.col + 0.72,
      damage:
        plant.type === "mooncap" && g.level === 7 && g.eclipseActive
          ? def.damage * 2
          : def.damage,
      slow: plant.type === "frostfern",
      pierce: plant.type === "mooncap" ? 3 : 1,
      hitIds: [],
      variant,
    });
    if (plant.type === "twinvine") {
      g.bullets.push({
        id: uid(),
        row: plant.row,
        x: plant.col + 0.42,
        damage: def.damage,
        slow: false,
        pierce: 1,
        hitIds: [],
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
          !bullet.hitIds.includes(zombie.id) &&
          zombie.x >= bullet.x - 0.1 &&
          zombie.x <= nextX + 0.35,
      )
      .sort((a, b) => a.x - b.x)[0];
    if (hit) {
      hit.hp -= bullet.damage;
      if (bullet.slow) hit.slowFor = 3.2;
      if (bullet.pierce > 1 && nextX < 9.7) {
        survivingBullets.push({
          ...bullet,
          x: nextX,
          pierce: bullet.pierce - 1,
          hitIds: [...bullet.hitIds, hit.id],
        });
      }
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
      const slowedByTide =
        g.level === 3 &&
        g.tideRow === zombie.row &&
        g.elapsed < g.tideUntil;
      zombie.x -=
        zombie.speed *
        (zombie.slowFor > 0 ? 0.48 : 1) *
        (slowedByTide ? 0.38 : 1) *
        (g.level === 7 && g.eclipseActive ? 1.3 : 1) *
        dt;
    }
  }

  g.plants = g.plants.filter((plant) => plant.hp > 0);

  const defeated = g.zombies.filter((zombie) => zombie.hp <= 0);
  if (defeated.length) {
    g.kills += defeated.length;
    g.totalKills += defeated.length;
    g.score += defeated.reduce(
      (total, zombie) =>
        total +
        Math.round(
          (zombie.kind === "ironhead"
            ? 260
            : zombie.kind === "pothead"
              ? 150
              : 90) * (zombie.echo ? 0.45 : 1),
        ),
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
      g.totalKills += mowed;
      g.score += mowed * 70;
      g.mowers[row] = false;
      g.bursts.push({ id: uid(), row, x: 0.5, ttl: 1.1 });
    } else {
      g.phase = "lost";
      g.paused = false;
      return g;
    }
  }

  if (g.spawned >= totalEnemies && g.zombies.length === 0) {
    if (g.mode === "gauntlet" && g.level < 7) {
      const nextLevel = (g.level + 1) as LevelId;
      const nextStage = g.journeyStage + 1;
      const occupied = new Set(
        g.plants.map((plant) => `${plant.row}-${plant.col}`),
      );
      g.level = nextLevel;
      g.journeyStage = nextStage;
      g.elapsed = 0;
      g.nextSpawnAt = 3.2;
      g.nextSunAt = 1.8;
      g.spawned = 0;
      g.kills = 0;
      g.zombies = [];
      g.bullets = [];
      g.bursts = [];
      g.tombstones = LEVELS[nextLevel].graves
        .filter(([row, col]) => !occupied.has(`${row}-${col}`))
        .map(([row, col]) => ({ id: uid(), row, col }));
      g.mowers = Array(ROWS).fill(true);
      g.tideRow = null;
      g.tideUntil = 0;
      g.nextTideAt = 7;
      g.windDirection = 1;
      g.lastWindDirection = 1;
      g.nextWindAt = 8;
      g.windUntil = 0;
      g.meteorColumn = null;
      g.meteorCursor = 2;
      g.meteorStrikeAt = 0;
      g.nextMeteorAt = 6;
      g.meteorFlashUntil = 0;
      g.nextEchoAt = 10;
      g.echoPulseUntil = 0;
      g.eclipseActive = false;
      g.nextSkyPhaseAt = 12;
      g.skyPhasePulseUntil = 0;
      g.transitionText = `连续远征第 ${nextStage} 站 · ${LEVELS[nextLevel].name}`;
      g.transitionUntil = 3;
      g.score += 1800 + nextStage * 220;
    } else {
      g.phase = "won";
      g.paused = false;
      const levelBonus =
        g.level === 7
          ? 13200
          : g.level === 6
            ? 10800
            : g.level === 5
              ? 8800
              : g.level === 4
                ? 6800
                : g.level === 3
                  ? 5200
                  : g.level === 2
                    ? 3800
                    : 2500;
      g.score += Math.max(0, Math.round(levelBonus - g.elapsed * 12));
    }
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
  const [game, setGame] = useState<GameState>(() => freshGame(1));
  const [selectedLevel, setSelectedLevel] = useState<LevelId>(1);
  const [selectedMode, setSelectedMode] = useState<GameMode>("campaign");
  const [selected, setSelected] = useState<Tool>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState("");
  const [bestScore, setBestScore] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const gameRef = useRef(game);
  const collectionTimers = useRef<number[]>([]);

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

  const collectSun = useCallback(
    (id: number) => {
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
    },
    [tone],
  );

  const collectAllSuns = useCallback(() => {
    const current = gameRef.current;
    if (current.phase !== "playing" || current.paused) return;
    const ids = [...current.suns]
      .sort((a, b) => a.id - b.id)
      .map((sun) => sun.id);
    if (!ids.length) {
      setToast("场上暂无可收集的阳光");
      return;
    }
    collectionTimers.current.forEach((timer) => window.clearTimeout(timer));
    collectionTimers.current = ids.map((id, index) =>
      window.setTimeout(() => collectSun(id), index * 110),
    );
    setToast(`自动收集 ${ids.length} 份阳光`);
  }, [collectSun]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGame((current) => stepGame(current, 0.05 * current.speed));
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      collectionTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBestScore(
        Number(window.localStorage.getItem("lawn-guardians-best") || 0),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (game.phase !== "won" && game.phase !== "lost") return;
    if (game.score > bestScore) {
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
      if (event.key >= "1" && event.key <= "7") {
        const plant = PLANT_ORDER[Number(event.key) - 1];
        const mooncapUnlocked =
          game.level >= 2 ||
          (game.mode === "gauntlet" && game.journeyStage > 1);
        if (plant && (plant !== "mooncap" || mooncapUnlocked)) {
          setSelected(plant);
        }
      }
      if (event.key.toLowerCase() === "a") collectAllSuns();
      if (event.key === "Escape") setSelected(null);
      if (event.code === "Space" && game.phase === "playing") {
        event.preventDefault();
        setGame((current) => ({ ...current, paused: !current.paused }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    collectAllSuns,
    game.journeyStage,
    game.level,
    game.mode,
    game.phase,
  ]);

  const level = LEVELS[game.level];
  const totalEnemies = stageEnemyTotal(game);
  const totalWaves = Math.ceil(totalEnemies / 10);
  const wave = Math.min(totalWaves, Math.floor(game.spawned / 10) + 1);
  const progress = Math.min(
    100,
    (game.spawned / totalEnemies) * 100,
  );
  const tideActive =
    game.level === 3 &&
    game.tideRow !== null &&
    game.elapsed < game.tideUntil;
  const windActive = game.level === 4 && game.elapsed < game.windUntil;
  const meteorWarning =
    game.level === 5 && game.meteorColumn !== null;
  const meteorFlash =
    game.level === 5 && game.elapsed < game.meteorFlashUntil;
  const echoCountdown = game.nextEchoAt - game.elapsed;
  const echoWarning =
    game.level === 6 && echoCountdown > 0 && echoCountdown <= 3;
  const echoPulse =
    game.level === 6 && game.elapsed < game.echoPulseUntil;
  const skyPhaseCountdown = game.nextSkyPhaseAt - game.elapsed;
  const skyPhaseWarning =
    game.level === 7 && skyPhaseCountdown > 0 && skyPhaseCountdown <= 3;
  const skyPhasePulse =
    game.level === 7 && game.elapsed < game.skyPhasePulseUntil;
  const mooncapUnlocked =
    game.level >= 2 ||
    (game.mode === "gauntlet" && game.journeyStage > 1);
  const selectedPlant = selected && selected !== "shovel" ? PLANTS[selected] : null;

  const startGame = (
    levelId: LevelId = selectedLevel,
    mode: GameMode = selectedMode,
  ) => {
    collectionTimers.current.forEach((timer) => window.clearTimeout(timer));
    collectionTimers.current = [];
    setBestScore((current) => Math.max(current, game.score));
    const startingLevel = mode === "gauntlet" ? 1 : levelId;
    const next = freshGame(startingLevel, mode);
    next.phase = "playing";
    setGame(next);
    setSelectedLevel(startingLevel);
    setSelectedMode(mode);
    setSelected(null);
    const startToast =
      mode === "gauntlet"
        ? "连续远征开始：七关连战，阳光与植物跨关保留"
        : startingLevel === 7
          ? "日蚀周期启动，白昼只剩十二秒……"
          : startingLevel === 6
            ? "镜面正在共振，留意即将出现的对称幽影……"
            : startingLevel === 5
              ? "星轨正在校准，红色警戒列即将出现……"
              : startingLevel === 4
                ? "钟声响起，第一阵风即将改变敌人路线……"
                : startingLevel === 3
                  ? "潮线启动，留意即将休眠的路线……"
                  : startingLevel === 2
                    ? "月雾升起，第一波正在靠近……"
                    : "第一波正在靠近……";
    setToast(startToast);
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
    const blocked = game.tombstones.some(
      (tombstone) => tombstone.row === row && tombstone.col === col,
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
    if (blocked) {
      setToast("墓碑占据了这个草格");
      return;
    }
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
        current.tombstones.some(
          (tombstone) => tombstone.row === row && tombstone.col === col,
        ) ||
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

  const availablePlants = PLANT_ORDER.filter(
    (key) => key !== "mooncap" || mooncapUnlocked,
  );
  const cardList = availablePlants.map((key) => {
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
  });
  const previewLevel =
    selectedMode === "gauntlet" ? LEVELS[1] : LEVELS[selectedLevel];

  return (
    <main
      className={`game-shell level-${
        game.phase === "ready"
          ? selectedMode === "gauntlet"
            ? 1
            : selectedLevel
          : game.level
      }`}
    >
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
            <span>
              {game.mode === "gauntlet"
                ? `远征第 ${game.journeyStage} 站 · `
                : ""}
              {level.name} · 第 {wave} 波 / {totalWaves}
            </span>
            <span>
              {game.mode === "gauntlet" ? game.totalKills : game.kills} 击退
            </span>
          </div>
          <div className="meter-track">
            <span style={{ width: `${progress}%` }} />
            {Array.from({ length: totalWaves - 1 }, (_, index) => (
              <i
                key={index}
                style={{ left: `${((index + 1) / totalWaves) * 100}%` }}
              />
            ))}
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
          <button
            className="collect-all-button"
            onClick={collectAllSuns}
            disabled={!game.suns.length || game.paused || game.phase !== "playing"}
            aria-label="按生成顺序自动收集场上全部阳光，快捷键 A"
            title="快捷键 A · 自动依次收集当前阳光"
          >
            A · 全收
          </button>
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
            <div
              className={`lawn-stage ${
                game.level === 2
                  ? "night-stage"
                  : game.level === 3
                    ? "tide-stage"
                    : game.level === 4
                      ? "wind-stage"
                      : game.level === 5
                        ? "meteor-stage"
                        : game.level === 6
                          ? "mirror-stage"
                          : game.level === 7
                            ? `observatory-stage ${
                                game.eclipseActive ? "eclipse-stage" : ""
                              }`
                    : ""
              }`}
            >
              <div className="lawn-grid">
                {Array.from({ length: ROWS * COLS }, (_, index) => {
                  const row = Math.floor(index / COLS);
                  const col = index % COLS;
                  const isBlocked = game.tombstones.some(
                    (tombstone) =>
                      tombstone.row === row && tombstone.col === col,
                  );
                  return (
                    <button
                      key={`${row}-${col}`}
                      className={`lawn-cell ${selectedPlant ? "plantable" : ""} ${
                        isBlocked ? "tombstone-cell" : ""
                      } ${
                        meteorWarning && col === game.meteorColumn
                          ? "meteor-danger-cell"
                          : ""
                      }`}
                      onClick={() => placeAt(row, col)}
                      aria-label={
                        isBlocked
                          ? `第 ${row + 1} 行，第 ${col + 1} 列，墓碑占据`
                          : `第 ${row + 1} 行，第 ${col + 1} 列`
                      }
                    />
                  );
                })}
              </div>

              {tideActive && (
                <div
                  className="tide-strip"
                  style={{ top: `${(game.tideRow! / ROWS) * 100}%` }}
                  role="status"
                  aria-label={`第 ${game.tideRow! + 1} 行潮水涌入，敌人减速，植物休眠`}
                >
                  <span>≈ 潮水：敌人减速 · 植物休眠 ≈</span>
                </div>
              )}

              {windActive && (
                <div
                  className={`wind-sweep ${
                    game.lastWindDirection === 1 ? "wind-down" : "wind-up"
                  }`}
                  role="status"
                  aria-label={`阵风将敌人卷向${
                    game.lastWindDirection === 1 ? "下方" : "上方"
                  }相邻路线`}
                >
                  <span>
                    {game.lastWindDirection === 1 ? "↓↓↓" : "↑↑↑"} 阵风换线{" "}
                    {game.lastWindDirection === 1 ? "↓↓↓" : "↑↑↑"}
                  </span>
                </div>
              )}

              {meteorWarning && (
                <div
                  className="meteor-warning"
                  style={{
                    left: `${(game.meteorColumn! / COLS) * 100}%`,
                    width: `${100 / COLS}%`,
                  }}
                  role="status"
                  aria-label={`第 ${game.meteorColumn! + 1} 列将在 ${Math.max(
                    1,
                    Math.ceil(game.meteorStrikeAt - game.elapsed),
                  )} 秒后遭受陨星轰击`}
                >
                  <strong>
                    {Math.max(1, Math.ceil(game.meteorStrikeAt - game.elapsed))}
                  </strong>
                  <span>陨星锁定</span>
                </div>
              )}

              {meteorFlash && (
                <div
                  className="meteor-impact"
                  style={{
                    left: `${(((game.meteorCursor + COLS - 4) % COLS) / COLS) * 100}%`,
                    width: `${100 / COLS}%`,
                  }}
                  aria-hidden="true"
                />
              )}

              {echoWarning && (
                <div className="echo-warning" role="status">
                  <span>镜像增援</span>
                  <strong>{Math.max(1, Math.ceil(echoCountdown))}</strong>
                  <span>对称路线</span>
                </div>
              )}

              {echoPulse && (
                <div className="echo-pulse" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              )}

              {skyPhaseWarning && (
                <div
                  className={`sky-phase-warning ${
                    game.eclipseActive ? "dawn-coming" : "eclipse-coming"
                  }`}
                  role="status"
                >
                  <span>
                    {game.eclipseActive ? "☀ 白昼回归" : "◉ 日蚀将至"}
                  </span>
                  <strong>{Math.max(1, Math.ceil(skyPhaseCountdown))}</strong>
                </div>
              )}

              {skyPhasePulse && (
                <div
                  className={`sky-phase-pulse ${
                    game.eclipseActive ? "eclipse-pulse" : "dawn-pulse"
                  }`}
                  aria-hidden="true"
                />
              )}

              {game.level === 7 && (
                <div
                  className={`sky-phase-chip ${
                    game.eclipseActive ? "eclipse" : "daylight"
                  }`}
                  aria-live="polite"
                >
                  <strong>{game.eclipseActive ? "日蚀" : "白昼"}</strong>
                  <small>
                    {game.eclipseActive
                      ? "阳光停产 · 敌人加速 · 月芒菇 ×2"
                      : "阳光恢复 · 准备下一次日蚀"}
                  </small>
                </div>
              )}

              {game.tombstones.map((tombstone) => (
                <span
                  key={tombstone.id}
                  className="tombstone"
                  style={{
                    left: `${((tombstone.col + 0.5) / COLS) * 100}%`,
                    top: `${((tombstone.row + 0.5) / ROWS) * 100}%`,
                  }}
                  aria-hidden="true"
                >
                  <i>✦</i>
                </span>
              ))}

              {game.plants.map((plant) => (
                <button
                  key={plant.id}
                  className={`plant-unit ${
                    tideActive && plant.row === game.tideRow
                      ? "tide-dormant"
                      : ""
                  } ${
                    meteorWarning && plant.col === game.meteorColumn
                      ? "meteor-marked"
                      : ""
                  } ${
                    game.level === 7 &&
                    game.eclipseActive &&
                    plant.type === "mooncap"
                      ? "eclipse-empowered"
                      : ""
                  } ${
                    game.level === 7 &&
                    game.eclipseActive &&
                    plant.type === "sunbud"
                      ? "eclipse-dormant"
                      : ""
                  }`}
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
                  className={`zombie-unit ${
                    zombie.slowFor > 0 ? "slowed" : ""
                  } ${
                    tideActive && zombie.row === game.tideRow
                      ? "tide-slowed"
                      : ""
                  } ${windActive ? "wind-tossed" : ""} ${
                    zombie.echo ? "echo-zombie" : ""
                  } ${
                    game.level === 7 && game.eclipseActive
                      ? "eclipse-haste"
                      : ""
                  }`}
                  style={{
                    left: `${(zombie.x / COLS) * 100}%`,
                    top: `${((zombie.row + 0.5) / ROWS) * 100}%`,
                  }}
                  aria-label={`${zombie.echo ? "幽影" : ""}入侵者，生命值 ${Math.ceil(zombie.hp)}`}
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
                <span>
                  {game.level === 5
                    ? "✦"
                    : game.level === 6
                      ? "◇"
                      : game.level === 7
                        ? "◉"
                        : game.level === 4
                          ? "≋"
                          : game.level === 3
                            ? "≈"
                            : "♱"}
                </span>
                <span>
                  {game.level === 5
                    ? "☄"
                    : game.level === 6
                      ? "◈"
                      : game.level === 7
                        ? "☀"
                        : game.level === 4
                          ? "◒"
                          : game.level === 3
                            ? "◌"
                            : "♱"}
                </span>
              </div>

              {game.mode === "gauntlet" &&
                game.transitionText &&
                game.elapsed < game.transitionUntil && (
                  <div className="stage-transition" role="status">
                    <small>阳光与植物已保留</small>
                    <strong>{game.transitionText}</strong>
                  </div>
                )}
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
              : `按 1–${mooncapUnlocked ? "7" : "6"} 选植物 · A 自动收集阳光 · 空格暂停`}
        </span>
        <span>
          {game.mode === "gauntlet"
            ? `连续远征第 ${game.journeyStage} 站 · `
            : ""}
          最高分 {Math.max(bestScore, game.score)}
        </span>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      {game.phase === "ready" && (
        <section className="game-overlay intro-overlay">
          <div className="intro-art" />
          <div className="intro-vignette" />
          <div className="intro-panel">
            <span className="eyebrow">{previewLevel.kicker}</span>
            <h1>
              草坪
              <br />
              守卫战
            </h1>
            <p>
              {selectedMode === "gauntlet"
                ? "从夕照前院出发，连续穿过月雾、潮汐、风暴、星陨与镜像战场，最终抵达蚀光天文台。阳光、植物、生命与分数跨关保留，第七关结束后赢得远征。"
                : previewLevel.description}
            </p>
            <div className="mode-picker" role="radiogroup" aria-label="选择模式">
              <button
                className={selectedMode === "campaign" ? "active" : ""}
                onClick={() => setSelectedMode("campaign")}
                role="radio"
                aria-checked={selectedMode === "campaign"}
              >
                <small>关卡模式</small>
                <strong>自由选择战场</strong>
              </button>
              <button
                className={`gauntlet ${selectedMode === "gauntlet" ? "active" : ""}`}
                onClick={() => setSelectedMode("gauntlet")}
                role="radio"
                aria-checked={selectedMode === "gauntlet"}
              >
                <small>连续远征</small>
                <strong>七关连战 · 状态不重置</strong>
              </button>
            </div>
            {selectedMode === "campaign" ? (
              <div
                className="level-picker"
                role="radiogroup"
                aria-label="选择关卡"
              >
                <button
                  className={`level-card ${selectedLevel === 1 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(1)}
                  role="radio"
                  aria-checked={selectedLevel === 1}
                >
                  <small>LEVEL 01</small>
                  <strong>夕照前院</strong>
                  <span>3 波 · 经典草坪</span>
                </button>
                <button
                  className={`level-card night ${selectedLevel === 2 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(2)}
                  role="radio"
                  aria-checked={selectedLevel === 2}
                >
                  <small>LEVEL 02</small>
                  <strong>月雾墓园</strong>
                  <span>4 波 · 墓碑与月芒菇</span>
                </button>
                <button
                  className={`level-card tide ${selectedLevel === 3 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(3)}
                  role="radio"
                  aria-checked={selectedLevel === 3}
                >
                  <small>LEVEL 03</small>
                  <strong>潮汐玻璃屋</strong>
                  <span>5 波 · 路线轮流休眠</span>
                </button>
                <button
                  className={`level-card wind ${selectedLevel === 4 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(4)}
                  role="radio"
                  aria-checked={selectedLevel === 4}
                >
                  <small>LEVEL 04</small>
                  <strong>风暴钟楼</strong>
                  <span>6 波 · 阵风迫使敌人换线</span>
                </button>
                <button
                  className={`level-card meteor ${selectedLevel === 5 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(5)}
                  role="radio"
                  aria-checked={selectedLevel === 5}
                >
                  <small>LEVEL 05</small>
                  <strong>星陨天台</strong>
                  <span>7 波 · 预警列双向伤害</span>
                </button>
                <button
                  className={`level-card mirror ${selectedLevel === 6 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(6)}
                  role="radio"
                  aria-checked={selectedLevel === 6}
                >
                  <small>LEVEL 06</small>
                  <strong>镜像回廊</strong>
                  <span>8 波 · 对称路线生成幽影</span>
                </button>
                <button
                  className={`level-card eclipse ${selectedLevel === 7 ? "active" : ""}`}
                  onClick={() => setSelectedLevel(7)}
                  role="radio"
                  aria-checked={selectedLevel === 7}
                >
                  <small>LEVEL 07</small>
                  <strong>蚀光天文台</strong>
                  <span>9 波 · 日蚀改变资源与战力</span>
                </button>
              </div>
            ) : (
              <div className="gauntlet-route" aria-label="连续远征关卡路线">
                <span>01 夕照</span>
                <b>→</b>
                <span>02 月雾</span>
                <b>→</b>
                <span>03 潮汐</span>
                <b>→</b>
                <span>04 风暴</span>
                <b>→</b>
                <span>05 星陨</span>
                <b>→</b>
                <span>06 镜像</span>
                <b>→</b>
                <span>07 日蚀</span>
                <b>🏆</b>
              </div>
            )}
            <button
              className="primary-button"
              onClick={() => startGame(selectedLevel, selectedMode)}
            >
              <span>
                {selectedMode === "gauntlet"
                  ? "开始连续远征"
                  : `开始 ${previewLevel.name}`}
              </span>
              <b>▶</b>
            </button>
            <div className="intro-tips">
              <span>☀ 按 A 自动收集阳光</span>
              <span>🌿 选择卡片后种植</span>
              <span>
                {selectedMode === "gauntlet"
                  ? "🏆 七关连战后获得胜利"
                  : `🏁 击退全部 ${previewLevel.waves} 波`}
              </span>
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
              {game.phase === "won"
                ? game.mode === "gauntlet"
                  ? "七座花园全部守住！"
                  : "花园守住了！"
                : game.mode === "gauntlet"
                  ? `连续远征止步第 ${game.journeyStage} 站`
                  : "防线被突破"}
            </span>
            <h2>
              {game.phase === "won"
                ? game.mode === "gauntlet"
                  ? "远征凯旋"
                  : game.level === 7
                    ? "光明复归"
                    : game.level === 6
                      ? "镜影归寂"
                      : game.level === 5
                        ? "星火坠落"
                        : game.level === 4
                          ? "风暴止息"
                          : game.level === 3
                            ? "潮声退去"
                            : game.level === 2
                              ? "月雾退散"
                              : "黎明到来"
                : game.mode === "gauntlet"
                  ? "远征暂歇"
                  : "再试一次"}
            </h2>
            <div className="result-stats">
              <div>
                <strong>{game.score}</strong>
                <small>本局得分</small>
              </div>
              <div>
                <strong>
                  {game.mode === "gauntlet" ? game.totalKills : game.kills}
                </strong>
                <small>击退敌人</small>
              </div>
              <div>
                <strong>
                  {Math.floor(
                    game.mode === "gauntlet" ? game.runElapsed : game.elapsed,
                  )}
                  s
                </strong>
                <small>坚持时间</small>
              </div>
            </div>
            <div className="result-actions">
              {game.phase === "won" &&
                game.mode === "campaign" &&
                game.level < 7 && (
                <button
                  className="primary-button compact"
                  onClick={() =>
                    startGame((game.level + 1) as LevelId, "campaign")
                  }
                >
                  进入第 {game.level + 1} 关
                </button>
              )}
              <button
                className={
                  game.mode === "gauntlet"
                    ? "primary-button compact"
                    : "secondary-button"
                }
                onClick={() =>
                  game.mode === "gauntlet"
                    ? startGame(1, "gauntlet")
                    : startGame(game.level, "campaign")
                }
              >
                {game.mode === "gauntlet" ? "重新远征" : "重玩本关"}
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
