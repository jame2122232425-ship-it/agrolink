import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '../../../design-system/components/Card';
import { Button } from '../../../design-system/components/Button';
import { Badge } from '../../../design-system/components/Badge';

export const AIAssistantCard: React.FC = () => {
  const [questionInput, setQuestionInput] = useState('');
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);

  const suggestedQuestions = [
    'Why are my maize leaves turning yellow?',
    'What should I do about poultry diseases?',
    'How can I improve my soil fertility?',
    'What is the best time to plant beans?',
  ];

  const handleAsk = (q?: string) => {
    const query = q || questionInput;
    if (!query.trim()) return;
    setActiveSimulation('The assistant is not connected to a verified service yet. No agricultural advice was generated.');
  };

  return (
    <Card
      padding="md"
      className="border-emerald-300 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/50 shadow-sm relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#14532D] text-[#86EFAC] flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Your Farm Intelligence Assistant
              </h3>
              <Badge variant="forest" size="sm">
                Not connected
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              AI guidance will be available here once a verified service is connected.
            </p>
          </div>
        </div>

        <Link
          to="/ai-assistant"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#16A34A] px-4 py-2.5 text-sm text-[#16A34A] transition-colors hover:bg-green-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2"
        >
          <span>Full AI Assistant</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Suggested question chips */}
      <div className="space-y-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Frequently Asked by Western Kenyan Farmers:
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestionInput(q);
                handleAsk(q);
              }}
              className="min-h-11 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/50 text-sm text-slate-700 font-medium transition-all cursor-pointer text-left shadow-2xs hover:shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              <span className="text-[#16A34A] font-bold mr-1.5">?</span>
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question input form */}
      <form
        className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleAsk();
        }}
      >
        <input
          type="text"
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          placeholder="Ask anything about your crops, pest symptoms, or soil (e.g. Sukuma wiki pest control)..."
          aria-label="Ask a question about your farm"
          className="flex-1 min-h-11 bg-white border border-slate-300 rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all shadow-2xs"
        />
        <Button
          variant="forest"
          size="md"
          type="submit"
          rightIcon={<Send className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Ask AI
        </Button>
      </form>

      {/* Simulated response disclosure box */}
      {activeSimulation && (
        <div className="mt-4 p-4 rounded-2xl bg-white border border-emerald-200 text-sm text-slate-800 space-y-2 animate-in fade-in zoom-in-95 duration-150 shadow-xs motion-reduce:animate-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-emerald-800 font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Simulated AgroLink Agronomic Response</span>
            </span>
            <span className="text-xs text-slate-500 font-normal">
              Sample response preview (No external AI API connected)
            </span>
          </div>
          <p className="leading-relaxed text-slate-700">{activeSimulation}</p>
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <span className="text-slate-600 font-medium">Source: KALRO Western Kenya Advisory Guidelines</span>
            <Link
              to="/ai-assistant"
              className="min-h-11 flex items-center text-[#16A34A] font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 rounded-md"
            >
              Continue in Full Chat →
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
};
