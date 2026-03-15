"use client";
import React, { useState } from 'react';

/**
 * ChronologicalTimeline — A structured, easy-to-understand recovery timeline.
 *
 * Accepts TWO data formats:
 *
 * 1. BACKEND format (from /api/timeline/:drug):
 *    timelineData: [{ week: "Week 1", symptom: "dry lips", count: 12 }, ...]
 *    This flat array is grouped into periods automatically.
 *
 * 2. CHART format (pre-grouped):
 *    timelineData: [{ marker: "Week 1", sentimentScore: 30, description: "..." }, ...]
 *    Used as-is for the sentiment chart.
 */

// Ordered period labels for sorting
const PERIOD_ORDER = [
  "General", "Day 1", "Week 1", "Week 2", "Week 3",
  "Month 1", "Month 2", "Month 3", "Month 4-6", "Month 7-9", "1 Year"
];

// Color/icon configs for each severity tier
const SEVERITY_TIERS = [
  { min: 0,  max: 3,  label: "Rare",      color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { min: 4,  max: 8,  label: "Uncommon",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  { min: 9,  max: 20, label: "Common",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  { min: 21, max: Infinity, label: "Very Common", color: "bg-red-100 text-red-700 border-red-200" },
];

function getSeverityTier(count) {
  return SEVERITY_TIERS.find(t => count >= t.min && count <= t.max) || SEVERITY_TIERS[0];
}

// Period icon based on the timeline label
function getPeriodIcon(period) {
  if (period.includes("Day")) return "today";
  if (period.includes("Week")) return "date_range";
  if (period.includes("Month")) return "calendar_month";
  if (period.includes("Year")) return "event";
  return "schedule";
}

// Period color based on the timeline label
function getPeriodColor(period) {
  if (period.includes("Day") || period.includes("Week 1")) return "bg-red-500";
  if (period.includes("Week")) return "bg-amber-500";
  if (period.includes("Month 1") || period.includes("Month 2")) return "bg-blue-500";
  if (period.includes("Month 3")) return "bg-emerald-500";
  return "bg-primary";
}

// Check if the data is in backend flat format
function isBackendFormat(data) {
  return data.length > 0 && data[0].week !== undefined && data[0].symptom !== undefined;
}

// Group flat backend data into structured periods
function groupByPeriod(flatData) {
  const groups = {};
  
  for (const entry of flatData) {
    const period = entry.week || "General";
    if (!groups[period]) {
      groups[period] = { period, symptoms: [], totalReports: 0 };
    }
    groups[period].symptoms.push({ name: entry.symptom, count: entry.count });
    groups[period].totalReports += entry.count;
  }

  // Sort by predefined period order
  return Object.values(groups).sort((a, b) => {
    const ai = PERIOD_ORDER.indexOf(a.period);
    const bi = PERIOD_ORDER.indexOf(b.period);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

// Convert chart format data to grouped periods
function chartToGrouped(chartData) {
  return chartData.map(item => ({
    period: item.marker,
    symptoms: [],
    totalReports: 0,
    sentimentScore: item.sentimentScore,
    description: item.description,
  }));
}

export default function ChronologicalTimeline({ timelineData = [], drugName = "" }) {
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-surface-container-low rounded-3xl border border-outline-variant/10 gap-3">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">timeline</span>
        <p className="text-on-surface-variant font-medium">No timeline data available yet.</p>
        <p className="text-sm text-on-surface-variant/60">Search for a drug to see its recovery timeline</p>
      </div>
    );
  }

  // Detect format and normalize
  const isBackend = isBackendFormat(timelineData);
  const groupedPeriods = isBackend ? groupByPeriod(timelineData) : chartToGrouped(timelineData);

  // Calculate overall stats
  const totalSymptomReports = groupedPeriods.reduce((sum, p) => sum + p.totalReports, 0);
  const totalUniqueSymptoms = isBackend 
    ? new Set(timelineData.map(e => e.symptom)).size 
    : 0;
  const totalPeriods = groupedPeriods.length;

  return (
    <div className="w-full bg-surface-container-lowest rounded-3xl border border-outline-variant/10 hover:shadow-lg transition-shadow overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">timeline</span>
            </div>
            <div>
              <h4 className="font-[Manrope] font-bold text-xl text-on-surface">Recovery Timeline</h4>
              <p className="text-sm text-on-surface-variant">
                {drugName ? `Side-effect progression for ${drugName}` : "Patient-reported side-effect progression"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {isBackend && totalSymptomReports > 0 && (
          <div className="flex items-center gap-6 mt-4 pb-4 border-b border-outline-variant/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
              <span className="text-sm font-medium text-on-surface">{totalSymptomReports} <span className="text-on-surface-variant">reports</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-lg">medication</span>
              <span className="text-sm font-medium text-on-surface">{totalUniqueSymptoms} <span className="text-on-surface-variant">side effects</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-lg">date_range</span>
              <span className="text-sm font-medium text-on-surface">{totalPeriods} <span className="text-on-surface-variant">phases</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Periods */}
      <div className="p-6 pt-4 space-y-3">
        {groupedPeriods.map((period, index) => {
          const isExpanded = expandedPeriod === period.period;
          const periodColor = getPeriodColor(period.period);
          const periodIcon = getPeriodIcon(period.period);
          const isLast = index === groupedPeriods.length - 1;
          const hasSymptoms = period.symptoms && period.symptoms.length > 0;

          return (
            <div key={period.period} className="relative">
              {/* Connecting line */}
              {!isLast && (
                <div className={`absolute left-5 top-12 w-0.5 ${periodColor} opacity-20`} style={{ height: "calc(100% - 12px)" }}></div>
              )}

              {/* Period Card */}
              <button
                onClick={() => hasSymptoms && setExpandedPeriod(isExpanded ? null : period.period)}
                className={`w-full text-left rounded-2xl p-4 transition-all duration-300 border ${
                  isExpanded 
                    ? "bg-surface-container-low border-primary/20 shadow-sm" 
                    : "bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-low hover:border-outline-variant/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Period Marker */}
                  <div className={`w-10 h-10 rounded-xl ${periodColor} flex items-center justify-center flex-shrink-0`}>
                    <span className="material-symbols-outlined text-white text-lg">{periodIcon}</span>
                  </div>

                  {/* Period Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h5 className="font-[Manrope] font-bold text-on-surface">{period.period}</h5>
                      {hasSymptoms && (
                        <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          {period.symptoms.length} symptom{period.symptoms.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {period.description && (
                      <p className="text-sm text-on-surface-variant mt-0.5">{period.description}</p>
                    )}
                    {hasSymptoms && !isExpanded && (
                      <p className="text-sm text-on-surface-variant mt-0.5 truncate">
                        {period.symptoms.slice(0, 3).map(s => s.name).join(", ")}
                        {period.symptoms.length > 3 ? `, +${period.symptoms.length - 3} more` : ""}
                      </p>
                    )}
                    {period.sentimentScore !== undefined && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden max-w-[120px]">
                          <div 
                            className={`h-full rounded-full ${period.sentimentScore > 60 ? 'bg-emerald-500' : period.sentimentScore < 40 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${period.sentimentScore}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-bold ${period.sentimentScore > 60 ? 'text-emerald-600' : period.sentimentScore < 40 ? 'text-red-500' : 'text-amber-500'}`}>
                          {period.sentimentScore}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total Reports Badge */}
                  {period.totalReports > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-on-surface">{period.totalReports}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium">reports</p>
                    </div>
                  )}

                  {/* Expand Arrow */}
                  {hasSymptoms && (
                    <span className={`material-symbols-outlined text-on-surface-variant text-xl transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded Symptom Details */}
              {isExpanded && hasSymptoms && (
                <div className="mt-2 ml-14 space-y-2 animate-fadeInUp">
                  {period.symptoms
                    .sort((a, b) => b.count - a.count)
                    .map((symptom) => {
                      const tier = getSeverityTier(symptom.count);
                      const maxCount = Math.max(...period.symptoms.map(s => s.count));
                      const barWidth = maxCount > 0 ? (symptom.count / maxCount) * 100 : 0;

                      return (
                        <div key={symptom.name} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-semibold text-on-surface capitalize">{symptom.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${tier.color}`}>
                                {tier.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    tier.label === "Very Common" ? "bg-red-400" :
                                    tier.label === "Common" ? "bg-orange-400" :
                                    tier.label === "Uncommon" ? "bg-amber-400" : "bg-emerald-400"
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">
                                {symptom.count} report{symptom.count !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-6 pb-5 pt-2 border-t border-outline-variant/10">
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
          <span className="text-on-surface-variant">Frequency:</span>
          {SEVERITY_TIERS.map(tier => (
            <div key={tier.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full border ${tier.color}`}></div>
              <span className="text-on-surface-variant">{tier.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
