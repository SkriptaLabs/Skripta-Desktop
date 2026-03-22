import { createSignal, For, Show } from "solid-js";
import { useSpaces } from "../service/spaces.service";
import { useRepo } from "../../data/repo.context";
import { SpaceForm } from "./SpaceForm";
import type { Space } from "../spaces.types";

export function SpacesList() {
  const { spacesHandle, selectSpace, ready, repo } = useRepo();
  const { spaces, loading, addSpace, editSpace, removeSpace } = useSpaces(spacesHandle, repo);
  const [creating, setCreating] = createSignal(false);
  const [editing, setEditing] = createSignal<Space | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<number | null>(null);

  const handleCreate = (data: { name: string; description: string }) => {
    addSpace(data);
    setCreating(false);
  };

  const handleEdit = (data: { name: string; description: string }) => {
    const e = editing();
    if (!e) return;
    editSpace(e.id, data);
    setEditing(null);
  };

  const handleDelete = (id: number) => {
    removeSpace(id);
    setConfirmDelete(null);
  };

  return (
    <Show
      when={ready() && !loading()}
      fallback={
        <div class="flex items-center justify-center h-full">
          <p class="text-sm text-foreground/50">Lade…</p>
        </div>
      }
    >
      <div class="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        {/* Header */}
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Spaces</h2>
            <p class="text-sm text-foreground/50 mt-1">
              Wähle einen Space für deine Recherche oder erstelle einen neuen.
            </p>
          </div>
          <Show when={!creating() && !editing()}>
            <button
              onClick={() => setCreating(true)}
              class="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
            >
              + Neuer Space
            </button>
          </Show>
        </div>

        {/* Create Form */}
        <Show when={creating()}>
          <SpaceForm
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Show>

        {/* Edit Form */}
        <Show when={editing()}>
          {(editingSpace) => (
            <SpaceForm
              existingSpace={editingSpace()}
              onSave={handleEdit}
              onCancel={() => setEditing(null)}
            />
          )}
        </Show>

        {/* Space List */}
        <Show
          when={spaces().length > 0 || creating()}
          fallback={
            <div class="text-center py-12">
              <p class="text-sm text-foreground/40">Noch keine Spaces vorhanden.</p>
              <p class="text-xs text-foreground/30 mt-1">
                Erstelle deinen ersten Space, um mit der Recherche zu beginnen.
              </p>
            </div>
          }
        >
          <ul class="flex flex-col gap-2">
            <For each={spaces()}>{(space) => (
              <li class="flex items-start justify-between p-4 rounded border border-border hover:bg-muted/50 transition-colors group">
                <button
                  onClick={() => selectSpace(space.id)}
                  class="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <p class="text-sm font-medium">{space.name}</p>
                  <p class="text-xs text-foreground/60 mt-1 line-clamp-2">
                    {space.description}
                  </p>
                  <p class="text-xs text-foreground/30 mt-2">
                    Erstellt: {new Date(space.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </button>

                <div class="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(space);
                      setCreating(false);
                    }}
                    class="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                    title="Bearbeiten"
                  >
                    ✎
                  </button>
                  <Show
                    when={confirmDelete() === space.id}
                    fallback={
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(space.id);
                        }}
                        class="text-xs px-2 py-1 border border-border rounded hover:bg-muted text-foreground/40 hover:text-red-500 transition-colors"
                        title="Löschen"
                      >
                        ✕
                      </button>
                    }
                  >
                    <div class="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(space.id);
                        }}
                        class="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Löschen
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(null);
                        }}
                        class="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                      >
                        Nein
                      </button>
                    </div>
                  </Show>
                </div>
              </li>
            )}</For>
          </ul>
        </Show>
      </div>
    </Show>
  );
}
