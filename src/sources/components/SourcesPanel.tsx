import { useI18n } from "solid-compose";

export function SourcesPanel() {
  const t = useI18n();
  return (
    <div class="flex items-center justify-center h-full">
      <p class="text-sm text-foreground/40">{t('sources.comingSoon')}</p>
    </div>
  );
}
