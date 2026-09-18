import { useState } from 'react';
import { Building2, Eye, EyeOff, KeyRound, Loader2, MapPin, Search } from 'lucide-react';
import CityCombobox from './CityCombobox';
import TravelFocusCombobox from './TravelFocusCombobox';

const RESEARCH_PRIORITIES = [
  'Hotel demand and occupancy', 'Pricing and rate trends', 'Upcoming events and festivals',
  'Travel disruptions and safety', 'Seasonality and best travel times', 'Traveler sentiment and reviews',
  'Flight routes and connectivity', 'Competitor activity', 'Emerging travel trends',
  'Local attractions and experiences', 'Visitor growth and demand', 'Business opportunities',
] as const;

export interface TravelResearchFormData {
  destination: string;
  travelSegment: string;
  researchPriorities: string;
  tavilyApiKey: string;
}

interface ResearchFormProps {
  onSubmit: (formData: TravelResearchFormData) => Promise<void>;
  isResearching: boolean;
  glassStyle: { card: string; input: string };
  loaderColor: string;
}

const EXAMPLE_DESTINATIONS = ['Barcelona, Spain', 'Cancún, Mexico', 'Geneva, Switzerland', 'New Orleans, USA', 'New York City, USA', 'San Francisco, USA', 'Tel Aviv, Israel', 'Tokyo, Japan', 'Toronto, Canada'];

const ResearchForm = ({ onSubmit, isResearching, glassStyle, loaderColor }: ResearchFormProps) => {
  const [formData, setFormData] = useState<TravelResearchFormData>({
    destination: '',
    travelSegment: '',
    researchPriorities: '',
    tavilyApiKey: '',
  });
  const [isTavilyKeyVisible, setIsTavilyKeyVisible] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="relative">
      <div className={`${glassStyle.card} research-form`}>
        <form onSubmit={submit} className="space-y-6">
          <div className="tavily-key-field">
            <label htmlFor="tavilyApiKey" className="field-label">Tavily API Key</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10" strokeWidth={1.5} />
              <input id="tavilyApiKey" type={isTavilyKeyVisible ? 'text' : 'password'} autoComplete="off" value={formData.tavilyApiKey} onChange={(event) => setFormData((current) => ({ ...current, tavilyApiKey: event.target.value }))} className={`${glassStyle.input} tavily-key-input`} placeholder="Use the configured key, or enter your own" />
              <button type="button" className="tavily-key-visibility" onClick={() => setIsTavilyKeyVisible((visible) => !visible)} aria-label={isTavilyKeyVisible ? 'Hide Tavily API key' : 'Show Tavily API key'}>{isTavilyKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <p className="tavily-key-help">Leave blank to use the configured key. An override is used only for this research session.</p>
          </div>

          <div className="relative group company-primary">
            <label htmlFor="destination" className="field-label">Destination <span className="text-gray-900/70">*</span></label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10" strokeWidth={1.5} />
              <CityCombobox value={formData.destination} onChange={(destination) => setFormData((current) => ({ ...current, destination }))} className={`${glassStyle.input} company-name-input`} />
            </div>
          </div>

          <div className="company-subfields">
            <div className="relative group">
              <label htmlFor="travelFocus" className="field-label">Travel focus <span className="optional-label">Optional</span></label>
              <p className="field-help">Choose the traveler or part of the trip this brief should prioritize.</p>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10" strokeWidth={1.5} />
                <TravelFocusCombobox value={formData.travelSegment} onChange={(travelSegment) => setFormData((current) => ({ ...current, travelSegment }))} className={glassStyle.input} />
              </div>
            </div>
            <div className="relative group">
              <label htmlFor="researchPriorities" className="field-label">Research priorities <span className="optional-label">Optional</span></label>
              <p className="field-help">What should this brief help you decide or understand?</p>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10" strokeWidth={1.5} />
                <TravelFocusCombobox id="researchPriorities" label="priority" suggestions={RESEARCH_PRIORITIES} value={formData.researchPriorities} onChange={(researchPriorities) => setFormData((current) => ({ ...current, researchPriorities }))} className={glassStyle.input} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isResearching || !formData.destination.trim()} className="research-submit">
            <span className="flex items-center justify-center gap-2">
              {isResearching ? <><Loader2 className="animate-spin h-5 w-5 loader-icon" style={{ stroke: loaderColor }} /><span>Researching destination...</span></> : <><Search className="h-4 w-4" /><span>Research destination</span></>}
            </span>
          </button>
        </form>
      </div>
      <div className="example-suggestions"><span>Try a destination</span>{EXAMPLE_DESTINATIONS.map((destination) => <button key={destination} type="button" className="example-chip" onClick={() => setFormData((current) => ({ ...current, destination }))}>{destination}</button>)}</div>
    </div>
  );
};

export default ResearchForm;
