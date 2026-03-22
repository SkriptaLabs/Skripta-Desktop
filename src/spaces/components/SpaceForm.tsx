import { createSignal, createEffect, Show } from "solid-js";
import type { Space } from "../spaces.types";
import { useI18n } from "solid-compose";

interface SpaceFormProps {
  existingSpace?: Space;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

export function SpaceForm(props: SpaceFormProps) {
  const [name, setName] = createSignal(props.existingSpace?.name ?? "");
  const [description, setDescription] = createSignal(props.existingSpace?.description ?? "");
  const [error, setError] = createSignal<string | null>(null);
  const t = useI18n();

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
      setError(t('spaceForm.nameRequired'));
      return;
    }
    if (!d) {
      setError(t('spaceForm.descriptionRequired'));
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
        {props.existingSpace ? t('spaceForm.editTitle') : t('spaceForm.createTitle')}
      </h3>

      <Show when={error()}>
        {(err) => <p class="text-xs text-red-500">{err()}</p>}
      </Show>

      <input
        autofocus
        type="text"
        placeholder={t('spaceForm.namePlaceholder')}
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        class="text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none"
      />

      <textarea
        placeholder={t('spaceForm.descriptionPlaceholder')}
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
          {t('spaceForm.cancel')}
        </button>
        <button
          type="submit"
          class="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
        >
          {props.existingSpace ? t('spaceForm.save') : t('spaceForm.create')}
        </button>
      </div>
    </form>
  );
}
