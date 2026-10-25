import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const api = async (path, options = {}) => {
  const token = localStorage.getItem("hcm_token");
  const response = await fetch(`${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};
const money = n => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString() : "—";

function AuthScreen({ onAuth }) {
  const [setup, setSetup] = useState(false);
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  useEffect(() => { api("/setup/status").then(x => setSetup(x.setupRequired)).catch(e => setError(e.message)); }, []);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError("");
    try {
      const data = await api(setup ? "/setup" : "/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("hcm_token", data.token); onAuth(data.user);
    } catch (e) { setError(e.message); }
  }
  return <main className="auth-wrap"><form className="auth-card" onSubmit={submit}>
    <div className="logo">HCM<span>Lite</span></div><p className="muted">People operations, made simpler.</p>
    <h1>{setup ? "Set up your company" : "Welcome back"}</h1>
    {setup && <label>Company name<input name="companyName" value={form.companyName} onChange={change} required /></label>}
    {setup && <label>Admin full name<input name="name" value={form.name} onChange={change} required /></label>}
    <label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
    <label>Password<input name="password" type="password" value={form.password} onChange={change} minLength="8" required /></label>
    {error && <p className="error">{error}</p>}
    <button className="primary full">{setup ? "Create Admin account" : "Sign in"}</button>
    <small className="muted">First run creates the Admin. HR accounts are created by your project administrator/seed workflow.</small>
  </form></main>;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [employeeForm, setEmployeeForm] = useState({ employeeCode: "", name: "", email: "", department: "General", designation: "Employee", basicSalary: "50000" });
  const [leaveForm, setLeaveForm] = useState({ type: "casual", startDate: "", endDate: "", reason: "" });
  const [attendanceForm, setAttendanceForm] = useState({ employeeId: "", dateKey: new Date().toISOString().slice(0, 10), status: "present" });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const role = user?.role;

  useEffect(() => {
    const token = localStorage.getItem("hcm_token");
    if (!token) { setLoading(false); return; }
    api("/auth/me").then(d => setUser(d.user)).catch(() => localStorage.removeItem("hcm_token")).finally(() => setLoading(false));
  }, []);
  async function refresh() {
    if (!user) return;
    try {
      const [d, e, a, l, p] = await Promise.all([
        api("/dashboard"), api("/employees"), api(`/attendance?month=${month}`), api("/leaves"), api(`/payroll?month=${month}`)
      ]);
      setDashboard(d); setEmployees(e); setAttendance(a); setLeaves(l); setPayroll(p);
    } catch (e) { setMessage(e.message); }
  }
  useEffect(() => { refresh(); }, [user, month]);
  async function act(fn, success = "Done.") {
    setBusy(true); setMessage("");
    try { const result = await fn(); setMessage(success); await refresh(); return result; }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  function logout() { localStorage.removeItem("hcm_token"); setUser(null); setDashboard(null); }
  if (loading) return <div className="loading">Loading HCM Lite…</div>;
  if (!user) return <AuthScreen onAuth={setUser} />;

  const nav = [
    ["Dashboard", "▦", ["Admin", "HR", "Employee"]],
    ["Employees", "♙", ["Admin", "HR", "Employee"]],
    ["Attendance", "◷", ["Admin", "HR", "Employee"]],
    ["Leave", "▣", ["Admin", "HR", "Employee"]],
    ["Payroll", "＄", ["Admin", "HR", "Employee"]],
    ["AI Assistant", "✳", ["Admin", "HR", "Employee"]],
    ["Settings", "⚙", ["Admin", "HR"]],
    ["Audit Log", "≋", ["Admin"]]
  ].filter(x => x[2].includes(role));
  async function askAI(e) {
    e.preventDefault(); if (!aiQuestion.trim()) return;
    setAiAnswer("Thinking…");
    try { const r = await api("/ai/chat", { method: "POST", body: JSON.stringify({ message: aiQuestion }) }); setAiAnswer(`${r.answer}${r.aiGenerated ? "  · AI-generated" : ""}`); }
    catch (e) { setAiAnswer(e.message); }
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">H</div><div>HCM <span>Lite</span><small>PEOPLE OPERATIONS</small></div></div>
      <div className="profile"><div className="avatar">{user.name?.[0]}</div><div><b>{user.name}</b><small>{role}</small></div></div>
      <nav>{nav.map(([name, icon]) => <button key={name} className={page === name ? "nav-item active" : "nav-item"} onClick={() => { setPage(name); setMessage(""); }}><span>{icon}</span>{name}</button>)}</nav>
      <button className="logout" onClick={logout}>↪ Sign out</button>
    </aside>
    <main className="main">
      <header className="topbar"><div><small>WORKSPACE / {role?.toUpperCase()}</small><h1>{page}</h1></div><div className="top-actions"><span className="status-dot"></span><span>Workspace active</span><div className="avatar small">{user.name?.[0]}</div></div></header>
      {message && <div className="notice" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
      {user.mustChangePassword && <ChangePassword act={act} />}
      {page === "Dashboard" && <section className="content">
        <div className="welcome"><div><p className="eyebrow">{dashboard?.companyName || "YOUR COMPANY"}</p><h2>Good to see you, {user.name?.split(" ")[0]} 👋</h2><p>Here’s what’s happening with your team today.</p></div><span className="date-chip">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span></div>
        <div className="stats">
          <Stat label={role === "Employee" ? "My profile" : "Active employees"} value={dashboard?.employeeCount ?? "—"} icon="♙" color="purple" />
          <Stat label="Checked in today" value={dashboard?.presentToday ?? "—"} icon="◷" color="blue" />
          <Stat label="Late today" value={dashboard?.lateToday ?? "—"} icon="⌁" color="orange" />
          <Stat label={role === "Employee" ? "My pending leaves" : "Pending leave requests"} value={dashboard?.pendingLeaves ?? "—"} icon="▣" color="green" />
        </div>
        <div className="grid-two">
          <section className="panel"><div className="panel-head"><div><h3>Attendance overview</h3><p>Recent attendance records</p></div><button className="text-button" onClick={() => setPage("Attendance")}>View all ↗</button></div>
            {attendance.length ? <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Status</th></tr></thead><tbody>{attendance.slice(0,6).map(a=><tr key={a._id}><td>{a.employee?.name || "Me"}</td><td>{a.dateKey}</td><td><Status value={a.status}/></td></tr>)}</tbody></table></div> : <Empty text="No attendance records yet." />}</section>
          <section className="panel"><div className="panel-head"><div><h3>Recent leave requests</h3><p>Track time-off requests</p></div><button className="text-button" onClick={() => setPage("Leave")}>View all ↗</button></div>
            {leaves.length ? <div className="stack">{leaves.slice(0,5).map(l=><div className="list-row" key={l._id}><div className="mini-avatar">{l.employee?.name?.[0] || "L"}</div><div className="grow"><b>{l.employee?.name || "My request"}</b><small>{l.type} · {fmtDate(l.startDate)} – {fmtDate(l.endDate)}</small></div><Status value={l.status}/></div>)}</div> : <Empty text="No leave requests yet." />}</section>
        </div>
        {role !== "Employee" && <section className="panel chart-panel"><div className="panel-head"><div><h3>Team snapshot</h3><p>Current totals from your database</p></div></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:"Present",value:dashboard?.presentToday||0},{name:"Late",value:dashboard?.lateToday||0},{name:"On leave",value:dashboard?.onLeaveToday||0},{name:"Pending",value:dashboard?.pendingLeaves||0}]}><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="value" radius={[7,7,0,0]} fill="#6757e8"/></BarChart></ResponsiveContainer></div></section>}
      </section>}
      {page === "Employees" && <section className="content">
        {["Admin", "HR"].includes(role) && <section className="panel"><h3>Add employee</h3><p className="muted">Creates an employee profile and a login with a temporary password.</p><form className="form-grid" onSubmit={e=>{e.preventDefault(); act(async()=>{const r=await api("/employees",{method:"POST",body:JSON.stringify(employeeForm)});setMessage(`Employee created. Temporary password: ${r.temporaryPassword}`);setEmployeeForm({employeeCode:"",name:"",email:"",department:"General",designation:"Employee",basicSalary:"50000"});});}}>
          {["employeeCode","name","email","department","designation","basicSalary"].map(k=><label key={k}>{({employeeCode:"Employee code",basicSalary:"Basic salary"})[k]||k[0].toUpperCase()+k.slice(1)}<input required name={k} type={k==="email"?"email":k==="basicSalary"?"number":"text"} value={employeeForm[k]} onChange={e=>setEmployeeForm({...employeeForm,[k]:e.target.value})}/></label>)}<button className="primary" disabled={busy}>Create employee</button></form></section>}
        <section className="panel"><div className="panel-head"><div><h3>Employee directory</h3><p>{employees.length} record(s) visible to your role</p></div><button className="secondary" onClick={()=>act(refresh,"Refreshed.")}>Refresh</button></div>
          <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Code</th><th>Department</th><th>Designation</th><th>Basic salary</th><th>Status</th>{["Admin","HR"].includes(role)&&<th>Actions</th>}</tr></thead><tbody>{employees.map(e=><tr key={e._id}><td><b>{e.name}</b><small className="cell-sub">{e.email}</small></td><td>{e.employeeCode}</td><td>{e.department}</td><td>{e.designation}</td><td>{role==="Employee" ? "Private" : money(e.basicSalary)}</td><td><Status value={e.active ? "active" : "inactive"}/></td>{["Admin","HR"].includes(role)&&<td><button className="reject" disabled={busy} onClick={()=>{if(window.confirm(`Delete ${e.name}? This also removes their login, attendance, leave and payroll records.`)){act(()=>api(`/employees/${e._id}`,{method:"DELETE"}), "Employee deleted.");}}}>Delete</button></td>}</tr>)}</tbody></table></div>
          {!employees.length && <Empty text="No employees have been registered yet."/>}</section>
      </section>}
      {page === "Attendance" && <section className="content">
        {role === "Employee" && <section className="panel"><h3>My attendance</h3><p className="muted">Check-in time is recorded by the server. One check-in per day.</p><div className="button-row"><button className="primary" disabled={busy} onClick={()=>act(()=>api("/attendance/check-in",{method:"POST",body:"{}"}),"Checked in successfully.")}>Check in</button><button className="secondary" disabled={busy} onClick={()=>act(()=>api("/attendance/check-out",{method:"POST",body:"{}"}),"Checked out successfully.")}>Check out</button></div></section>}
        {["Admin","HR"].includes(role) && <section className="panel"><h3>Mark attendance manually</h3><p className="muted">Choose an employee, date, and status. Existing attendance for that day will be updated.</p><form className="form-grid" onSubmit={e=>{e.preventDefault();act(()=>api("/attendance/mark",{method:"POST",body:JSON.stringify(attendanceForm)}),"Attendance saved.");}}><label>Employee<select required value={attendanceForm.employeeId} onChange={e=>setAttendanceForm({...attendanceForm,employeeId:e.target.value})}><option value="">Select employee</option>{employees.filter(x=>x.active).map(x=><option key={x._id} value={x._id}>{x.name} ({x.employeeCode})</option>)}</select></label><label>Date<input type="date" required value={attendanceForm.dateKey} onChange={e=>setAttendanceForm({...attendanceForm,dateKey:e.target.value})}/></label><label>Status<select value={attendanceForm.status} onChange={e=>setAttendanceForm({...attendanceForm,status:e.target.value})}><option value="present">Present</option><option value="absent">Absent</option></select></label><button className="primary" disabled={busy||!employees.length}>Save attendance</button></form></section>}
        <section className="panel"><div className="panel-head"><div><h3>Attendance records</h3><p>Month: {month}</p></div><input className="month-input" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div>
          <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead><tbody>{attendance.map(a=><tr key={a._id}><td>{a.employee?.name || "Me"}</td><td>{a.dateKey}</td><td>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "—"}</td><td>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "—"}</td><td><Status value={a.status}/></td></tr>)}</tbody></table></div>{!attendance.length&&<Empty text="No attendance for this month yet."/>}</section>
      </section>}
      {page === "Leave" && <section className="content">
        {role === "Employee" && <section className="panel"><h3>Request time off</h3><form className="form-grid" onSubmit={e=>{e.preventDefault();act(()=>api("/leaves",{method:"POST",body:JSON.stringify(leaveForm)}).then(r=>{setLeaveForm({type:"casual",startDate:"",endDate:"",reason:""});return r;}),"Leave request submitted.");}}>
          <label>Leave type<select value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})}><option value="casual">Casual</option><option value="sick">Sick</option><option value="annual">Annual</option><option value="unpaid">Unpaid</option></select></label>
          <label>Start date<input type="date" required value={leaveForm.startDate} onChange={e=>setLeaveForm({...leaveForm,startDate:e.target.value})}/></label>
          <label>End date<input type="date" required value={leaveForm.endDate} onChange={e=>setLeaveForm({...leaveForm,endDate:e.target.value})}/></label>
          <label className="wide">Reason<textarea required value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})}/></label><button className="primary" disabled={busy}>Submit request</button></form></section>}
        <section className="panel"><div className="panel-head"><div><h3>Leave requests</h3><p>Requests and their approval status</p></div></div><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th>{["Admin","HR"].includes(role)&&<th>Actions</th>}</tr></thead><tbody>{leaves.map(l=><tr key={l._id}><td>{l.employee?.name||"Me"}</td><td>{l.type}</td><td>{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</td><td>{l.reason}</td><td><Status value={l.status}/></td>{["Admin","HR"].includes(role)&&<td>{l.status==="pending"?<div className="button-row compact"><button className="approve" disabled={busy} onClick={()=>act(()=>api(`/leaves/${l._id}/review`,{method:"PATCH",body:JSON.stringify({status:"approved"})}),"Leave approved.")}>Approve</button><button className="reject" disabled={busy} onClick={()=>act(()=>api(`/leaves/${l._id}/review`,{method:"PATCH",body:JSON.stringify({status:"rejected"})}),"Leave rejected.")}>Reject</button></div>:"—"}</td>}</tr>)}</tbody></table></div>{!leaves.length&&<Empty text="No leave requests yet."/>}</section>
      </section>}
      {page === "Payroll" && <section className="content">
        {role !== "Employee" && <section className="panel"><div className="panel-head"><div><h3>Monthly payroll</h3><p>Draft calculation uses recorded attendance and salary.</p></div><div className="button-row"><input className="month-input" type="month" value={month} onChange={e=>setMonth(e.target.value)}/>{role==="HR"&&<button className="primary" disabled={busy} onClick={()=>act(()=>api("/payroll/run",{method:"POST",body:JSON.stringify({month})}),"Payroll draft created.")}>Run payroll</button>}{role==="Admin"&&<button className="primary" disabled={busy} onClick={()=>act(()=>api(`/payroll/${month}/finalize`,{method:"POST",body:"{}"}),"Payroll finalized and locked.")}>Finalize month</button>}</div></div></section>}
        <section className="panel"><div className="panel-head"><div><h3>{role==="Employee"?"My payslips":"Payroll records"}</h3><p>Selected month: {month}</p></div></div><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Month</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{payroll.map(p=><tr key={p._id}><td>{p.employee?.name||"Me"}</td><td>{p.month}</td><td>{money(p.gross)}</td><td>{money(p.deductions)}</td><td><b>{money(p.net)}</b></td><td><Status value={p.status}/></td></tr>)}</tbody></table></div>{!payroll.length&&<Empty text="No payroll records for this month."/>}</section>
      </section>}
      {page === "AI Assistant" && <section className="content ai-layout"><section className="panel ai-panel"><div className="ai-icon">✳</div><h2>Ask your HR assistant</h2><p className="muted">Ask about attendance, leave, headcount, or payroll. Answers are limited to the records your role can access.</p><form onSubmit={askAI}><textarea value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Example: How many employees were late recently?" required/><button className="primary" disabled={!aiQuestion.trim()}>Ask assistant ↗</button></form>{aiAnswer&&<div className="ai-answer"><b>Assistant response</b><p>{aiAnswer}</p></div>}<div className="suggestions"><button onClick={()=>setAiQuestion("How many active employees are there?")}>How many active employees?</button><button onClick={()=>setAiQuestion("How many leave requests are approved?")}>Approved leaves</button><button onClick={()=>setAiQuestion("How many late attendance records are there?")}>Late attendance</button></div></section></section>}
      {page === "Settings" && <Settings act={act} />}
      {page === "Audit Log" && <AuditLog />}
      <footer>HCM Lite · AI-assisted Human Capital Management <span>Built for the Saylani Hackathon</span></footer>
    </main>
  </div>;
}
function Stat({label,value,icon,color}) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong></div><span className="stat-arrow">↗</span></div>; }
function Status({value}) { const v=String(value||"unknown").toLowerCase().replace("_"," "); return <span className={`pill ${v.replace(" ","-")}`}>{v}</span>; }
function Empty({text}) { return <div className="empty"><div>◌</div><p>{text}</p></div>; }
function ChangePassword({act}) {
  const [f,setF]=useState({currentPassword:"",newPassword:""});
  return <section className="panel password-panel"><h3>Change your temporary password</h3><form className="form-grid" onSubmit={e=>{e.preventDefault();act(()=>api("/auth/change-password",{method:"POST",body:JSON.stringify(f)}),"Password changed.");setF({currentPassword:"",newPassword:""});}}><label>Current password<input type="password" required value={f.currentPassword} onChange={e=>setF({...f,currentPassword:e.target.value})}/></label><label>New password (8+ characters)<input type="password" minLength="8" required value={f.newPassword} onChange={e=>setF({...f,newPassword:e.target.value})}/></label><button className="primary">Update password</button></form></section>;
}
function Settings({act}) {
  const [f,setF]=useState({companyName:"",officeStart:"09:00",graceMinutes:15});
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{api("/settings").then(s=>{setF({companyName:s.companyName,officeStart:s.officeStart,graceMinutes:s.graceMinutes});setLoaded(true);}).catch(()=>setLoaded(true));},[]);
  return <section className="content"><section className="panel"><h3>Company settings</h3><p className="muted">Settings are applied to new attendance records.</p>{loaded&&<form className="form-grid" onSubmit={e=>{e.preventDefault();act(()=>api("/settings",{method:"PUT",body:JSON.stringify(f)}),"Settings saved.");}}><label>Company name<input required value={f.companyName} onChange={e=>setF({...f,companyName:e.target.value})}/></label><label>Office start time<input type="time" required value={f.officeStart} onChange={e=>setF({...f,officeStart:e.target.value})}/></label><label>Grace minutes<input type="number" min="0" max="120" value={f.graceMinutes} onChange={e=>setF({...f,graceMinutes:e.target.value})}/></label><button className="primary">Save settings</button></form>}</section></section>;
}
function AuditLog() {
  const [rows,setRows]=useState([]),[error,setError]=useState("");
  useEffect(()=>{api("/audit").then(setRows).catch(e=>setError(e.message));},[]);
  return <section className="content"><section className="panel"><h3>Audit log</h3><p className="muted">Important actions recorded by the API.</p>{error&&<p className="error">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{rows.map(r=><tr key={r._id}><td>{new Date(r.createdAt).toLocaleString()}</td><td>{r.actorName||"User"}</td><td>{r.action}</td><td>{r.entity}</td><td><code>{JSON.stringify(r.details||{})}</code></td></tr>)}</tbody></table></div>{!rows.length&&!error&&<Empty text="No audit entries yet."/>}</section></section>;
}
export default App;
