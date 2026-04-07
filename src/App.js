import React, { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://nmpbvjpvolhtxrultmvj.supabase.co";
const SUPABASE_KEY = "sb_publishable_iZs30OH1g7IVnI0MvhUMPw_dwUVgBrS";
const JOIN_CODE = "OVERNIGHT2026";
const ADMIN_CODE = "ONTL";

const CHALLENGES = [
  { id: 1, category: "End Caps", label: "Stock Front End Cap to Height", points: 1, icon: "📦" },
  { id: 2, category: "End Caps", label: "Stock Back End Cap to Height", points: 2, icon: "📦" },
  { id: 3, category: "End Caps", label: "Switch Out Feature to Reach Height", points: 5, icon: "🔄" },
  { id: 4, category: "Pallets", label: "Fix Pallet to Red Beam", points: 3, icon: "🔴" },
  { id: 5, category: "Pallets", label: "Cut Off Shrink Wrap Tails/Front Wrap", points: 1, icon: "✂️" },
  { id: 6, category: "Pallets", label: "Correct an Unsafe Stack", points: 10, icon: "⚠️" },
  { id: 7, category: "Pallets", label: "Rewrap a Bad Pallet", points: 3, icon: "🔧" },
  { id: 8, category: "Pallets", label: "Fix Pallet Lines", points: 1, icon: "📏" },
];

const BONUS_ICONS = ["⭐","🎯","🚀","💥","🔥","⚡","🏅","🎪","🎲","💎"];

async function sbGet(table, params = "") {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error(`sbGet ${table} failed:`, err);
    return [];
  }
}
async function sbInsert(table, data) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) return { error: json };
    return json;
  } catch (err) {
    console.error(`sbInsert ${table} failed:`, err);
    return { error: { message: err.message } };
  }
}
async function sbUpdate(table, match, data) {
  try {
    const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err) {
    console.error(`sbUpdate ${table} failed:`, err);
    return false;
  }
}
async function sbDelete(table, match) {
  try {
    const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return res.ok;
  } catch (err) {
    console.error(`sbDelete ${table} failed:`, err);
    return false;
  }
}

