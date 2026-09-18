import { ArrowRight } from 'lucide-react';

// Sample companies for examples
export const EXAMPLE_COMPANIES = [
  {
    name: "Stripe",
    url: "stripe.com",
    hq: "San Francisco, CA",
    industry: "Financial Technology"
  },
  {
    name: "Shopify",
    url: "shopify.com",
    hq: "Ottawa, Canada",
    industry: "E-commerce"
  },
  {
    name: "Notion",
    url: "notion.so",
    hq: "San Francisco, CA",
    industry: "Productivity Software"
  },
  {
    name: "Tesla",
    url: "tesla.com",
    hq: "Austin, TX",
    industry: "Automotive & Energy"
  },
  {
    name: "Airbnb",
    url: "airbnb.com",
    hq: "San Francisco, CA",
    industry: "Travel & Hospitality"
  },
  {
    name: "Slack",
    url: "slack.com",
    hq: "San Francisco, CA",
    industry: "Business Communication"
  },
  {
    name: "Spotify",
    url: "spotify.com",
    hq: "Stockholm, Sweden",
    industry: "Music Streaming"
  },
  {
    name: "Microsoft",
    url: "microsoft.com",
    hq: "Redmond, WA",
    industry: "Software & Cloud Computing"
  },
  { name: "Apple", url: "apple.com", hq: "Cupertino, CA", industry: "Consumer Technology" },
  { name: "Amazon", url: "amazon.com", hq: "Seattle, WA", industry: "E-commerce & Cloud Computing" },
  { name: "Google", url: "google.com", hq: "Mountain View, CA", industry: "Internet & Software" },
  { name: "Netflix", url: "netflix.com", hq: "Los Gatos, CA", industry: "Entertainment" },
  { name: "Meta", url: "meta.com", hq: "Menlo Park, CA", industry: "Social Technology" },
  { name: "Nvidia", url: "nvidia.com", hq: "Santa Clara, CA", industry: "Semiconductors & AI" },
  { name: "Adobe", url: "adobe.com", hq: "San Jose, CA", industry: "Creative Software" },
  { name: "Figma", url: "figma.com", hq: "San Francisco, CA", industry: "Design Software" },
  { name: "Zoom", url: "zoom.us", hq: "San Jose, CA", industry: "Communications Software" },
  { name: "Salesforce", url: "salesforce.com", hq: "San Francisco, CA", industry: "Enterprise Software" },
  { name: "Uber", url: "uber.com", hq: "San Francisco, CA", industry: "Mobility & Delivery" },
  { name: "Coinbase", url: "coinbase.com", hq: "Remote", industry: "Financial Technology" },
  { name: "Datadog", url: "datadoghq.com", hq: "New York, NY", industry: "Cloud Monitoring" },
  { name: "Snowflake", url: "snowflake.com", hq: "Bozeman, MT", industry: "Cloud Data Platform" },
  { name: "Canva", url: "canva.com", hq: "Sydney, Australia", industry: "Design Software" },
  { name: "Atlassian", url: "atlassian.com", hq: "Sydney, Australia", industry: "Collaboration Software" }
];

export type ExampleCompany = typeof EXAMPLE_COMPANIES[0];

export interface ExamplePopupProps {
  visible: boolean;
  onExampleSelect: (example: ExampleCompany) => void;

}

// Keep suggestions in the document flow on both desktop and mobile.
const ExamplePopup = ({ visible, onExampleSelect }: ExamplePopupProps) => {
  if (!visible) return null;
  return (
    <div className="example-suggestions">
      <span>Try researching</span>
      {EXAMPLE_COMPANIES.map((company) => (
        <button key={company.name} type="button" className="example-chip" onClick={() => onExampleSelect(company)}>
          <img src={`/company-logos/${company.name.toLowerCase()}.png`} alt="" width="20" height="20" className="company-logo" />
          {company.name}<ArrowRight size={12} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export default ExamplePopup;
