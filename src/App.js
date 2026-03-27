import { useState, useEffect, useRef } from "react";

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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
}

async function sbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function sbUpdate(table, match, data) {
  const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function sbDelete(table, match) {
  const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return res.ok;
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const max = 800;
      let w = img.width, h = img.height;
      if (w > max) { h = (h * max) / w; w = max; }
      if (h > max) { w = (w * max) / h; h = max; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = rej;
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

function todayStr() {
  return new Date().toISOString().split("T")[0];
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
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("sc_user") || null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  const loadAll = async () => {
    const [m, s, b, p, a, q, qa] = await Promise.all([
      sbGet("members", "select=name&order=created_at.asc"),
      sbGet("submissions", "select=*&order=created_at.desc"),
      sbGet("bonuses", "select=*&order=id.desc"),
      sbGet("prizes", "select=*&order=id.asc"),
      sbGet("announcements", "select=message&id=eq.1"),
      sbGet("questions", "select=*&order=created_at.desc"),
      sbGet("question_answers", "select=*&order=created_at.desc"),
    ]);
    setMembers(Array.isArray(m) ? m.map(x => x.name) : []);
    setSubmissions(Array.isArray(s) ? s : []);
    setBonuses(Array.isArray(b) ? b : []);
    setPrizes(Array.isArray(p) ? p : []);
    setAnnouncement(Array.isArray(a) && a[0] ? a[0].message || "" : "");
    setQuestions(Array.isArray(q) ? q : []);
    setQuestionAnswers(Array.isArray(qa) ? qa : []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); const t = setInterval(loadAll, 15000); return () => clearInterval(t); }, []);

  const getPoints = (name) => {
    const subPts = submissions.filter(s => s.member === name && s.status === "approved").reduce((sum, s) => sum + s.points, 0);
    const qPts = questionAnswers.filter(a => a.member === name && a.status === "approved").reduce((sum, a) => sum + a.points, 0);
    return subPts + qPts;
  };

  const leaderboard = [...members].map(m => ({ name: m, points: getPoints(m) })).sort((a, b) => b.points - a.points);
  const totalPoints = leaderboard.reduce((s, m) => s + m.points, 0);
  const now = new Date();
  const activeBonuses = bonuses.filter(b => b.active && new Date(b.start_time) <= now && new Date(b.end_time) > now && !b.claimed_by);
  const activeQuestions = questions.filter(q => q.active);

  const approveSubmission = async (id) => {
    const sub = submissions.find(s => s.id === id);
    await sbUpdate("submissions", { id }, { status: "approved" });
    if (sub?.bonus_id) await sbUpdate("bonuses", { id: sub.bonus_id }, { claimed_by: sub.member });
    loadAll();
  };
  const rejectSubmission = async (id) => { await sbUpdate("submissions", { id }, { status: "rejected" }); loadAll(); };
  const deleteSubmission = async (id) => { await sbDelete("submissions", { id }); loadAll(); };
  const deleteMember = async (name) => {
    await sbDelete("members", { name });
    await sbDelete("submissions", { member: name });
    await sbDelete("question_answers", { member: name });
    if (currentUser === name) { setCurrentUser(null); localStorage.removeItem("sc_user"); }
    loadAll();
  };

  if (loading) return (
    <div style={{ ...S.root, alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 60 }}>🌙</div><div style={{ color: "#60a5fa", fontSize: 18, fontWeight: 700, marginTop: 16 }}>Loading Night Crew...</div></div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.app}>
        <Header screen={screen} setScreen={setScreen} currentUser={currentUser} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
        <div style={S.content}>
          {screen === "home" && <HomeScreen setScreen={setScreen} leaderboard={leaderboard} totalPoints={totalPoints} activeBonuses={activeBonuses} announcement={announcement} activeQuestions={activeQuestions} />}
          {screen === "join" && <JoinScreen members={members} setCurrentUser={setCurrentUser} setScreen={setScreen} loadAll={loadAll} />}
          {screen === "rules" && <RulesScreen />}
          {screen === "submit" && currentUser && <SubmitScreen currentUser={currentUser} submissions={submissions} activeBonuses={activeBonuses} loadAll={loadAll} />}
          {screen === "submit" && !currentUser && <GateScreen setScreen={setScreen} />}
          {screen === "leaderboard" && <LeaderboardScreen leaderboard={leaderboard} totalPoints={totalPoints} />}
          {screen === "prizes" && <PrizesScreen prizes={prizes} />}
          {screen === "bonuses" && <BonusesScreen bonuses={bonuses} activeBonuses={activeBonuses} questions={activeQuestions} currentUser={currentUser} questionAnswers={questionAnswers} loadAll={loadAll} setScreen={setScreen} />}
          {screen === "admin" && isAdmin && <AdminScreen submissions={submissions} approveSubmission={approveSubmission} rejectSubmission={rejectSubmission} deleteSubmission={deleteSubmission} leaderboard={leaderboard} bonuses={bonuses} loadAll={loadAll} prizes={prizes} announcement={announcement} members={members} deleteMember={deleteMember} questions={questions} questionAnswers={questionAnswers} />}
          {screen === "adminlogin" && <AdminLogin setIsAdmin={setIsAdmin} setScreen={setScreen} />}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} isAdmin={isAdmin} activeBonuses={activeBonuses} activeQuestions={activeQuestions} />
      </div>
    </div>
  );
}

