/**
 * World Clock UI
 * 
 * Displays a clock showing in-game time with day/night cycle.
 * Ported from MyHavokSimCode/UI/WorldClock.js
 */

/**
 * WorldClock configuration
 */
export interface WorldClockConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showPeriod: boolean;
  showDate: boolean;
  clockSize: number;
}

/**
 * Default world clock configuration
 */
const DEFAULT_CONFIG: WorldClockConfig = {
  position: 'top-left',
  showPeriod: true,
  showDate: false,
  clockSize: 120,
};

/**
 * WorldClock displays in-game time
 */
export class WorldClock {
  private scene: unknown = null;
  private config: WorldClockConfig;
  private advancedTexture: unknown = null;
  private timeText: unknown = null;
  private periodText: unknown = null;
  private progressRing: unknown = null;
  private initialized = false;

  // Time tracking
  private gameTime = 8 * 60; // Start at 8:00 AM (in minutes)
  private dayLength = 24 * 60; // Minutes in a day

  constructor(scene: unknown, config: Partial<WorldClockConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the world clock UI
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('WorldClock already initialized');
      return;
    }

    if (!this.scene) {
      console.warn('WorldClock: Scene is undefined, clock UI will not be created');
      return;
    }

    console.log('Creating world clock UI...');
    this.createClockUI();
    this.initialized = true;
    console.log('WorldClock initialized');
  }

  /**
   * Create the clock UI
   */
  private createClockUI(): void {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON?.GUI) return;

    // Create advanced dynamic texture
    this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
      'clockUI',
      true,
      this.scene
    );

    // Create main container
    const container = new BABYLON.GUI.Rectangle('clockContainer');
    container.width = `${this.config.clockSize}px`;
    container.height = `${this.config.clockSize}px`;
    container.cornerRadius = this.config.clockSize / 2;
    container.thickness = 2;
    container.background = 'rgba(0, 0, 0, 0.7)';
    container.zIndex = 1000;

    // Set position
    switch (this.config.position) {
      case 'top-left':
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        container.top = '20px';
        container.left = '20px';
        break;
      case 'top-right':
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        container.top = '20px';
        container.left = '-20px';
        break;
      case 'bottom-left':
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.top = '-20px';
        container.left = '20px';
        break;
      case 'bottom-right':
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.top = '-20px';
        container.left = '-20px';
        break;
    }

    (this.advancedTexture as { addControl: (c: unknown) => void }).addControl(container);

    // Create outer progress ring
    this.progressRing = new BABYLON.GUI.Ellipse('progressRing');
    (this.progressRing as { width: string; height: string; color: string; thickness: number }).width = `${this.config.clockSize - 10}px`;
    (this.progressRing as { width: string; height: string; color: string; thickness: number }).height = `${this.config.clockSize - 10}px`;
    (this.progressRing as { width: string; height: string; color: string; thickness: number }).color = '#4CAF50';
    (this.progressRing as { width: string; height: string; color: string; thickness: number }).thickness = 3;
    container.addControl(this.progressRing);

    // Create inner circle
    const innerCircle = new BABYLON.GUI.Ellipse('innerCircle');
    (innerCircle as { width: string; height: string; color: string; thickness: number; background: string }).width = `${this.config.clockSize - 20}px`;
    (innerCircle as { width: string; height: string; color: string; thickness: number; background: string }).height = `${this.config.clockSize - 20}px`;
    (innerCircle as { width: string; height: string; color: string; thickness: number; background: string }).color = 'white';
    (innerCircle as { width: string; height: string; color: string; thickness: number; background: string }).thickness = 2;
    (innerCircle as { width: string; height: string; color: string; thickness: number; background: string }).background = 'rgba(0, 0, 0, 0.5)';
    container.addControl(innerCircle);

    // Create time text
    this.timeText = new BABYLON.GUI.TextBlock('timeText');
    (this.timeText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string }).text = '12:00';
    (this.timeText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string }).color = 'white';
    (this.timeText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string }).fontSize = 32;
    (this.timeText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string }).fontFamily = 'Arial';
    (this.timeText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string }).outlineWidth = 2;
    (this.timeText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string }).outlineColor = 'black';
    container.addControl(this.timeText);

    // Create period text (DAY/NIGHT)
    if (this.config.showPeriod) {
      this.periodText = new BABYLON.GUI.TextBlock('periodText');
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).text = 'DAY';
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).color = '#FFD700';
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).fontSize = 14;
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).fontFamily = 'Arial';
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).outlineWidth = 1;
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).outlineColor = 'black';
      (this.periodText as { text: string; color: string; fontSize: number; fontFamily: string; outlineWidth: number; outlineColor: string; top: string }).top = '25px';
      container.addControl(this.periodText);
    }

    // Initial update
    this.updateTime(this.gameTime);
  }

  /**
   * Update the clock time
   * @param minutes - Time in minutes from midnight
   */
  updateTime(minutes: number): void {
    this.gameTime = minutes % this.dayLength;

    // Format time
    const hours = Math.floor(this.gameTime / 60);
    const mins = Math.floor(this.gameTime % 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    if (this.timeText) {
      (this.timeText as { text: string }).text = timeString;
    }

    // Update period text
    if (this.periodText) {
      const period = this.getTimePeriod(hours);
      (this.periodText as { text: string }).text = period.name;
      (this.periodText as { color: string }).color = period.color;
    }

    // Update progress ring
    if (this.progressRing) {
      const progress = this.gameTime / this.dayLength;
      (this.progressRing as { thickness: number }).thickness = 3 + progress * 3;
    }
  }

  /**
   * Get time period info
   */
  private getTimePeriod(hours: number): { name: string; color: string } {
    if (hours >= 6 && hours < 12) {
      return { name: 'MORNING', color: '#FF9800' };
    } else if (hours >= 12 && hours < 17) {
      return { name: 'DAY', color: '#FFD700' };
    } else if (hours >= 17 && hours < 20) {
      return { name: 'EVENING', color: '#FF5722' };
    } else {
      return { name: 'NIGHT', color: '#9C27B0' };
    }
  }

  /**
   * Advance the clock by real-time seconds.
   * @param deltaSeconds - Frame delta in seconds
   * @param minutesPerSecond - How many in-game minutes pass per real second
   */
  advance(deltaSeconds: number, minutesPerSecond = 1): void {
    this.updateTime(this.gameTime + deltaSeconds * minutesPerSecond);
  }

  /**
   * Get current game time in minutes
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Get current hour (0-23)
   */
  getHour(): number {
    return Math.floor(this.gameTime / 60);
  }

  /**
   * Get current minute (0-59)
   */
  getMinute(): number {
    return Math.floor(this.gameTime % 60);
  }

  /**
   * Check if it's daytime
   */
  isDaytime(): boolean {
    const hour = this.getHour();
    return hour >= 6 && hour < 18;
  }

  /**
   * Dispose of world clock resources
   */
  dispose(): void {
    if (this.advancedTexture) {
      (this.advancedTexture as { dispose: () => void }).dispose();
      this.advancedTexture = null;
    }
    this.initialized = false;
    console.log('WorldClock disposed');
  }
}