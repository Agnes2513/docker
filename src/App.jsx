import { useState } from "react";
import modelOutput from "./model_output2.json";

const C = {
  bg: "#0a0e1a", panel: "#0f1629", border: "#1e2d4a",
  accent: "#00d4ff", danger: "#ff3b5c", warn: "#ffb800",
  ok: "#00e676", purple: "#a855f7", teal: "#14b8a6",
  text: "#e2e8f0", muted: "#64748b",
  high: "#ff6b35", medium: "#ffb800",
};

/* ── tiny helpers ─────────────────────────────────────────── */
const Badge = ({ value, label }) => {
  const col = value > 0.75 ? C.danger : value > 0.5 ? C.high
            : value > 0.3  ? C.medium : C.ok;
  return (
    <span style={{
      background: col + "22", border: `1px solid ${col}`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11,
      color: col, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {label || `${(value * 100).toFixed(1)}%`}
    </span>
  );
};

const Bar = ({ value, max, color }) => (
  <div style={{ flex: 1, background: C.border, borderRadius: 3, height: 8, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
  </div>
);

/* ── ROC chart ────────────────────────────────────────────── */
const ROCChart = ({ points, auc }) => {
  const W = 240, H = 190, P = 32;
  const x = v => P + v * (W - P * 2);
  const y = v => H - P - v * (H - P * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.fpr)},${y(p.tpr)}`).join(" ");
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={C.accent} stopOpacity=".3" />
          <stop offset="100%" stopColor={C.accent} stopOpacity=".02" />
        </linearGradient>
      </defs>
      {[0, .25, .5, .75, 1].map(v => (
        <g key={v}>
          <line x1={P} y1={y(v)} x2={W-P} y2={y(v)} stroke={C.border} strokeWidth=".5" strokeDasharray="3,3" />
          <line x1={x(v)} y1={P} x2={x(v)} y2={H-P} stroke={C.border} strokeWidth=".5" strokeDasharray="3,3" />
          <text x={P-3} y={y(v)+3} fill={C.muted} fontSize="8" textAnchor="end">{v}</text>
          <text x={x(v)} y={H-P+11} fill={C.muted} fontSize="8" textAnchor="middle">{v}</text>
        </g>
      ))}
      <line x1={P} y1={P} x2={P} y2={H-P} stroke={C.border} />
      <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke={C.border} />
      <path d={`${path} L${W-P},${H-P} L${P},${H-P} Z`} fill="url(#rg)" />
      <path d={path} fill="none" stroke={C.accent} strokeWidth="2" />
      <path d={`M${P},${H-P} L${W-P},${P}`} fill="none" stroke={C.muted} strokeWidth="1" strokeDasharray="4,4" />
      <text x={W-P-4} y={P+12} fill={C.accent} fontSize="9" textAnchor="end" fontWeight="bold">AUC = {auc?.toFixed(4)}</text>
      <text x={P+4} y={P+10} fill={C.muted} fontSize="7">TPR</text>
      <text x={W/2} y={H-2} fill={C.muted} fontSize="7" textAnchor="middle">FPR</text>
    </svg>
  );
};

/* ── Calibration chart ────────────────────────────────────── */
const CalibChart = ({ points, brier }) => {
  const W = 240, H = 190, P = 32;
  const x = v => P + v * (W - P * 2);
  const y = v => H - P - v * (H - P * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.predicted)},${y(p.observed)}`).join(" ");
  return (
    <svg width={W} height={H}>
      <line x1={P} y1={P} x2={P} y2={H-P} stroke={C.border} />
      <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke={C.border} />
      <path d={`M${P},${H-P} L${W-P},${P}`} fill="none" stroke={C.muted} strokeWidth="1" strokeDasharray="4,4" />
      <path d={path} fill="none" stroke={C.teal} strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={x(p.predicted)} cy={y(p.observed)} r="3.5" fill={C.teal} opacity=".8" />)}
      <text x={W-P-4} y={P+12} fill={C.teal} fontSize="9" textAnchor="end" fontWeight="bold">Brier = {brier?.toFixed(4)}</text>
      <text x={P+4} y={P+10} fill={C.muted} fontSize="7">Observed</text>
      <text x={W/2} y={H-2} fill={C.muted} fontSize="7" textAnchor="middle">Predicted</text>
    </svg>
  );
};

