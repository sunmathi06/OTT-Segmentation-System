import React from "react";
import { SegmentDetail } from "../types";
import { X, Sparkles, Tv, Smartphone, Globe, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface SegmentDetailModalProps {
  segment: SegmentDetail | null;
  onClose: () => void;
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({ segment, onClose }) => {
  if (!segment) return null;

  const avg = segment.average_feature_values || {};
  const cat = segment.categorical_distributions || {};

  // Downstream personalization rules derived directly from segment profile
  const getPersonalizationStrategy = (name: string) => {
    if (name.includes("Action")) {
      return {
        strategy: "Adrenaline & Velocity Curation",
        recommendations: [
          "Feature blockbuster thriller & action releases on top hero banner with auto-playing trailers",
          "Enable high-velocity next-episode autoplay (< 5s countdown) for binges",
          "Send weekend action premier push notifications around 8:00 PM"
        ],
        targetContent: "Action Movies, Spy Thrillers, High-Octane Anime, Crime Series"
      };
    }
    if (name.includes("Family")) {
      return {
        strategy: "Co-Viewing & Weekend Family Hub",
        recommendations: [
          "Curate 'Family Movie Night' carousel active exclusively on Friday evening & Saturdays",
          "Highlight age-rating badges, kid profiles, and co-viewing collections",
          "Promote animated features and wholesome adventure sagas"
        ],
        targetContent: "Animated Features, PG Adventures, Nature Documentaries"
      };
    }
    if (name.includes("Casual") || name.includes("Short-Session")) {
      return {
        strategy: "Bite-Sized & Quick-Hit Engagement",
        recommendations: [
          "Surface 'Under 25 Minutes' row and comedy standup clips on mobile launch",
          "Implement quick 'Resume from Last 5 Minutes' prompt for intermittent commutes",
          "Prioritize sitcoms, quick sketch shows, and highlights"
        ],
        targetContent: "Sitcoms, Standup Comedy, 20-Minute Episodic Formats"
      };
    }
    if (name.includes("Multi-Genre")) {
      return {
        strategy: "Serendipity & Broad Discovery",
        recommendations: [
          "Provide diverse genre carousels rotating across Sci-Fi, Drama, and Comedy",
          "Leverage 'Because You Watched' hybrid cross-genre recommendations",
          "Send personalized weekly newsletter of eclectic top-rated hidden gems"
        ],
        targetContent: "Eclectic Indie Cinema, Cross-Genre Originals, Docuseries"
      };
    }
    // Completion-oriented
    return {
      strategy: "Deep Immersion & Prestige Series Curation",
      recommendations: [
        "Feature complex serialized prestige dramas and award-winning limited series",
        "Enable seamless 'Skip Recap & Intro' by default (high skip affinity detected)",
        "Early access alerts for season finales and episodic drops"
      ],
      targetContent: "Serialized Drama, Miniseries, Psychological Thrillers, Docu-Dramas"
    };
  };

  const strategy = getPersonalizationStrategy(segment.segment_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                Cluster {segment.cluster_id}
              </span>
              <span className="text-xs text-slate-400">
                {segment.user_count.toLocaleString()} Viewers ({segment.percentage}% of platform)
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {segment.segment_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Dominant Characteristics */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Discovered Behavioral Traits
            </h4>
            <div className="flex flex-wrap gap-2">
              {segment.dominant_characteristics.map((c, i) => (
                <span
                  key={i}
                  className="text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-950/60 text-indigo-200 border border-indigo-800/60"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Average Feature Metrics Grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Cluster Feature Averages
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Watch Time</span>
                <span className="text-base font-bold text-slate-100">{Math.round(avg.watch_time || 0)} min</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Session Length</span>
                <span className="text-base font-bold text-slate-100">{Math.round(avg.session_duration || 0)} min</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Visit Frequency</span>
                <span className="text-base font-bold text-slate-100">{Math.round(avg.visit_frequency || 0)} / mo</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Completion Rate</span>
                <span className="text-base font-bold text-emerald-400">{Math.round((avg.completion_rate || 0) * 100)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Action Affinity</span>
                <span className="text-base font-bold text-slate-100">{Math.round((avg.action_preference || 0) * 100)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Family Affinity</span>
                <span className="text-base font-bold text-slate-100">{Math.round((avg.family_preference || 0) * 100)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Comedy Affinity</span>
                <span className="text-base font-bold text-slate-100">{Math.round((avg.comedy_preference || 0) * 100)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Drama Affinity</span>
                <span className="text-base font-bold text-slate-100">{Math.round((avg.drama_preference || 0) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Downstream Personalization Playbook */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40">
            <div className="flex items-center gap-2 mb-2 text-indigo-300 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Downstream Personalization Playbook: {strategy.strategy}</span>
            </div>
            <p className="text-xs text-slate-300 mb-3 font-mono">
              Target Content: {strategy.targetContent}
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              {strategy.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
