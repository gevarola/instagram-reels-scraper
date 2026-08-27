"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

type Dict = Record<string, string>;

const es: Dict = {
  "sidebar.tagline": "IA para Reels de Instagram",
  "sidebar.nav.videos": "Videos",
  "sidebar.nav.contentIdeas": "Ideas de Contenido",
  "sidebar.nav.runPipeline": "Correr Pipeline",
  "sidebar.nav.creators": "Creadores",
  "sidebar.nav.discover": "Descubrir",
  "sidebar.nav.configs": "Configuraciones",
  "sidebar.lastPipeline": "Último pipeline: {{date}}",

  "videos.title": "Videos",
  "videos.subtitle": "Explorá los reels de la competencia analizados con IA",
  "videos.filterConfig": "Filtrar por configuración",
  "videos.allConfigs": "Todas las Configuraciones",
  "videos.filterCreator": "Filtrar por creador",
  "videos.allCreators": "Todos los Creadores",
  "videos.sortViews": "Más Vistas",
  "videos.sortDatePosted": "Fecha de Publicación",
  "videos.sortDateAdded": "Fecha Agregado",
  "videos.sortStarred": "Favoritos Primero",
  "videos.count": "{{n}} videos",
  "videos.analysis": "Análisis",
  "videos.concepts": "Conceptos",
  "videos.analyzing": "Analizando...",
  "videos.analyzeWithAI": "Analizar con IA",
  "videos.analysisFailed": "No se pudo analizar el video",
  "videos.emptyTitle": "No se encontraron videos",
  "videos.emptySubtitle": "Corré un pipeline para generar resultados, o ajustá los filtros.",
  "videos.modalTitleAnalysis": "Análisis del Video",
  "videos.modalTitleConcepts": "Nuevos Conceptos",

  "creators.title": "Creadores",
  "creators.subtitle": "Gestioná las cuentas de Instagram de la competencia",
  "creators.refreshAll": "Actualizar Todo",
  "creators.addCreator": "Agregar Creador",
  "creators.editCreator": "Editar Creador",
  "creators.instagramUsername": "Usuario de Instagram",
  "creators.usernamePlaceholder": "ej. marcel.remus",
  "creators.category": "Categoría",
  "creators.categoryPlaceholder": "ej. revision-autos",
  "creators.scrapeNote": "La foto de perfil, seguidores y métricas de actividad se scrapean automáticamente desde Instagram.",
  "creators.saving": "Guardando...",
  "creators.addingScraping": "Agregando y scrapeando...",
  "creators.saveChanges": "Guardar Cambios",
  "creators.filterCategory": "Filtrar por categoría",
  "creators.allCategories": "Todas las Categorías",
  "creators.count": "{{n}} creadores",
  "creators.followers": "Seguidores",
  "creators.reels30d": "Reels/30d",
  "creators.avgViews": "Vistas Prom.",
  "creators.noStatsPrefix": "Sin estadísticas — hacé click en",
  "creators.noStatsSuffix": "para scrapear",
  "creators.scraped": "Scrapeado {{date}}",
  "creators.viewVideos": "Ver videos",
  "creators.emptyTitle": "Todavía no hay creadores",
  "creators.emptySubtitle": "Agregá uno para empezar.",
  "creators.confirmDelete": "¿Eliminar este creador?",

  "run.title": "Correr Pipeline",
  "run.subtitle": "Scrapea los reels de la competencia y guarda sus métricas — el análisis con IA se corre video por video desde la página de Videos",
  "run.pipelineConfiguration": "Configuración del Pipeline",
  "run.config": "Configuración",
  "run.selectConfig": "Elegí una configuración...",
  "run.advancedSettings": "Configuración avanzada",
  "run.maxVideosPerCreator": "Máx. Videos por Creador",
  "run.daysLookback": "Días hacia Atrás",
  "run.runningPipeline": "Corriendo Pipeline...",
  "run.runPipeline": "Correr Pipeline",
  "run.scrapingCreators": "Scrapeando creadores...",
  "run.pipelineComplete": "Pipeline completo",
  "run.pipelineFailed": "Pipeline falló",
  "run.creatorsLabel": "Creadores:",
  "run.videosSaved": "Videos guardados:",
  "run.viewNewVideos": "Ver {{n}} Videos Nuevos",
  "run.errorsLabel": "Errores ({{n}})",
  "run.log": "Registro",
  "run.entries": "{{n}} entradas",
  "run.viewsSuffix": "vistas",

  "configs.title": "Configuraciones",
  "configs.subtitle": "Gestioná las configuraciones del pipeline y los prompts de IA",
  "configs.newConfig": "Nueva Configuración",
  "configs.editConfig": "Editar Configuración",
  "configs.configName": "Nombre de la Configuración",
  "configs.configNamePlaceholder": "ej. Videos de Autos para Toto",
  "configs.creatorsCategory": "Categoría de Creadores",
  "configs.creatorsCategoryPlaceholder": "ej. revision-autos",
  "configs.analysisInstruction": "Instrucción de Análisis (prompt de Gemini)",
  "configs.analysisPlaceholder": "Prompt que le indica a Gemini cómo analizar el video...",
  "configs.conceptsInstruction": "Instrucción de Nuevos Conceptos (prompt de Claude)",
  "configs.conceptsPlaceholder": "Prompt que le indica a Claude cómo generar nuevos conceptos...",
  "configs.saveChanges": "Guardar Cambios",
  "configs.createConfig": "Crear Configuración",
  "configs.analysisPromptLabel": "Prompt de Análisis",
  "configs.conceptsPromptLabel": "Prompt de Conceptos",
  "configs.emptyTitle": "Todavía no hay configuraciones",
  "configs.emptySubtitle": "Creá una para empezar.",
  "configs.confirmDelete": "¿Eliminar esta configuración?",

  "contentIdeas.title": "Ideas de Contenido",
  "contentIdeas.subtitle": "Conceptos extraídos de tus pipelines, armados con los frameworks de ganchos + storytelling + sistema de contenido",
  "contentIdeas.filterArchetype": "Filtrar por arquetipo",
  "contentIdeas.allArchetypes": "Todos los Arquetipos",
  "contentIdeas.count": "{{n}} ideas",
  "contentIdeas.inspiredBy": "Inspirado en {{source}}",
  "contentIdeas.hook": "Gancho",
  "contentIdeas.script": "Guion",
  "contentIdeas.emptyTitle": "Todavía no hay ideas de contenido",
  "contentIdeas.emptySubtitle": "Corré el pipeline primero, después generá un lote nuevo de ideas a partir de los resultados.",

  "discover.title": "Descubrir Creadores",
  "discover.subtitle": "Paso 1: buscá un nicho por palabra clave. Paso 2: elegí cuentas prometedoras y expandí a su red de \"Sugeridas para vos\".",
  "discover.searchNiche": "Buscar un nicho",
  "discover.queryPlaceholder": "ej. \"cafetería\" o \"coffee shop\" (para resultados en inglés)",
  "discover.categoryToSave": "Categoría para guardar (opcional)",
  "discover.search": "Buscar",
  "discover.results": "{{n}} resultados",
  "discover.scrapingNote": "Scrapeando el detalle de cada perfil — tarda entre 1 y 1.5 minutos para 10 resultados, no está trabado.",
  "discover.expandFromSelected": "Expandir desde las cuentas seleccionadas",
  "discover.selectedAsSeeds": "({{n}}/5 elegidas como semilla)",
  "discover.minFollowers": "Seguidores mín.",
  "discover.language": "Idioma",
  "discover.anyLanguage": "Cualquier idioma",
  "discover.findSimilar": "Buscar cuentas similares",
  "discover.pickSeedsNote": "Elegí 1-5 cuentas de arriba con \"Usar como semilla\" primero — este paso gasta un poco de uso de Apify por cuenta analizada (~$0.01 cada una, las primeras 5 gratis).",
  "discover.selectedAsSeed": "Elegida como semilla",
  "discover.useAsSeed": "Usar como semilla",
  "discover.added": "Agregada",
  "discover.addToCreators": "Agregar a Creadores",
  "discover.searchFailed": "La búsqueda falló",
  "discover.expansionFailed": "La expansión falló",

  "markdown.noContent": "No hay contenido disponible.",
};

