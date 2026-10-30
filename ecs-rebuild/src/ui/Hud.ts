/**
 * Hud
 *
 * DOM overlay for the simulation: clock, level menu, time controls,
 * population stats, entity inspector and toasts. Pure presentation — all
 * state flows in through update()/showInspector() and all intent flows out
 * through HudCallbacks, so it has no dependency on Babylon or the ECS.
 * Styles live in hud.css, linked from index.html so the loading screen is styled before JS runs.
 */

export interface HudLevel {
  key: string;
  name: string;
  description: string;
}

export interface HudState {
  hour: number;
  minute: number;
  day: number;
  night: boolean;
  paused: boolean;
  speed: number;
  fps: number;
  villagers: number;
  zombies: number;
  animals: number;
}

export interface InspectorBar {
  label: string;
  value: number;
  max: number;
  tone: 'good' | 'warn' | 'bad' | 'info';
}

export interface InspectorInfo {
  title: string;
  subtitle?: string;
  bars: InspectorBar[];
  rows: Array<[string, string]>;
  following: boolean;
}

export interface HudCallbacks {
  onLevel(key: string): void;
  onSpeed(multiplier: number): void;
  onTogglePause(): void;
  onFollow(): void;
  onCloseInspector(): void;
}

const SPEEDS = [1, 3, 10];

const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="#f2b84b" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="#f2b84b"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" fill="#cfd8ff"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>`;

export function periodName(hour: number): string {
  if (hour < 5) return 'Night';
  if (hour < 7) return 'Dawn';
  if (hour < 12) return 'Morning';
  if (hour < 14) return 'Midday';
  if (hour < 17) return 'Afternoon';
  if (hour < 20) return 'Evening';
  return 'Night';
}

export class Hud {
  private root: HTMLElement;
  private callbacks: HudCallbacks;
  private els!: {
    time: HTMLElement;
    meta: HTMLElement;
    dial: HTMLElement;
    villagers: HTMLElement;
    zombies: HTMLElement;
    animals: HTMLElement;
    fps: HTMLElement;
    levels: HTMLElement;
    timeButtons: HTMLElement;
    inspector: HTMLElement;
    toasts: HTMLElement;
    loading: HTMLElement | null;
  };
  private lastClock = '';
  private lastNight: boolean | null = null;
  private currentLevel = '';

  constructor(callbacks: HudCallbacks, parent: HTMLElement = document.body) {
    this.callbacks = callbacks;
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = this.template();
    parent.appendChild(this.root);
    this.bind();
  }

  private template(): string {
    return `
      <div id="hud-clock" class="hud-panel" aria-live="off">
        <div class="dial" data-ref="dial"></div>
        <div>
          <div class="time" data-ref="time">08:00</div>
          <div class="meta" data-ref="meta">Morning · Day 1</div>
        </div>
      </div>

      <div id="hud-toasts" aria-live="polite"></div>

      <div id="hud-inspector" class="hud-panel" role="dialog" aria-label="Selected entity"></div>

      <nav id="hud-levels" class="hud-panel" aria-label="Levels">
        <h3>Scenario</h3>
        <div data-ref="levels"></div>
      </nav>

      <div id="hud-stats" class="hud-panel">
        <div class="stat villager"><b data-ref="villagers">0</b><span>Villagers</span></div>
        <div class="stat zombie"><b data-ref="zombies">0</b><span>Zombies</span></div>
        <div class="stat animal"><b data-ref="animals">0</b><span>Wildlife</span></div>
        <div class="stat"><b data-ref="fps">0</b><span>FPS</span></div>
      </div>

      <div id="hud-time" class="hud-panel" role="group" aria-label="Time controls" data-ref="timeButtons">
        <button class="time-btn" data-action="pause" aria-label="Pause" title="Pause (Space)">❚❚</button>
        ${SPEEDS.map(
          (s) => `<button class="time-btn" data-speed="${s}" title="${s}× speed">${s}×</button>`
        ).join('')}
      </div>

      <div id="hud-help" class="hud-panel">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> pan &nbsp; <kbd>Q</kbd><kbd>E</kbd> rotate</div>
        <div><kbd>Wheel</kbd> zoom &nbsp; <kbd>Shift</kbd> faster</div>
        <div><kbd>Click</kbd> inspect &nbsp; <kbd>Space</kbd> pause</div>
      </div>
    `;
  }

