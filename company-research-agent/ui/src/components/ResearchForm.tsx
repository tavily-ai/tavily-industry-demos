import { useState, useEffect } from "react";
import { Building2, Factory, Globe, Loader2, MapPin, Search } from "lucide-react";
import ExamplePopup from "./ExamplePopup";
import type { ExampleCompany } from "./ExamplePopup";

interface FormData {
  companyName: string;
  companyUrl: string;
  companyHq: string;
  companyIndustry: string;
}

interface ResearchFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  onStop: () => void;
  isResearching: boolean;
  liveReady: boolean;
  glassStyle: {
    card: string;
    input: string;
  };
  loaderColor: string;
}

const emptyForm: FormData = {
  companyName: "",
  companyUrl: "",
  companyHq: "",
  companyIndustry: "",
};

const ResearchForm = ({
  onSubmit,
  onStop,
  isResearching,
  liveReady,
  glassStyle,
  loaderColor,
}: ResearchFormProps) => {
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [showExampleSuggestion, setShowExampleSuggestion] = useState(true);
  const [wasResearching, setWasResearching] = useState(false);

  useEffect(() => {
    setShowExampleSuggestion(!formData.companyName);
  }, [formData.companyName]);

  useEffect(() => {
    if (wasResearching && !isResearching) {
      setTimeout(() => {
        setFormData(emptyForm);
        setShowExampleSuggestion(true);
      }, 1000);
    }
    setWasResearching(isResearching);
  }, [isResearching, wasResearching]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveReady) return;
    await onSubmit(formData);
  };

  const fillExampleData = (example: ExampleCompany) => {
    if (isResearching) return;
    setFormData({
      companyName: example.name,
      companyUrl: example.url,
      companyHq: example.hq,
      companyIndustry: example.industry,
    });
  };

  return (
    <div className="relative">
      <div className={`${glassStyle.card} research-form`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="relative group company-primary">
              <label htmlFor="companyName" className="field-label">
                Company Name <span className="text-gray-900/70">*</span>
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10"
                  strokeWidth={1.5}
                />
                <input
                  required
                  autoComplete="off"
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
            </div>

            <div className="company-subfields">
              <div className="relative group">
                <label htmlFor="companyUrl" className="field-label">
                  Company URL <span className="optional-label">Optional</span>
                </label>
                <div className="relative">
                  <Globe
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10"
                    strokeWidth={1.5}
                  />
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

              <div className="relative group">
                <label htmlFor="companyHq" className="field-label">
                  Company HQ <span className="optional-label">Optional</span>
                </label>
                <div className="relative">
                  <MapPin
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10"
                    strokeWidth={1.5}
                  />
                  <input
                    id="companyHq"
                    type="text"
                    value={formData.companyHq}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyHq: e.target.value,
                      }))
                    }
                    className={`${glassStyle.input}`}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="relative group">
                <label htmlFor="companyIndustry" className="field-label">
                  Company Industry <span className="optional-label">Optional</span>
                </label>
                <div className="relative">
                  <Factory
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-[#2677FF] transition-all duration-200 group-hover:stroke-[#8FBCFA] z-10"
                    strokeWidth={1.5}
                  />
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
            disabled={isResearching || !liveReady || !formData.companyName.trim()}
            className="research-submit"
          >
            <div className="flex items-center justify-center gap-2">
              {isResearching ? (
                <>
                  <Loader2
                    className="animate-spin -ml-1 mr-2 h-5 w-5 loader-icon"
                    style={{ stroke: loaderColor }}
                  />
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
          {isResearching && (
            <button type="button" className="text-button stop-research" onClick={onStop}>
              Stop research
            </button>
          )}
        </form>
      </div>
      <ExamplePopup
        visible={showExampleSuggestion && !isResearching}
        onExampleSelect={fillExampleData}
      />
    </div>
  );
};

export default ResearchForm;
