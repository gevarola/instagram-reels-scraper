"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/lib/i18n";

export function TopBar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();

  const pageTitles: Record<string, string> = {
    "/videos": t("sidebar.nav.videos"),
    "/run": t("sidebar.nav.runPipeline"),
    "/creators": t("sidebar.nav.creators"),
    "/configs": t("sidebar.nav.configs"),
    "/content-ideas": t("sidebar.nav.contentIdeas"),
    "/discover": t("sidebar.nav.discover"),
  };
  const title = pageTitles[pathname] || "Virality System";

  return (
    <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-background/80 px-6 backdrop-blur-xl">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
      <div className="h-4 w-px bg-white/10" />
      <span className="text-sm font-medium">{title}</span>

      <div className="ml-auto flex items-center rounded-full glass border border-white/[0.08] p-0.5 text-[11px] font-semibold">
        <button
          onClick={() => setLang("es")}
          aria-pressed={lang === "es"}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            lang === "es" ? "bg-amber-500 text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ES
        </button>
        <button
          onClick={() => setLang("en")}
          aria-pressed={lang === "en"}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            lang === "en" ? "bg-amber-500 text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
