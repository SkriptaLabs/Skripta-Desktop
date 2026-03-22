import { createSignal, Show, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { MenuItem } from "./menu.types";

interface MenuLevelProps {
  items: MenuItem[];
  level?: 1 | 2 | 3;
}

const levelStyles = {
  1: {
    bar: "border-b border-border",
    button: "text-sm px-4 py-2",
    active: "bg-muted font-medium",
    inactive: "text-foreground/70 hover:text-foreground hover:bg-muted/70",
  },
  2: {
    bar: "border-b border-border/70",
    button: "text-xs px-3 py-1.5",
    active: "bg-muted font-medium",
    inactive: "text-foreground/70 hover:text-foreground hover:bg-muted/70",
  },
  3: {
    bar: "border-b border-border/70",
    button: "text-xs px-2 py-1",
    active: "bg-muted font-medium",
    inactive: "text-foreground/70 hover:text-foreground hover:bg-muted/70",
  },
};

export function MenuLevel(props: MenuLevelProps) {
  const [activeId, setActiveId] = createSignal(props.items[0]?.id);

  const activeItem = () => props.items.find((i) => i.id === activeId()) ?? props.items[0];
  const level = () => props.level ?? 1;
  const styles = () => levelStyles[level()];

  return (
    <Show
      when={props.items.length > 1}
      fallback={
        <Show when={props.items[0]}>
          {(item) => (
            <div class="flex flex-col w-full h-full">
              <Dynamic component={item().component} />
            </div>
          )}
        </Show>
      }
    >
      <div class="flex flex-col w-full h-full">
        <nav class={`flex w-full ${styles().bar}`}>
          <For each={props.items}>
            {(item) => (
              <button
                onClick={() => setActiveId(item.id)}
                class={`flex-1 transition-colors cursor-pointer ${styles().button} ${
                  activeId() === item.id ? styles().active : styles().inactive
                }`}
              >
                {item.label}
              </button>
            )}
          </For>
        </nav>
        <div class="flex-1 overflow-auto">
          <Dynamic component={activeItem().component} />
        </div>
      </div>
    </Show>
  );
}
