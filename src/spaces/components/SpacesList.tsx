import { useState } from "react";
import { useSpaces } from "../service/spaces.service";
import { useRepo } from "../../data/repo.context";
import { SpaceForm } from "./SpaceForm";
import type { Space } from "../spaces.types";

export function SpacesList() {
  const { spacesHandle, selectSpace, ready, repo } = useRepo();
  const { spaces, loading, addSpace, editSpace, removeSpace } = useSpaces(
    ready ? spacesHandle : null,
    repo
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = (data: { name: string; description: string }) => {
    addSpace(data);
    setCreating(false);
  };

  const handleEdit = (data: { name: string; description: string }) => {
    if (!editing) return;
    editSpace(editing.id, data);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    removeSpace(id);
    setConfirmDelete(null);
  };

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-foreground/50">Lade…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Spaces</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Wähle einen Space für deine Recherche oder erstelle einen neuen.
          </p>
        </div>
        {!creating && !editing && (
          <button
            onClick={() => setCreating(true)}
            className="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
          >
            + Neuer Space
          </button>
        )}
      </div>

      {/* Create Form */}
      {creating && (
        <SpaceForm
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Edit Form */}
      {editing && (
        <SpaceForm
          existingSpace={editing}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Space List */}
      {spaces.length === 0 && !creating ? (
        <div className="text-center py-12">
          <p className="text-sm text-foreground/40">Noch keine Spaces vorhanden.</p>
          <p className="text-xs text-foreground/30 mt-1">
            Erstelle deinen ersten Space, um mit der Recherche zu beginnen.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {spaces.map((space) => (
            <li
              key={space.id}
              className="flex items-start justify-between p-4 rounded border border-border hover:bg-muted/50 transition-colors group"
            >
              <button
                onClick={() => selectSpace(space.id)}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <p className="text-sm font-medium">{space.name}</p>
                <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
                  {space.description}
                </p>
                <p className="text-xs text-foreground/30 mt-2">
                  Erstellt: {new Date(space.createdAt).toLocaleDateString("de-DE")}
                </p>
              </button>

              <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(space);
                    setCreating(false);
                  }}
                  className="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                  title="Bearbeiten"
                >
                  ✎
                </button>
                {confirmDelete === space.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(space.id);
                      }}
                      className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Löschen
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(null);
                      }}
                      className="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                    >
                      Nein
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(space.id);
                    }}
                    className="text-xs px-2 py-1 border border-border rounded hover:bg-muted text-foreground/40 hover:text-red-500 transition-colors"
                    title="Löschen"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
