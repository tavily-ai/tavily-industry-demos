import { useState, useEffect, useRef } from "react";
import {
  Header,
  ResearchStatus,
  ResearchReport,
  ResearchForm,
  ResearchQueries,
  CurationExtraction,
  ResearchBriefings,
} from "./components";
import type { ResearchOutput, ResearchStatusType } from "./types";
import { glassStyle, fadeInAnimation } from "./styles";
import { consumeSSE } from "./stream";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [isResearching, setIsResearching] = useState(false);
  const [status, setStatus] = useState<ResearchStatusType | null>(null);
  const [output, setOutput] = useState<ResearchOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const [hasTavilyKey, setHasTavilyKey] = useState<boolean | null>(null);
  const [hasOpenAIKey, setHasOpenAIKey] = useState<boolean | null>(null);
  const [originalCompanyName, setOriginalCompanyName] = useState<string>("");
  const [currentPhase, setCurrentPhase] = useState<
    "search" | "enrichment" | "briefing" | "complete" | null
  >(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [queries, setQueries] = useState<Array<{ text: string; number: number; category: string }>>(
    [],
  );
  const [streamingQueries, setStreamingQueries] = useState<
    Record<string, { text: string; number: number; category: string; isComplete: boolean }>
  >({});
  const [isQueriesExpanded, setIsQueriesExpanded] = useState(true);
  const [enrichmentCounts, setEnrichmentCounts] = useState<
    | {
        company: { total: number; enriched: number };
        industry: { total: number; enriched: number };
        financial: { total: number; enriched: number };
        news: { total: number; enriched: number };
      }
    | undefined
  >(undefined);
  const [briefingStatus, setBriefingStatus] = useState({
    company: false,
    industry: false,
    financial: false,
    news: false,
  });
  const [isEnrichmentExpanded, setIsEnrichmentExpanded] = useState(true);
  const [isBriefingExpanded, setIsBriefingExpanded] = useState(true);
  const [hasScrolledToStatus, setHasScrolledToStatus] = useState(false);
  const [isReportStreaming, setIsReportStreaming] = useState(false);

  // Add new state for color cycling
  const [loaderColor, setLoaderColor] = useState("#2677FF");

  // Scroll helper function
  const scrollToStatus = () => {
    if (!hasScrolledToStatus && statusRef.current) {
      const yOffset = -20;
      const y = statusRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setHasScrolledToStatus(true);
    }
  };

  // Add useEffect for color cycling
  useEffect(() => {
    if (!isResearching) return;

    const colors = [
      "#2677FF", // Blue
      "#8FBCFA", // Light Blue
      "#FE363B", // Red
      "#FF9A9D", // Light Red
      "#FDBB11", // Yellow
      "#F6D785", // Light Yellow
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % colors.length;
      setLoaderColor(colors[currentIndex]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isResearching]);

  const resetResearch = () => {
    setIsResetting(true);

    // Use setTimeout to create a smooth transition
    setTimeout(() => {
      setStatus(null);
      setOutput(null);
      setError(null);
      setIsComplete(false);
      setCurrentPhase(null);
      setQueries([]);
      setStreamingQueries({});
      setEnrichmentCounts(undefined);
      setBriefingStatus({
        company: false,
        industry: false,
        financial: false,
        news: false,
      });
      setIsQueriesExpanded(true);
      setIsEnrichmentExpanded(true);
      setIsBriefingExpanded(true);
      setHasScrolledToStatus(false);
      setIsReportStreaming(false);
      setIsResetting(false);
    }, 300);
  };

  const applyEvent = (data: Record<string, unknown>) => {
    const getStepName = (nodeName: string): string => {
      const stepMap: Record<string, string> = {
        grounding: "Search",
        financial_analyst: "Search",
        news_scanner: "Search",
        industry_analyst: "Search",
        company_analyst: "Search",
        collector: "Search",
        curator: "Enriching",
        enricher: "Enriching",
        briefing: "Briefing",
        editor: "Finalizing",
      };
      return stepMap[nodeName] || nodeName;
    };

    if (data.type === "progress" && data.step) {
      const step = String(data.step);
      const stepName = getStepName(step);
      setStatus({
        step: stepName,
        message: `Processing ${step}...`,
      });

      if (
        [
          "grounding",
          "financial_analyst",
          "news_scanner",
          "industry_analyst",
          "company_analyst",
          "collector",
        ].includes(step)
      ) {
        setCurrentPhase("search");
      } else if (["curator", "enricher"].includes(step)) {
        setCurrentPhase("enrichment");
      } else if (step === "briefing") {
        setCurrentPhase("briefing");
      }

      scrollToStatus();
    }

    if (data.type === "query_generating") {
      setCurrentPhase("search");
      setStatus({
        step: "Search",
        message: `Query ${data.query_number}: ${data.query}`,
      });
      const key = `${data.category}_${data.query_number}`;
      setStreamingQueries((prev) => ({
        ...prev,
        [key]: {
          text: String(data.query || ""),
          number: Number(data.query_number || 0),
          category: String(data.category || ""),
          isComplete: false,
        },
      }));
    } else if (data.type === "query_generated") {
      setCurrentPhase("search");
      setStatus({
        step: "Search",
        message: `Generated: ${data.query}`,
      });
      setQueries((prev) => [
        ...prev,
        {
          text: String(data.query || ""),
          number: Number(data.query_number || 0),
          category: String(data.category || ""),
        },
      ]);
      const key = `${data.category}_${data.query_number}`;
      setStreamingQueries((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      scrollToStatus();
    } else if (data.type === "research_init") {
      setCurrentPhase("search");
      setStatus({
        step: "Initializing",
        message: String(data.message || `Initiating research for ${data.company}`),
      });
    } else if (data.type === "crawl_start") {
      setCurrentPhase("search");
      setStatus({
        step: "Website Crawl",
        message: String(data.message || "Crawling company website"),
      });
    } else if (data.type === "curation") {
      setCurrentPhase("enrichment");
      setStatus({
        step: "Curating data",
        message: String(data.message || `Curating ${data.category} documents`),
      });
      if (data.category) {
        const category = String(data.category) as "company" | "industry" | "financial" | "news";
        setEnrichmentCounts(
          (prev) =>
            ({
              ...prev,
              [category]: {
                total: Number(data.total || 0),
                enriched: 0,
              },
            }) as typeof enrichmentCounts,
        );
      }
      setTimeout(() => {
        setIsQueriesExpanded(false);
      }, 1000);
      scrollToStatus();
    } else if (data.type === "enrichment") {
      setCurrentPhase("enrichment");
      setStatus({
        step: "Enriching",
        message: String(data.message || "Enriching documents with additional content"),
      });
      if (data.category && data.enriched !== undefined) {
        const category = String(data.category) as "company" | "industry" | "financial" | "news";
        setEnrichmentCounts((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [category]: {
              total: prev[category]?.total || Number(data.total || 0),
              enriched: Number(data.enriched),
            },
          } as typeof enrichmentCounts;
        });
      }
    } else if (data.type === "briefing_start") {
      setCurrentPhase("briefing");
      setStatus({
        step: "Generating briefings",
        message: `Creating ${data.category} briefing from ${data.total_docs} documents`,
      });
      setTimeout(() => {
        setIsEnrichmentExpanded(false);
      }, 1000);
      scrollToStatus();
    } else if (data.type === "briefing_complete") {
      setCurrentPhase("briefing");
      setStatus({
        step: "Briefing complete",
        message: `${data.category} briefing generated (${data.content_length} characters)`,
      });
      if (data.category) {
        const category = String(data.category) as "company" | "industry" | "financial" | "news";
        setBriefingStatus((prev) => {
          const newBriefingStatus = {
            ...prev,
            [category]: true,
          };

          const allBriefingsComplete = Object.values(newBriefingStatus).every((status) => status);

          if (allBriefingsComplete) {
            setTimeout(() => {
              setIsBriefingExpanded(false);
            }, 2000);
          }

          return newBriefingStatus;
        });
      }
    } else if (data.type === "report_compilation") {
      setCurrentPhase("briefing");
      setStatus({
        step: "Finalizing report",
        message: String(data.message || "Compiling final report"),
      });
    } else if (data.type === "report_chunk" && data.chunk) {
      setIsReportStreaming(true);
      setOutput((prev) => {
        const currentReport = prev?.details?.report || "";
        return {
          summary: "",
          details: { report: currentReport + String(data.chunk) },
        };
      });
      setStatus({
        step: "Finalizing report",
        message: "Generating final report...",
      });
    } else if (data.type === "complete" && data.report) {
      setIsReportStreaming(false);
      setOutput({
        summary: "",
        details: { report: String(data.report) },
      });
      setStatus({ step: "Complete", message: "Research completed successfully" });
      setIsComplete(true);
      setIsResearching(false);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => response.json())
      .then((data) => {
        setHasTavilyKey(Boolean(data.hasTavilyKey));
        setHasOpenAIKey(Boolean(data.hasOpenAIKey));
      })
      .catch(() => {
        setHasTavilyKey(false);
        setHasOpenAIKey(false);
      });
    return () => controllerRef.current?.abort();
  }, []);

  // Create a custom handler for the form that receives form data
  const liveReady = hasTavilyKey === true && hasOpenAIKey === true;

  const handleFormSubmit = async (formData: {
    companyName: string;
    companyUrl: string;
    companyHq: string;
    companyIndustry: string;
  }) => {
    setError(null);

    if (isComplete) {
      resetResearch();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    controllerRef.current?.abort();
    const abort = new AbortController();
    controllerRef.current = abort;

    setIsResearching(true);
    setOriginalCompanyName(formData.companyName);
    setStatus({
      step: "Processing",
      message: "Starting research...",
    });

    try {
      const formattedCompanyUrl = formData.companyUrl
        ? formData.companyUrl.startsWith("http://") || formData.companyUrl.startsWith("https://")
          ? formData.companyUrl
          : `https://${formData.companyUrl}`
        : undefined;

      const response = await fetch(`${API_URL}/research`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: formData.companyName,
          company_url: formattedCompanyUrl,
          industry: formData.companyIndustry || undefined,
          hq_location: formData.companyHq || undefined,
        }),
        signal: abort.signal,
      });

      await consumeSSE(response, applyEvent);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Research stopped. Completed results remain below.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to start research");
      }
    } finally {
      setIsResearching(false);
      controllerRef.current = null;
    }
  };

  // Add new function to handle PDF generation
  const handleGeneratePdf = async () => {
    if (!output || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    try {
      const response = await fetch(`${API_URL}/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_content: output.details.report,
          company_name: originalCompanyName || output.details.report,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.download = `${originalCompanyName || "research_report"}.pdf`;

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Add new function to handle copying to clipboard
  const handleCopyToClipboard = async () => {
    if (!output?.details?.report) return;

    try {
      await navigator.clipboard.writeText(output.details.report);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setError("Failed to copy to clipboard");
    }
  };

  return (
    <div className="app-shell">
      <div className="landscape-background" aria-hidden="true">
        <img src="/tavily-landscape.jpg" alt="" />
        <div className="landscape-fade-top" />
        <div className="landscape-fade-bottom" />
      </div>
      <div className="research-workspace">
        {/* Header Component */}
        <Header />

        {/* Form Section */}
        <ResearchForm
          onSubmit={handleFormSubmit}
          onStop={() => controllerRef.current?.abort()}
          isResearching={isResearching}
          liveReady={liveReady}
          glassStyle={glassStyle}
          loaderColor={loaderColor}
        />

        {!liveReady && hasTavilyKey !== null && (
          <div
            className={`${glassStyle.card} border-[#FE363B]/30 bg-[#FE363B]/10 ${fadeInAnimation.fadeIn} font-sans`}
          >
            <p className="text-[#FE363B]">
              Set TAVILY_API_KEY and OPENAI_API_KEY in the server .env to run a live search.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className={`${glassStyle.card} border-[#FE363B]/30 bg-[#FE363B]/10 ${fadeInAnimation.fadeIn} ${isResetting ? "opacity-0 transform -translate-y-4" : "opacity-100 transform translate-y-0"} font-sans`}
          >
            <p className="text-[#FE363B]">{error}</p>
          </div>
        )}

        {/* Status Box */}
        <ResearchStatus
          status={status}
          error={error}
          isComplete={isComplete}
          currentPhase={currentPhase}
          isResetting={isResetting}
          glassStyle={glassStyle}
          loaderColor={loaderColor}
          statusRef={statusRef}
        />

        {/* Research Report - always at the top when available */}
        {output && output.details && (
          <ResearchReport
            output={{
              summary: output.summary,
              details: {
                report: output.details.report || "",
              },
            }}
            isResetting={isResetting}
            isStreaming={isReportStreaming}
            glassStyle={glassStyle}
            fadeInAnimation={fadeInAnimation}
            loaderColor={loaderColor}
            isGeneratingPdf={isGeneratingPdf}
            isCopied={isCopied}
            onCopyToClipboard={handleCopyToClipboard}
            onGeneratePdf={handleGeneratePdf}
          />
        )}

        {/* Research Briefings - show once briefing starts and keep visible */}
        {(currentPhase === "briefing" || currentPhase === "complete") && (
          <ResearchBriefings
            briefingStatus={briefingStatus}
            isExpanded={isBriefingExpanded}
            onToggleExpand={() => setIsBriefingExpanded(!isBriefingExpanded)}
            isResetting={isResetting}
          />
        )}

        {/* Curation and Extraction - show once enrichment starts and keep visible */}
        {(currentPhase === "enrichment" ||
          currentPhase === "briefing" ||
          currentPhase === "complete") &&
          enrichmentCounts && (
            <CurationExtraction
              enrichmentCounts={enrichmentCounts}
              isExpanded={isEnrichmentExpanded}
              onToggleExpand={() => setIsEnrichmentExpanded(!isEnrichmentExpanded)}
              isResetting={isResetting}
              loaderColor={loaderColor}
            />
          )}

        {/* Research Queries - always at the bottom when visible */}
        {(queries.length > 0 || Object.keys(streamingQueries).length > 0) && (
          <ResearchQueries
            queries={queries}
            streamingQueries={streamingQueries}
            isExpanded={isQueriesExpanded}
            onToggleExpand={() => setIsQueriesExpanded(!isQueriesExpanded)}
            isResetting={isResetting}
            glassStyle={glassStyle.card}
          />
        )}
        <footer className="demo-footer">
          <a
            className="search-api-link"
            href="https://docs.tavily.com/documentation/api-reference/endpoint/search"
            target="_blank"
            rel="noopener noreferrer"
          >
            Search API docs <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
