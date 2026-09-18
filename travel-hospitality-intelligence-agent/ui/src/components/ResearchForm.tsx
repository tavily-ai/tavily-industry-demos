import { useState } from "react";
import { Building2, Loader2, MapPin, Search } from "lucide-react";
import CityCombobox from "./CityCombobox";
import TravelFocusCombobox from "./TravelFocusCombobox";

const RESEARCH_PRIORITIES = [
  "Hotel demand and occupancy",
  "Pricing and rate trends",
  "Upcoming events and festivals",
  "Travel disruptions and safety",
  "Seasonality and best travel times",
  "Traveler sentiment and reviews",
  "Flight routes and connectivity",
  "Competitor activity",
  "Emerging travel trends",
  "Local attractions and experiences",
  "Visitor growth and demand",
  "Business opportunities",
] as const;

export interface TravelResearchFormData {
  destination: string;
  travelSegment: string;
  researchPriorities: string;
}

interface ResearchFormProps {
  onSubmit: (formData: TravelResearchFormData) => Promise<void>;
  onStop: () => void;
  isResearching: boolean;
  liveReady: boolean;
  glassStyle: { card: string; input: string };
  loaderColor: string;
}

const EXAMPLE_DESTINATIONS = [
  "Barcelona, Spain",
  "Cancún, Mexico",
  "Geneva, Switzerland",
  "New Orleans, USA",
  "New York City, USA",
  "San Francisco, USA",
  "Tel Aviv, Israel",
  "Tokyo, Japan",
  "Toronto, Canada",
];

const emptyForm: TravelResearchFormData = {
  destination: "",
  travelSegment: "",
  researchPriorities: "",
};

const ResearchForm = ({
  onSubmit,
  onStop,
  isResearching,
  liveReady,
  glassStyle,
  loaderColor,
}: ResearchFormProps) => {
  const [formData, setFormData] = useState<TravelResearchFormData>(emptyForm);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!liveReady) return;
    await onSubmit(formData);
  };

  return (
    <div className="relative">
      <div className={`${glassStyle.card} research-form`}>
        <form onSubmit={submit} className="space-y-6">
          <div className="relative group company-primary">
            <label htmlFor="destination" className="field-label">
              Destination <span className="text-gray-900/70">*</span>
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10"
                strokeWidth={1.5}
              />
              <CityCombobox
                value={formData.destination}
                onChange={(destination) => setFormData((current) => ({ ...current, destination }))}
                className={`${glassStyle.input} company-name-input`}
              />
            </div>
          </div>

          <div className="company-subfields">
            <div className="relative group">
              <label htmlFor="travelFocus" className="field-label">
                Travel focus <span className="optional-label">Optional</span>
              </label>
              <p className="field-help">
                Choose the traveler or part of the trip this brief should prioritize.
              </p>
              <div className="relative">
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10"
                  strokeWidth={1.5}
                />
                <TravelFocusCombobox
                  value={formData.travelSegment}
                  onChange={(travelSegment) =>
                    setFormData((current) => ({ ...current, travelSegment }))
                  }
                  className={glassStyle.input}
                />
              </div>
            </div>
            <div className="relative group">
              <label htmlFor="researchPriorities" className="field-label">
                Research priorities <span className="optional-label">Optional</span>
              </label>
              <p className="field-help">What should this brief help you decide or understand?</p>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10"
                  strokeWidth={1.5}
                />
                <TravelFocusCombobox
                  id="researchPriorities"
                  label="priority"
                  suggestions={RESEARCH_PRIORITIES}
                  value={formData.researchPriorities}
                  onChange={(researchPriorities) =>
                    setFormData((current) => ({ ...current, researchPriorities }))
                  }
                  className={glassStyle.input}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isResearching || !liveReady || !formData.destination.trim()}
            className="research-submit"
          >
            <span className="flex items-center justify-center gap-2">
              {isResearching ? (
                <>
                  <Loader2
                    className="animate-spin h-5 w-5 loader-icon"
                    style={{ stroke: loaderColor }}
                  />
                  <span>Researching destination...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Research destination</span>
                </>
              )}
            </span>
          </button>
          {isResearching && (
            <button type="button" className="text-button stop-research" onClick={onStop}>
              Stop research
            </button>
          )}
        </form>
      </div>
      <div className="example-suggestions">
        <span>Try a destination</span>
        {EXAMPLE_DESTINATIONS.map((destination) => (
          <button
            key={destination}
            type="button"
            className="example-chip"
            onClick={() => setFormData((current) => ({ ...current, destination }))}
          >
            {destination}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ResearchForm;