function Header({ screen, setScreen, currentUser, isAdmin, setIsAdmin }) {
  const titles = { home: "Night Crew Challenge", join: "Join the Team", rules: "Rules & Points", submit: "Submit Proof", leaderboard: "Leaderboard", prizes: "Prizes", admin: "Admin Panel", adminlogin: "Admin Login", bonuses: "🔥 Bonus & Questions" };
  return (
    <div style={S.header}>
      <div style={S.headerLeft}>
        <span style={{ fontSize: 28 }}>🌙</span>
        <div>
          <div style={S.headerTitle}>{titles[screen] || "Night Crew"}</div>
          {currentUser && <div style={S.headerSub}>Hey, {currentUser}!</div>}
        </div>
      </div>
      {!isAdmin
        ? <button style={S.adminBtn} onClick={() => setScreen("adminlogin")}>Admin</button>
        : <button style={{ ...S.adminBtn, background: "#16a34a", color: "#fff" }} onClick={() => { setIsAdmin(false); setScreen("home"); }}>Exit Admin</button>}
    </div>
  );
}

function BottomNav({ screen, setScreen, isAdmin, activeBonuses, activeQuestions }) {
  const hasDot = activeBonuses.length > 0 || activeQuestions.length > 0;
  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "leaderboard", icon: "🏆", label: "Board" },
    { id: "submit", icon: "📸", label: "Submit" },
    { id: "bonuses", icon: "🔥", label: "Bonus", dot: hasDot },
    { id: "prizes", icon: "🎁", label: "Prizes" },
  ];
  if (isAdmin) tabs.push({ id: "admin", icon: "⚙️", label: "Admin" });
  return (
    <div style={S.bottomNav}>
      {tabs.map(t => (
        <button key={t.id} style={{ ...S.navTab, ...(screen === t.id ? S.navTabActive : {}) }} onClick={() => setScreen(t.id)}>
          <span style={{ fontSize: 20, position: "relative" }}>{t.icon}{t.dot && <span style={S.pulseDot} />}</span>
          <span style={S.navLabel}>{t.label}</span>
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

function HomeScreen({ setScreen, leaderboard, totalPoints, activeBonuses, announcement, activeQuestions }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ padding: 16 }}>
      <div style={S.heroBanner}>
        <div style={{ fontSize: 48 }}>🌙</div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginTop: 8 }}>Night Crew Challenge</div>
        <div style={{ color: "#bfdbfe", fontSize: 14, marginTop: 4 }}>Stock. Earn. Win. Together.</div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 16px", display: "inline-block", color: "#fff", fontSize: 14, fontWeight: 600 }}>{totalPoints} total team pts</div>
      </div>

      {announcement && (
        <div style={S.announcementBox}>
          <div style={S.announcementIcon}>📣</div>
          <div style={S.announcementText}>{announcement}</div>
        </div>
      )}

      {(activeBonuses.length > 0 || activeQuestions.length > 0) && (
        <div style={S.bonusAlert} onClick={() => setScreen("bonuses")}>
          <span style={{ fontSize: 32 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
              {activeBonuses.length > 0 && `${activeBonuses.length} Bonus${activeBonuses.length > 1 ? "es" : ""}`}
              {activeBonuses.length > 0 && activeQuestions.length > 0 && " · "}
              {activeQuestions.length > 0 && `${activeQuestions.length} Question${activeQuestions.length > 1 ? "s" : ""}`}
              {" Active!"}
            </div>
            <div style={{ color: "#fca5a5", fontSize: 12 }}>Earn bonus points — tap to see</div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: 18 }}>→</span>
        </div>
      )}

      <div style={S.quickGrid}>
        {[
          { label: "Join Team", icon: "👋", bg: "linear-gradient(135deg,#1e40af,#3b82f6)", to: "join" },
          { label: "Submit Proof", icon: "📸", bg: "linear-gradient(135deg,#7c3aed,#a855f7)", to: "submit" },
          { label: "Prizes", icon: "🎁", bg: "linear-gradient(135deg,#b45309,#f59e0b)", to: "prizes" },
          { label: "Rules", icon: "📋", bg: "linear-gradient(135deg,#065f46,#10b981)", to: "rules" },
        ].map(c => (
          <button key={c.to} style={{ ...S.quickCard, background: c.bg }} onClick={() => setScreen(c.to)}>
            <span style={{ fontSize: 32 }}>{c.icon}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{c.label}</span>
          </button>
        ))}
      </div>

      {leaderboard.slice(0, 3).length > 0 && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20 }}>
          <div style={S.sectionTitle}>🏆 Top 3</div>
          {leaderboard.slice(0, 3).map((m, i) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #334155" }}>
              <span style={{ fontSize: 24 }}>{medals[i]}</span>
              <span style={{ flex: 1, color: "#f1f5f9", fontWeight: 600 }}>{m.name}</span>
              <span style={{ color: "#60a5fa", fontWeight: 700 }}>{m.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BonusesScreen({ bonuses, activeBonuses, questions, currentUser, questionAnswers, loadAll, setScreen }) {
  const [activeTab, setActiveTab] = useState("bonuses");
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
              <div key={b.id} style={{ ...S.bonusCard, ...(urgent ? { border: "2px solid #ef4444", background: "linear-gradient(135deg,#450a0a,#7f1d1d)" } : {}) }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 36 }}>{b.icon || "⭐"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>{b.label}</div>
                    {b.description && <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 3 }}>{b.description}</div>}
                  </div>
                  <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 26, textAlign: "right", lineHeight: 1.1 }}>+{b.points}<br /><span style={{ fontSize: 11, fontWeight: 400, color: "#fca5a5" }}>pts</span></div>
                </div>
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
                      {b.claimed_by ? <div style={{ color: "#4ade80", fontSize: 13 }}>🏆 Claimed by {b.claimed_by}</div>
                        : <div style={{ color: "#f87171", fontSize: 13 }}>⏰ Expired</div>}
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
    let status = "pending";
    let correct = false;
    if (q.type === "multiple_choice") {
      correct = answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      status = correct ? "approved" : "rejected";
      setResult(correct);
    }
    await sbInsert("question_answers", {
      id: Date.now(), question_id: q.id, member: currentUser,
      answer, status, points: correct || q.type === "short_answer" ? q.points : 0,
      answered_at: today
    });
    await loadAll();
    setSubmitted(true);
    setSaving(false);
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
            <button key={i} style={{ background: selected === opt ? "#1d4ed8" : "#0f172a", border: `2px solid ${selected === opt ? "#3b82f6" : "#334155"}`, borderRadius: 10, padding: "10px 14px", color: selected === opt ? "#fff" : "#e2e8f0", fontSize: 14, textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelected(opt)}>{opt}</button>
          ))}
        </div>
      )}
      {q.type === "short_answer" && (
        <input style={S.input} placeholder="Type your answer..." value={shortAnswer} onChange={e => setShortAnswer(e.target.value)} />
      )}
      <button style={{ ...S.btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving || (!selected && !shortAnswer)}>
        {saving ? "Submitting..." : "Submit Answer"}
      </button>
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
    setCurrentUser(name.trim());
    setSuccess(true);
    setSaving(false);
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

function SubmitScreen({ currentUser, submissions, activeBonuses, loadAll }) {
  const [challenge, setChallenge] = useState("");
  const [bonusId, setBonusId] = useState("");
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const beforeRef = useRef();
  const afterRef = useRef();

  const handleImg = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await toBase64(file);
    type === "before" ? setBeforeImg(b64) : setAfterImg(b64);
  };

  const handleSubmit = async () => {
    if (!challenge && !bonusId) { setError("Select a task or bonus."); return; }
    if (!beforeImg || !afterImg) { setError("Upload both before & after photos."); return; }
    let label, points, subBonusId = null;
    if (bonusId) {
      const bonus = activeBonuses.find(b => String(b.id) === String(bonusId));
      if (!bonus) { setError("That bonus is no longer available."); return; }
      label = "🔥 BONUS: " + bonus.label; points = bonus.points; subBonusId = bonus.id;
    } else {
      const ch = CHALLENGES.find(c => c.id === parseInt(challenge));
      label = ch.label; points = ch.points;
    }
    setSaving(true);
    await sbInsert("submissions", {
      member: currentUser, challenge_label: label, points,
      bonus_id: subBonusId, before_img: beforeImg, after_img: afterImg,
      note, status: "pending", date: new Date().toLocaleString()
    });
    await loadAll();
    setSubmitted(true); setSaving(false);
    setChallenge(""); setBonusId(""); setBeforeImg(null); setAfterImg(null); setNote("");
  };

  const mySubmissions = submissions.filter(s => s.member === currentUser);
  const statusStyle = s => ({ pending: { background: "#fef3c7", color: "#92400e" }, approved: { background: "#d1fae5", color: "#065f46" }, rejected: { background: "#fee2e2", color: "#991b1b" } })[s];

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
        <label style={S.label}>Photos (Before & After)</label>
        <div style={{ display: "flex", gap: 12 }}>
          {["before", "after"].map(type => (
            <div key={type} style={{ flex: 1 }}>
              <div style={S.photoBox} onClick={() => (type === "before" ? beforeRef : afterRef).current.click()}>
                {(type === "before" ? beforeImg : afterImg)
                  ? <img src={type === "before" ? beforeImg : afterImg} alt={type} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <><div style={{ fontSize: 28 }}>📷</div><div style={{ color: "#475569", fontSize: 11, fontWeight: 700, marginTop: 4 }}>{type.toUpperCase()}</div><div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>tap to upload</div></>}
                <input ref={type === "before" ? beforeRef : afterRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImg(e, type)} />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <button style={S.photoOptionBtn} onClick={() => {
                  const inp = type === "before" ? beforeRef : afterRef;
                  inp.current.removeAttribute("capture");
                  inp.current.click();
                }}>📁 Gallery</button>
                <button style={S.photoOptionBtn} onClick={() => {
                  const inp = type === "before" ? beforeRef : afterRef;
                  inp.current.setAttribute("capture", "environment");
                  inp.current.click();
                }}>📷 Camera</button>
              </div>
            </div>
          ))}
        </div>
        <label style={S.label}>Note (optional)</label>
        <input style={S.input} placeholder="Aisle #, location, etc." value={note} onChange={e => setNote(e.target.value)} />
        {error && <div style={S.errorMsg}>{error}</div>}
        <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>{saving ? "Submitting..." : "Submit for Approval 🚀"}</button>
      </div>

      {mySubmissions.length > 0 && (
        <div>
          <div style={S.sectionTitle}>My Submissions</div>
          {mySubmissions.map(s => (
            <div key={s.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, flex: 1 }}>{s.challenge_label}</span>
                <span style={{ borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8, ...statusStyle(s.status) }}>{s.status}</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{s.date} · +{s.points} pts</div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {s.before_img && <img src={s.before_img} alt="before" style={{ width: "calc(50% - 5px)", height: 90, objectFit: "cover", borderRadius: 8 }} />}
                {s.after_img && <img src={s.after_img} alt="after" style={{ width: "calc(50% - 5px)", height: 90, objectFit: "cover", borderRadius: 8 }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardScreen({ leaderboard, totalPoints }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#78350f,#b45309)", borderRadius: 20, padding: "24px 20px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>🏆 Leaderboard</div>
        <div style={{ color: "#fde68a", fontSize: 14, marginTop: 4 }}>{totalPoints} Team Points Earned</div>
      </div>
      {leaderboard.length === 0 && <div style={S.emptyMsg}>No points yet — get stocking! 💪</div>}
      {leaderboard.map((m, i) => (
        <div key={m.name} style={{ ...S.lbRow, ...(i === 0 ? { background: "linear-gradient(135deg,#78350f,#92400e)", border: "1px solid #b45309" } : {}) }}>
          <span style={{ fontSize: 28, width: 36, textAlign: "center" }}>{medals[i] || `#${i + 1}`}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{m.name}</div>
            <div style={{ height: 6, background: "#334155", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#3b82f6,#7c3aed)", borderRadius: 3, width: `${leaderboard[0].points ? (m.points / leaderboard[0].points) * 100 : 0}%`, transition: "width 0.5s ease" }} />
            </div>
          </div>
          <span style={{ color: "#60a5fa", fontWeight: 800, fontSize: 24, textAlign: "right", lineHeight: 1.1 }}>{m.points}<br /><span style={{ color: "#475569", fontSize: 11, fontWeight: 400 }}>pts</span></span>
        </div>
      ))}
    </div>
  );
}

function PrizesScreen({ prizes }) {
  const individual = prizes.filter(p => p.individual && p.active);
  const team = prizes.filter(p => !p.individual && p.active);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)", borderRadius: 20, padding: "24px 20px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>🎁 Prize Shop</div>
        <div style={{ color: "#ddd6fe", fontSize: 13, marginTop: 4 }}>Spend your points or pool with the team!</div>
      </div>
      {[{ title: "🙋 Individual Prizes", items: individual, bg: "#1e293b" },
        { title: "👥 Team Prizes (Pool Points)", items: team, bg: "linear-gradient(135deg,#1e3a5f,#1e40af)" }
      ].map(section => (
        <div key={section.title} style={{ marginBottom: 20 }}>
          <div style={S.sectionTitle}>{section.title}</div>
          {section.items.length === 0 && <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>No prizes yet.</div>}
          {section.items.map(p => (
            <div key={p.id} style={{ background: section.bg, borderRadius: 14, padding: "16px 20px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: p.mystery ? "transparent" : "#f1f5f9", fontWeight: 600, fontSize: 15, flex: 1, filter: p.mystery ? "blur(6px)" : "none", userSelect: p.mystery ? "none" : "auto" }}>{p.mystery ? "Mystery Prize 🎁" : p.label}</span>
              {p.mystery && <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13, marginRight: 8 }}>🎁 Mystery</span>}
              <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>{p.cost} pts</span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 20 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>💡 How to Redeem</div>
        <p style={{ color: "#cbd5e1", fontSize: 14, margin: 0 }}>See your team lead to redeem prizes. Individual prizes use your own balance. Team prizes require pooling everyone's points together.</p>
      </div>
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

function AdminScreen({ submissions, approveSubmission, rejectSubmission, deleteSubmission, leaderboard, bonuses, loadAll, prizes, announcement, members, deleteMember, questions, questionAnswers }) {
  const pending = submissions.filter(s => s.status === "pending");
  const reviewed = submissions.filter(s => s.status !== "pending");
  const pendingQA = questionAnswers.filter(a => a.status === "pending");
  const [tab, setTab] = useState("pending");

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{ label: "Pending", val: pending.length + pendingQA.length, color: "#ef4444" },
          { label: "Approved", val: submissions.filter(s => s.status === "approved").length, color: "#10b981" },
          { label: "Total Pts", val: leaderboard.reduce((s, m) => s + m.points, 0), color: "#60a5fa" }
        ].map(st => (
          <div key={st.label} style={{ flex: 1, background: "#1e293b", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
            <div style={{ color: st.color, fontWeight: 800, fontSize: 28 }}>{st.val}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["pending", `Pending${(pending.length + pendingQA.length) > 0 ? ` (${pending.length + pendingQA.length})` : ""}`],
          ["reviewed", "Reviewed"], ["bonuses", "🔥 Bonuses"], ["questions", "❓ Questions"],
          ["prizes", "🎁 Prizes"], ["announce", "📣 Announce"], ["members", "👥 Members"], ["board", "Standings"]
        ].map(([id, label]) => (
          <button key={id} style={{ ...S.tabBtn, ...(tab === id ? S.tabBtnActive : {}), fontSize: 11 }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "pending" && (
        <>
          {pending.length === 0 && pendingQA.length === 0 && <div style={S.emptyMsg}>No pending submissions 🎉</div>}
          {pending.map(s => <ReviewCard key={s.id} s={s} approve={approveSubmission} reject={rejectSubmission} onDelete={deleteSubmission} />)}
          {pendingQA.map(a => <QAReviewCard key={a.id} a={a} questions={questions} loadAll={loadAll} />)}
        </>
      )}
      {tab === "reviewed" && (reviewed.length === 0 ? <div style={S.emptyMsg}>No reviewed submissions yet.</div> : reviewed.map(s => <ReviewCard key={s.id} s={s} readonly onDelete={deleteSubmission} />))}
      {tab === "bonuses" && <AdminBonuses bonuses={bonuses} loadAll={loadAll} />}
      {tab === "questions" && <AdminQuestions questions={questions} questionAnswers={questionAnswers} loadAll={loadAll} />}
      {tab === "prizes" && <AdminPrizes prizes={prizes} loadAll={loadAll} />}
      {tab === "announce" && <AdminAnnouncement announcement={announcement} loadAll={loadAll} />}
      {tab === "members" && <AdminMembers members={members} leaderboard={leaderboard} deleteMember={deleteMember} submissions={submissions} questionAnswers={questionAnswers} />}
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
      <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>📣 Home Announcement</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>This message appears on the home screen for the whole team. Use it for tips, quotes, shoutouts, or reminders. Leave blank to hide it.</div>
      <textarea style={{ ...S.input, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
        placeholder="e.g. Great work tonight team! Keep pushing 💪" value={msg} onChange={e => setMsg(e.target.value)} />
      <button style={{ ...S.btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
        {saved ? "✅ Saved!" : saving ? "Saving..." : "💾 Save Announcement"}
      </button>
      {msg && (
        <>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Preview</div>
          <div style={S.announcementBox}>
            <div style={S.announcementIcon}>📣</div>
            <div style={S.announcementText}>{msg}</div>
          </div>
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
    setSaving(true);
    const data = { label: form.label, cost: parseInt(form.cost), individual: form.individual, mystery: form.mystery, active: true };
    if (editId) { await sbUpdate("prizes", { id: editId }, data); }
    else { await sbInsert("prizes", { id: Date.now(), ...data }); }
    await loadAll(); setShowForm(false); resetForm(); setSaving(false);
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
              <input type="checkbox" checked={form.individual} onChange={e => setForm(f => ({ ...f, individual: e.target.checked }))} />
              Individual Prize
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.mystery} onChange={e => setForm(f => ({ ...f, mystery: e.target.checked }))} />
              🎁 Mystery (blurred)
            </label>
          </div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save"}</button>
            <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}
      {prizes.length === 0 && !showForm && <div style={S.emptyMsg}>No prizes yet. Add your first one!</div>}
      {prizes.map(p => (
        <div key={p.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{p.label} {p.mystery ? "🎁" : ""}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{p.individual ? "Individual" : "Team"} · {p.cost} pts{p.mystery ? " · Mystery" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(p)}>✏️</button>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={async () => { await sbDelete("prizes", { id: p.id }); loadAll(); }}>🗑</button>
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
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>Deleting a member removes them and all their submissions and answers from the app.</div>
      {members.length === 0 && <div style={S.emptyMsg}>No members yet.</div>}
      {members.map(m => {
        const lb = leaderboard.find(l => l.name === m);
        const subCount = submissions.filter(s => s.member === m).length;
        const qaCount = questionAnswers.filter(a => a.member === m).length;
        return (
          <div key={m} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{m}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{lb?.points || 0} pts · {subCount} submission{subCount !== 1 ? "s" : ""} · {qaCount} answer{qaCount !== 1 ? "s" : ""}</div>
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

  const openEdit = (q) => {
    setForm({ question: q.question, type: q.type, options: q.options || ["", "", "", ""], correctAnswer: q.correct_answer || "", points: String(q.points), active: q.active });
    setEditId(q.id); setShowForm(true);
  };

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
    else { await sbInsert("questions", { id: Date.now(), ...data }); }
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
                  <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "approved", points: a.points }); loadAll(); }}>✅ Approve +{a.points} pts</button>
                  <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "rejected", points: 0 }); loadAll(); }}>❌ Reject</button>
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
              <button key={t} style={{ flex: 1, background: form.type === t ? "#1d4ed8" : "#0f172a", border: `2px solid ${form.type === t ? "#3b82f6" : "#334155"}`, color: form.type === t ? "#fff" : "#94a3b8", borderRadius: 10, padding: "10px 0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                onClick={() => setForm(f => ({ ...f, type: t }))}>{t === "multiple_choice" ? "Multiple Choice" : "Short Answer"}</button>
            ))}
          </div>
          <label style={S.label}>Question</label>
          <input style={S.input} placeholder="e.g. What is the correct height for a front end cap?" value={form.question} onChange={e => { setForm(f => ({ ...f, question: e.target.value })); setError(""); }} />
          {form.type === "multiple_choice" && (
            <>
              <label style={S.label}>Answer Options</label>
              {form.options.map((opt, i) => (
                <input key={i} style={{ ...S.input, marginBottom: 8 }} placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm(f => ({ ...f, options: opts })); }} />
              ))}
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

      {questions.length === 0 && !showForm && <div style={S.emptyMsg}>No questions yet. Create your first one!</div>}
      {questions.map(q => (
        <div key={q.id} style={{ background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>{q.question}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{q.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"} · +{q.points} pts · {q.active ? <span style={{ color: "#4ade80" }}>Active</span> : <span style={{ color: "#f87171" }}>Inactive</span>}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(q)}>✏️</button>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: q.active ? "#f87171" : "#4ade80", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                onClick={async () => { await sbUpdate("questions", { id: q.id }, { active: !q.active }); loadAll(); }}>{q.active ? "⏸" : "▶️"}</button>
              <button style={{ background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                onClick={async () => { await sbDelete("questions", { id: q.id }); loadAll(); }}>🗑</button>
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
  const [form, setForm] = useState({ label: "", description: "", points: "", icon: "⭐", startTime: "", endTime: "", active: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setForm({ label: "", description: "", points: "", icon: "⭐", startTime: "", endTime: "", active: true }); setEditId(null); setError(""); };
  const openEdit = (b) => { setForm({ label: b.label, description: b.description || "", points: String(b.points), icon: b.icon || "⭐", startTime: b.start_time, endTime: b.end_time, active: b.active }); setEditId(b.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.label.trim()) { setError("Add a title."); return; }
    if (!form.points || isNaN(form.points) || parseInt(form.points) <= 0) { setError("Enter valid points."); return; }
    if (!form.startTime || !form.endTime) { setError("Set start and end times."); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { setError("End time must be after start time."); return; }
    setSaving(true);
    const data = { label: form.label, description: form.description, points: parseInt(form.points), icon: form.icon, start_time: form.startTime, end_time: form.endTime, active: form.active };
    if (editId) { await sbUpdate("bonuses", { id: editId }, data); }
    else { await sbInsert("bonuses", { id: Date.now(), ...data, claimed_by: null }); }
    await loadAll(); setShowForm(false); resetForm(); setSaving(false);
  };

  const now = new Date();
  const getStatus = (b) => {
    if (b.claimed_by) return { label: `Claimed by ${b.claimed_by}`, color: "#4ade80" };
    if (!b.active) return { label: "Inactive", color: "#64748b" };
    if (new Date(b.start_time) > now) return { label: "Scheduled", color: "#60a5fa" };
    if (new Date(b.end_time) <= now) return { label: "Expired", color: "#f87171" };
    return { label: `Live · ${getTimeLeft(b.end_time)}`, color: "#fbbf24" };
  };

  return (
    <div>
      <button style={{ ...S.btnPrimary, marginBottom: 16, marginTop: 0 }} onClick={() => { resetForm(); setShowForm(true); }}>+ Create New Bonus</button>
      {showForm && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{editId ? "✏️ Edit Bonus" : "✨ New Bonus"}</div>
          <label style={S.label}>Icon</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            {BONUS_ICONS.map(ic => (
              <button key={ic} style={{ background: form.icon === ic ? "#292524" : "#0f172a", border: `2px solid ${form.icon === ic ? "#f59e0b" : "#334155"}`, borderRadius: 8, width: 40, height: 40, fontSize: 20, cursor: "pointer" }} onClick={() => setForm(f => ({ ...f, icon: ic }))}>{ic}</button>
            ))}
          </div>
          <label style={S.label}>Title</label>
          <input style={S.input} placeholder="e.g. Speed Stocking Blitz" value={form.label} onChange={e => { setForm(f => ({ ...f, label: e.target.value })); setError(""); }} />
          <label style={S.label}>Description (optional)</label>
          <input style={S.input} placeholder="e.g. Fully stock aisle 12 end cap" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <label style={S.label}>Bonus Points</label>
          <input style={S.input} type="number" placeholder="e.g. 20" value={form.points} onChange={e => { setForm(f => ({ ...f, points: e.target.value })); setError(""); }} />
          <label style={S.label}>Start Time</label>
          <input style={S.input} type="datetime-local" value={form.startTime} onChange={e => { setForm(f => ({ ...f, startTime: e.target.value })); setError(""); }} />
          <label style={S.label}>End Time</label>
          <input style={S.input} type="datetime-local" value={form.endTime} onChange={e => { setForm(f => ({ ...f, endTime: e.target.value })); setError(""); }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <input type="checkbox" id="activeCheck" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="activeCheck" style={{ color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Active (visible to team when live)</label>
          </div>
          {error && <div style={S.errorMsg}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Bonus"}</button>
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
                <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{b.label}</div>
                {b.description && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{b.description}</div>}
                <div style={{ color: st.color, fontSize: 12, marginTop: 6 }}>● {st.label}</div>
              </div>
              <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 22 }}>+{b.points}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #334155" }}>
              <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 4px", fontSize: 12, cursor: "pointer" }} onClick={() => openEdit(b)}>✏️ Edit</button>
              <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: b.active ? "#f87171" : "#4ade80", borderRadius: 8, padding: "8px 4px", fontSize: 12, cursor: "pointer" }}
                onClick={async () => { await sbUpdate("bonuses", { id: b.id }, { active: !b.active }); loadAll(); }}>{b.active ? "⏸ Deactivate" : "▶️ Activate"}</button>
              <button style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "8px 4px", fontSize: 12, cursor: "pointer" }}
                onClick={async () => { await sbDelete("bonuses", { id: b.id }); loadAll(); }}>🗑 Delete</button>
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
        <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "approved", points: a.points }); loadAll(); }}>✅ Approve +{a.points} pts</button>
        <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          onClick={async () => { await sbUpdate("question_answers", { id: a.id }, { status: "rejected", points: 0 }); loadAll(); }}>❌ Reject</button>
      </div>
    </div>
  );
}

function ReviewCard({ s, approve, reject, readonly, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const statusColor = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444" }[s.status];
  return (
    <div style={{ ...S.reviewCard, ...(s.bonus_id ? { border: "1px solid #f59e0b" } : {}) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div>
          {s.bonus_id && <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>🔥 BONUS</div>}
          <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 15 }}>{s.member}</div>
          <div style={{ color: "#e2e8f0", fontSize: 14, marginTop: 2 }}>{s.challenge_label}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{s.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: statusColor, fontWeight: 700, fontSize: 13 }}>{s.status.toUpperCase()}</div>
          <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 20 }}>+{s.points}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>{expanded ? "▲" : "▼"}</div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #334155" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {["before_img", "after_img"].map((key, i) => s[key] && (
              <div key={key} style={{ textAlign: "center", width: "calc(50% - 5px)" }}>
                <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{i === 0 ? "BEFORE" : "AFTER"}</div>
                <img src={s[key]} alt={key} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }} />
              </div>
            ))}
          </div>
          {s.note && <div style={{ background: "#0f172a", borderRadius: 8, padding: "8px 12px", color: "#94a3b8", fontSize: 13, marginTop: 10 }}>📝 {s.note}</div>}
          {!readonly && s.status === "pending" && (
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={{ flex: 1, background: "#065f46", color: "#d1fae5", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => approve(s.id)}>✅ Approve +{s.points} pts</button>
              <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => reject(s.id)}>❌ Reject</button>
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            {confirmDel ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => onDelete(s.id)}>Confirm Delete</button>
                <button style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, cursor: "pointer" }} onClick={() => setConfirmDel(false)}>Cancel</button>
              </div>
            ) : (
              <button style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#f87171", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }} onClick={() => setConfirmDel(true)}>🗑 Delete from view</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  root: { background: "#0f172a", minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" },
  app: { width: "100%", maxWidth: 480, minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column" },
  header: { background: "#1e293b", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { color: "#f1f5f9", fontWeight: 700, fontSize: 16 },
  headerSub: { color: "#60a5fa", fontSize: 12 },
  adminBtn: { background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  content: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#1e293b", borderTop: "1px solid #334155", display: "flex", zIndex: 100 },
  navTab: { flex: 1, background: "none", border: "none", padding: "10px 4px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  navTabActive: { borderTop: "2px solid #3b82f6" },
  navLabel: { color: "#64748b", fontSize: 10 },
  pulseDot: { position: "absolute", top: -2, right: -4, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", display: "inline-block" },
  heroBanner: { background: "linear-gradient(135deg,#1e3a5f 0%,#1e40af 50%,#7c3aed 100%)", borderRadius: 20, padding: "32px 24px", textAlign: "center", marginBottom: 20 },
  announcementBox: { background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1px solid #334155", borderLeft: "4px solid #f59e0b", borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" },
  announcementIcon: { fontSize: 22, flexShrink: 0 },
  announcementText: { color: "#e2e8f0", fontSize: 14, lineHeight: 1.6, flex: 1 },
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
  tabBtn: { flex: 1, background: "#1e293b", border: "none", color: "#64748b", borderRadius: 10, padding: "10px 4px", cursor: "pointer", fontSize: 12, fontWeight: 600, minWidth: 60 },
  tabBtnActive: { background: "#1d4ed8", color: "#fff" },
  reviewCard: { background: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 },
};