const en: Dict = {
  "sidebar.tagline": "Instagram Reels AI",
  "sidebar.nav.videos": "Videos",
  "sidebar.nav.contentIdeas": "Content Ideas",
  "sidebar.nav.runPipeline": "Run Pipeline",
  "sidebar.nav.creators": "Creators",
  "sidebar.nav.discover": "Discover",
  "sidebar.nav.configs": "Configs",
  "sidebar.lastPipeline": "Last pipeline: {{date}}",

  "videos.title": "Videos",
  "videos.subtitle": "Browse analyzed competitor reels with AI insights",
  "videos.filterConfig": "Filter by config",
  "videos.allConfigs": "All Configs",
  "videos.filterCreator": "Filter by creator",
  "videos.allCreators": "All Creators",
  "videos.sortViews": "Most Views",
  "videos.sortDatePosted": "Date Posted",
  "videos.sortDateAdded": "Date Added",
  "videos.sortStarred": "Starred First",
  "videos.count": "{{n}} videos",
  "videos.analysis": "Analysis",
  "videos.concepts": "Concepts",
  "videos.analyzing": "Analyzing...",
  "videos.analyzeWithAI": "Analyze with AI",
  "videos.analysisFailed": "Analysis failed",
  "videos.emptyTitle": "No videos found",
  "videos.emptySubtitle": "Run a pipeline analysis to generate results, or adjust your filters.",
  "videos.modalTitleAnalysis": "Video Analysis",
  "videos.modalTitleConcepts": "New Concepts",

  "creators.title": "Creators",
  "creators.subtitle": "Manage competitor Instagram accounts to track",
  "creators.refreshAll": "Refresh All",
  "creators.addCreator": "Add Creator",
  "creators.editCreator": "Edit Creator",
  "creators.instagramUsername": "Instagram Username",
  "creators.usernamePlaceholder": "e.g. marcel.remus",
  "creators.category": "Category",
  "creators.categoryPlaceholder": "e.g. dubai-real-estate",
  "creators.scrapeNote": "Profile picture, followers, and activity metrics will be scraped automatically from Instagram.",
  "creators.saving": "Saving...",
  "creators.addingScraping": "Adding & scraping...",
  "creators.saveChanges": "Save Changes",
  "creators.filterCategory": "Filter by category",
  "creators.allCategories": "All Categories",
  "creators.count": "{{n}} creators",
  "creators.followers": "Followers",
  "creators.reels30d": "Reels/30d",
  "creators.avgViews": "Avg Views",
  "creators.noStatsPrefix": "No stats yet — click",
  "creators.noStatsSuffix": "to scrape",
  "creators.scraped": "Scraped {{date}}",
  "creators.viewVideos": "View videos",
  "creators.emptyTitle": "No creators yet",
  "creators.emptySubtitle": "Add one to get started.",
  "creators.confirmDelete": "Delete this creator?",

  "run.title": "Run Pipeline",
  "run.subtitle": "Scrape competitor reels and save their metrics — AI analysis runs per-video from the Videos page",
  "run.pipelineConfiguration": "Pipeline Configuration",
  "run.config": "Config",
  "run.selectConfig": "Select a config...",
  "run.advancedSettings": "Advanced settings",
  "run.maxVideosPerCreator": "Max Videos per Creator",
  "run.daysLookback": "Days Lookback",
  "run.runningPipeline": "Running Pipeline...",
  "run.runPipeline": "Run Pipeline",
  "run.scrapingCreators": "Scraping creators...",
  "run.pipelineComplete": "Pipeline complete",
  "run.pipelineFailed": "Pipeline failed",
  "run.creatorsLabel": "Creators:",
  "run.videosSaved": "Videos saved:",
  "run.viewNewVideos": "View {{n}} New Videos",
  "run.errorsLabel": "Errors ({{n}})",
  "run.log": "Log",
  "run.entries": "{{n}} entries",
  "run.viewsSuffix": "views",

  "configs.title": "Configs",
  "configs.subtitle": "Manage pipeline configurations and AI prompts",
  "configs.newConfig": "New Config",
  "configs.editConfig": "Edit Config",
  "configs.configName": "Config Name",
  "configs.configNamePlaceholder": "e.g. Real Estate Videos for Anja",
  "configs.creatorsCategory": "Creators Category",
  "configs.creatorsCategoryPlaceholder": "e.g. dubai-real-estate",
  "configs.analysisInstruction": "Analysis Instruction (Gemini prompt)",
  "configs.analysisPlaceholder": "Prompt that tells Gemini how to analyze the video...",
  "configs.conceptsInstruction": "New Concepts Instruction (Claude prompt)",
  "configs.conceptsPlaceholder": "Prompt that tells Claude how to generate new concepts...",
  "configs.saveChanges": "Save Changes",
  "configs.createConfig": "Create Config",
  "configs.analysisPromptLabel": "Analysis Prompt",
  "configs.conceptsPromptLabel": "Concepts Prompt",
  "configs.emptyTitle": "No configs yet",
  "configs.emptySubtitle": "Create one to get started.",
  "configs.confirmDelete": "Delete this config?",

  "contentIdeas.title": "Content Ideas",
  "contentIdeas.subtitle": "Concepts mined from your pipeline runs, built with the hooks + storytelling + content-system frameworks",
  "contentIdeas.filterArchetype": "Filter by archetype",
  "contentIdeas.allArchetypes": "All Archetypes",
  "contentIdeas.count": "{{n}} ideas",
  "contentIdeas.inspiredBy": "Inspired by {{source}}",
  "contentIdeas.hook": "Hook",
  "contentIdeas.script": "Script",
  "contentIdeas.emptyTitle": "No content ideas yet",
  "contentIdeas.emptySubtitle": "Run the pipeline first, then generate a fresh batch of ideas from the results.",

  "discover.title": "Discover Creators",
  "discover.subtitle": "Step 1: search a niche by keyword. Step 2: pick promising accounts and expand into their \"Suggested for You\" network.",
  "discover.searchNiche": "Search a niche",
  "discover.queryPlaceholder": "e.g. \"coffee shop\" or \"cafeteria\" (for Spanish results)",
  "discover.categoryToSave": "Category to save under (optional)",
  "discover.search": "Search",
  "discover.results": "{{n}} results",
  "discover.scrapingNote": "Scraping profile details for each match — this takes roughly 1-1.5 minutes for 10 results, not stuck.",
  "discover.expandFromSelected": "Expand from selected accounts",
  "discover.selectedAsSeeds": "({{n}}/5 selected as seeds)",
  "discover.minFollowers": "Min followers",
  "discover.language": "Language",
  "discover.anyLanguage": "Any language",
  "discover.findSimilar": "Find similar accounts",
  "discover.pickSeedsNote": "Pick 1-5 accounts above with \"Use as seed\" first — this step costs a small amount of Apify usage per account analyzed (~$0.01 each, first 5 free).",
  "discover.selectedAsSeed": "Selected as seed",
  "discover.useAsSeed": "Use as seed",
  "discover.added": "Added",
  "discover.addToCreators": "Add to Creators",
  "discover.searchFailed": "Search failed",
  "discover.expansionFailed": "Expansion failed",

  "markdown.noContent": "No content available.",
};

const dictionaries: Record<Lang, Dict> = { es, en };

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "virality-system-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "es" || stored === "en") setLangState(stored);
    } catch {
      /* localStorage unavailable — stick with default */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = dictionaries[lang][key] ?? dictionaries.es[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.split(`{{${k}}}`).join(String(v));
      }
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
