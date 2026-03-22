import { For, Show, createSignal } from 'solid-js';
import { useTheme } from '../theme.context';
import { THEME_OPTIONS } from '../theme.types';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = createSignal(false);

  const currentThemeLabel = () => {
    const option = THEME_OPTIONS.find(opt => opt.value === theme());
    return option?.label || 'Theme';
  };

  const handleThemeChange = (newTheme: typeof theme extends () => infer T ? T : never) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const standardThemes = () => THEME_OPTIONS.filter(opt => opt.category === 'standard');
  const accessibilityThemes = () => THEME_OPTIONS.filter(opt => opt.category === 'accessibility');

  return (
    <div class="relative">
      <button
        onClick={() => setIsOpen(!isOpen())}
        class="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors"
        aria-label="Theme auswählen"
        aria-expanded={isOpen()}
        aria-haspopup="true"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
        <span>{currentThemeLabel()}</span>
        <svg
          class={`w-3 h-3 transition-transform ${isOpen() ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={isOpen()}>
        <div class="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-[100] overflow-hidden">
          <div class="p-3 border-b border-border">
            <h3 class="text-sm font-semibold">Design auswählen</h3>
          </div>

          <div class="max-h-96 overflow-y-auto">
            {/* Standard Themes */}
            <div class="p-2">
              <h4 class="px-2 py-1 text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Standard
              </h4>
              <For each={standardThemes()}>
                {(option) => (
                  <button
                    onClick={() => handleThemeChange(option.value)}
                    class={`w-full text-left px-3 py-2 rounded transition-colors ${
                      theme() === option.value
                        ? 'bg-muted border border-border'
                        : 'hover:bg-muted/50'
                    }`}
                    aria-current={theme() === option.value ? 'true' : undefined}
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-sm">{option.label}</span>
                      {theme() === option.value && (
                        <svg
                          class="w-4 h-4 text-foreground"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p class="text-xs text-foreground/60 mt-0.5">{option.description}</p>
                  </button>
                )}
              </For>
            </div>

            {/* Accessibility Themes */}
            <div class="p-2 border-t border-border">
              <h4 class="px-2 py-1 text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Barrierefreiheit
              </h4>
              <For each={accessibilityThemes()}>
                {(option) => (
                  <button
                    onClick={() => handleThemeChange(option.value)}
                    class={`w-full text-left px-3 py-2 rounded transition-colors ${
                      theme() === option.value
                        ? 'bg-muted border border-border'
                        : 'hover:bg-muted/50'
                    }`}
                    aria-current={theme() === option.value ? 'true' : undefined}
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-sm">{option.label}</span>
                      {theme() === option.value && (
                        <svg
                          class="w-4 h-4 text-foreground"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p class="text-xs text-foreground/60 mt-0.5">{option.description}</p>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Backdrop to close dropdown */}
      <Show when={isOpen()}>
        <div
          class="fixed inset-0 z-[90] bg-black/20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      </Show>
    </div>
  );
}
