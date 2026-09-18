import { useState, useEffect, useRef } from 'react';
import { Building2, Eye, EyeOff, Factory, Globe, KeyRound, Loader2, Search } from 'lucide-react';
import LocationInput from './LocationInput';
import ExamplePopup, { EXAMPLE_COMPANIES } from './ExamplePopup';
import type { ExampleCompany } from './ExamplePopup';

interface FormData {
  companyName: string;
  companyUrl: string;
  companyHq: string;
  companyIndustry: string;
  tavilyApiKey: string;
}

interface ResearchFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  isResearching: boolean;
  glassStyle: {
    card: string;
    input: string;
  };
  loaderColor: string;
}

const ResearchForm = ({
  onSubmit,
  isResearching,
  glassStyle,
  loaderColor
}: ResearchFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    companyUrl: "",
    companyHq: "",
    companyIndustry: "",
    tavilyApiKey: "",
  });
  const [isTavilyKeyVisible, setIsTavilyKeyVisible] = useState(false);
  
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [isExamplesClosing, setIsExamplesClosing] = useState(false);
  const [suggestedExamples, setSuggestedExamples] = useState<ExampleCompany[]>([]);
  const companyFieldRef = useRef<HTMLDivElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const closeExamplesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringCompanyInput = useRef(false);
  const isHoveringCompanyPicker = useRef(false);

  const cancelExamplesClose = () => {
    if (closeExamplesTimer.current) clearTimeout(closeExamplesTimer.current);
    closeExamplesTimer.current = null;
  };

  const closeExamples = () => {
    cancelExamplesClose();
    setIsExamplesClosing(true);
    closeExamplesTimer.current = setTimeout(() => {
      setExamplesOpen(false);
      setIsExamplesClosing(false);
      closeExamplesTimer.current = null;
    }, 180);
  };

  const closeExamplesWhenPointerLeaves = () => {
    cancelExamplesClose();
    closeExamplesTimer.current = setTimeout(() => {
      if (!isHoveringCompanyInput.current && !isHoveringCompanyPicker.current) {
        closeExamples();
      }
    }, 60);
  };

  const handleCompanyInputEnter = () => {
    isHoveringCompanyInput.current = true;
    openExamples();
  };

  const handleCompanyInputLeave = () => {
    isHoveringCompanyInput.current = false;
    closeExamplesWhenPointerLeaves();
  };

  const handleCompanyPickerEnter = () => {
    isHoveringCompanyPicker.current = true;
    openExamples();
  };

  const handleCompanyPickerLeave = () => {
    isHoveringCompanyPicker.current = false;
    closeExamplesWhenPointerLeaves();
  };

  const openExamples = () => {
    cancelExamplesClose();
    setIsExamplesClosing(false);
    if (!isResearching && !examplesOpen) {
      setSuggestedExamples([...EXAMPLE_COMPANIES].sort(() => Math.random() - 0.5).slice(0, 8));
      setExamplesOpen(true);
    }
  };

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !companyFieldRef.current?.contains(event.target)) {
        closeExamples();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      if (closeExamplesTimer.current) clearTimeout(closeExamplesTimer.current);
    };
  }, []);

  const matchingExamples = formData.companyName.trim()
    ? EXAMPLE_COMPANIES.filter(company => company.name.toLowerCase().includes(formData.companyName.toLowerCase().trim()))
    : suggestedExamples;

  // Animation states
  const [showExampleSuggestion, setShowExampleSuggestion] = useState(true);
  const [wasResearching, setWasResearching] = useState(false);
  
  // Hide example suggestion when form is filled
  useEffect(() => {
    if (formData.companyName) {
      setShowExampleSuggestion(false);
    } else {
      setShowExampleSuggestion(true);
    }
  }, [formData.companyName]);

  // Track research state changes to show example popup when research completes
  useEffect(() => {
    // If we were researching and now we're not, research just completed
    if (wasResearching && !isResearching) {
      // Add a slight delay to let animations complete
      setTimeout(() => {
        // Reset form fields to empty values
        setFormData((previous) => ({
          companyName: "",
          companyUrl: "",
          companyHq: "",
          companyIndustry: "",
          tavilyApiKey: previous.tavilyApiKey,
        }));
        
        // Show the example suggestion again
        setShowExampleSuggestion(true);
      }, 1000);
    }
    
    // Update tracking state
    setWasResearching(isResearching);
  }, [isResearching, wasResearching]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };
  
  const fillExampleData = (example: ExampleCompany, startResearch = true) => {
    if (isResearching) return;
    const newFormData = {
      companyName: example.name,
      companyUrl: example.url,
      companyHq: example.hq,
      companyIndustry: example.industry,
      tavilyApiKey: formData.tavilyApiKey,
    };
    cancelExamplesClose();
    setFormData(newFormData);
    if (!startResearch) companyInputRef.current?.focus();
    closeExamples();
    if (startResearch) onSubmit(newFormData);
  };

  return (
    <div className="relative">
      {/* Main Form */}
      <div className={`${glassStyle.card} research-form`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="tavily-key-field">
              <label htmlFor="tavilyApiKey" className="field-label">
                Tavily API Key <span className="text-gray-900/70">*</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] z-10" strokeWidth={1.5} />
                <input
                  required
                  id="tavilyApiKey"
                  type={isTavilyKeyVisible ? 'text' : 'password'}
                  autoComplete="off"
                  value={formData.tavilyApiKey}
                  onChange={(event) => setFormData((previous) => ({ ...previous, tavilyApiKey: event.target.value }))}
                  className={`${glassStyle.input} tavily-key-input`}
                  placeholder="Enter your Tavily API key"
                />
                <button
                  type="button"
                  className="tavily-key-visibility"
                  onClick={() => setIsTavilyKeyVisible((visible) => !visible)}
                  aria-label={isTavilyKeyVisible ? 'Hide Tavily API key' : 'Show Tavily API key'}
                >
                  {isTavilyKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="tavily-key-help">Used only for this research session and never stored.</p>
            </div>
            {/* Company Name */}
            <div className="relative group company-primary"
              ref={companyFieldRef}
              onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); closeExamples(); } }}
            >
              <label
                htmlFor="companyName"
                className="field-label"
              >
                Company Name <span className="text-gray-900/70">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10" strokeWidth={1.5} />
                <input
                  required
                  ref={companyInputRef}
                  onMouseEnter={handleCompanyInputEnter}
                  onMouseLeave={handleCompanyInputLeave}
                  onFocus={openExamples}
                  autoComplete="off"
                  aria-expanded={examplesOpen && matchingExamples.length > 0}
                  aria-controls="company-examples"
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, companyName: e.target.value }));
                  }}
                  className={`${glassStyle.input} company-name-input`}
                  placeholder="Which company would you like to research?"
                />
              </div>
              {examplesOpen && !isResearching && matchingExamples.length > 0 && (
                <div
                  id="company-examples"
                  className={`company-options${isExamplesClosing ? ' company-options--closing' : ''}`}
                  aria-label="Example companies"
                  onMouseEnter={handleCompanyPickerEnter}
                  onMouseLeave={handleCompanyPickerLeave}
                >
                  <p className="company-options-label">Choose an example company</p>
                  <div className="company-options-grid">
                    {matchingExamples.map(company => (
                      <button type="button" key={company.name} className="company-option" onClick={() => fillExampleData(company, false)}>
                        <img src={`/company-logos/${company.name.toLowerCase()}.png`} alt="" width="24" height="24" className="company-logo" />
                        <span><strong>{company.name}</strong></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="company-subfields">
            {/* Company URL */}
            <div className="relative group">
              <label
                htmlFor="companyUrl"
                className="field-label"
              >
                Company URL <span className="optional-label">Optional</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10" strokeWidth={1.5} />
                <input
                  id="companyUrl"
                  type="text"
                  value={formData.companyUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      companyUrl: e.target.value,
                    }))
                  }
                  className={`${glassStyle.input}`}
                  placeholder="example.com"
                />
              </div>
            </div>

            {/* Company HQ */}
            <div className="relative group">
              <label
                htmlFor="companyHq"
                className="field-label"
              >
                Company HQ <span className="optional-label">Optional</span>
              </label>
              <LocationInput
                value={formData.companyHq}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    companyHq: value,
                  }))
                }
                className={`${glassStyle.input}`}
              />
            </div>

            {/* Company Industry */}
            <div className="relative group">
              <label
                htmlFor="companyIndustry"
                className="field-label"
              >
                Company Industry <span className="optional-label">Optional</span>
              </label>
              <div className="relative">
                <Factory className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10" strokeWidth={1.5} />
                <input
                  id="companyIndustry"
                  type="text"
                  value={formData.companyIndustry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      companyIndustry: e.target.value,
                    }))
                  }
                  className={`${glassStyle.input}`}
                  placeholder="e.g. Technology, Healthcare"
                />
              </div>
            </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isResearching || !formData.companyName.trim() || !formData.tavilyApiKey.trim()}
            className="research-submit"
          >
            <div className="flex items-center justify-center gap-2">
              {isResearching ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 loader-icon" style={{ stroke: loaderColor }} />
                  <span className="text-sm font-medium">Researching...</span>
                </>
              ) : (
                <>
                  <Search className="-ml-1 mr-2 h-4 w-4" />
                  <span className="text-sm font-medium">Start Research</span>
                </>
              )}
            </div>
          </button>
        </form>
      </div>
      {/* Example Suggestion */}
      <ExamplePopup
        visible={showExampleSuggestion && !isResearching}
        onExampleSelect={(example) => fillExampleData(example)}
      />

    </div>
  );
};

export default ResearchForm;
