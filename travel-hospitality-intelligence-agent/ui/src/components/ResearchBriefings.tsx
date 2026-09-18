import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { glassStyle } from '../styles';

type BriefingStatus = {
  company: boolean;
  industry: boolean;
  financial: boolean;
  news: boolean;
};

interface ResearchBriefingsProps {
  briefingStatus: BriefingStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isResetting: boolean;
}

const ResearchBriefings = ({
  briefingStatus,
  isExpanded,
  onToggleExpand,
  isResetting
}: ResearchBriefingsProps) => {
  const categories = [
    ['company', 'Destination demand'],
    ['industry', 'Trends and events'],
    ['financial', 'Pricing outlook'],
    ['news', 'Disruptions and sentiment'],
  ] as const;
  return (
    <div 
      className={`${glassStyle.card} transition-all duration-300 ease-in-out ${
        isResetting ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'
      } font-sans`}
    >
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <h2 className="text-xl font-semibold text-gray-900">
          Travel intelligence briefings
        </h2>
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          {isExpanded ? (
            <ChevronUp className="h-6 w-6" />
          ) : (
            <ChevronDown className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
        isExpanded ? 'mt-6 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-1">
          {categories.map(([category, label]) => (
            <div 
              key={category} 
              className={`backdrop-filter backdrop-blur-lg bg-white/80 shadow-sm rounded-lg p-4 transition-all duration-500 ease-in-out relative ${
                briefingStatus[category as keyof BriefingStatus] 
                  ? 'border border-[#2677FF] bg-gradient-to-br from-[#2677FF]/5 to-[#2677FF]/10 shadow-md'
                  : 'border border-gray-200 bg-white/80 hover:border-gray-300 hover:shadow-sm'
              } backdrop-blur-sm group`}
            >
              {/* Background decoration element (only visible when active) */}
              <div 
                className={`absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(70,139,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-700 ease-in-out rounded-lg ${
                  briefingStatus[category as keyof BriefingStatus] ? 'opacity-100' : ''
                }`}
                style={{ pointerEvents: 'none' }}
              />
              
              <div className="relative z-10 flex items-start justify-between gap-3">
                <h3 className={`min-w-0 text-sm leading-5 font-medium capitalize transition-all duration-500 ${
                  briefingStatus[category as keyof BriefingStatus]
                    ? 'text-[#2677FF]'
                    : 'text-gray-700 group-hover:text-gray-900'
                }`}>{label}</h3>
                {briefingStatus[category as keyof BriefingStatus] ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2677FF] transition-all duration-300" />
                ) : (
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-gray-200 group-hover:border-gray-300 transition-all duration-300"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isExpanded && (
        <div className="mt-2 text-sm text-gray-600">
          {Object.values(briefingStatus).filter(Boolean).length} of {Object.keys(briefingStatus).length} briefings completed
        </div>
      )}
    </div>
  );
};

export default ResearchBriefings;
