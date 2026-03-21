import { useState } from "react";
import { NotesPanel } from "./app/notes/components/NotesPanel";
import { AiSpacePanel } from "./app/aispace/components/AiSpacePanel";
import { ServerStatus } from "./app/settings/components/ServerStatus";
import { RepoProvider, useRepo } from "./app/data/repo.context";
import { SpacesList } from "./app/spaces/components/SpacesList";

function AppContent() {
  const { activeSpace, leaveSpace } = useRepo();
  const [showAiSpace, setShowAiSpace] = useState(false);

  // No active space → show spaces list
  if (!activeSpace) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <header className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h1 className="text-lg font-semibold tracking-tight">Scripta</h1>
          <ServerStatus />
        </header>
        <main className="flex-1 overflow-auto">
          <SpacesList />
        </main>
      </div>
    );
  }

  // Active space → show research workspace
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={leaveSpace}
            className="text-sm px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
            title="Zurück zur Space-Übersicht"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{activeSpace.name}</h1>
            <p className="text-xs text-foreground/50">{activeSpace.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ServerStatus />
          <button
            onClick={() => setShowAiSpace(!showAiSpace)}
            className="text-sm px-3 py-1 rounded border border-border hover:bg-muted transition-colors"
          >
            {showAiSpace ? "KI-Space ausblenden" : "KI-Space anzeigen"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className={`flex-1 overflow-auto ${showAiSpace ? "border-r border-border" : ""}`}>
          <NotesPanel />
        </main>
        {showAiSpace && (
          <aside className="w-96 overflow-auto">
            <AiSpacePanel />
          </aside>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RepoProvider>
      <AppContent />
    </RepoProvider>
  );
}