/* ── SHAP waterfall ───────────────────────────────────────── */
const SHAPChart = ({ shapValues }) => {
  const sorted = [...shapValues].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)).slice(0, 12);
  const all = sorted.map(s => s.shap);
  const mn = Math.min(...all, -0.05), mx = Math.max(...all, 0.05);
  const rng = mx - mn;
  const PL = 155, PR = 55, TOP = 8, BH = 17, GAP = 3;
  const W = 380;
  const chartW = W - PL - PR;
  const tx = v => PL + ((v - mn) / rng) * chartW;
  const z  = tx(0);
  const TH = sorted.length * (BH + GAP) + TOP + 28;
  return (
    <svg viewBox={`0 0 ${W} ${TH}`} width="100%" height={TH}
         style={{ fontFamily: "monospace", display: "block" }}>
      <line x1={z} y1={TOP} x2={z} y2={TH - 20} stroke={C.border} strokeWidth="1" />
      {sorted.map((s, i) => {
        const yy = TOP + i * (BH + GAP);
        const barStart = s.shap >= 0 ? z : tx(s.shap);
        const bw = Math.max(1, Math.abs(tx(s.shap) - z));
        const col = s.shap >= 0 ? C.danger : C.teal;
        return (
          <g key={i}>
            {/* feature name — always on the left */}
            <text x={PL - 8} y={yy + BH - 3} fill={C.text}
                  fontSize="9" textAnchor="end">{s.feature}</text>
            {/* bar */}
            <rect x={barStart} y={yy} width={bw} height={BH}
                  fill={col} opacity=".85" rx="2" />
            {/* value label — inside bar if wide enough, else outside */}
            {bw > 38 ? (
              <text x={barStart + bw / 2} y={yy + BH - 4}
                    fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">
                {s.shap.toFixed(3)}
              </text>
            ) : s.shap >= 0 ? (
              <text x={barStart + bw + 3} y={yy + BH - 3}
                    fill={col} fontSize="8" textAnchor="start">
                +{s.shap.toFixed(4)}
              </text>
            ) : (
              <text x={z - bw - 3} y={yy + BH - 3}
                    fill={col} fontSize="8" textAnchor="end">
                {s.shap.toFixed(4)}
              </text>
            )}
          </g>
        );
      })}
      <text x={z} y={TH - 6} fill={C.muted} fontSize="8" textAnchor="middle">0</text>
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════ */
export default function App() {
  const raw = modelOutput.propagation?.ranked_images || modelOutput.dataset || [];
  const meta = modelOutput.metadata || {};
  const metrics    = modelOutput.metrics    || {};
  const shapTop20  = modelOutput.shap_top20 || [];
  const propagation = modelOutput.propagation || {};

  const data = raw.map((d, i) => ({ ...d, id: i + 1 }));

  const [tab,      setTab]      = useState("overview");
  const [selIdx,   setSelIdx]   = useState(0);
  const [page,     setPage]     = useState(0);
  const [search,   setSearch]   = useState("");
  const PER = 15;

  const filtered = data.filter(d =>
    (d.artifact_name || d.os_family || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.os_family || "").toLowerCase().includes(search.toLowerCase())
  );
  const paged   = filtered.slice(page * PER, (page + 1) * PER);
  const pages   = Math.ceil(filtered.length / PER);
  const top20   = data.slice(0, 20);

  const TABS = [
    { id: "overview",      label: " Overview"      },
    { id: "model",         label: " Model"          },
    { id: "prioritization",label: " Prioritize"     },
    { id: "shap",          label: " SHAP"           },
    { id: "propagation",   label: " Propagation"   },
  ];

  // secure=0 → INSECURE (has critical CVEs)
  // secure=1 → SECURE   (no/low critical CVEs)
  const insecureCount = data.filter(d => d.secure === 0).length;
  const secureCount   = data.filter(d => d.secure === 1).length;

  const statCards = [
    { label: "Total Images",  value: data.length,         col: C.accent  },
    { label: "Critical CVEs", value: meta.critical_total || 0,           col: C.danger  },
    { label: "High CVEs",     value: meta.high_total     || 0,           col: C.high    },
    { label: "Secure",      value: insecureCount,     col: C.ok  ,
      sub: "secure = 0"  },
    { label: "Insecure",        value: secureCount,        col: C.danger ,
      sub: "secure = 1"  },
    { label: "Anomalies",     value: meta.anomaly_count  || 0,           col: C.purple  },
  ];

  /* ── shared style tokens ── */
  const panel = {
    background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: 20,
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, color: C.text,
                  fontFamily: "'Courier New', monospace", boxSizing: "border-box",
                  overflowX: "hidden" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`,
                    padding: "14px 32px", display: "flex",
                    alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, fontSize: 20,
            background: `linear-gradient(135deg,${C.accent},${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>🐳</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.accent, letterSpacing: 2 }}>
               DOCKER RISK INTELLIGENCE · Trivy
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginTop: 2 }}>
              LightGBM · SHAP · Propagation · {data.length} Real Images
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Critical", v: meta.critical_total || 0, col: C.danger },
            { label: "High",     v: meta.high_total     || 0, col: C.high   },
            { label: "Secure", v: insecureCount,           col: C.ok    },
            { label: "Insecure",   v: secureCount,             col: C.danger   },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "5px 16px",
                                        background: C.bg, borderRadius: 8,
                                        border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.col }}>{s.v.toLocaleString()}</div>
              <div style={{ fontSize: 9,  color: C.muted, letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────── */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`,
                    display: "flex", padding: "0 32px", gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "13px 22px", fontSize: 11, letterSpacing: 1.5,
            textTransform: "uppercase", fontFamily: "inherit",
            color:       tab === t.id ? C.accent : C.muted,
            borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
            transition: "all .2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── PAGE CONTENT ───────────────────────────────────── */}
      <div style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>

        {/* ══ OVERVIEW ══════════════════════════════════════ */}
        {tab === "overview" && (
          <div>
            {/* stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)",
                          gap: 14, marginBottom: 24 }}>
              {statCards.map(s => (
                <div key={s.label} style={{ ...panel, padding: "16px 18px",
                  borderTop: `3px solid ${s.col}` }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.col }}>
                    {s.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>{s.label}</div>
                  {s.sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* distribution panels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                          gap: 16, marginBottom: 24 }}>
              {/* OS family */}
              <div style={panel}>
                <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 16 }}>
                  OS FAMILY DISTRIBUTION
                </div>
                {[...new Set(data.map(d => d.os_family))].filter(Boolean).slice(0, 10).map(os => {
                  const cnt = data.filter(d => d.os_family === os).length;
                  return (
                    <div key={os} style={{ display: "flex", alignItems: "center",
                                           gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 72, fontSize: 10, color: C.text }}>{os}</div>
                      <Bar value={cnt} max={data.length} color={C.teal} />
                      <div style={{ width: 28, fontSize: 10, color: C.muted, textAlign: "right" }}>{cnt}</div>
                    </div>
                  );
                })}
              </div>

              {/* Risk distribution */}
              <div style={panel}>
                <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 16 }}>
                  RISK DISTRIBUTION
                </div>
                {[
                  ["0–20%",   [0, .2],   C.ok     ],
                  ["20–40%",  [.2,.4],   C.teal   ],
                  ["40–60%",  [.4,.6],   C.medium ],
                  ["60–80%",  [.6,.8],   C.high   ],
                  ["80–100%", [.8,1.01], C.danger ],
                ].map(([label, [lo, hi], col]) => {
                  const cnt = data.filter(d => (d.propagated_risk||0) >= lo && (d.propagated_risk||0) < hi).length;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center",
                                              gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 72, fontSize: 10, color: C.text }}>{label}</div>
                      <Bar value={cnt} max={data.length} color={col} />
                      <div style={{ width: 28, fontSize: 10, color: C.muted, textAlign: "right" }}>{cnt}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── ALL IMAGES TABLE ── */}
            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1 }}>ALL IMAGES</div>
                <input
                  placeholder="  Search image name or OS..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  style={{
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: "6px 14px", color: C.text, fontFamily: "inherit",
                    fontSize: 11, width: 260, outline: "none",
                  }}
                />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse",
                                fontSize: 10, minWidth: 900 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {["Rank","Image Name","OS","Pkg Mgr","Size MB",
                        "Critical","High","Medium","Low",
                        "Net Exp","Root","Risk","Secure","Anomaly"
                       ].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left",
                                             color: C.muted, fontWeight: 600,
                                             letterSpacing: .5, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((d) => (
                      <tr key={d.id}
                        style={{ borderBottom: `1px solid ${C.border}`,
                                 transition: "background .15s", cursor: "default" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#ffffff09"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "7px 10px", color: d.rank <= 10 ? C.danger : C.muted,
                                     fontWeight: 700, whiteSpace: "nowrap" }}>#{d.rank}</td>
                        <td style={{ padding: "7px 10px", color: C.text, maxWidth: 200,
                                     overflow: "hidden", textOverflow: "ellipsis",
                                     whiteSpace: "nowrap" }}
                            title={d.artifact_name}>
                          {d.artifact_name || `${d.os_family}:${d.Package_Manager}`}
                        </td>
                        <td style={{ padding: "7px 10px", color: C.muted, whiteSpace: "nowrap" }}>{d.os_family}</td>
                        <td style={{ padding: "7px 10px", color: C.muted, whiteSpace: "nowrap" }}>{d.Package_Manager}</td>
                        <td style={{ padding: "7px 10px", color: C.muted, whiteSpace: "nowrap" }}>{d.Size_MB}</td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap",
                                     color: d.Critical > 0 ? C.danger : C.muted,
                                     fontWeight: d.Critical > 0 ? 700 : 400 }}>{d.Critical}</td>
                        <td style={{ padding: "7px 10px", color: d.High > 0 ? C.high : C.muted,
                                     whiteSpace: "nowrap" }}>{d.High}</td>
                        <td style={{ padding: "7px 10px", color: C.medium, whiteSpace: "nowrap" }}>{d.Medium}</td>
                        <td style={{ padding: "7px 10px", color: C.muted, whiteSpace: "nowrap" }}>{d.Low}</td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap",
                                     color: (d.network_exploitable_count||0) > 50 ? C.warn : C.muted }}>
                          {d.network_exploitable_count ?? "—"}
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          {d.run_as_root ? <span style={{ color: C.danger }}>Yes</span>
                                         : <span style={{ color: C.ok   }}> No</span>}
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          <Badge value={d.propagated_risk || 0} />
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          {d.secure ? <span style={{ color: C.ok }}>✅</span>
                                    : <span style={{ color: C.danger }}>❌</span>}
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          {d.anomaly ? "✅" : <span style={{ color: C.muted }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginTop: 14 }}>
                <div style={{ fontSize: 10, color: C.muted }}>
                  Showing {page * PER + 1}–{Math.min((page + 1) * PER, filtered.length)} of {filtered.length}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{ background: C.border, border: "none", borderRadius: 4,
                             padding: "4px 10px", color: C.muted, cursor: "pointer",
                             fontFamily: "inherit", fontSize: 10, opacity: page === 0 ? .4 : 1 }}>
                    ← Prev
                  </button>
                  {[...Array(Math.min(7, pages))].map((_, i) => (
                    <button key={i} onClick={() => setPage(i)} style={{
                      background: page === i ? C.accent : C.border, border: "none",
                      borderRadius: 4, width: 28, height: 28, cursor: "pointer",
                      color: page === i ? C.bg : C.muted,
                      fontFamily: "inherit", fontSize: 10, fontWeight: page === i ? 700 : 400,
                    }}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                    disabled={page === pages - 1}
                    style={{ background: C.border, border: "none", borderRadius: 4,
                             padding: "4px 10px", color: C.muted, cursor: "pointer",
                             fontFamily: "inherit", fontSize: 10,
                             opacity: page === pages - 1 ? .4 : 1 }}>
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ══ MODEL METRICS ══════════════════════════════════ */}
{tab === "model" && (
  <div>

    {/* metric cards */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)",
                  gap: 14, marginBottom: 24 }}>
      {[
        { label: "ROC-AUC", value: metrics.auc?.toFixed(4), col: C.accent },
        { label: "Accuracy", value: `${((metrics.accuracy||0)*100).toFixed(2)}%`, col: C.ok },
        { label: "Precision", value: `${((metrics.precision||0)*100).toFixed(2)}%`, col: C.teal },
        { label: "Recall", value: `${((metrics.recall||0)*100).toFixed(2)}%`, col: C.purple },
        { label: "F1 Score", value: metrics.f1?.toFixed(4), col: C.warn },
      ].map(m => (
        <div key={m.label} style={{ ...panel, textAlign: "center",
                                    borderTop: `3px solid ${m.col}` }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: m.col }}>{m.value}</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginTop: 6 }}>{m.label}</div>
        </div>
      ))}
    </div>


    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16, marginBottom: 16 }}>

      {/* ROC */}
      <div style={panel}>
        <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 14 }}>ROC CURVE</div>
        {metrics.roc_points && <ROCChart points={metrics.roc_points} auc={metrics.auc} />}
        <div style={{ fontSize: 10, color: C.muted, marginTop: 10 }}>
          5-Fold CV AUC: <span style={{ color: C.ok }}>{metrics.cv_auc_mean?.toFixed(4)}</span>
          {" "}± {metrics.cv_auc_std?.toFixed(4)}
        </div>
      </div>

      {/* Calibration */}
      <div style={panel}>
        <div style={{ fontSize: 11, color: C.teal, letterSpacing: 1, marginBottom: 14 }}>CALIBRATION CURVE</div>
        {metrics.calib_points && <CalibChart points={metrics.calib_points} brier={metrics.brier} />}
        <div style={{ fontSize: 10, color: C.muted, marginTop: 10 }}>
          Platt scaling applied. Brier score closer to 0 = better calibrated.
        </div>
      </div>

      {/* Feature importance */}
      <div style={panel}>
        <div style={{ fontSize: 11, color: C.purple, letterSpacing: 1, marginBottom: 14 }}>FEATURE IMPORTANCE</div>
        {(metrics.features || []).slice(0, 12).map((f, i) => {
          const maxImp = metrics.features[0]?.importance || 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center",
                                  gap: 8, marginBottom: 6 }}>
              <div style={{ width: 130, fontSize: 9, color: C.text,
                            textAlign: "right", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
              <Bar value={f.importance} max={maxImp} color={i === 0 ? C.danger : C.accent} />
              <div style={{ width: 36, fontSize: 9, color: C.muted,
                            textAlign: "right" }}>{(f.importance * 100).toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>


    {/* Confusion matrix */}
    {metrics.confusion_matrix && (
      <div style={panel}>
        <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 18 }}>CONFUSION MATRIX</div>
        <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: 120 }} />
                <th style={{ padding: "8px 24px", fontSize: 10, color: C.ok,
                             border: `1px solid ${C.border}`, fontWeight: 600 }}>Pred. Secure</th>
                <th style={{ padding: "8px 24px", fontSize: 10, color: C.danger,
                             border: `1px solid ${C.border}`, fontWeight: 600 }}>Pred. Insecure</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Actual Secure", metrics.confusion_matrix.tn, metrics.confusion_matrix.fp, C.ok, C.warn],
                ["Actual Insecure", metrics.confusion_matrix.fn, metrics.confusion_matrix.tp, C.warn, C.danger],
              ].map(([lbl, a, b, ca, cb]) => (
                <tr key={lbl}>
                  <td style={{ padding: "8px 12px", fontSize: 10, color: C.muted,
                               border: `1px solid ${C.border}` }}>{lbl}</td>
                  <td style={{ padding: "16px 24px", fontSize: 22, fontWeight: 800,
                               color: ca, border: `1px solid ${C.border}`,
                               textAlign: "center" }}>{a}</td>
                  <td style={{ padding: "16px 24px", fontSize: 22, fontWeight: 800,
                               color: cb, border: `1px solid ${C.border}`,
                               textAlign: "center" }}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 10, color: C.muted, lineHeight: 2.2 }}>
            <div> True Negatives (TN): {metrics.confusion_matrix.tn}</div>
            <div> True Positives (TP): {metrics.confusion_matrix.tp}</div>
            <div> False Positives (FP): {metrics.confusion_matrix.fp}</div>
            <div> False Negatives (FN): {metrics.confusion_matrix.fn}</div>
          </div>
        </div>
      </div>
    )}


    {/* ── CV FOLD SCORES ── */}
    {(metrics.cv5_folds || metrics.cv10_folds) && (
      <div style={{ ...panel, marginTop: 16, borderLeft: `4px solid ${C.ok}` }}>
        <div style={{ fontSize: 11, color: C.ok, letterSpacing: 1, marginBottom: 16 }}>
          📊 CROSS-VALIDATION SCORES — more reliable than single 80/20 split
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* 5-Fold */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>5-Fold CV AUC</span>
              <span style={{ fontSize: 13, color: C.ok, fontWeight: 800 }}>
                {(metrics.cv_auc_mean||0).toFixed(4)}
                <span style={{ fontSize: 10, color: C.muted }}> ± {(metrics.cv_auc_std||0).toFixed(4)}</span>
              </span>
            </div>

            {(metrics.cv5_folds || []).map((score, i) => {
              const s = parseFloat(score);
              const col = s >= 0.95 ? C.ok : s >= 0.90 ? C.teal : s >= 0.80 ? C.warn : C.danger;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 44, fontSize: 10, color: C.muted }}>Fold {i+1}</div>
                  <div style={{ flex: 1, background: C.border, borderRadius: 4,
                                height: 18, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${s * 100}%`, height: "100%", borderRadius: 4,
                                  background: `linear-gradient(90deg,${col}88,${col})` }} />
                  </div>
                </div>
              );
            })}
          </div>


          {/* 10-Fold */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>10-Fold CV AUC</span>
              <span style={{ fontSize: 13, color: C.teal, fontWeight: 800 }}>
                {(metrics.cv10_auc_mean||0).toFixed(4)}
                <span style={{ fontSize: 10, color: C.muted }}> ± {(metrics.cv10_auc_std||0).toFixed(4)}</span>
              </span>
            </div>

            {(metrics.cv10_folds || []).map((score, i) => {
              const s = parseFloat(score);
              const col = s >= 0.95 ? C.ok : s >= 0.90 ? C.teal : s >= 0.80 ? C.warn : C.danger;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 44, fontSize: 10, color: C.muted }}>Fold {i+1}</div>
                  <div style={{ flex: 1, background: C.border, borderRadius: 4,
                                height: 18, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${s * 100}%`, height: "100%", borderRadius: 4,
                                  background: `linear-gradient(90deg,${col}88,${col})` }} />
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    )}

  </div>
)}

        {/* ══ PRIORITIZATION ════════════════════════════════ */}
        {tab === "prioritization" && (
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>
              Ranked by <span style={{ color: C.accent }}>propagated_risk</span> —
              composite of Critical CVEs, network exploitability, run_as_root, and inherited base-image risk.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {top20.map((img, i) => (
                <div key={img.id || i}
                  onClick={() => { setSelIdx(i); setTab("shap"); }}
                  style={{
                    ...panel,
                    cursor: "pointer",
                    borderColor: (img.propagated_risk||0) > 0.75 ? C.danger
           : (img.propagated_risk||0) > 0.50 ? C.high
           : (img.propagated_risk||0) > 0.30 ? C.warn : C.border,
boxShadow: (img.propagated_risk||0) > 0.75 ? `0 0 14px ${C.danger}33` : "none",
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between",
                                alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                        borderColor: (img.propagated_risk||0) > 0.75 ? C.danger
           : (img.propagated_risk||0) > 0.50 ? C.high
           : (img.propagated_risk||0) > 0.30 ? C.warn : C.border,
boxShadow: (img.propagated_risk||0) > 0.75 ? `0 0 14px ${C.danger}33` : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800,
                      }}>#{img.rank}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text,
                                      overflow: "hidden", textOverflow: "ellipsis",
                                      whiteSpace: "nowrap", maxWidth: 260 }}
                             title={img.artifact_name}>
                          {img.artifact_name || `${img.os_family}:${img.Package_Manager}`}
                        </div>
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
                          {img.os_family} · {img.Package_Manager} · {img.Size_MB} MB · {img.layers} layers
                        </div>
                      </div>
                    </div>
                    <Badge value={img.propagated_risk || 0} />
                  </div>

                  {/* tag row */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {img.Critical > 0 && (
                      <span style={{ fontSize: 9, color: C.danger, background: C.danger+"18",
                                     borderRadius: 3, padding: "2px 7px" }}>
                         {img.Critical} Critical
                      </span>
                    )}
                    {img.High > 0 && (
                      <span style={{ fontSize: 9, color: C.high, background: C.high+"18",
                                     borderRadius: 3, padding: "2px 7px" }}>
                         {img.High} High
                      </span>
                    )}
                    {(img.network_exploitable_count || 0) > 0 && (
                      <span style={{ fontSize: 9, color: C.warn, background: C.warn+"18",
                                     borderRadius: 3, padding: "2px 7px" }}>
                         {img.network_exploitable_count} NetExp
                      </span>
                    )}
                    {img.run_as_root === 1 && (
                      <span style={{ fontSize: 9, color: C.danger, background: C.danger+"18",
                                     borderRadius: 3, padding: "2px 7px" }}>
                         root
                      </span>
                    )}
                    {img.anomaly === 1 && (
                      <span style={{ fontSize: 9, color: C.purple, background: C.purple+"18",
                                     borderRadius: 3, padding: "2px 7px" }}> anomaly</span>
                    )}
                    {img.is_base_image === 1 && (
                      <span style={{ fontSize: 9, color: C.teal, background: C.teal+"18",
                                     borderRadius: 3, padding: "2px 7px" }}>BASE</span>
                    )}
                  </div>

                  {/* risk bar */}
                  <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      width: `${(img.propagated_risk || 0) * 100}%`, height: "100%", borderRadius: 3,
                      background: (img.propagated_risk||0) > .75 ? C.danger
                                : (img.propagated_risk||0) > .5  ? C.high : C.medium,
                    }} />
                  </div>
                  <div style={{ fontSize: 8, color: C.muted, marginTop: 5 }}>
                    inherited: {((img.inherited_risk||0)*100).toFixed(1)}% ·
                    propagated: {((img.propagated_risk||0)*100).toFixed(1)}% ·
                    click → SHAP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SHAP ══════════════════════════════════════════ */}
        {tab === "shap" && (
          <div>
            {/* image selector buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
              {shapTop20.slice(0, 12).map((img, i) => (
                <button key={i} onClick={() => setSelIdx(i)} style={{
                  background: selIdx === i ? C.accent : C.panel,
                  border: `1px solid ${selIdx === i ? C.accent : C.border}`,
                  borderRadius: 6, padding: "6px 14px", cursor: "pointer",
                  fontSize: 10, fontFamily: "inherit",
                  color: selIdx === i ? C.bg : C.text,
                  fontWeight: selIdx === i ? 700 : 400,
                }}>
                  #{img.rank} {(img.artifact_name || img.os_family || "").slice(0, 20)}
                </button>
              ))}
            </div>

            {shapTop20[selIdx] && (() => {
              const img = shapTop20[selIdx];
              return (
                <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 18 }}>
                  {/* waterfall */}
                  <div style={panel}>
                    <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 4 }}>
                      SHAP WATERFALL
                    </div>
                    <div style={{ fontSize: 9, color: C.muted, marginBottom: 12 }}>
                      #{img.rank} · {img.artifact_name || img.os_family}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  fontSize: 10, marginBottom: 12 }}>
                      <span style={{ color: C.muted }}>
                        Base: <span style={{ color: C.teal }}>{img.base_value?.toFixed(3)}</span>
                      </span>
                      <Badge value={img.predicted_risk || 0} />
                    </div>
                    <SHAPChart shapValues={img.shap_values || []} />
                    <div style={{ marginTop: 12, display: "flex", gap: 18, fontSize: 9 }}>
                      <span style={{ color: C.danger }}>■ Increases risk</span>
                      <span style={{ color: C.teal   }}>■ Decreases risk</span>
                    </div>
                  </div>

                  {/* feature contributions + recommendation */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={panel}>
                      <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 14 }}>
                        FEATURE CONTRIBUTIONS
                      </div>
                      {(img.shap_values || [])
                        .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
                        .slice(0, 12)
                        .map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center",
                                                gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 155, fontSize: 9, color: C.text,
                                          whiteSpace: "nowrap", overflow: "hidden",
                                          textOverflow: "ellipsis" }}>{s.feature}</div>
                            <div style={{ width: 55, fontSize: 9, color: C.muted,
                                          textAlign: "right" }}>
                              = {typeof s.value === "number" ? s.value.toFixed(2) : s.value}
                            </div>
                            <div style={{ flex: 1, background: C.border, borderRadius: 3,
                                          height: 8, overflow: "hidden" }}>
                              <div style={{
                                width: `${Math.min(100, Math.abs(s.shap) * 300)}%`,
                                height: "100%", borderRadius: 3,
                                background: s.shap >= 0 ? C.danger : C.teal,
                              }} />
                            </div>
                            <div style={{ width: 62, fontSize: 9, textAlign: "right",
                                          fontWeight: 700,
                                          color: s.shap >= 0 ? C.danger : C.teal }}>
                              {s.shap >= 0 ? "+" : ""}{s.shap.toFixed(4)}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* recommendation box */}
                    <div style={{ ...panel,
                      borderLeft: `4px solid ${C.warn}`,
                      background: C.warn + "0d",
                    }}>
                      <div style={{ fontSize: 11, color: C.warn, letterSpacing: 1, marginBottom: 10 }}>
                        🔧 REMEDIATION RECOMMENDATION
                      </div>
                      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.8 }}>
                        Image <strong style={{ color: C.accent }}>
                          {img.artifact_name || img.os_family}
                        </strong> is ranked{" "}
                        <strong style={{ color: C.danger }}>#{img.rank}</strong> with{" "}
                        <strong style={{ color: C.danger }}>
                          {(img.predicted_risk * 100).toFixed(1)}%
                        </strong> propagated risk.
                      </div>
                      <ul style={{ fontSize: 10, color: C.muted, lineHeight: 2,
                                   marginTop: 10, paddingLeft: 18 }}>
                        {img.Critical > 0 && (
                          <li>Patch <strong style={{ color: C.danger }}>{img.Critical} critical CVE(s)</strong> immediately — highest priority.</li>
                        )}
                        {img.run_as_root === 1 && (
                          <li>Add <code style={{ color: C.accent }}>USER</code> directive in Dockerfile — avoid running as root.</li>
                        )}
                        {(img.network_exploitable_count || 0) > 50 && (
                          <li>Reduce attack surface — <strong style={{ color: C.warn }}>{img.network_exploitable_count}</strong> network-exploitable CVEs found.</li>
                        )}
                        {img.is_base_image === 1 && (
                          <li>This is a <strong style={{ color: C.teal }}>base image</strong> — fixing it protects all downstream containers.</li>
                        )}
                        {img.anomaly === 1 && (
                          <li>Anomalous pattern detected — review package composition.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ PROPAGATION ═══════════════════════════════════ */}
        {tab === "propagation" && (
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>
              Risk flows from base images to derived containers.
              Formula: <span style={{ color: C.accent }}>risk_child = risk_own + base_risk × 0.35</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* base image impact */}
              <div style={panel}>
                <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 16 }}>
                  BASE IMAGE RISK IMPACT
                </div>
                {(propagation.base_impact || []).slice(0, 10).map((b, i) => (
                  <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`,
                                        borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text,
                                      overflow: "hidden", textOverflow: "ellipsis",
                                      whiteSpace: "nowrap" }}
                             title={b.artifact_name}>
                          {(b.artifact_name || b.os_family || "unknown").slice(0, 36)}
                        </div>
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
                          OS: {b.os_family} ·
                          {" "}{b.num_dependents} dependent{b.num_dependents !== 1 ? "s" : ""} ·
                          avg boost +{((b.avg_boost_given || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <Badge value={b.own_risk || 0} />
                        <div style={{ fontSize: 8, color: C.purple, marginTop: 4 }}>
                          impact: {(b.total_impact || 0).toFixed(3)}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.min(100, (b.total_impact || 0) * 80)}%`,
                        height: "100%", background: C.purple, borderRadius: 3,
                      }} />
                    </div>
                    {(b.Critical > 0 || b.run_as_root) && (
                      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                        {b.Critical > 0 && (
                          <span style={{ fontSize: 8, color: C.danger, background: C.danger+"18",
                                         borderRadius: 3, padding: "1px 6px" }}>
                            {b.Critical} Critical
                          </span>
                        )}
                        {b.run_as_root === 1 && (
                          <span style={{ fontSize: 8, color: C.warn, background: C.warn+"18",
                                         borderRadius: 3, padding: "1px 6px" }}>
                             root
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* propagation edges */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={panel}>
                  <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 16 }}>
                    TOP PROPAGATION EDGES
                  </div>
                  {(propagation.edges || []).slice(0, 14).map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center",
                                          gap: 8, marginBottom: 9, fontSize: 10 }}>
                      <div style={{ flex: 1, color: C.text, overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    fontSize: 9 }}
                           title={e.from_image}>{e.from_image}</div>
                      <span style={{ color: C.warn, fontSize: 16, flexShrink: 0 }}>→</span>
                      <div style={{ flex: 1, color: C.muted, overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    fontSize: 9 }}
                           title={e.to_image}>{e.to_image}</div>
                      <div style={{ flexShrink: 0 }}>
                        <Badge value={e.child_final_risk || 0} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* summary box */}
                <div style={{ ...panel, borderLeft: `4px solid ${C.teal}`,
                               background: C.teal + "0d" }}>
                  <div style={{ fontSize: 11, color: C.teal, letterSpacing: 1, marginBottom: 12 }}>
                     PROPAGATION SUMMARY
                  </div>
                  {[
                    ["Total images",       data.length],
                    ["Base images",        (propagation.base_impact || []).length],
                    ["Propagation edges",  (propagation.edges || []).length],
                    ["High-risk base (>75%)", (propagation.base_impact || []).filter(b => b.own_risk > .75).length],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between",
                                              fontSize: 10, marginBottom: 8 }}>
                      <span style={{ color: C.muted }}>{label}</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, padding: "10px 12px",
                                background: C.accent + "12", borderRadius: 6,
                                fontSize: 10, color: C.text, lineHeight: 1.7 }}>
                    <strong style={{ color: C.accent }}>Key insight:</strong> Fixing a high-risk
                    base image reduces the risk of all its dependent containers simultaneously.
                    Prioritise base images with the highest <em>total_impact</em> score.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}