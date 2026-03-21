import { useState } from "react";
import { useRepo } from "../../data/repo.context";

export function ServerStatus() {
  const { port, ready } = useRepo();
  const [copied, setCopied] = useState(false);

  if (!ready) {
    return <span className="text-xs text-foreground/40">Server startet…</span>;
  }

  const mcpUrl = `http://localhost:${port}/mcp`;

  const copy = () => {
    navigator.clipboard.writeText(mcpUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Server läuft" />
      <button
        onClick={copy}
        className="text-xs text-foreground/60 hover:text-foreground font-mono transition-colors"
        title="MCP-Endpunkt kopieren"
      >
        {copied ? "Kopiert ✓" : mcpUrl}
      </button>
    </div>
  );
}