  private bind(): void {
    const ref = (name: string) => this.root.querySelector<HTMLElement>(`[data-ref="${name}"]`)!;
    this.els = {
      time: ref('time'),
      meta: ref('meta'),
      dial: ref('dial'),
      villagers: ref('villagers'),
      zombies: ref('zombies'),
      animals: ref('animals'),
      fps: ref('fps'),
      levels: ref('levels'),
      timeButtons: ref('timeButtons'),
      inspector: this.root.querySelector<HTMLElement>('#hud-inspector')!,
      toasts: this.root.querySelector<HTMLElement>('#hud-toasts')!,
      loading: document.getElementById('loadingScreen'),
    };

    this.els.timeButtons.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!btn) return;
      if (btn.dataset.action === 'pause') this.callbacks.onTogglePause();
      else if (btn.dataset.speed) this.callbacks.onSpeed(Number(btn.dataset.speed));
    });

    this.els.levels.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('button[data-level]');
      if (btn?.dataset.level) this.callbacks.onLevel(btn.dataset.level);
    });

    this.els.inspector.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.close')) this.callbacks.onCloseInspector();
      else if (t.closest('#hud-follow')) this.callbacks.onFollow();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
        e.preventDefault();
        this.callbacks.onTogglePause();
      } else if (e.key === 'Escape') {
        this.callbacks.onCloseInspector();
      }
    });
  }

  setLevels(levels: HudLevel[], current: string): void {
    this.currentLevel = current;
    this.els.levels.replaceChildren(
      ...levels.map((l) => {
        const b = document.createElement('button');
        b.className = 'level-btn' + (l.key === current ? ' active' : '');
        b.dataset.level = l.key;
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = l.name;
        const desc = document.createElement('div');
        desc.className = 'desc';
        desc.textContent = l.description;
        b.append(name, desc);
        return b;
      })
    );
  }

  setCurrentLevel(key: string): void {
    this.currentLevel = key;
    this.els.levels.querySelectorAll<HTMLElement>('.level-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.level === key);
    });
  }

  update(s: HudState): void {
    const hh = String(Math.floor(s.hour)).padStart(2, '0');
    const mm = String(Math.floor(s.minute)).padStart(2, '0');
    const clock = `${hh}:${mm}`;
    if (clock !== this.lastClock) {
      this.lastClock = clock;
      this.els.time.textContent = clock;
      this.els.meta.textContent = `${periodName(s.hour)} · Day ${s.day + 1}`;
    }
    if (s.night !== this.lastNight) {
      this.lastNight = s.night;
      this.els.dial.innerHTML = s.night ? MOON_ICON : SUN_ICON;
    }

    this.els.villagers.textContent = String(s.villagers);
    this.els.zombies.textContent = String(s.zombies);
    this.els.animals.textContent = String(s.animals);
    this.els.fps.textContent = String(Math.round(s.fps));

    this.els.timeButtons.querySelectorAll<HTMLElement>('button').forEach((b) => {
      if (b.dataset.action === 'pause') b.classList.toggle('active', s.paused);
      else if (b.dataset.speed) b.classList.toggle('active', !s.paused && Number(b.dataset.speed) === s.speed);
    });
  }

  showInspector(info: InspectorInfo | null): void {
    const el = this.els.inspector;
    if (!info) {
      el.classList.remove('open');
      return;
    }

    const bars = info.bars
      .map((b) => {
        const pct = Math.max(0, Math.min(100, (b.value / b.max) * 100));
        return `<div class="bar"><div class="label"><span>${b.label}</span><span>${Math.round(b.value)}</span></div>
          <div class="track"><div class="fill ${b.tone}" style="width:${pct}%"></div></div></div>`;
      })
      .join('');
    const rows = info.rows.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('');

    el.innerHTML = `
      <header>
        <div><h4></h4><div class="sub"></div></div>
        <button class="close" aria-label="Close inspector">×</button>
      </header>
      ${bars}
      <div class="rows">${rows}</div>
      <button id="hud-follow" class="${info.following ? 'active' : ''}">${info.following ? 'Following' : 'Follow'}</button>
    `;
    // Names are set via textContent so entity names can never inject markup.
    el.querySelector('h4')!.textContent = info.title;
    el.querySelector('.sub')!.textContent = info.subtitle ?? '';
    el.classList.add('open');
  }

  toast(message: string, tone: 'good' | 'bad' | 'info' = 'info', durationMs = 3200): void {
    const t = document.createElement('div');
    t.className = `toast hud-panel ${tone}`;
    t.textContent = message;
    this.els.toasts.appendChild(t);
    while (this.els.toasts.children.length > 3) this.els.toasts.firstElementChild?.remove();
    setTimeout(() => t.classList.add('out'), durationMs);
    setTimeout(() => t.remove(), durationMs + 450);
  }

  /** Shows or hides the full-screen loading overlay. */
  setLoading(visible: boolean, message?: string): void {
    const el = this.els.loading;
    if (!el) return;
    if (message) {
      const p = el.querySelector('p');
      if (p) p.textContent = message;
    }
    el.classList.toggle('hidden', !visible);
  }

  getCurrentLevel(): string {
    return this.currentLevel;
  }

  dispose(): void {
    this.root.remove();
  }
}
