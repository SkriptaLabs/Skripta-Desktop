export type ThemeMode = 
  | 'light' 
  | 'dark' 
  | 'high-contrast' 
  | 'deuteranopia' 
  | 'protanopia' 
  | 'tritanopia';

export interface ThemeOption {
  value: ThemeMode;
  label: string;
  description: string;
  category: 'standard' | 'accessibility';
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Hell',
    description: 'Helles Design für normale Lichtverhältnisse',
    category: 'standard'
  },
  {
    value: 'dark',
    label: 'Dunkel',
    description: 'Dunkles Design für reduzierte Augenbelastung',
    category: 'standard'
  },
  {
    value: 'high-contrast',
    label: 'Hoher Kontrast',
    description: 'Maximaler Kontrast für Sehbeeinträchtigungen',
    category: 'accessibility'
  },
  {
    value: 'deuteranopia',
    label: 'Deuteranopie',
    description: 'Optimiert für Rot-Grün-Schwäche (häufigste Form)',
    category: 'accessibility'
  },
  {
    value: 'protanopia',
    label: 'Protanopie',
    description: 'Optimiert für Rot-Grün-Blindheit',
    category: 'accessibility'
  },
  {
    value: 'tritanopia',
    label: 'Tritanopie',
    description: 'Optimiert für Blau-Gelb-Blindheit',
    category: 'accessibility'
  }
];

export const THEME_STORAGE_KEY = 'skripta-theme-preference';
