import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SearchHit } from "../types";
import { glassStyle } from "../styles";

interface SearchResultsProps {
  hits: SearchHit[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isResetting: boolean;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function HitFavicon({ src }: { src: string }) {
  const [hidden, setHidden] = useState(false);
  if (!src || hidden) return null;
  return (
    <img
      className="search-hit-favicon"
      src={src}
      alt=""
      width="16"
      height="16"
      onError={() => setHidden(true)}
    />
  );
}

function categoryLabel(category: string) {
  const [name] = category.split("_");
  return name || category;
}

const SearchResults = ({ hits, isExpanded, onToggleExpand, isResetting }: SearchResultsProps) => {
  if (!hits.length) return null;

  return (
    <div
      className={`${glassStyle.card} transition-all duration-300 ease-in-out ${
        isResetting ? "opacity-0 transform -translate-y-4" : "opacity-100 transform translate-y-0"
      }`}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
        <h2 className="text-xl font-semibold text-gray-900">Search results</h2>
        <button className="text-gray-600 hover:text-gray-900 transition-colors" type="button">
          {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? "mt-4 max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ol className="search-hits">
          {hits.map((hit) => (
            <li key={hit.url} className="search-hit">
              <HitFavicon src={hit.favicon} />
              <div>
                <a href={hit.url} target="_blank" rel="noopener noreferrer">
                  {hit.title}
                  <span aria-hidden="true">↗</span>
                </a>
                {hit.content ? <p>{hit.content}</p> : null}
                <small>
                  {hostname(hit.url)}
                  {hit.category ? ` · ${categoryLabel(hit.category)}` : ""}
                </small>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {!isExpanded && (
        <div className="mt-2 text-sm text-gray-600">
          {hits.length} source{hits.length === 1 ? "" : "s"} found
        </div>
      )}
    </div>
  );
};

export default SearchResults;
