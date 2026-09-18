import { ChevronDown, ChevronUp } from "lucide-react";
import type { ResearchQueriesProps } from "../types";
import { fadeInAnimation } from "../styles";

const LANES = [
  ["destination", "Destination demand"],
  ["trends", "Trends and events"],
  ["pricing", "Pricing and demand"],
  ["disruptions", "Disruptions and sentiment"],
] as const;

const ResearchQueries = ({
  queries,
  streamingQueries,
  isExpanded,
  onToggleExpand,
  isResetting,
  glassStyle,
}: ResearchQueriesProps) => {
  const glassCardStyle = `${glassStyle} rounded-2xl p-6`;

  return (
    <div
      className={`${glassCardStyle} ${fadeInAnimation.fadeIn} ${isResetting ? "opacity-0 transform -translate-y-4" : "opacity-100 transform translate-y-0"} font-sans`}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
        <h2 className="text-xl font-semibold text-gray-900">Generated Research Queries</h2>
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? "mt-4 max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid grid-cols-2 gap-4">
          {LANES.map(([category, label]) => (
            <div key={category} className={`${glassStyle} rounded-xl p-3`}>
              <h3 className="text-base font-medium text-gray-900 mb-3">{label}</h3>
              <div className="space-y-2">
                {Object.entries(streamingQueries)
                  .filter(([key]) => key.startsWith(category))
                  .map(([key, query]) => (
                    <div
                      key={key}
                      className="backdrop-filter backdrop-blur-lg bg-white/80 border border-[#2677FF]/30 rounded-lg p-2"
                    >
                      <span className="text-gray-600">{query.text}</span>
                      <span className="animate-pulse ml-1 text-[#8FBCFA]">|</span>
                    </div>
                  ))}
                {queries
                  .filter((q) => q.category.startsWith(category))
                  .map((query, idx) => (
                    <div
                      key={idx}
                      className="backdrop-filter backdrop-blur-lg bg-white/80 border border-gray-200 rounded-lg p-2"
                    >
                      <span className="text-gray-600">{query.text}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isExpanded && (
        <div className="mt-2 text-sm text-gray-600">
          {queries.length} queries generated across {LANES.length} research lanes
        </div>
      )}
    </div>
  );
};

export default ResearchQueries;
