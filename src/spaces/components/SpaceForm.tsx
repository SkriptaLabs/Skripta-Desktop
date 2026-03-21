import { useState, useEffect } from "react";
import type { Space } from "../spaces.types";

interface SpaceFormProps {
  existingSpace?: Space;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

export function SpaceForm({ existingSpace, onSave, onCancel }: SpaceFormProps) {
  const [name, setName] = useState(existingSpace?.name ?? "");
  const [description, setDescription] = useState(existingSpace?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingSpace) {
      setName(existingSpace.name);
      setDescription(existingSpace.description);
    }
  }, [existingSpace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    if (!description.trim()) {
      setError("Beschreibung ist erforderlich.");
      return;
    }

    try {
      onSave({ name: name.trim(), description: description.trim() });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 border border-border rounded bg-muted">
      <h3 className="text-sm font-medium">
        {existingSpace ? "Space bearbeiten" : "Neuer Space"}
      </h3>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        autoFocus
        type="text"
        placeholder="Name des Spaces…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none"
      />

      <textarea
        placeholder="Wofür ist dieser Space? (z.B. Forschungsthema, Seminararbeit…)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none resize-none"
      />

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
        >
          {existingSpace ? "Speichern" : "Erstellen"}
        </button>
      </div>
    </form>
  );
}
