import ReactMarkdown from "react-markdown";
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, Loader2 } from 'lucide-react';
import type { GlassStyle, AnimationStyle } from '../types';

interface ResearchReportProps {
  output: {
    summary: string;
    details: {
      report: string;
    };
  } | null;
  isResetting: boolean;
  isStreaming: boolean;
  glassStyle: GlassStyle;
  fadeInAnimation: AnimationStyle;
  loaderColor: string;
  isGeneratingPdf: boolean;
  isCopied: boolean;
  onCopyToClipboard: () => void;
  onGeneratePdf: () => void;
}

const ResearchReport = ({
  output,
  isResetting,
  isStreaming,
  glassStyle,
  fadeInAnimation,
  loaderColor,
  isGeneratingPdf,
  isCopied,
  onCopyToClipboard,
  onGeneratePdf
}: ResearchReportProps) => {
  if (!output || !output.details) return null;

  return (
    <div 
      className={`${glassStyle.card} ${fadeInAnimation.fadeIn} ${isResetting ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'} font-sans`}
    >
      {isStreaming && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-[#2677FF]/10 rounded-lg border border-[#2677FF]/20">
          <Loader2 className="h-4 w-4 animate-spin" style={{ stroke: loaderColor }} />
          <span className="text-sm text-gray-600">Generating report...</span>
        </div>
      )}
      <div className="flex justify-end gap-2 mb-4">
        {output?.details?.report && (
          <>
            <button
              onClick={onCopyToClipboard}
              aria-label={isCopied ? "Report copied" : "Copy report"}
              className="report-action"
            >
              {isCopied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onGeneratePdf}
              disabled={isGeneratingPdf}
              className="report-action disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" style={{ stroke: loaderColor }} />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span className="ml-2">PDF</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
      <div className="report-content">
        <div className="mt-4">
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            remarkPlugins={[remarkGfm]}
            components={{
              div: ({node, ...props}) => (
                <div className="space-y-4 text-gray-800" {...props} />
              ),
              h1: ({node, children, ...props}) => {
                const text = String(children);
                const isFirstH1 = text.includes("Research Report");
                const isReferences = text.includes("References");
                return (
                  <div>
                    <h1 
                      className={`font-bold text-gray-900 break-words whitespace-pre-wrap ${isFirstH1 ? 'text-2xl sm:text-3xl mb-6 mt-4' : 'text-2xl mb-6'}`}
                      {...props} 
                    >
                      {children}
                    </h1>
                    {isReferences && (
                      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent my-8"></div>
                    )}
                  </div>
                );
              },
              h2: ({node, ...props}) => (
                <h2 className="text-xl font-semibold text-gray-900 first:mt-2 mt-8 mb-4 pb-2 border-b border-gray-200" {...props} />
              ),
              h3: ({node, ...props}) => (
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3" {...props} />
              ),
              p: ({node, children, ...props}) => {
                const text = String(children);
                const isSubsectionHeader = (
                  text.includes('\n') === false && 
                  text.length < 50 && 
                  (text.endsWith(':') || /^[A-Z][A-Za-z\s\/]+$/.test(text))
                );
                
                if (isSubsectionHeader) {
                  return (
                    <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                      {text.endsWith(':') ? text.slice(0, -1) : text}
                    </h3>
                  );
                }
                
                const isBulletLabel = text.startsWith('•') && text.includes(':');
                if (isBulletLabel) {
                  const [label, content] = text.split(':');
                  return (
                    <div className="text-gray-800 my-2">
                      <span className="font-semibold text-gray-900">
                        {label.replace('•', '').trim()}:
                      </span>
                      {content}
                    </div>
                  );
                }
                
                const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
                if (urlRegex.test(text)) {
                  const parts = text.split(urlRegex);
                  return (
                    <p className="text-gray-800 my-2" {...props}>
                      {parts.map((part, i) => 
                        urlRegex.test(part) ? (
                          <a 
                            key={i}
                            href={part}
                            className="text-[#2677FF] hover:text-[#8FBCFA] underline decoration-[#2677FF] hover:decoration-[#8FBCFA] cursor-pointer transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {part}
                          </a>
                        ) : part
                      )}
                    </p>
                  );
                }
                
                return <p className="text-gray-800 my-2" {...props}>{children}</p>;
              },
              ul: ({node, ...props}) => (
                <ul className="text-gray-800 space-y-1 list-disc pl-6" {...props} />
              ),
              li: ({node, ...props}) => (
                <li className="text-gray-800" {...props} />
              ),
              a: ({node, href, ...props}) => (
                <a 
                  href={href}
                  className="text-[#2677FF] hover:text-[#8FBCFA] underline decoration-[#2677FF] hover:decoration-[#8FBCFA] cursor-pointer transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props} 
                />
              ),
            }}
          >
            {output.details.report || "No report available"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ResearchReport; 