function toBase64(file) {
  return new Promise((res, rej) => {
    // Reject files that are unreasonably large before even loading them
    if (file.size > 20 * 1024 * 1024) {
      rej(new Error("Photo is too large. Please use a smaller image (under 20 MB)."));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Keep max dimension at 700px and quality at 0.55 to stay well under Supabase row limits
        const max = 700;
        let w = img.width, h = img.height;
        if (w > max) { h = Math.round((h * max) / w); w = max; }
        if (h > max) { w = Math.round((w * max) / h); h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
        // Safety check: warn if still large (> ~400 KB base64)
        if (dataUrl.length > 400000) {
          console.warn("Compressed image is still large:", Math.round(dataUrl.length / 1024), "KB");
        }
        res(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        rej(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Could not load image. Try a different photo.")); };
    img.src = url;
  });
}

function getTimeLeft(endTime) {
  const diff = new Date(endTime) - new Date();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

// Top-level error boundary — catches any unhandled render crash and shows a message
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { crashed: false, error: null }; }
  static getDerivedStateFromError(error) { return { crashed: true, error }; }
  componentDidCatch(error, info) { console.error("App crashed:", error, info); }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌙</div>
            <div style={{ color: "#f87171", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </div>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 24 }}>Try refreshing — your data is safe.</div>
            <button onClick={() => window.location.reload()}
              style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [members, setMembers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState([]);
  const [expectations, setExpectations] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("sc_user") || null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const prevPendingCount = useRef(0);
  const [newSubmissionAlert, setNewSubmissionAlert] = useState(false);
  const [pendingBonusId, setPendingBonusId] = useState("");
  const isFetching = useRef(false);
  
  const [dailyStandards, setDailyStandards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [redemptionRequests, setRedemptionRequests] = useState([]);
  const [pledges, setPledges] = useState([]);

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  // Silently wipe photo data from submissions older than 48 hours.
  // Keeps the record and points intact — just frees up the database storage.
  const cleanOldPhotos = async () => {
    try {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      // Fetch old submissions that still have photos
      const old = await sbGet("submissions", `select=id&created_at=lt.${cutoff}&before_img=not.is.null`);
      if (Array.isArray(old) && old.length > 0) {
        await Promise.all(old.map(row =>
          sbUpdate("submissions", { id: row.id }, { before_img: null, after_img: null })
        ));
      }
    } catch (err) {
      console.warn("cleanOldPhotos failed (non-critical):", err);
    }
  };

  // forceLoad: bypasses the isFetching guard — used after admin actions so they never silently skip
  const doFetch = async () => {
    isFetching.current = true;
    try {
      // Core tables — these must succeed for the app to work
      const [m, s, b, p, rd, a, q, qa, ex] = await Promise.all([
        sbGet("members", "select=name&order=created_at.asc"),
        sbGet("submissions", "select=id,member,challenge_label,points,bonus_id,note,status,date,submission_type,description,suggested_points,reject_reason,created_at&order=created_at.desc"),
        sbGet("bonuses", "select=*&order=id.desc"),
        sbGet("prizes", "select=*&order=id.asc"),
        sbGet("point_redemptions", "select=*&order=created_at.desc"),
        sbGet("announcements", "select=message&id=eq.1"),
        sbGet("questions", "select=*&order=created_at.desc"),
        sbGet("question_answers", "select=*&order=created_at.desc"),
        sbGet("expectations", "select=id,title,description,imgs,img,created_at&order=created_at.desc"),
      ]);

      // Optional/newer tables — fetched with allSettled so a missing table never crashes the app
      const optResults = await Promise.allSettled([
        sbGet("daily_standards", "select=*&order=id.asc"),
        sbGet("assignments", "select=*&order=created_at.desc"),
        sbGet("feedback", "select=*&order=created_at.desc"),
        sbGet("redemption_requests", "select=*&order=created_at.desc"),
        sbGet("team_pledges", "select=*&order=pledged_at.desc"),
      ]);
      const safeVal = (result) => (result.status === "fulfilled" && Array.isArray(result.value)) ? result.value : [];
      const [ds, asgn, fb, rr, pl] = optResults.map(safeVal);

      const newSubs = Array.isArray(s) ? s : [];
      const newPending = newSubs.filter(x => x.status === "pending").length;
      if (newPending > prevPendingCount.current && prevPendingCount.current >= 0 && !loading) {
        setNewSubmissionAlert(true);
        setTimeout(() => setNewSubmissionAlert(false), 5000);
      }
      prevPendingCount.current = newPending;
      setMembers(Array.isArray(m) ? m.map(x => x.name) : []);
      setSubmissions(newSubs);
      setBonuses(Array.isArray(b) ? b : []);
      setPrizes(Array.isArray(p) ? p : []);
      setAnnouncement(Array.isArray(a) && a[0] ? a[0].message || "" : "");
      setQuestions(Array.isArray(q) ? q : []);
      setQuestionAnswers(Array.isArray(qa) ? qa : []);
      setExpectations(Array.isArray(ex) ? ex : []);
      setRedemptions(Array.isArray(rd) ? rd : []);
      setDailyStandards(ds);
      setAssignments(asgn);
      setFeedback(fb);
      setRedemptionRequests(rr);
      setPledges(pl);
    } catch (err) {
      console.error("fetch failed:", err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  // loadAll: used by polling — skips if a fetch is already running
  const loadAll = async () => {
    if (isFetching.current) return;
    await doFetch();
  };

  // Poll every 15 seconds. doFetch's isFetching guard prevents overlap with manual refreshes.
  // Also run photo cleanup on every poll cycle (non-blocking).
  useEffect(() => {
    doFetch();
    const t = setInterval(() => { loadAll(); cleanOldPhotos(); }, 15000);
    return () => clearInterval(t);
  }, []);

  const getSpentPoints = (name) => redemptions.filter(r => r.member === name).reduce((sum, r) => sum + r.points, 0);
  const getEarnedPoints = (name) => {
    const subPts = submissions.filter(s => s.member === name && s.status === "approved").reduce((sum, s) => sum + s.points, 0);
    const qPts = questionAnswers.filter(a => a.member === name && a.status === "approved").reduce((sum, a) => sum + a.points, 0);
    return subPts + qPts;
  };
  const getPoints = (name) => getEarnedPoints(name) - getSpentPoints(name);

  const leaderboard = [...members].map(m => ({ name: m, points: getPoints(m), earned: getEarnedPoints(m) })).sort((a, b) => b.points - a.points);
  const totalPoints = leaderboard.reduce((s, m) => s + m.points, 0);
  const now = new Date();
  const activeBonuses = bonuses.filter(b => b.active && new Date(b.start_time) <= now && new Date(b.end_time) > now && !b.claimed_by);
  const activeQuestions = questions.filter(q => q.active);
  const pendingCount = submissions.filter(s => s.status === "pending").length + questionAnswers.filter(a => a.status === "pending").length;

  const approveSubmission = async (id, customPoints) => {
    const sub = submissions.find(s => s.id === id);
    if (!sub) { await doFetch(); return; } // submission already gone — just refresh
    const pts = customPoints !== undefined ? customPoints : (sub.points || 0);
    await sbUpdate("submissions", { id }, { status: "approved", points: pts });
    if (sub.bonus_id) await sbUpdate("bonuses", { id: sub.bonus_id }, { claimed_by: sub.member });
    await doFetch(); // use doFetch so this always runs even if polling is mid-flight
  };
  const rejectSubmission = async (id, reason) => {
    await sbUpdate("submissions", { id }, { status: "rejected", reject_reason: reason || null });
    await doFetch();
  };
  const deleteSubmission = async (id) => { await sbDelete("submissions", { id }); await doFetch(); };
  const deleteMember = async (name) => {
    await sbDelete("members", { name });
    await sbDelete("submissions", { member: name });
    await sbDelete("question_answers", { member: name });
    await sbDelete("point_redemptions", { member: name });
    if (currentUser === name) { setCurrentUser(null); localStorage.removeItem("sc_user"); }
    await doFetch();
  };

  if (loading) return (
    <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 60 }}>🌙</div><div style={{ color: "#60a5fa", fontSize: 18, fontWeight: 700, marginTop: 16 }}>Loading Night Crew...</div></div>
    </div>
  );

  return (
    <AppErrorBoundary>
    <div style={S.root}>
      <div style={S.app}>
        <Header screen={screen} setScreen={setScreen} currentUser={currentUser} isAdmin={isAdmin} setIsAdmin={setIsAdmin} pendingCount={pendingCount} newSubmissionAlert={newSubmissionAlert} />
        <div style={S.content}>
          {screen === "home" && <HomeScreen setScreen={setScreen} leaderboard={leaderboard} totalPoints={totalPoints} activeBonuses={activeBonuses} announcement={announcement} activeQuestions={activeQuestions} members={members} />}
          {screen === "join" && <JoinScreen members={members} setCurrentUser={setCurrentUser} setScreen={setScreen} loadAll={loadAll} />}
          {screen === "rules" && <RulesScreen />}
          {screen === "submit" && currentUser && <SubmitScreen currentUser={currentUser} submissions={submissions} activeBonuses={activeBonuses} loadAll={loadAll} initialBonusId={pendingBonusId} />}
          {screen === "submit" && !currentUser && <GateScreen setScreen={setScreen} />}
          {screen === "leaderboard" && <LeaderboardScreen leaderboard={leaderboard} totalPoints={totalPoints} members={members} />}
          {screen === "prizes" && <PrizesScreen prizes={prizes} currentUser={currentUser} getPoints={getPoints} loadAll={loadAll} leaderboard={leaderboard} pledges={pledges} />}
          {(screen === "bonuses" || screen === "bonuses_tab_bonuses" || screen === "bonuses_tab_questions") && <BonusesScreen bonuses={bonuses} activeBonuses={activeBonuses} questions={activeQuestions} currentUser={currentUser} questionAnswers={questionAnswers} loadAll={loadAll} setScreen={setScreen} setPendingBonusId={setPendingBonusId} initialTab={screen === "bonuses_tab_questions" ? "questions" : "bonuses"} />}
          {screen === "expectations" && <ExpectationsScreen expectations={expectations} />}
          {screen === "admin" && isAdmin && <AdminScreen submissions={submissions} approveSubmission={approveSubmission} rejectSubmission={rejectSubmission} deleteSubmission={deleteSubmission} leaderboard={leaderboard} bonuses={bonuses} loadAll={loadAll} refresh={doFetch} prizes={prizes} announcement={announcement} members={members} deleteMember={deleteMember} questions={questions} questionAnswers={questionAnswers} expectations={expectations} redemptions={redemptions} getPoints={getPoints} getEarnedPoints={getEarnedPoints} redemptionRequests={redemptionRequests} pledges={pledges} />}
          {screen === "adminlogin" && <AdminLogin setIsAdmin={setIsAdmin} setScreen={setScreen} />}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} isAdmin={isAdmin} activeBonuses={activeBonuses} activeQuestions={activeQuestions} pendingCount={pendingCount} />
      </div>
    </div>
    </AppErrorBoundary>
  );
}

function Header({ screen, setScreen, currentUser, isAdmin, setIsAdmin, pendingCount, newSubmissionAlert }) {
  const titles = { home: "Night Crew Challenge", join: "Join the Team", rules: "Rules & Points", submit: "Submit Proof", leaderboard: "Leaderboard", prizes: "Prizes", admin: "Admin Panel", adminlogin: "Admin Login", bonuses: "🔥 Bonus & Questions", bonuses_tab_bonuses: "🔥 Bonus Challenges", bonuses_tab_questions: "❓ Daily Questions", expectations: "📸 Expectations" };
  return (
    <div style={S.header}>
      {newSubmissionAlert && (
        <div style={{ position: "absolute", top: 56, left: 0, right: 0, background: "#b45309", color: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 700, textAlign: "center", zIndex: 200, cursor: "pointer" }} onClick={() => setScreen("admin")}>
          🔔 New submission needs review! Tap to view →
        </div>
      )}
      <div style={S.headerLeft}>
        <span style={{ fontSize: 28 }}>🌙</span>
        <div>
          <div style={S.headerTitle}>{titles[screen] || "Night Crew"}</div>
          {currentUser && <div style={S.headerSub}>Hey, {currentUser}!</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {isAdmin && pendingCount > 0 && (
          <div style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{pendingCount}</div>
        )}
        {!isAdmin
          ? <button style={S.adminBtn} onClick={() => setScreen("adminlogin")}>Admin</button>
          : <button style={{ ...S.adminBtn, background: "#16a34a", color: "#fff" }} onClick={() => { setIsAdmin(false); setScreen("home"); }}>Exit Admin</button>}
      </div>
    </div>
  );
}

function BottomNav({ screen, setScreen, isAdmin, activeBonuses, activeQuestions, pendingCount }) {
  const hasDot = activeBonuses.length > 0 || activeQuestions.length > 0;
  const isBonusScreen = screen === "bonuses" || screen === "bonuses_tab_bonuses" || screen === "bonuses_tab_questions";
  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "leaderboard", icon: "🏆", label: "Board" },
    { id: "submit", icon: "📸", label: "Submit" },
    { id: "bonuses", icon: "🔥", label: "Bonus", dot: hasDot, active: isBonusScreen },
    { id: "prizes", icon: "🎁", label: "Prizes" },
    { id: "rules", icon: "📋", label: "Rules" },
    { id: "expectations", icon: "👁", label: "Expect" },
  ];
  if (isAdmin) tabs.push({ id: "admin", icon: "⚙️", label: `Admin${pendingCount > 0 ? ` (${pendingCount})` : ""}` });
  return (
    <div style={S.bottomNav}>
      {tabs.map(t => (
        <button key={t.id} style={{ ...S.navTab, ...((screen === t.id || t.active) ? S.navTabActive : {}) }} onClick={() => setScreen(t.id)}>
          <span style={{ fontSize: 18, position: "relative" }}>{t.icon}{t.dot && <span style={S.pulseDot} />}</span>
          <span style={{ ...S.navLabel, ...((screen === t.id || t.active) ? { color: "#60a5fa" } : {}) }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function GateScreen({ setScreen }) {
  return (
    <div style={S.gateBox}>
      <div style={{ fontSize: 60 }}>🔒</div>
      <p style={{ color: "#94a3b8", fontSize: 16, textAlign: "center" }}>Join the team first!</p>
      <button style={S.btnPrimary} onClick={() => setScreen("join")}>Join Now</button>
    </div>
  );
}

function HomeScreen({ setScreen, leaderboard, totalPoints, activeBonuses, announcement, activeQuestions, members }) {
  const medals = ["🥇", "🥈", "🥉"];
  const allMembers = [...leaderboard];
  const lbNames = leaderboard.map(m => m.name);
  members.forEach(m => { if (!lbNames.includes(m)) allMembers.push({ name: m, points: 0 }); });
  const topPoints = allMembers[0]?.points || 1;
  return (
    <div style={{ padding: 16 }}>
      <div style={S.heroBanner}>
        <div style={{ fontSize: 48 }}>🌙</div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginTop: 8 }}>Night Crew Challenge</div>
        <div style={{ color: "#bfdbfe", fontSize: 14, marginTop: 4 }}>Stock. Earn. Win. Together.</div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 16px", display: "inline-block", color: "#fff", fontSize: 14, fontWeight: 600 }}>{totalPoints} total team pts</div>
      </div>

      {announcement && <AnnouncementBox message={announcement} />}

      {activeBonuses.length > 0 && (
        <div style={S.bonusAlert} onClick={() => setScreen("bonuses_tab_bonuses")}>
          <span style={{ fontSize: 32 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{activeBonuses.length} Bonus Challenge{activeBonuses.length > 1 ? "s" : ""} Active!</div>
            <div style={{ color: "#fca5a5", fontSize: 12 }}>First to complete wins — tap to see</div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: 18 }}>→</span>
        </div>
      )}
      {activeQuestions.length > 0 && (
        <div style={{ ...S.bonusAlert, background: "linear-gradient(135deg,#1e3a5f,#4c1d95)" }} onClick={() => setScreen("bonuses_tab_questions")}>
          <span style={{ fontSize: 32 }}>❓</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{activeQuestions.length} Question{activeQuestions.length > 1 ? "s" : ""} Active!</div>
            <div style={{ color: "#c4b5fd", fontSize: 12 }}>Answer to earn bonus points — tap to see</div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: 18 }}>→</span>
        </div>
      )}

      <div style={S.quickGrid}>
        {[
          { label: "Join Team", icon: "👋", bg: "linear-gradient(135deg,#1e40af,#3b82f6)", to: "join" },
          { label: "Submit Proof", icon: "📸", bg: "linear-gradient(135deg,#7c3aed,#a855f7)", to: "submit" },
          { label: "Prizes", icon: "🎁", bg: "linear-gradient(135deg,#b45309,#f59e0b)", to: "prizes" },
          { label: "Expectations", icon: "👁", bg: "linear-gradient(135deg,#065f46,#10b981)", to: "expectations" },
        ].map(c => (
          <button key={c.to} style={{ ...S.quickCard, background: c.bg }} onClick={() => setScreen(c.to)}>
            <span style={{ fontSize: 32 }}>{c.icon}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{c.label}</span>
          </button>
        ))}
      </div>

      {allMembers.length > 0 && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20 }}>
          <div style={S.sectionTitle}>🏆 Team Standings</div>
          {allMembers.map((m, i) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < allMembers.length - 1 ? "1px solid #1e293b" : "none" }}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{i < 3 && m.points > 0 ? medals[i] : <span style={{ color: "#475569", fontSize: 12 }}>#{i+1}</span>}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                  <span style={{ color: m.points > 0 ? "#60a5fa" : "#475569", fontWeight: 700, fontSize: 13, marginLeft: 8, flexShrink: 0 }}>{m.points} pts</span>
                </div>
                <div style={{ height: 5, background: "#334155", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: i === 0 && m.points > 0 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#3b82f6,#7c3aed)", borderRadius: 3, width: `${(m.points / topPoints) * 100}%`, transition: "width 0.6s ease" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementBox({ message }) {
  return (
    <div style={S.announcementOuter}>
      <div style={S.announcementCornerTL}>★</div>
      <div style={S.announcementCornerTR}>★</div>
      <div style={S.announcementInner}>
        <div style={S.announcementHeader}>
          <span style={{ fontSize: 22 }}>📣</span>
          <span style={S.announcementHeaderText}>ANNOUNCEMENT</span>
          <span style={{ fontSize: 22 }}>📣</span>
        </div>
        <div style={S.announcementDivider} />
        <div style={S.announcementBody}>{message}</div>
      </div>
      <div style={S.announcementCornerBL}>★</div>
      <div style={S.announcementCornerBR}>★</div>
    </div>
  );
}

function ExpectationsScreen({ expectations }) {
  const [expanded, setExpanded] = useState({});
  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#065f46,#10b981)", borderRadius: 20, padding: "24px 20px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>👁 Expectations</div>
        <div style={{ color: "#d1fae5", fontSize: 13, marginTop: 4 }}>Standards & examples from your team lead</div>
      </div>
      {expectations.length === 0 && <div style={S.emptyMsg}>No expectations posted yet.<br />Check back soon! 👀</div>}
      {expectations.map(e => {
        const photos = Array.isArray(e.imgs) && e.imgs.length > 0 ? e.imgs : (e.img ? [{ img: e.img, label: "" }] : []);
        const isOpen = expanded[e.id];
        return (
          <div key={e.id} style={{ background: "#1e293b", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
            {photos.length === 1 && <img src={photos[0].img} alt={e.title} style={{ width: "100%", maxHeight: 260, objectFit: "cover" }} />}
            {photos.length > 1 && (
              <div>
                <img src={photos[0].img} alt={photos[0].label || e.title} style={{ width: "100%", maxHeight: 240, objectFit: "cover" }} />
                {photos[0].label && <div style={{ background: "#0f172a", color: "#94a3b8", fontSize: 12, padding: "6px 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{photos[0].label}</div>}
                <button style={{ width: "100%", background: "#0f172a", border: "none", borderTop: "1px solid #334155", color: "#60a5fa", fontSize: 13, padding: "10px 0", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => setExpanded(prev => ({ ...prev, [e.id]: !prev[e.id] }))}>
                  {isOpen ? "▲ Hide" : `▼ Show all ${photos.length} photos`}
                </button>
                {isOpen && photos.slice(1).map((p, i) => (
                  <div key={i}>
                    <img src={p.img} alt={p.label || `photo ${i + 2}`} style={{ width: "100%", maxHeight: 240, objectFit: "cover" }} />
                    {p.label && <div style={{ background: "#0f172a", color: "#94a3b8", fontSize: 12, padding: "6px 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.label}</div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: 16 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{e.title}</div>
              {e.description && <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{e.description}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BonusesScreen({ bonuses, activeBonuses, questions, currentUser, questionAnswers, loadAll, setScreen, setPendingBonusId, initialTab = "bonuses" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const expired = bonuses.filter(b => b.claimed_by || new Date(b.end_time) <= new Date());
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={{ ...S.tabBtn, ...(activeTab === "bonuses" ? S.tabBtnActive : {}) }} onClick={() => setActiveTab("bonuses")}>🔥 Bonuses</button>
        <button style={{ ...S.tabBtn, ...(activeTab === "questions" ? S.tabBtnActive : {}) }} onClick={() => setActiveTab("questions")}>❓ Questions</button>
      </div>
      {activeTab === "bonuses" && (
        <>
          <div style={{ ...S.rulesHero, background: "linear-gradient(135deg,#7f1d1d,#dc2626)", marginBottom: 16 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>🔥 Bonus Challenges</div>
            <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 4 }}>First to complete wins!</div>
          </div>
          {activeBonuses.length === 0 && <div style={S.emptyMsg}>No active bonuses right now. 👀</div>}
          {activeBonuses.map(b => {
            const tl = getTimeLeft(b.end_time);
            const urgent = tl && !tl.includes("h") && !tl.includes("m ");
            return (
              <div key={b.id} onClick={() => { if (setPendingBonusId) setPendingBonusId(b.id); setScreen("submit"); }} style={{ ...S.bonusCard, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 36 }}>{b.icon || "⭐"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>{b.label}</div>
                    {b.description && <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 3 }}>{b.description}</div>}
                  </div>
                  <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 26, textAlign: "right", lineHeight: 1.1 }}>+{b.points}<br /><span style={{ fontSize: 11, fontWeight: 400, color: "#fca5a5" }}>pts</span></div>
                </div>
                {b.photo && <img src={b.photo} alt="bonus reference" onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, marginTop: 10 }} />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ background: urgent ? "#dc2626" : "#b45309", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>⏱ {tl}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>🏁 First to complete wins!</span>
                </div>
              </div>
            );
          })}
          {expired.length > 0 && (
            <>
              <div style={{ ...S.sectionTitle, marginTop: 24 }}>Past Bonuses</div>
              {expired.map(b => (
                <div key={b.id} style={{ ...S.bonusCard, opacity: 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{b.icon || "⭐"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{b.label}</div>
                      {b.claimed_by ? <div style={{ color: "#4ade80", fontSize: 13 }}>🏆 Claimed by {b.claimed_by}</div> : <div style={{ color: "#f87171", fontSize: 13 }}>⏰ Expired</div>}
                    </div>
                    <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 20 }}>+{b.points}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {activeTab === "questions" && (
        <>
          <div style={{ ...S.rulesHero, background: "linear-gradient(135deg,#1e3a5f,#4c1d95)", marginBottom: 16 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>❓ Daily Questions</div>
            <div style={{ color: "#c4b5fd", fontSize: 13, marginTop: 4 }}>Answer to earn bonus points!</div>
          </div>
          {questions.length === 0 && <div style={S.emptyMsg}>No questions right now. Check back later! 📚</div>}
          {!currentUser && questions.length > 0 && (
            <div style={S.gateBox}>
              <div style={{ fontSize: 40 }}>🔒</div>
              <p style={{ color: "#94a3b8", fontSize: 15, textAlign: "center" }}>Join the team to answer questions!</p>
              <button style={S.btnPrimary} onClick={() => setScreen("join")}>Join Now</button>
            </div>
          )}
          {currentUser && questions.map(q => (
            <QuestionCard key={q.id} q={q} currentUser={currentUser} questionAnswers={questionAnswers} loadAll={loadAll} />
          ))}
        </>
      )}
    </div>
  );
}

function QuestionCard({ q, currentUser, questionAnswers, loadAll }) {
  const today = todayStr();
  const myAnswer = questionAnswers.find(a => a.question_id === q.id && a.member === currentUser && a.answered_at === today);
  const [selected, setSelected] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const answer = q.type === "multiple_choice" ? selected : shortAnswer;
    if (!answer) return;
    setSaving(true);
    let status = "pending", correct = false;
    if (q.type === "multiple_choice") {
      correct = answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      status = correct ? "approved" : "rejected";
      setResult(correct);
    }
    await sbInsert("question_answers", { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), question_id: q.id, member: currentUser, answer, status, points: correct || q.type === "short_answer" ? q.points : 0, answered_at: today });
    await loadAll();
    setSubmitted(true); setSaving(false);
  };

  if (myAnswer || submitted) {
    const ans = myAnswer || { status: q.type === "multiple_choice" ? (result ? "approved" : "rejected") : "pending", answer: selected || shortAnswer };
    return (
      <div style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{q.question}</div>
        <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>Your answer: <span style={{ color: "#e2e8f0" }}>{ans.answer}</span></div>
        {q.type === "multiple_choice" && (
          <div style={{ padding: "8px 14px", borderRadius: 10, background: ans.status === "approved" ? "#065f46" : "#7f1d1d", color: ans.status === "approved" ? "#d1fae5" : "#fecaca", fontWeight: 700, fontSize: 14, display: "inline-block" }}>
            {ans.status === "approved" ? `✅ Correct! +${q.points} pts` : `❌ Incorrect. Correct: ${q.correct_answer}`}
          </div>
        )}
        {q.type === "short_answer" && (
          <div style={{ padding: "8px 14px", borderRadius: 10, background: ans.status === "approved" ? "#065f46" : ans.status === "rejected" ? "#7f1d1d" : "#1e3a5f", color: ans.status === "approved" ? "#d1fae5" : ans.status === "rejected" ? "#fecaca" : "#bfdbfe", fontWeight: 700, fontSize: 14, display: "inline-block" }}>
            {ans.status === "approved" ? `✅ Approved! +${q.points} pts` : ans.status === "rejected" ? "❌ Not approved" : "⏳ Pending review"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #334155" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, flex: 1 }}>{q.question}</div>
        <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, marginLeft: 8, whiteSpace: "nowrap" }}>+{q.points} pts</span>
      </div>
      {q.type === "multiple_choice" && q.options && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, i) => (
            <button key={i} style={{ background: selected === opt ? "#1d4ed8" : "#0f172a", border: `2px solid ${selected === opt ? "#3b82f6" : "#334155"}`, borderRadius: 10, padding: "10px 14px", color: selected === opt ? "#fff" : "#e2e8f0", fontSize: 14, textAlign: "left", cursor: "pointer" }} onClick={() => setSelected(opt)}>{opt}</button>
          ))}
        </div>
      )}
      {q.type === "short_answer" && <input style={S.input} placeholder="Type your answer..." value={shortAnswer} onChange={e => setShortAnswer(e.target.value)} />}
      <button style={{ ...S.btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving || (!selected && !shortAnswer)}>{saving ? "Submitting..." : "Submit Answer"}</button>
    </div>
  );
}

function JoinScreen({ members, setCurrentUser, setScreen, loadAll }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleJoin = async () => {
    if (!name.trim()) { setError("Enter your name."); return; }
    if (code.trim().toUpperCase() !== JOIN_CODE) { setError("Wrong team code. Ask your team lead!"); return; }
    setSaving(true);
    if (!members.includes(name.trim())) { await sbInsert("members", { name: name.trim() }); await loadAll(); }
    localStorage.setItem("sc_user", name.trim());
    setCurrentUser(name.trim()); setSuccess(true); setSaving(false);
  };

  if (success) return (
    <div style={S.gateBox}>
      <div style={{ fontSize: 60 }}>🎉</div>
      <p style={{ color: "#94a3b8", fontSize: 16, textAlign: "center" }}>You're on the team, {name}!</p>
      <button style={S.btnPrimary} onClick={() => setScreen("submit")}>Start Earning Points</button>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={S.formCard}>
        <div style={S.formTitle}>Join the Night Crew</div>
        <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Get the team code from your team lead</div>
        <label style={S.label}>Your Name</label>
        <input style={S.input} placeholder="First name (or nickname)" value={name} onChange={e => { setName(e.target.value); setError(""); }} />
        <label style={S.label}>Team Code</label>
        <input style={S.input} placeholder="Enter team code" value={code} onChange={e => { setCode(e.target.value); setError(""); }} />
        {error && <div style={S.errorMsg}>{error}</div>}
        <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleJoin} disabled={saving}>{saving ? "Joining..." : "Join Team 🚀"}</button>
      </div>
      <div style={S.hintBox}><strong>Team Code:</strong> <code style={S.codeChip}>{JOIN_CODE}</code></div>
    </div>
  );
}

function SubmissionCard({ s, statusStyle }) {
  const [lightbox, setLightbox] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState(null);
  const [photosLoading, setPhotosLoading] = useState(false);

  const loadPhotos = async () => {
    if (photos !== null || photosLoading) return;
    setPhotosLoading(true);
    try {
      const res = await sbGet("submissions", `select=before_img,after_img&id=eq.${s.id}`);
      setPhotos(Array.isArray(res) && res[0] ? res[0] : {});
    } catch { setPhotos({}); }
    setPhotosLoading(false);
  };

  return (
    <div style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, flex: 1 }}>{s.challenge_label}</span>
        <span style={{ borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8, ...statusStyle(s.status) }}>{s.status}</span>
      </div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{s.date}{s.points > 0 ? ` · +${s.points} pts` : " · pts TBD"}</div>
      {s.description && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, fontStyle: "italic" }}>"{s.description}"</div>}
      {s.status === "rejected" && s.reject_reason && (
        <div style={{ background: "#450a0a", borderRadius: 8, padding: "8px 12px", marginTop: 8, color: "#fca5a5", fontSize: 13 }}>
          ❌ Reason: {s.reject_reason}
        </div>
      )}
      <button onClick={() => { setExpanded(!expanded); if (!expanded) loadPhotos(); }}
        style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#60a5fa", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer", marginTop: 12 }}>
        {expanded ? "▲ Hide Photos" : "▼ View Photos"}
      </button>
      {expanded && (
        <>
          {photosLoading && <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "12px 0" }}>⏳ Loading...</div>}
          {photos && (
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              {photos.before_img && <img src={photos.before_img} alt="before" onClick={() => setLightbox(photos.before_img)} style={{ width: "calc(50% - 5px)", height: 90, objectFit: "cover", borderRadius: 8, cursor: "zoom-in" }} />}
              {photos.after_img && <img src={photos.after_img} alt="after" onClick={() => setLightbox(photos.after_img)} style={{ width: "calc(50% - 5px)", height: 90, objectFit: "cover", borderRadius: 8, cursor: "zoom-in" }} />}
            </div>
          )}
          {photos && !photos.before_img && !photos.after_img && <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "8px 0" }}>📷 Photos expired or unavailable</div>}
          {photos && (photos.before_img || photos.after_img) && <div style={{ color: "#475569", fontSize: 11, textAlign: "center", marginTop: 6 }}>Tap to view full size</div>}
        </>
      )}
    </div>
  );
}

function RulesScreen() {
  const categories = [...new Set(CHALLENGES.map(c => c.category))];
  return (
    <div style={{ padding: 16 }}>
      <div style={S.rulesHero}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>How to Earn Points</div>
        <div style={{ color: "#bfdbfe", fontSize: 13, marginTop: 4 }}>Complete tasks, snap proof, submit & get approved!</div>
      </div>
      {categories.map(cat => (
        <div key={cat} style={{ background: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{cat}</div>
          {CHALLENGES.filter(c => c.category === cat).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #0f172a" }}>
              <span style={{ fontSize: 22, width: 32, textAlign: "center" }}>{c.icon}</span>
              <span style={{ flex: 1, color: "#e2e8f0", fontSize: 14 }}>{c.label}</span>
              <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>+{c.points} pt{c.points > 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 20 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📌 How It Works</div>
        <ol style={{ color: "#94a3b8", fontSize: 14, lineHeight: 2, paddingLeft: 20, margin: 0 }}>
          <li>Join the team with your code</li>
          <li>Complete a task on the floor</li>
          <li>Take or upload a before & after photo</li>
          <li>Submit in the app for approval</li>
          <li>Team lead approves → points added!</li>
          <li>Answer daily questions for bonus points</li>
          <li>Redeem individually or pool with the team</li>
        </ol>
      </div>
    </div>
  );
}

function SubmitScreen({ currentUser, submissions, activeBonuses, loadAll, initialBonusId }) {
  const [mode, setMode] = useState("standard"); // "standard" | "above_beyond"
  const [challenge, setChallenge] = useState("");
  const [bonusId, setBonusId] = useState(initialBonusId || "");
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [note, setNote] = useState("");
  const [abDescription, setAbDescription] = useState("");
  const [abSuggestedPts, setAbSuggestedPts] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const beforeRef = useRef();
  const afterRef = useRef();
  const bothRef = useRef();

  // Pick two photos at once from library — first selected = before, second = after
  const handleBothImgs = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setError("");
    try {
      if (files.length >= 2) {
        const [b, a] = await Promise.all([toBase64(files[0]), toBase64(files[1])]);
        setBeforeImg(b); setAfterImg(a);
      } else {
        const b = await toBase64(files[0]);
        setBeforeImg(b);
        setError("Only one photo selected — please also pick your After photo.");
      }
    } catch (err) {
      setError(err.message || "Failed to process photos.");
    }
    e.target.value = "";
  };

  const handleImg = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await toBase64(file);
      type === "before" ? setBeforeImg(b64) : setAfterImg(b64);
    } catch (err) {
      setError(err.message || "Failed to process photo. Please try a different image.");
    }
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!beforeImg || !afterImg) { setError("Upload both before & after photos."); return; }
    let label, points, subBonusId = null, submissionType = "standard", desc = null, suggestedPts = null;

    if (mode === "above_beyond") {
      if (!abDescription.trim()) { setError("Add a description of what you did."); return; }
      label = "⭐ Above & Beyond";
      points = 0;
      submissionType = "above_beyond";
      desc = abDescription;
      suggestedPts = abSuggestedPts ? parseInt(abSuggestedPts) : null;
    } else {
      if (!challenge && !bonusId) { setError("Select a task or bonus."); return; }
      if (bonusId) {
        const bonus = activeBonuses.find(b => String(b.id) === String(bonusId));
        if (!bonus) { setError("That bonus is no longer available."); return; }
        label = "🔥 BONUS: " + bonus.label; points = bonus.points; subBonusId = bonus.id;
      } else {
        const ch = CHALLENGES.find(c => c.id === parseInt(challenge));
        if (!ch) { setError("Invalid task selected. Please choose again."); setSaving(false); return; }
        label = ch.label; points = ch.points;
      }
    }

    setSaving(true);
    setError("");
    try {
      const result = await sbInsert("submissions", { member: currentUser, challenge_label: label, points, bonus_id: subBonusId, before_img: beforeImg, after_img: afterImg, note, status: "pending", date: new Date().toLocaleString(), submission_type: submissionType, description: desc, suggested_points: suggestedPts });
      // sbInsert returns an array on success, or an object with an error field on failure
      if (result && result.error) {
        setError("Submission failed: " + (result.error.message || "Unknown error. Try reducing photo size."));
        setSaving(false);
        return;
      }
      await loadAll();
      setSubmitted(true); setSaving(false);
      setChallenge(""); setBonusId(""); setBeforeImg(null); setAfterImg(null); setNote(""); setAbDescription("");
    } catch (err) {
      setError("Submission failed. Please check your connection and try again.");
      setSaving(false);
    }
  };

  const mySubmissions = submissions.filter(s => s.member === currentUser);
  const statusStyle = s => ({ pending: { background: "#fef3c7", color: "#92400e" }, approved: { background: "#d1fae5", color: "#065f46" }, rejected: { background: "#fee2e2", color: "#991b1b" } })[s] || { background: "#1e293b", color: "#94a3b8" };

  return (
    <div style={{ padding: 16 }}>
      {submitted && (
        <div style={{ background: "#065f46", color: "#d1fae5", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
          ✅ Submitted! Waiting for approval.
          <button style={{ background: "none", border: "none", color: "#d1fae5", fontSize: 20, cursor: "pointer" }} onClick={() => setSubmitted(false)}>×</button>
        </div>
      )}
      <div style={S.formCard}>
        <div style={S.formTitle}>New Submission</div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 4 }}>
          <button style={{ flex: 1, background: mode === "standard" ? "#1d4ed8" : "#0f172a", border: `2px solid ${mode === "standard" ? "#3b82f6" : "#334155"}`, color: mode === "standard" ? "#fff" : "#94a3b8", borderRadius: 10, padding: "10px 0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setMode("standard"); setError(""); }}>📋 Standard Task</button>
          <button style={{ flex: 1, background: mode === "above_beyond" ? "#7c3aed" : "#0f172a", border: `2px solid ${mode === "above_beyond" ? "#a855f7" : "#334155"}`, color: mode === "above_beyond" ? "#fff" : "#94a3b8", borderRadius: 10, padding: "10px 0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setMode("above_beyond"); setChallenge(""); setBonusId(""); setError(""); }}>⭐ Above & Beyond</button>
        </div>

        {mode === "above_beyond" && (
          <div style={{ background: "linear-gradient(135deg,#2e1065,#4c1d95)", borderRadius: 12, padding: "12px 14px", marginBottom: 4 }}>
            <div style={{ color: "#e9d5ff", fontSize: 13, lineHeight: 1.5 }}>Did something that's not on the list? Submit it here! Describe what you did and why it deserves points. Your team lead will review and decide.</div>
          </div>
        )}

        {mode === "standard" && (
          <>
            {activeBonuses.length > 0 && (
              <>
                <label style={S.label}>🔥 Active Bonus (optional)</label>
                <select style={{ ...S.input, borderColor: bonusId ? "#f59e0b" : "#334155" }} value={bonusId} onChange={e => { setBonusId(e.target.value); setChallenge(""); setError(""); }}>
                  <option value="">— No bonus —</option>
                  {activeBonuses.map(b => <option key={b.id} value={b.id}>{b.icon || "⭐"} {b.label} (+{b.points} pts)</option>)}
                </select>
              </>
            )}
            {!bonusId && (
              <>
                <label style={S.label}>Task Completed</label>
                <select style={S.input} value={challenge} onChange={e => { setChallenge(e.target.value); setError(""); }}>
                  <option value="">— Choose a task —</option>
                  {CHALLENGES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label} (+{c.points} pt{c.points > 1 ? "s" : ""})</option>)}
                </select>
              </>
            )}
          </>
        )}

        {mode === "above_beyond" && (
          <>
            <label style={S.label}>What Did You Do?</label>
            <textarea style={{ ...S.input, minHeight: 90, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
              placeholder="Describe what you did and why it should count for points..." value={abDescription} onChange={e => { setAbDescription(e.target.value); setError(""); }} />
            <div style={{ background: "rgba(124,58,237,0.15)", border: "1px solid #7c3aed", borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
              <div style={{ color: "#c4b5fd", fontSize: 13 }}>💡 Your Team Lead will review and assign points based on what you submit.</div>
            </div>
          </>
        )}

        <label style={S.label}>Photos (Before & After)</label>
        <div style={{ display: "flex", gap: 12 }}>
          {["before", "after"].map(type => (
            <div key={type} style={{ flex: 1 }}>
              <div style={S.photoBox} onClick={() => (type === "before" ? beforeRef : afterRef).current.click()}>
                {(type === "before" ? beforeImg : afterImg)
                  ? <img src={type === "before" ? beforeImg : afterImg} alt={type} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <><div style={{ fontSize: 28 }}>📷</div><div style={{ color: "#475569", fontSize: 11, fontWeight: 700, marginTop: 4 }}>{type.toUpperCase()}</div></>}
                <input ref={type === "before" ? beforeRef : afterRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImg(e, type)} />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <button style={S.photoOptionBtn} onClick={() => { const inp = (type === "before" ? beforeRef : afterRef); inp.current.removeAttribute("capture"); inp.current.click(); }}>📁 Gallery</button>
                <button style={S.photoOptionBtn} onClick={() => { const inp = (type === "before" ? beforeRef : afterRef); inp.current.setAttribute("capture", "environment"); inp.current.click(); }}>📷 Camera</button>
              </div>
            </div>
          ))}
        </div>
        <button style={{ width: "100%", background: "#0f172a", border: "2px dashed #3b82f6", color: "#60a5fa", borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer", fontWeight: 600, marginTop: 8 }}
          onClick={() => bothRef.current.click()}>📁 Pick Both from Library at Once</button>
        <input ref={bothRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleBothImgs} />
        <label style={S.label}>Note (optional)</label>
        <input style={S.input} placeholder="Aisle #, location, etc." value={note} onChange={e => setNote(e.target.value)} />
        {error && <div style={S.errorMsg}>{error}</div>}
        <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, ...(mode === "above_beyond" ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)" } : {}) }} onClick={handleSubmit} disabled={saving}>
          {saving ? "Submitting..." : mode === "above_beyond" ? "Submit Above & Beyond ⭐" : "Submit for Approval 🚀"}
        </button>
      </div>
      {mySubmissions.length > 0 && (
        <div>
          <div style={S.sectionTitle}>My Submissions</div>
          {mySubmissions.map(s => (
            <SubmissionCard key={s.id} s={s} statusStyle={statusStyle} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardScreen({ leaderboard, totalPoints, members }) {
  const medals = ["🥇", "🥈", "🥉"];
  const allMembers = [...leaderboard];
  const lbNames = leaderboard.map(m => m.name);
  members.forEach(m => { if (!lbNames.includes(m)) allMembers.push({ name: m, points: 0, earned: 0 }); });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#78350f,#b45309)", borderRadius: 20, padding: "24px 20px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>🏆 Leaderboard</div>
        <div style={{ color: "#fde68a", fontSize: 14, marginTop: 4 }}>{totalPoints} Team Points Available</div>
      </div>
      {allMembers.length === 0 && <div style={S.emptyMsg}>No members yet!</div>}
      {allMembers.map((m, i) => (
        <div key={m.name} style={{ ...S.lbRow, ...(i === 0 && m.points > 0 ? { background: "linear-gradient(135deg,#78350f,#92400e)", border: "1px solid #b45309" } : {}) }}>
          <span style={{ fontSize: 26, width: 36, textAlign: "center" }}>{i < 3 && m.points > 0 ? medals[i] : `#${i + 1}`}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{m.name}</div>
            <div style={{ height: 6, background: "#334155", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#3b82f6,#7c3aed)", borderRadius: 3, width: `${allMembers[0]?.points > 0 ? (m.points / allMembers[0].points) * 100 : 0}%`, transition: "width 0.5s ease" }} />
            </div>
          </div>
          <span style={{ color: m.points > 0 ? "#60a5fa" : "#475569", fontWeight: 800, fontSize: 22, textAlign: "right", lineHeight: 1.1 }}>{m.points}<br /><span style={{ color: "#475569", fontSize: 11, fontWeight: 400 }}>pts</span></span>
        </div>
      ))}
    </div>
  );
}

function PrizesScreen({ prizes, currentUser, getPoints, loadAll, leaderboard, pledges }) {
  const individual = prizes.filter(p => p.individual && p.active);
  const team = prizes.filter(p => !p.individual && p.active);
  const [requesting, setRequesting] = useState(null); // individual prize being requested
  const [reqNote, setReqNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("individual");
  const [pledgingPrize, setPledgingPrize] = useState(null); // team prize being pledged to
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledgeError, setPledgeError] = useState("");

  const myPoints = currentUser && getPoints ? getPoints(currentUser) : 0;

  // Coerce IDs to strings for safe comparison — Supabase can return numbers or strings
  const prizePledges = (prizeId) => (pledges || []).filter(pl => String(pl.prize_id) === String(prizeId));
  const pledgeTotal = (prizeId) => prizePledges(prizeId).reduce((s, pl) => s + (Number(pl.amount) || 0), 0);
  const myPledge = (prizeId) => (pledges || []).find(pl => String(pl.prize_id) === String(prizeId) && pl.member === currentUser);

  // Points already committed to pledges (can't double-spend)
  const myTotalPledged = (pledges || [])
    .filter(pl => pl.member === currentUser)
    .reduce((s, pl) => s + (Number(pl.amount) || 0), 0);
  const myAvailablePoints = Math.max(0, myPoints - myTotalPledged);

  const handleIndividualRequest = async () => {
    if (!requesting || !currentUser) return;
    setSubmitting(true);
    try {
      await sbInsert("redemption_requests", {
        id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
        member: currentUser,
        prize_label: requesting.mystery ? "Mystery Prize" : requesting.label,
        prize_cost: requesting.cost,
        note: reqNote.trim() || null,
        status: "pending",
        is_team_prize: false,
        requested_at: new Date().toLocaleString()
      });
      await loadAll();
      setSuccess(`✅ Request sent for "${requesting.mystery ? "Mystery Prize" : requesting.label}"! Your Team Lead will review it.`);
      setRequesting(null); setReqNote("");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setSuccess("❌ Request failed — please try again.");
    }
    setSubmitting(false);
  };

  const handlePledge = async () => {
    if (!pledgingPrize) return;
    const amt = parseInt(pledgeAmount);
    if (!amt || amt <= 0) { setPledgeError("Enter a valid amount."); return; }
    const existing = myPledge(pledgingPrize.id);
    const currentPledged = existing ? (Number(existing.amount) || 0) : 0;
    // Available = myPoints minus all pledges EXCEPT what I already have on this prize
    const availableForThis = myPoints - myTotalPledged + currentPledged;
    if (amt > availableForThis) {
      setPledgeError(`You only have ${availableForThis} pts available for this pledge.`);
      return;
    }
    if (amt > myPoints) { setPledgeError(`You only have ${myPoints} pts total.`); return; }
    setSubmitting(true);
    setPledgeError("");
    try {
      if (existing) {
        await sbUpdate("team_pledges", { id: existing.id }, { amount: amt });
      } else {
        await sbInsert("team_pledges", {
          id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
          prize_id: pledgingPrize.id,
          prize_label: pledgingPrize.mystery ? "Mystery Prize" : pledgingPrize.label,
          member: currentUser,
          amount: amt,
          pledged_at: new Date().toLocaleString()
        });
      }
      await loadAll();
      const newTotal = pledgeTotal(pledgingPrize.id) - currentPledged + amt;
      const goal = pledgingPrize.cost;
      setSuccess(newTotal >= goal
        ? `🎉 Goal reached! The team has pledged ${newTotal} / ${goal} pts. Ask your Team Lead to claim it!`
        : `✅ Pledged ${amt} pts toward ${pledgingPrize.mystery ? "Mystery Prize" : pledgingPrize.label}!`
      );
      setPledgingPrize(null); setPledgeAmount("");
      setTimeout(() => setSuccess(""), 6000);
    } catch (err) {
      setPledgeError("Save failed — check your connection and try again.");
    }
    setSubmitting(false);
  };

  const handleRemovePledge = async (prizeId) => {
    const existing = myPledge(prizeId);
    if (!existing) return;
    try {
      await sbDelete("team_pledges", { id: existing.id });
      await loadAll();
      setSuccess("Pledge removed.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setSuccess("❌ Remove failed — try again.");
    }
  };

  // Catch any render error and show a friendly message instead of white screen
  try {
  return (
    <div style={{ padding: 16 }}>

      {/* ── Individual prize request sheet ── */}
      {requesting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#1e293b", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", boxSizing: "border-box" }}>
            <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>🎁 Request Redemption</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>{requesting.mystery ? "Mystery Prize" : requesting.label} · {requesting.cost} pts</div>
            {requesting.label && requesting.label.toLowerCase().includes("break") && (
              <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⏰ Extra Break Reminder</div>
                <div style={{ color: "#fde68a", fontSize: 13 }}>The specific day must be approved by your Team Lead before use.</div>
              </div>
            )}
            <label style={S.label}>Note (optional)</label>
            <input style={S.input} placeholder={requesting.label && requesting.label.toLowerCase().includes("break") ? "e.g. I'd like to use this on Friday 4/11" : "Any details for your Team Lead..."} value={reqNote} onChange={e => setReqNote(e.target.value)} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={{ flex: 2, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }} onClick={handleIndividualRequest} disabled={submitting}>{submitting ? "Sending..." : "Send Request 🚀"}</button>
              <button style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 14, cursor: "pointer" }} onClick={() => { setRequesting(null); setReqNote(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Team pledge sheet ── */}
      {pledgingPrize && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#1e293b", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", boxSizing: "border-box" }}>
            <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 2 }}>💰 Pledge Points</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
              {pledgingPrize.mystery ? "Mystery Prize" : pledgingPrize.label} · Goal: {pledgingPrize.cost} pts
            </div>
            <div style={{ background: "#0f172a", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13 }}>
                <span>Your total points</span><span style={{ color: "#f1f5f9", fontWeight: 700 }}>{myPoints}</span>
              </div>
              {myTotalPledged > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                  <span>Already pledged elsewhere</span><span style={{ color: "#f87171", fontWeight: 700 }}>−{myTotalPledged - (myPledge(pledgingPrize.id)?.amount || 0)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13, marginTop: 4, borderTop: "1px solid #1e293b", paddingTop: 4 }}>
                <span>Available to pledge</span><span style={{ color: "#4ade80", fontWeight: 700 }}>{myAvailablePoints + (myPledge(pledgingPrize.id)?.amount || 0)}</span>
              </div>
            </div>
            {myPledge(pledgingPrize.id) && (
              <div style={{ color: "#60a5fa", fontSize: 13, marginBottom: 10 }}>
                You already pledged <strong>{myPledge(pledgingPrize.id).amount} pts</strong>. Enter a new amount to update it.
              </div>
            )}
            <label style={S.label}>How many points to pledge?</label>
            <input style={S.input} type="number" placeholder="e.g. 10" value={pledgeAmount} onChange={e => { setPledgeAmount(e.target.value); setPledgeError(""); }} />
            {pledgeError && <div style={S.errorMsg}>{pledgeError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={{ flex: 2, background: "linear-gradient(135deg,#1e40af,#3b82f6)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }} onClick={handlePledge} disabled={submitting}>{submitting ? "Saving..." : myPledge(pledgingPrize.id) ? "Update Pledge 💰" : "Pledge Points 💰"}</button>
              <button style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 14, cursor: "pointer" }} onClick={() => { setPledgingPrize(null); setPledgeAmount(""); setPledgeError(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)", borderRadius: 20, padding: "24px 20px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>🎁 Prize Shop</div>
        <div style={{ color: "#ddd6fe", fontSize: 13, marginTop: 4 }}>Spend your points or pool with the team!</div>
        {currentUser && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 14px", color: "#fff", fontSize: 13, fontWeight: 600 }}>Your balance: {myPoints} pts</div>
            {myTotalPledged > 0 && <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 14px", color: "#c4b5fd", fontSize: 13 }}>{myTotalPledged} pledged</div>}
          </div>
        )}
      </div>

      {success && <div style={{ background: "#065f46", color: "#d1fae5", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>{success}</div>}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={{ ...S.tabBtn, ...(activeTab === "individual" ? S.tabBtnActive : {}) }} onClick={() => setActiveTab("individual")}>🙋 Individual</button>
        <button style={{ ...S.tabBtn, ...(activeTab === "team" ? S.tabBtnActive : {}) }} onClick={() => setActiveTab("team")}>👥 Team Pool</button>
      </div>

      {/* ── Individual Prizes ── */}
      {activeTab === "individual" && (
        <>
          {individual.length === 0 && <div style={S.emptyMsg}>No individual prizes yet.</div>}
          {individual.map(p => (
            <div key={p.id} style={{ background: "#1e293b", borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, flex: 1, filter: p.mystery ? "blur(5px)" : "none", userSelect: p.mystery ? "none" : "auto" }}>{p.mystery ? "Mystery Prize" : p.label}</span>
                {p.mystery && <span style={{ color: "#fbbf24", fontSize: 13, marginRight: 8 }}>🎁</span>}
                <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p.cost} pts</span>
              </div>
              {currentUser && (
                <button style={{ width: "100%", marginTop: 10, background: myPoints >= p.cost ? "linear-gradient(135deg,#065f46,#10b981)" : "#0f172a", border: myPoints >= p.cost ? "none" : "1px solid #334155", color: myPoints >= p.cost ? "#d1fae5" : "#475569", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: myPoints >= p.cost ? "pointer" : "default" }}
                  onClick={() => myPoints >= p.cost && setRequesting(p)}>
                  {myPoints >= p.cost ? "🙋 Request Redemption" : `Need ${p.cost - myPoints} more pts`}
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── Team Pool Prizes ── */}
      {activeTab === "team" && (
        <>
          <div style={{ background: "linear-gradient(135deg,#0f2027,#1e3a5f)", border: "1px solid #3b82f6", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>👥 How Team Prizes Work</div>
            <div style={{ color: "#bfdbfe", fontSize: 13, lineHeight: 1.6 }}>
              Pledge any amount of your own points toward a team prize. Your pledged points are locked toward that goal. When the goal is fully funded, the prize is ready to claim — your Team Lead will approve and the pledged points are automatically deducted.
            </div>
          </div>

          {team.length === 0 && <div style={S.emptyMsg}>No team prizes set up yet.</div>}
          {team.map(p => {
            const pp = prizePledges(p.id);
            const total = pledgeTotal(p.id);
            const cost = Number(p.cost) || 1; // guard against 0/null cost causing NaN
            const pct = Math.min(100, Math.round((total / cost) * 100));
            const goalMet = total >= cost;
            const myP = myPledge(p.id);
            return (
              <div key={p.id} style={{ background: "linear-gradient(135deg,#0f2027,#1e3a5f)", border: `1px solid ${goalMet ? "#10b981" : "#1e40af"}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                {/* Prize header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, flex: 1, filter: p.mystery ? "blur(5px)" : "none", userSelect: p.mystery ? "none" : "auto" }}>{p.mystery ? "Mystery Prize" : p.label}</span>
                  {p.mystery && <span style={{ color: "#fbbf24", marginRight: 8 }}>🎁</span>}
                  <span style={{ background: goalMet ? "#10b981" : "#1e40af", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p.cost} pts</span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>Pledges so far</span>
                    <span style={{ color: goalMet ? "#4ade80" : "#60a5fa", fontSize: 12, fontWeight: 700 }}>{total} / {cost} pts ({pct}%)</span>
                  </div>
                  <div style={{ height: 10, background: "#0f172a", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 5, background: goalMet ? "linear-gradient(90deg,#10b981,#4ade80)" : "linear-gradient(90deg,#1e40af,#3b82f6)", width: `${pct}%`, transition: "width 0.6s ease" }} />
                  </div>
                  {goalMet
                    ? <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 13, textAlign: "center", marginTop: 6 }}>🎉 Goal reached! Ask your Team Lead to claim.</div>
                    : <div style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 4 }}>Need {Math.max(0, cost - total)} more pts in pledges</div>
                  }
                </div>

                {/* Pledger breakdown */}
                {pp.length > 0 && (
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Who's pledged</div>
                    {pp.map(pl => (
                      <div key={pl.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: pl.member === currentUser ? "#60a5fa" : "#cbd5e1", fontSize: 13, fontWeight: pl.member === currentUser ? 700 : 400 }}>
                          {pl.member === currentUser ? "You" : pl.member}
                        </span>
                        <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{pl.amount} pts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pledge / update / remove buttons */}
                {currentUser && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{ flex: 1, background: "linear-gradient(135deg,#1e40af,#3b82f6)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: (myAvailablePoints > 0 || myP) ? "pointer" : "default", opacity: (myAvailablePoints > 0 || myP) ? 1 : 0.4 }}
                      onClick={() => { if (myAvailablePoints > 0 || myP) { setPledgingPrize(p); setPledgeAmount(myP ? String(myP.amount) : ""); setPledgeError(""); } }}>
                      {myP ? `✏️ Update (${myP.amount} pts)` : "💰 Pledge Points"}
                    </button>
                    {myP && (
                      <button style={{ background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                        onClick={() => handleRemovePledge(p.id)}>✕ Remove</button>
                    )}
                  </div>
                )}
                {!currentUser && <div style={{ color: "#475569", fontSize: 13, textAlign: "center", marginTop: 8 }}>Join the team to pledge points</div>}
              </div>
            );
          })}
        </>
      )}

      <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginTop: 8 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>💡 How to Redeem</div>
        <p style={{ color: "#cbd5e1", fontSize: 14, margin: 0, lineHeight: 1.7 }}>Individual prizes use your own balance. For team prizes, pledge any amount — your pledged points are locked toward that goal. When fully funded, tell your Team Lead and they'll approve the deductions. All redemptions require Team Lead approval.</p>
      </div>
    </div>
  );
  } catch (err) {
    console.error("PrizesScreen render error:", err);
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: "#f87171", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>The prizes page hit an error. Pull to refresh or tap below.</div>
        <button onClick={() => window.location.reload()} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>🔄 Reload App</button>
      </div>
    );
  }
}

function AdminRedemptionRequests({ requests, loadAll, getPoints, leaderboard, pledges }) {
  const pending = requests.filter(r => r.status === "pending");
  const reviewed = requests.filter(r => r.status !== "pending");
  const totalTeamPoints = leaderboard ? leaderboard.reduce((s, m) => s + m.points, 0) : 0;

  const handleApprove = async (r) => {
    await sbUpdate("redemption_requests", { id: r.id }, { status: "approved", reviewed_at: new Date().toLocaleString() });
    // For team prizes: auto-deduct each member's pledged amount and clear the pledges
    if (r.is_team_prize && pledges) {
      const prizePledges = pledges.filter(pl => pl.prize_label === r.prize_label);
      await Promise.all(prizePledges.map(async pl => {
        const uid = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        await sbInsert("point_redemptions", { id: uid, member: pl.member, points: pl.amount, note: `Team prize: ${r.prize_label}`, redeemed_at: new Date().toLocaleString() });
        await sbDelete("team_pledges", { id: pl.id });
      }));
    }
    await loadAll();
  };
  const handleDeny = async (r) => {
    await sbUpdate("redemption_requests", { id: r.id }, { status: "denied", reviewed_at: new Date().toLocaleString() });
    await loadAll();
  };

  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>Review prize redemption requests from your team.</div>
      {pending.length === 0 && <div style={S.emptyMsg}>No pending requests 🎉</div>}
      {pending.map(r => {
        const isTeam = r.is_team_prize;
        const pledgeTotal = isTeam ? (pledges || []).filter(pl => pl.prize_label === r.prize_label).reduce((s, pl) => s + pl.amount, 0) : 0;
        const available = isTeam ? pledgeTotal : (getPoints ? getPoints(r.member) : 0);
        const canAfford = available >= r.prize_cost;
        return (
          <div key={r.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10, border: `1px solid ${isTeam ? "#3b82f6" : "#7c3aed"}` }}>
            <div style={{ color: isTeam ? "#60a5fa" : "#a78bfa", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
              {isTeam ? "👥 TEAM PRIZE REQUEST" : "🙋 INDIVIDUAL REQUEST"}
            </div>
            <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 15 }}>{r.member} {isTeam ? "(on behalf of team)" : ""}</div>
            <div style={{ color: "#e2e8f0", fontSize: 14, marginTop: 4 }}>{r.prize_label}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{r.prize_cost} pts needed · Requested {r.requested_at}</div>

            {isTeam ? (
              <div style={{ marginTop: 8, background: canAfford ? "#065f46" : "#1e3a5f", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: canAfford ? "#4ade80" : "#60a5fa", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {canAfford ? `✅ Fully pledged! ${pledgeTotal} / ${r.prize_cost} pts — ready to approve.` : `⏳ Pledged so far: ${pledgeTotal} / ${r.prize_cost} pts`}
                </div>
                {canAfford && <div style={{ color: "#86efac", fontSize: 12, marginBottom: 6 }}>Approving will automatically deduct each member's pledge.</div>}
                {(pledges || []).filter(pl => pl.prize_label === r.prize_label).length > 0
                  ? (pledges || []).filter(pl => pl.prize_label === r.prize_label).map(pl => (
                      <div key={pl.id} style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                        <span>{pl.member}</span><span style={{ color: "#4ade80" }}>−{pl.amount} pts</span>
                      </div>
                    ))
                  : <div style={{ color: "#475569", fontSize: 12 }}>No pledges yet.</div>
                }
              </div>
            ) : (
              <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 8, background: canAfford ? "#065f46" : "#7f1d1d", display: "inline-block" }}>
                <span style={{ color: canAfford ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 700 }}>
                  {canAfford ? `✅ Has ${available} pts (can afford)` : `❌ Only has ${available} pts — cannot afford`}
                </span>
              </div>
            )}

            {r.note && <div style={{ background: "#0f172a", borderRadius: 8, padding: "8px 12px", marginTop: 8, color: "#94a3b8", fontSize: 13 }}>📝 {r.note}</div>}
            {!isTeam && r.prize_label && r.prize_label.toLowerCase().includes("break") && (
              <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>⏰ Break Request — verify the day in the note before approving</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => handleApprove(r)}>✅ Approve</button>
              <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => handleDeny(r)}>❌ Deny</button>
            </div>
          </div>
        );
      })}
      {reviewed.length > 0 && (
        <>
          <div style={{ ...S.sectionTitle, marginTop: 20 }}>Past Requests</div>
          {reviewed.map(r => (
            <div key={r.id} style={{ background: "#1e293b", borderRadius: 12, padding: "12px 16px", marginBottom: 8, opacity: 0.7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{r.is_team_prize ? "👥 " : ""}{r.member} — {r.prize_label}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{r.prize_cost} pts · {r.reviewed_at || r.requested_at}</div>
                  {r.note && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>📝 {r.note}</div>}
                </div>
                <span style={{ color: r.status === "approved" ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 13 }}>{r.status === "approved" ? "✅ Approved" : "❌ Denied"}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AdminLogin({ setIsAdmin, setScreen }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return (
    <div style={{ padding: 16 }}>
      <div style={S.formCard}>
        <div style={S.formTitle}>⚙️ Team Lead Login</div>
        <label style={S.label}>Admin Code</label>
        <input style={S.input} type="password" placeholder="Enter admin code" value={code} onChange={e => { setCode(e.target.value); setError(""); }} />
        {error && <div style={S.errorMsg}>{error}</div>}
        <button style={S.btnPrimary} onClick={() => { if (code.trim().toUpperCase() === ADMIN_CODE) { setIsAdmin(true); setScreen("admin"); } else setError("Wrong code."); }}>Login</button>
      </div>
    </div>
  );
}

function AdminScreen({ submissions, approveSubmission, rejectSubmission, deleteSubmission, leaderboard, bonuses, loadAll, refresh, prizes, announcement, members, deleteMember, questions, questionAnswers, expectations, redemptions, getPoints, getEarnedPoints, redemptionRequests, pledges }) {
  // refresh = doFetch from App — always forces a reload even if polling is mid-flight
  // loadAll = guarded version used by polling; refresh used after any save/delete action
  const r = refresh || loadAll; // fallback to loadAll if refresh not passed
  const pending = submissions.filter(s => s.status === "pending");
  const reviewed = submissions.filter(s => s.status !== "pending");
  const pendingQA = questionAnswers.filter(a => a.status === "pending");
  const [tab, setTab] = useState("pending");

  const pendingRequests = (redemptionRequests || []).filter(r => r.status === "pending");
  const tabs = [
    ["pending", `Pending${(pending.length + pendingQA.length) > 0 ? ` (${pending.length + pendingQA.length})` : ""}`],
    ["reviewed", "Reviewed"], ["bonuses", "🔥 Bonuses"], ["questions", "❓ Q's"],
    ["prizes", "🎁 Prizes"], ["announce", "📣"], ["members", "👥 Members"],
    ["cashout", "💰 Cash Out"], ["requests", `🙋 Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`],
    ["expectations", "📸 Expect"], ["board", "Standings"]
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{ label: "Pending", val: pending.length + pendingQA.length, color: "#ef4444" }, { label: "Approved", val: submissions.filter(s => s.status === "approved").length, color: "#10b981" }, { label: "Total Pts", val: leaderboard.reduce((s, m) => s + m.points, 0), color: "#60a5fa" }].map(st => (
          <div key={st.label} style={{ flex: 1, background: "#1e293b", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
            <div style={{ color: st.color, fontWeight: 800, fontSize: 28 }}>{st.val}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(([id, label]) => (
          <button key={id} style={{ ...S.tabBtn, ...(tab === id ? S.tabBtnActive : {}), fontSize: 11, padding: "8px 6px" }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "pending" && (
        <>
          {pending.length === 0 && pendingQA.length === 0 && <div style={S.emptyMsg}>No pending submissions 🎉</div>}
          {pending.map(s => <ReviewCard key={s.id} s={s} approve={approveSubmission} reject={rejectSubmission} onDelete={deleteSubmission} />)}
          {pendingQA.map(a => <QAReviewCard key={a.id} a={a} questions={questions} loadAll={r} />)}
        </>
      )}
      {tab === "reviewed" && (reviewed.length === 0 ? <div style={S.emptyMsg}>No reviewed submissions yet.</div> : reviewed.map(s => <ReviewCard key={s.id} s={s} readonly onDelete={deleteSubmission} />))}
      {tab === "bonuses" && <AdminBonuses bonuses={bonuses} loadAll={r} />}
      {tab === "questions" && <AdminQuestions questions={questions} questionAnswers={questionAnswers} loadAll={r} />}
      {tab === "prizes" && <AdminPrizes prizes={prizes} loadAll={r} />}
      {tab === "announce" && <AdminAnnouncement announcement={announcement} loadAll={r} />}
      {tab === "members" && <AdminMembers members={members} leaderboard={leaderboard} deleteMember={deleteMember} submissions={submissions} questionAnswers={questionAnswers} />}
      {tab === "cashout" && <AdminCashOut leaderboard={leaderboard} redemptions={redemptions} loadAll={r} getPoints={getPoints} getEarnedPoints={getEarnedPoints} />}
      {tab === "requests" && <AdminRedemptionRequests requests={redemptionRequests || []} loadAll={r} getPoints={getPoints} leaderboard={leaderboard} pledges={pledges || []} />}
      {tab === "expectations" && <AdminExpectations expectations={expectations} loadAll={r} />}
      {tab === "board" && leaderboard.map((m, i) => (
        <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 14, background: "#1e293b", borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>{["🥇","🥈","🥉"][i] || `#${i+1}`}</span>
          <span style={{ flex: 1, color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{m.name}</span>
          <span style={{ color: "#60a5fa", fontWeight: 800, fontSize: 18 }}>{m.points} pts</span>
        </div>
      ))}
    </div>
  );
}

function AdminCashOut({ leaderboard, redemptions, loadAll, getPoints, getEarnedPoints }) {
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const handleCashOut = async () => {
    if (!selected) { setError("Select a member."); return; }
    const pts = parseInt(amount);
    if (!pts || pts <= 0) { setError("Enter valid points."); return; }
    const available = getPoints(selected);
    if (pts > available) { setError(`${selected} only has ${available} pts available.`); return; }
    setSaving(true);
    setError("");
    try {
      const uniqueId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      const result = await sbInsert("point_redemptions", { id: uniqueId, member: selected, points: pts, note, redeemed_at: new Date().toLocaleString() });
      if (result && result.error) {
        setError("Cash out failed: " + (result.error.message || "Please try again."));
        setSaving(false);
        return;
      }
      await loadAll();
      setSuccess(`✅ Cashed out ${pts} pts from ${selected}!`);
      setSelected(""); setAmount(""); setNote(""); setError(""); setSaving(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Cash out failed. Please check your connection.");
      setSaving(false);
    }
  };

  const history = [...redemptions].slice(0, 20);

  return (
    <div>
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>💰 Cash Out Points</div>
        <div style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Remove points from a member when they redeem a prize.</div>
        {success && <div style={{ background: "#065f46", color: "#d1fae5", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 14, fontWeight: 600 }}>{success}</div>}
        <label style={S.label}>Member</label>
        <select style={S.input} value={selected} onChange={e => { setSelected(e.target.value); setError(""); }}>
          <option value="">— Select member —</option>
          {leaderboard.map(m => <option key={m.name} value={m.name}>{m.name} ({m.points} pts available)</option>)}
        </select>
        <label style={S.label}>Points to Remove</label>
        <input style={S.input} type="number" placeholder="e.g. 25" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} />
        <label style={S.label}>Note (optional)</label>
        <input style={S.input} placeholder="e.g. Redeemed extra break" value={note} onChange={e => setNote(e.target.value)} />
        {error && <div style={S.errorMsg}>{error}</div>}
        <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleCashOut} disabled={saving}>{saving ? "Processing..." : "💸 Cash Out Points"}</button>
      </div>
      {history.length > 0 && (
        <div>
          <div style={S.sectionTitle}>Recent Redemptions</div>
          {history.map(r => (
            <div key={r.id} style={{ background: "#1e293b", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{r.member}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{r.redeemed_at}{r.note ? ` · ${r.note}` : ""}</div>
              </div>
              <div style={{ color: "#f87171", fontWeight: 800, fontSize: 18 }}>-{r.points}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminExpectations({ expectations, loadAll }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", photos: [] });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef();

  const resetForm = () => { setForm({ title: "", description: "", photos: [] }); setEditId(null); };

  const openEdit = (e) => {
    const photos = Array.isArray(e.imgs) && e.imgs.length > 0 ? e.imgs : (e.img ? [{ img: e.img, label: "" }] : []);
    setForm({ title: e.title, description: e.description || "", photos });
    setEditId(e.id); setShowForm(true);
  };

  const handleImg = async (e) => {
    const files = Array.from(e.target.files);
    try {
      const b64s = await Promise.all(files.map(f => toBase64(f)));
      setForm(f => ({ ...f, photos: [...f.photos, ...b64s.map(img => ({ img, label: "" }))] }));
    } catch (err) {
      alert(err.message || "Failed to process one or more photos. Try smaller images.");
    }
    e.target.value = "";
  };

  const updateLabel = (i, label) => {
    setForm(f => { const photos = [...f.photos]; photos[i] = { ...photos[i], label }; return { ...f, photos }; });
  };

  const removePhoto = (i) => {
    setForm(f => { const photos = [...f.photos]; photos.splice(i, 1); return { ...f, photos }; });
  };

  const movePhoto = (i, dir) => {
    setForm(f => {
      const photos = [...f.photos];
      const j = i + dir;
      if (j < 0 || j >= photos.length) return f;
      [photos[i], photos[j]] = [photos[j], photos[i]];
      return { ...f, photos };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = { title: form.title, description: form.description, imgs: form.photos, img: form.photos[0]?.img || null };
    if (editId) { await sbUpdate("expectations", { id: editId }, data); }
    else { await sbInsert("expectations", { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), ...data }); }
    await loadAll(); setShowForm(false); resetForm(); setSaving(false);
  };

  return (
    <div>
      <button style={{ ...S.btnPrimary, marginBottom: 16, marginTop: 0 }} onClick={() => { resetForm(); setShowForm(true); }}>+ Add Expectation</button>
      {showForm && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{editId ? "✏️ Edit" : "📸 New Expectation"}</div>

          <label style={S.label}>Title</label>
          <input style={S.input} placeholder="e.g. End Cap Height Standard" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

          <label style={S.label}>Description</label>
          <textarea style={{ ...S.input, minHeight: 80, resize: "vertical", fontFamily: "inherit" }} placeholder="Describe what's expected..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

          <label style={S.label}>Photos ({form.photos.length} added)</label>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>Add as many photos as you need. Label each one (e.g. "Before", "After", "Side View"). First photo shows as the preview.</div>

          {form.photos.map((p, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 12, marginBottom: 10, overflow: "hidden", border: "1px solid #334155" }}>
              <img src={p.img} alt={`photo ${i+1}`} style={{ width: "100%", maxHeight: 180, objectFit: "cover" }} />
              <div style={{ padding: 10 }}>
                <input style={{ ...S.input, marginBottom: 8, fontSize: 13 }} placeholder={`Label (e.g. Before, After, Side view...)`} value={p.label} onChange={e => updateLabel(i, e.target.value)} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 0", fontSize: 12, cursor: "pointer" }} onClick={() => movePhoto(i, -1)} disabled={i === 0}>↑ Up</button>
                  <button style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 0", fontSize: 12, cursor: "pointer" }} onClick={() => movePhoto(i, 1)} disabled={i === form.photos.length - 1}>↓ Down</button>
                  <button style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "6px 0", fontSize: 12, cursor: "pointer" }} onClick={() => removePhoto(i)}>🗑 Remove</button>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <button style={{ flex: 1, background: "#0f172a", border: "2px dashed #334155", color: "#60a5fa", borderRadius: 10, padding: "12px 0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              onClick={() => { imgRef.current.removeAttribute("capture"); imgRef.current.click(); }}>📁 Add from Gallery</button>
            <button style={{ flex: 1, background: "#0f172a", border: "2px dashed #334155", color: "#60a5fa", borderRadius: 10, padding: "12px 0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              onClick={() => { imgRef.current.setAttribute("capture", "environment"); imgRef.current.click(); }}>📷 Take Photo</button>
            <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImg} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save"}</button>
            <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      {expectations.length === 0 && !showForm && <div style={S.emptyMsg}>No expectations yet. Add your first one!</div>}
      {expectations.map(e => {
        const photos = Array.isArray(e.imgs) && e.imgs.length > 0 ? e.imgs : (e.img ? [{ img: e.img, label: "" }] : []);
        return (
          <div key={e.id} style={{ background: "#1e293b", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            {photos[0] && <img src={photos[0].img} alt={e.title} style={{ width: "100%", maxHeight: 160, objectFit: "cover" }} />}
            <div style={{ padding: 14 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700 }}>{e.title}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{photos.length} photo{photos.length !== 1 ? "s" : ""}</div>
              {e.description && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{e.description}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(e)}>✏️ Edit</button>
                <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbDelete("expectations", { id: e.id }); await loadAll(); }}>🗑 Delete</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminAnnouncement({ announcement, loadAll }) {
  const [msg, setMsg] = useState(announcement);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await sbUpdate("announcements", { id: 1 }, { message: msg, updated_at: new Date().toISOString() });
    await loadAll();
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ background: "#1e293b", borderRadius: 16, padding: 20 }}>
      <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>📣 Home Announcement</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>Formatting is preserved — press Enter for new lines. Leave blank to hide.</div>
      <textarea style={{ ...S.input, minHeight: 120, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
        placeholder={"e.g. Great work tonight team! 💪\n\nRemember: safety first on those end caps."} value={msg} onChange={e => setMsg(e.target.value)} />
      <button style={{ ...S.btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
        {saved ? "✅ Saved!" : saving ? "Saving..." : "💾 Save Announcement"}
      </button>
      {msg && (
        <>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Preview</div>
          <AnnouncementBox message={msg} />
        </>
      )}
    </div>
  );
}

function AdminPrizes({ prizes, loadAll }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ label: "", cost: "", individual: true, mystery: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ label: "", cost: "", individual: true, mystery: false }); setEditId(null); setError(""); };
  const openEdit = (p) => { setForm({ label: p.label, cost: String(p.cost), individual: p.individual, mystery: p.mystery }); setEditId(p.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.label.trim()) { setError("Add a prize name."); return; }
    if (!form.cost || isNaN(form.cost) || parseInt(form.cost) <= 0) { setError("Enter valid points."); return; }
    setSaving(true); setError("");
    try {
      const data = { label: form.label, cost: parseInt(form.cost), individual: form.individual, mystery: form.mystery, active: true };
      if (editId) { await sbUpdate("prizes", { id: editId }, data); }
      else { const r = await sbInsert("prizes", { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), ...data }); if (r && r.error) { setError("Save failed — try again."); setSaving(false); return; } }
      await loadAll(); setShowForm(false); resetForm();
    } catch { setError("Save failed — check connection."); }
    setSaving(false);
  };

  return (
    <div>
      <button style={{ ...S.btnPrimary, marginBottom: 16, marginTop: 0 }} onClick={() => { resetForm(); setShowForm(true); }}>+ Add New Prize</button>
      {showForm && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{editId ? "✏️ Edit Prize" : "✨ New Prize"}</div>
          <label style={S.label}>Prize Name</label>
          <input style={S.input} placeholder="e.g. Extra 15-min Break" value={form.label} onChange={e => { setForm(f => ({ ...f, label: e.target.value })); setError(""); }} />
          <label style={S.label}>Points Required</label>
          <input style={S.input} type="number" placeholder="e.g. 25" value={form.cost} onChange={e => { setForm(f => ({ ...f, cost: e.target.value })); setError(""); }} />
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.individual} onChange={e => setForm(f => ({ ...f, individual: e.target.checked }))} />Individual
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.mystery} onChange={e => setForm(f => ({ ...f, mystery: e.target.checked }))} />🎁 Mystery (blurred)
            </label>
          </div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save"}</button>
            <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}
      {prizes.length === 0 && !showForm && <div style={S.emptyMsg}>No prizes yet.</div>}
      {prizes.map(p => (
        <div key={p.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{p.label} {p.mystery ? "🎁" : ""}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{p.individual ? "Individual" : "Team"} · {p.cost} pts</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(p)}>✏️</button>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbDelete("prizes", { id: p.id }); await loadAll(); }}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminMembers({ members, leaderboard, deleteMember, submissions, questionAnswers }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>Removing a member deletes all their data.</div>
      {members.length === 0 && <div style={S.emptyMsg}>No members yet.</div>}
      {members.map(m => {
        const lb = leaderboard.find(l => l.name === m);
        const subCount = submissions.filter(s => s.member === m).length;
        return (
          <div key={m} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{m}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{lb?.points || 0} pts · {subCount} submission{subCount !== 1 ? "s" : ""}</div>
              </div>
              {confirmDelete === m ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ background: "#7f1d1d", border: "none", color: "#fecaca", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }} onClick={() => { deleteMember(m); setConfirmDelete(null); }}>Confirm</button>
                  <button style={{ background: "#334155", border: "none", color: "#94a3b8", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </div>
              ) : (
                <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={() => setConfirmDelete(m)}>🗑 Remove</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminQuestions({ questions, questionAnswers, loadAll }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ question: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: "", active: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingAnswers = questionAnswers.filter(a => a.status === "pending");

  const resetForm = () => { setForm({ question: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: "", active: true }); setEditId(null); setError(""); };
  const openEdit = (q) => { setForm({ question: q.question, type: q.type, options: q.options || ["", "", "", ""], correctAnswer: q.correct_answer || "", points: String(q.points), active: q.active }); setEditId(q.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.question.trim()) { setError("Add a question."); return; }
    if (!form.points || isNaN(form.points) || parseInt(form.points) <= 0) { setError("Enter valid points."); return; }
    if (form.type === "multiple_choice") {
      const opts = form.options.filter(o => o.trim());
      if (opts.length < 2) { setError("Add at least 2 options."); return; }
      if (!form.correctAnswer) { setError("Select the correct answer."); return; }
    }
    setSaving(true);
    const opts = form.type === "multiple_choice" ? form.options.filter(o => o.trim()) : null;
    const data = { question: form.question, type: form.type, options: opts, correct_answer: form.correctAnswer || null, points: parseInt(form.points), active: form.active };
    if (editId) { await sbUpdate("questions", { id: editId }, data); }
    else { await sbInsert("questions", { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), ...data }); }
    await loadAll(); setShowForm(false); resetForm(); setSaving(false);
  };

  return (
    <div>
      <button style={{ ...S.btnPrimary, marginBottom: 16, marginTop: 0 }} onClick={() => { resetForm(); setShowForm(true); }}>+ Create New Question</button>
      {pendingAnswers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={S.sectionTitle}>⏳ Pending Short Answers</div>
          {pendingAnswers.map(a => {
            const q = questions.find(q => q.id === a.question_id);
            return (
              <div key={a.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{ color: "#60a5fa", fontWeight: 700 }}>{a.member}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Q: {q?.question}</div>
                <div style={{ color: "#e2e8f0", fontSize: 14, marginTop: 6, padding: "8px 12px", background: "#0f172a", borderRadius: 8 }}>{a.answer}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "approved", points: a.points }); await loadAll(); }}>✅ Approve +{a.points} pts</button>
                  <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "rejected", points: 0 }); await loadAll(); }}>❌ Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{editId ? "✏️ Edit Question" : "✨ New Question"}</div>
          <label style={S.label}>Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {["multiple_choice", "short_answer"].map(t => (
              <button key={t} style={{ flex: 1, background: form.type === t ? "#1d4ed8" : "#0f172a", border: `2px solid ${form.type === t ? "#3b82f6" : "#334155"}`, color: form.type === t ? "#fff" : "#94a3b8", borderRadius: 10, padding: "10px 0", fontSize: 13, cursor: "pointer", fontWeight: 600 }} onClick={() => setForm(f => ({ ...f, type: t }))}>{t === "multiple_choice" ? "Multiple Choice" : "Short Answer"}</button>
            ))}
          </div>
          <label style={S.label}>Question</label>
          <input style={S.input} placeholder="e.g. What is the correct height for a front end cap?" value={form.question} onChange={e => { setForm(f => ({ ...f, question: e.target.value })); setError(""); }} />
          {form.type === "multiple_choice" && (
            <>
              <label style={S.label}>Answer Options</label>
              {form.options.map((opt, i) => <input key={i} style={{ ...S.input, marginBottom: 8 }} placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm(f => ({ ...f, options: opts })); }} />)}
              <label style={S.label}>Correct Answer</label>
              <select style={S.input} value={form.correctAnswer} onChange={e => { setForm(f => ({ ...f, correctAnswer: e.target.value })); setError(""); }}>
                <option value="">— Select correct answer —</option>
                {form.options.filter(o => o.trim()).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </>
          )}
          <label style={S.label}>Points</label>
          <input style={S.input} type="number" placeholder="e.g. 5" value={form.points} onChange={e => { setForm(f => ({ ...f, points: e.target.value })); setError(""); }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <input type="checkbox" id="qActive" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="qActive" style={{ color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Active (visible to team)</label>
          </div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Question"}</button>
            <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}
      {questions.length === 0 && !showForm && <div style={S.emptyMsg}>No questions yet.</div>}
      {questions.map(q => (
        <div key={q.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>{q.question}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{q.type === "multiple_choice" ? "MC" : "Short"} · +{q.points} pts · {q.active ? <span style={{ color: "#4ade80" }}>Active</span> : <span style={{ color: "#f87171" }}>Inactive</span>}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 8px", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(q)}>✏️</button>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: q.active ? "#f87171" : "#4ade80", borderRadius: 8, padding: "6px 8px", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbUpdate("questions", { id: q.id }, { active: !q.active }); await loadAll(); }}>{q.active ? "⏸" : "▶️"}</button>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "6px 8px", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbDelete("questions", { id: q.id }); await loadAll(); }}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminBonuses({ bonuses, loadAll }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ label: "", description: "", points: "", icon: "⭐", startTime: "", endTime: "", active: true, photo: null });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const bonusImgRef = useRef();

  const resetForm = () => { setForm({ label: "", description: "", points: "", icon: "⭐", startTime: "", endTime: "", active: true, photo: null }); setEditId(null); setError(""); };
  const openEdit = (b) => { setForm({ label: b.label, description: b.description || "", points: String(b.points), icon: b.icon || "⭐", startTime: b.start_time, endTime: b.end_time, active: b.active, photo: b.photo || null }); setEditId(b.id); setShowForm(true); };

  const handleBonusImg = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { const b64 = await toBase64(file); setForm(f => ({ ...f, photo: b64 })); }
    catch (err) { setError(err.message || "Could not load photo."); }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!form.label.trim()) { setError("Add a title."); return; }
    if (!form.points || isNaN(form.points) || parseInt(form.points) <= 0) { setError("Enter valid points."); return; }
    if (!form.startTime || !form.endTime) { setError("Set start and end times."); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { setError("End time must be after start time."); return; }
    setSaving(true);
    setError("");
    try {
      const data = { label: form.label, description: form.description, points: parseInt(form.points), icon: form.icon, start_time: form.startTime, end_time: form.endTime, active: form.active, photo: form.photo || null };
      if (editId) {
        const ok = await sbUpdate("bonuses", { id: editId }, data);
        if (!ok) { setError("Save failed — please try again."); setSaving(false); return; }
      } else {
        const result = await sbInsert("bonuses", { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), ...data, claimed_by: null });
        if (result && result.error) { setError("Save failed: " + (result.error.message || "please try again.")); setSaving(false); return; }
      }
      await loadAll();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError("Save failed — check your connection.");
    }
    setSaving(false);
  };

  const nowT = new Date();
  const getStatus = (b) => {
    if (b.claimed_by) return { label: `Claimed by ${b.claimed_by}`, color: "#4ade80" };
    if (!b.active) return { label: "Inactive", color: "#64748b" };
    if (new Date(b.start_time) > nowT) return { label: "Scheduled", color: "#60a5fa" };
    if (new Date(b.end_time) <= nowT) return { label: "Expired", color: "#f87171" };
    return { label: `Live · ${getTimeLeft(b.end_time)}`, color: "#fbbf24" };
  };

  return (
    <div>
      <button style={{ ...S.btnPrimary, marginBottom: 16, marginTop: 0 }} onClick={() => { resetForm(); setShowForm(true); }}>+ Create New Bonus</button>
      {showForm && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{editId ? "✏️ Edit" : "✨ New Bonus"}</div>
          <label style={S.label}>Icon</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {BONUS_ICONS.map(ic => <button key={ic} style={{ background: form.icon === ic ? "#292524" : "#0f172a", border: `2px solid ${form.icon === ic ? "#f59e0b" : "#334155"}`, borderRadius: 8, width: 40, height: 40, fontSize: 20, cursor: "pointer" }} onClick={() => setForm(f => ({ ...f, icon: ic }))}>{ic}</button>)}
          </div>
          <label style={S.label}>Title</label>
          <input style={S.input} placeholder="e.g. Speed Stocking Blitz" value={form.label} onChange={e => { setForm(f => ({ ...f, label: e.target.value })); setError(""); }} />
          <label style={S.label}>Description</label>
          <input style={S.input} placeholder="e.g. Fully stock aisle 12 end cap" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <label style={S.label}>Reference Photo (optional)</label>
          {form.photo
            ? <div style={{ position: "relative", marginBottom: 8 }}>
                <img src={form.photo} alt="bonus ref" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10 }} />
                <button onClick={() => setForm(f => ({ ...f, photo: null }))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 16, cursor: "pointer" }}>×</button>
              </div>
            : <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <button style={{ flex: 1, background: "#0f172a", border: "2px dashed #334155", color: "#60a5fa", borderRadius: 10, padding: "10px 0", fontSize: 12, cursor: "pointer", fontWeight: 600 }} onClick={() => { bonusImgRef.current.removeAttribute("capture"); bonusImgRef.current.click(); }}>📁 Gallery</button>
                <button style={{ flex: 1, background: "#0f172a", border: "2px dashed #334155", color: "#60a5fa", borderRadius: 10, padding: "10px 0", fontSize: 12, cursor: "pointer", fontWeight: 600 }} onClick={() => { bonusImgRef.current.setAttribute("capture", "environment"); bonusImgRef.current.click(); }}>📷 Camera</button>
                <input ref={bonusImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBonusImg} />
              </div>
          }
          <label style={S.label}>Points</label>
          <input style={S.input} type="number" value={form.points} onChange={e => { setForm(f => ({ ...f, points: e.target.value })); setError(""); }} />
          <label style={S.label}>Start Time</label>
          <input style={S.input} type="datetime-local" value={form.startTime} onChange={e => { setForm(f => ({ ...f, startTime: e.target.value })); setError(""); }} />
          <label style={S.label}>End Time</label>
          <input style={S.input} type="datetime-local" value={form.endTime} onChange={e => { setForm(f => ({ ...f, endTime: e.target.value })); setError(""); }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <span style={{ color: "#94a3b8", fontSize: 14 }}>Active when live</span>
          </div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save"}</button>
            <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}
      {bonuses.length === 0 && !showForm && <div style={S.emptyMsg}>No bonuses yet.</div>}
      {bonuses.map(b => {
        const st = getStatus(b);
        return (
          <div key={b.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{b.icon || "⭐"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#f1f5f9", fontWeight: 700 }}>{b.label}</div>
                <div style={{ color: st.color, fontSize: 12, marginTop: 4 }}>● {st.label}</div>
              </div>
              <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 20 }}>+{b.points}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #334155" }}>
              <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(b)}>✏️ Edit</button>
              <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: b.active ? "#f87171" : "#4ade80", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbUpdate("bonuses", { id: b.id }, { active: !b.active }); await loadAll(); }}>{b.active ? "⏸ Off" : "▶️ On"}</button>
              <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbDelete("bonuses", { id: b.id }); await loadAll(); }}>🗑 Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QAReviewCard({ a, questions, loadAll }) {
  const q = questions.find(q => q.id === a.question_id);
  return (
    <div style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #7c3aed" }}>
      <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>❓ QUESTION ANSWER</div>
      <div style={{ color: "#60a5fa", fontWeight: 700 }}>{a.member}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Q: {q?.question}</div>
      <div style={{ color: "#e2e8f0", fontSize: 14, marginTop: 6, padding: "8px 12px", background: "#0f172a", borderRadius: 8 }}>{a.answer}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "approved", points: a.points }); await loadAll(); }}>✅ Approve +{a.points} pts</button>
        <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "rejected", points: 0 }); await loadAll(); }}>❌ Reject</button>
      </div>
    </div>
  );
}

function ReviewCard({ s, approve, reject, readonly, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [customPoints, setCustomPoints] = useState(s.suggested_points ? String(s.suggested_points) : "");
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [photos, setPhotos] = useState(null); // null = not yet loaded
  const [photosLoading, setPhotosLoading] = useState(false);
  const statusColor = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444" }[s.status] || "#94a3b8";
  const isAboveBeyond = s.submission_type === "above_beyond";

  const loadPhotos = async () => {
    if (photos !== null || photosLoading) return;
    setPhotosLoading(true);
    try {
      const res = await sbGet("submissions", `select=before_img,after_img&id=eq.${s.id}`);
      setPhotos(Array.isArray(res) && res[0] ? res[0] : {});
    } catch { setPhotos({}); }
    setPhotosLoading(false);
  };

  const handleReject = async () => {
    await reject(s.id, rejectReason);
    setShowRejectForm(false);
  };

  const handleApprove = async () => {
    const pts = isAboveBeyond ? (parseInt(customPoints) || 0) : s.points;
    await approve(s.id, pts);
  };

  return (
    <div style={{ ...S.reviewCard, ...(s.bonus_id ? { border: "1px solid #f59e0b" } : {}), ...(isAboveBeyond ? { border: "1px solid #a855f7" } : {}) }}>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => { setExpanded(!expanded); if (!expanded) loadPhotos(); }}>
        <div>
          {s.bonus_id && <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>🔥 BONUS</div>}
          {isAboveBeyond && <div style={{ color: "#a855f7", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>⭐ ABOVE & BEYOND</div>}
          <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 15 }}>{s.member}</div>
          <div style={{ color: "#e2e8f0", fontSize: 14, marginTop: 2 }}>{s.challenge_label}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{s.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: statusColor, fontWeight: 700, fontSize: 13 }}>{(s.status || "unknown").toUpperCase()}</div>
          <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 20 }}>{isAboveBeyond && s.status === "pending" ? "?" : `+${s.points}`}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>{expanded ? "▲" : "▼"}</div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #334155" }}>
          {isAboveBeyond && s.description && (
            <div style={{ background: "linear-gradient(135deg,#2e1065,#3b0764)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>WHAT THEY DID</div>
              <div style={{ color: "#e9d5ff", fontSize: 14, lineHeight: 1.6 }}>{s.description}</div>
              {s.suggested_points && <div style={{ color: "#a78bfa", fontSize: 12, marginTop: 6 }}>💡 They suggested: {s.suggested_points} pts</div>}
            </div>
          )}
          {photosLoading && <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "16px 0" }}>⏳ Loading photos...</div>}
          {photos && (
            <div style={{ display: "flex", gap: 10 }}>
              {["before_img", "after_img"].map((key, i) => photos[key] && (
                <div key={key} style={{ textAlign: "center", width: "calc(50% - 5px)" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{i === 0 ? "BEFORE" : "AFTER"}</div>
                  <img src={photos[key]} alt={key} onClick={() => setLightboxSrc(photos[key])} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, cursor: "zoom-in" }} />
                </div>
              ))}
            </div>
          )}
          {photos && (photos.before_img || photos.after_img) && <div style={{ color: "#475569", fontSize: 11, textAlign: "center", marginTop: 4 }}>Tap photos to view full size</div>}
          {photos && !photos.before_img && !photos.after_img && <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "8px 0" }}>📷 Photos expired or unavailable</div>}
          {s.note && <div style={{ background: "#0f172a", borderRadius: 8, padding: "8px 12px", color: "#94a3b8", fontSize: 13, marginTop: 10 }}>📝 {s.note}</div>}
          {s.reject_reason && <div style={{ background: "#450a0a", borderRadius: 8, padding: "8px 12px", color: "#fca5a5", fontSize: 13, marginTop: 10 }}>❌ Rejection reason: {s.reject_reason}</div>}

          {!readonly && s.status === "pending" && (
            <>
              {isAboveBeyond && (
                <div style={{ marginTop: 14 }}>
                  <label style={S.label}>Points to Award</label>
                  <input style={S.input} type="number" placeholder="Enter points to award" value={customPoints} onChange={e => setCustomPoints(e.target.value)} />
                </div>
              )}
              {!showRejectForm ? (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={handleApprove}>
                    ✅ Approve {isAboveBeyond ? (customPoints ? `+${customPoints} pts` : "(set pts above)") : `+${s.points} pts`}
                  </button>
                  <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => setShowRejectForm(true)}>❌ Reject</button>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <label style={S.label}>Reason for Rejection</label>
                  <input style={S.input} placeholder="e.g. Photos unclear, task not complete..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={handleReject}>Confirm Reject</button>
                    <button style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer" }} onClick={() => setShowRejectForm(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ marginTop: 10 }}>
            {confirmDel
              ? <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => onDelete(s.id)}>Confirm Delete</button>
                  <button style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, cursor: "pointer" }} onClick={() => setConfirmDel(false)}>Cancel</button>
                </div>
              : <button style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }} onClick={() => setConfirmDel(true)}>🗑 Delete from view</button>}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Lightbox: tap any photo to view full-screen with pinch-zoom support ──
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>×</button>
      <img src={src} alt="full view" onClick={e => e.stopPropagation()}
        style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, touchAction: "pinch-zoom" }} />
    </div>
  );
}

const S = {
  root: { background: "#0f172a", minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" },
  app: { width: "100%", maxWidth: 480, minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", position: "relative" },
  header: { background: "#1e293b", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", flexShrink: 0, position: "relative" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { color: "#f1f5f9", fontWeight: 700, fontSize: 16 },
  headerSub: { color: "#60a5fa", fontSize: 12 },
  adminBtn: { background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  content: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#1e293b", borderTop: "1px solid #334155", display: "flex", zIndex: 100 },
  navTab: { flex: 1, background: "none", border: "none", padding: "8px 2px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  navTabActive: { borderTop: "2px solid #3b82f6" },
  navLabel: { color: "#64748b", fontSize: 9 },
  pulseDot: { position: "absolute", top: -2, right: -4, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", display: "inline-block" },
  heroBanner: { background: "linear-gradient(135deg,#1e3a5f 0%,#1e40af 50%,#7c3aed 100%)", borderRadius: 20, padding: "32px 24px", textAlign: "center", marginBottom: 20 },
  announcementOuter: { position: "relative", marginBottom: 16, background: "linear-gradient(135deg,#1c1412,#2d1f0e)", border: "2px solid #f59e0b", borderRadius: 16, padding: 3 },
  announcementInner: { borderRadius: 13, padding: "16px 18px", background: "linear-gradient(135deg,#1c1a14,#252010)" },
  announcementHeader: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 },
  announcementHeaderText: { color: "#f59e0b", fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" },
  announcementDivider: { height: 1, background: "linear-gradient(90deg,transparent,#f59e0b,transparent)", marginBottom: 12 },
  announcementBody: { color: "#fde68a", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", textAlign: "center" },
  announcementCornerTL: { position: "absolute", top: -10, left: -10, color: "#f59e0b", fontSize: 18, background: "#0f172a", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" },
  announcementCornerTR: { position: "absolute", top: -10, right: -10, color: "#f59e0b", fontSize: 18, background: "#0f172a", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" },
  announcementCornerBL: { position: "absolute", bottom: -10, left: -10, color: "#f59e0b", fontSize: 18, background: "#0f172a", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" },
  announcementCornerBR: { position: "absolute", bottom: -10, right: -10, color: "#f59e0b", fontSize: 18, background: "#0f172a", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" },
  bonusAlert: { background: "linear-gradient(135deg,#78350f,#dc2626)", borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  quickGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 },
  quickCard: { border: "none", borderRadius: 16, padding: "20px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  sectionTitle: { color: "#94a3b8", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  bonusCard: { background: "linear-gradient(135deg,#1c1917,#292524)", border: "1px solid #dc2626", borderRadius: 16, padding: 16, marginBottom: 12 },
  formCard: { background: "#1e293b", borderRadius: 20, padding: 24, marginBottom: 16 },
  formTitle: { color: "#f1f5f9", fontWeight: 800, fontSize: 20, marginBottom: 4 },
  label: { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, color: "#f1f5f9", padding: "12px 14px", fontSize: 15, boxSizing: "border-box", outline: "none" },
  btnPrimary: { width: "100%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 20 },
  errorMsg: { color: "#f87171", fontSize: 13, marginTop: 8 },
  hintBox: { background: "#1e293b", borderRadius: 12, padding: 16, color: "#94a3b8", fontSize: 13 },
  codeChip: { background: "#0f172a", border: "1px solid #3b82f6", color: "#60a5fa", borderRadius: 6, padding: "2px 8px", fontFamily: "monospace", fontWeight: 700 },
  gateBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  rulesHero: { background: "linear-gradient(135deg,#1e3a5f,#1e40af)", borderRadius: 20, padding: "24px 20px", marginBottom: 20, textAlign: "center" },
  photoBox: { background: "#0f172a", border: "2px dashed #334155", borderRadius: 12, aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" },
  photoOptionBtn: { flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 4px", fontSize: 11, cursor: "pointer" },
  lbRow: { background: "#1e293b", borderRadius: 14, padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 },
  emptyMsg: { color: "#64748b", textAlign: "center", padding: 40, fontSize: 15 },
  tabBtn: { flex: 1, background: "#1e293b", border: "none", color: "#64748b", borderRadius: 10, padding: "10px 4px", cursor: "pointer", fontSize: 12, fontWeight: 600, minWidth: 50 },
  tabBtnActive: { background: "#1d4ed8", color: "#fff" },
  reviewCard: { background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 },
};
function TasksScreen({ currentUser, dailyStandards, assignments, loadAll, isAdmin, members }) {
  const S2 = {
    container: { padding: 16 },
    sectionTitle: { color: "#94a3b8", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, marginTop: 24 },
    card: { background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 },
    checkbox: { width: 24, height: 24, borderRadius: 6, border: "2px solid #334155", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    checkboxDone: { width: 24, height: 24, borderRadius: 6, background: "#4f46e5", border: "2px solid #4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    label: { color: "#f1f5f9", fontSize: 15, flex: 1 },
    claimedBy: { color: "#60a5fa", fontSize: 12, marginTop: 4 },
    points: { color: "#fbbf24", fontWeight: 700, fontSize: 14 },
    assignedBadge: { background: "#7c3aed", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, marginLeft: 8 },
  };

  const claimStandard = async (item) => {
  if (item.claimed_by) return;
  await sbUpdate("daily_standards", { id: item.id }, { claimed_by: currentUser, claimed_at: new Date().toISOString() });
  await loadAll();
};

  const myAssignments = assignments.filter(a => a.assigned_to === currentUser && !a.completed);

  const completeAssignment = async (item) => {
  await sbUpdate("assignments", { id: item.id }, { completed: true, completed_at: new Date().toISOString() });
  await loadAll();
};

  return (
    <div style={S2.container}>
      <div style={{ ...S2.sectionTitle, marginTop: 8 }}>📋 Daily Standards</div>
      {dailyStandards.filter(d => d.active).map(item => (
        <div key={item.id} style={S2.card}>
          <div onClick={() => claimStandard(item)} style={item.claimed_by ? S2.checkboxDone : S2.checkbox}>
            {item.claimed_by && <span style={{ color: "#fff", fontSize: 16 }}>✓</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={S2.label}>{item.label}</div>
            {item.claimed_by && <div style={S2.claimedBy}>Claimed by {item.claimed_by}</div>}
          </div>
          {item.points > 0 && <div style={S2.points}>+{item.points}</div>}
        </div>
      ))}
      {dailyStandards.length === 0 && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>No standards added yet.</div>}

      {myAssignments.length > 0 && (
        <>
          <div style={S2.sectionTitle}>🎯 Your Assignments</div>
          {myAssignments.map(item => (
            <div key={item.id} style={{ ...S2.card, border: "1px solid #7c3aed" }}>
              <div onClick={() => completeAssignment(item)} style={S2.checkbox}>
                <span style={{ color: "#94a3b8", fontSize: 14 }}>○</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={S2.label}>{item.label}</div>
              </div>
              {item.points > 0 && <div style={S2.points}>+{item.points}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function FeedbackScreen({ currentUser, loadAll }) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async () => {
  if (!message.trim()) return;
  await sbInsert("feedback", { member: currentUser, message: message.trim() });
  setMessage("");
  setSubmitted(true);
  setTimeout(() => setSubmitted(false), 3000);
  await loadAll();
};

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: "#1e293b", borderRadius: 20, padding: "24px 20px", marginBottom: 16 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>💬 Send Feedback</div>
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Report bugs, suggestions, or anything on your mind.</div>
      </div>
      {submitted && <div style={{ background: "#166534", color: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>✅ Feedback sent!</div>}
      <div style={{ background: "#1e293b", borderRadius: 14, padding: 16 }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe the bug or suggestion..."
          style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, color: "#f1f5f9", padding: "12px 14px", fontSize: 15, resize: "vertical", minHeight: 120, fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
        />
        <button onClick={submitFeedback} style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>
          Send Feedback
        </button>
      </div>
    </div>
  );
}
