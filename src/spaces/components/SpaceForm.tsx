import { createSignal, createEffect, Show } from "solid-js";
import type { Space } from "../spaces.types";

interface SpaceFormProps {
  existingSpace?: Space;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

export function SpaceForm(props: SpaceFormProps) {
  const [name, setName] = createSignal(props.existingSpace?.name ?? "");
  const [description, setDescription] = createSignal(props.existingSpace?.description ?? "");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (props.existingSpace) {
      setName(props.existingSpace.name);
      setDescription(props.existingSpace.description);
    }
  });

  const handleSubmit = (e: Event & { currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    setError(null);

    const n = name().trim();
    const d = description().trim();

    if (!n) {
      setError("Name ist erforderlich.");
      return;
    }
    if (!d) {
      setError("Beschreibung ist erforderlich.");
      return;
    }

    try {
      props.onSave({ name: n, description: d });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-3 p-4 border border-border rounded bg-muted">
      <h3 class="text-sm font-medium">
        {props.existingSpace ? "Space bearbeiten" : "Neuer Space"}
      </h3>

      <Show when={error()}>
        {(err) => <p class="text-xs text-red-500">{err()}</p>}
      </Show>

      <input
        autofocus
        type="text"
        placeholder="Name des Spaces…"
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        class="text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none"
      />

      <textarea
        placeholder="Wofür ist dieser Space? (z.B. Forschungsthema, Seminararbeit…)"
        value={description()}
        onInput={(e) => setDescription(e.currentTarget.value)}
        rows={3}
        class="text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none resize-none"
      />

      <div class="flex gap-2 justify-end">
        <button
          type="button"
          onClick={props.onCancel}
          class="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          class="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
        >
          {props.existingSpace ? "Speichern" : "Erstellen"}
        </button>
      </div>
    </form>
  );
}
