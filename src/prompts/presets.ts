// Placeholder presets - will be refined in M2 with expert input

export interface Preset {
  id: string;
  name: string;
  description: string;
  hidden: string; // Hidden parameters only revealed post-game
}

export const PRESETS: Record<string, Preset> = {
  slowTakeoff: {
    id: 'slowTakeoff',
    name: 'Slow Takeoff',
    description: 'A gradual capability curve with multiple intervention windows. More forgiving for policy mistakes.',
    hidden: `
## Hidden Parameters (Slow Takeoff)

Capability growth rate: 1.5x per year
Alignment difficulty: moderate
Economic pressure: medium
International coordination: possible with effort
Key thresholds:
- 2027: AI matches average knowledge workers
- 2030: AI surpasses most professionals
- 2034: Potential ASI if unchecked

Player has multiple opportunities to influence trajectory. Moderate coordination
can delay extinction by years. Strong coordination can achieve utopia.

Extinction triggers:
- Uncontrolled ASI development by any major lab
- Arms race dynamics without safety standards
- Economic displacement causing political instability

Utopia triggers:
- International compute governance before 2030
- Successful alignment research breakthrough
- Coordinated capability pause with safety milestones
`,
  },

  fastTakeoff: {
    id: 'fastTakeoff',
    name: 'Fast Takeoff',
    description: 'Rapid capability gains with narrow intervention windows. Requires quick, decisive action.',
    hidden: `
## Hidden Parameters (Fast Takeoff)

Capability growth rate: 3x per year
Alignment difficulty: high
Economic pressure: extreme
International coordination: difficult
Key thresholds:
- 2026: AI matches average knowledge workers
- 2027: AI surpasses most professionals
- 2028-2029: Potential ASI window

Player has limited time to influence trajectory. Only aggressive early action
has meaningful impact. Most games end in extinction.

Extinction triggers:
- Any significant delay in safety regulations
- Lab competition prioritizing speed over safety
- Failure to establish international monitoring by 2027

Utopia triggers:
- Immediate international moratorium (2026)
- Major alignment breakthrough (requires luck)
- Coordinated lab self-governance (narrow window)
`,
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

export function getRandomPreset(exclude?: string): Preset {
  const available = PRESET_IDS.filter(id => id !== exclude);
  const randomId = available[Math.floor(Math.random() * available.length)];
  return PRESETS[randomId];
}

export function getPreset(id: string): Preset | undefined {
  return PRESETS[id];
}

export default PRESETS;
