(() => {
  "use strict";
  const KEY = "icseMasterClass.studentDashboard.v1";
  const subjects = ["Physics","Chemistry","Biology","Mathematics","English Language","English Literature","History & Civics","Geography","Computer Applications","Other"];
  const validProgressStatuses = ["not-started","learning","completed","revision"];
  let state = { version:1, tasks:[], sessions:[], syllabusProgress:{} };
  let filter = "all";
  const TIMER_MODES = { focus:{label:"Focus session",minutes:25}, shortBreak:{label:"Short break",minutes:5}, longBreak:{label:"Long break",minutes:15} };
  let timerMode = "focus", timerRemainingMs = TIMER_MODES.focus.minutes * 60000, timerEndAt = null, timerInterval = null, timerSubjectAtStart = "Physics";
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
  const id = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "task-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  function validState(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.tasks) || !Array.isArray(data.sessions)) return false;
    if (data.syllabusProgress !== undefined && (!data.syllabusProgress || typeof data.syllabusProgress !== "object" || Array.isArray(data.syllabusProgress) || Object.keys(data.syllabusProgress).length > 3000 || !Object.values(data.syllabusProgress).every(p => p && typeof p === "object" && validProgressStatuses.includes(p.status) && (p.confidence == null || ["low","medium","high"].includes(p.confidence))))) return false;
    if (data.tasks.length > 2000 || data.sessions.length > 5000) return false;
    return data.tasks.every(t => t && typeof t.id === "string" && typeof t.title === "string" && t.title.length <= 120 && subjects.includes(t.subject) && typeof t.done === "boolean") && data.sessions.every(s => s && typeof s.id === "string" && subjects.includes(s.subject) && Number.isInteger(s.minutes) && s.minutes >= 1 && s.minutes <= 600);
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (!raw) return; const parsed = JSON.parse(raw); if (validState(parsed)) state = {...parsed, syllabusProgress: parsed.syllabusProgress || {}}; else setStatus("Saved data could not be read safely. Your existing browser data was left untouched.", true); }
    catch (_) { setStatus("Local storage is unavailable in this browser session. Exporting or saving may not work.", true); }
  }
  window.getDashboardSyllabusProgress = function(){ return state.syllabusProgress || {}; };
  window.setDashboardSyllabusProgress = function(topicId, patch){ if(typeof topicId!=="string"||!topicId||!patch||typeof patch!=="object")return; const old=(state.syllabusProgress||{})[topicId]||{status:"not-started",confidence:null}; const next={...old,...patch}; if(!validProgressStatuses.includes(next.status)||(next.confidence!=null&&!["low","medium","high"].includes(next.confidence)))return; state.syllabusProgress=state.syllabusProgress||{}; state.syllabusProgress[topicId]=next; save(); };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); setStatus("Saved on this device in this browser. Export a backup to move it."); }
    catch (_) { setStatus("Could not save locally. Your browser may be in private mode or storage may be full.", true); }
  }
  function setStatus(message, error=false) { const el=$("dashboardStatus"); if(el){el.textContent=message;el.classList.toggle("text-red-400",error);el.classList.toggle("text-emerald-400",!error);} }
  window.openStudentDashboard = function(){ const section=$("studentDashboard"), main=document.querySelector("main"); if(!section||!main)return; section.classList.remove("hidden"); main.classList.add("hidden"); const shared=$("sharedMaterialPage"); if(shared)shared.classList.add("hidden"); render(); section.scrollIntoView({behavior:"smooth",block:"start"}); };
  window.closeStudentDashboard = function(){ const section=$("studentDashboard"), main=document.querySelector("main"); if(section)section.classList.add("hidden"); if(main)main.classList.remove("hidden"); const shared=$("sharedMaterialPage"); if(shared && new URLSearchParams(location.search).has("material"))shared.classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"}); };
  function element(tag, cls, text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function renderTasks(){const list=$("dashboardTaskList"),empty=$("dashboardTaskEmpty");if(!list||!empty)return;list.replaceChildren();const rows=state.tasks.filter(t=>filter==="all"||(filter==="open"&&!t.done)||(filter==="done"&&t.done)).sort((a,b)=>(a.done-b.done)||(a.due||"9999").localeCompare(b.due||"9999")||b.createdAt-a.createdAt);empty.classList.toggle("hidden",rows.length>0);if(!rows.length)empty.textContent=state.tasks.length?"No tasks match this filter.":"No tasks here yet. Add one small, clear task to get started.";
    rows.forEach(t=>{const row=element("div","dashboard-task"+(t.done?" is-done":""));const check=element("input","dashboard-task-check");check.type="checkbox";check.checked=t.done;check.setAttribute("aria-label","Mark "+t.title+" complete");check.addEventListener("change",()=>{t.done=check.checked;t.completedAt=t.done?Date.now():null;save();render();});const body=element("div","flex-1 min-w-0");body.append(element("p","dashboard-task-title",t.title));body.append(element("p","dashboard-task-meta",t.subject+(t.due?" · Due "+t.due:" · No due date")+(t.done&&t.completedAt?" · Completed":"")));row.append(check,body);const del=element("button","dashboard-task-delete");del.type="button";del.setAttribute("aria-label","Delete "+t.title);del.innerHTML='<i class="fa-solid fa-trash" aria-hidden="true"></i>';del.addEventListener("click",()=>{if(confirm("Delete this task?")){state.tasks=state.tasks.filter(x=>x.id!==t.id);save();render();}});row.append(del);list.append(row);});
  }
  function renderProgress(){const done=state.tasks.filter(t=>t.done).length,total=state.tasks.length;$("dashboardTasksDone").textContent=String(done);$("dashboardTasksTotal").textContent=total+" task"+(total===1?"":"s")+" planned";const pct=total?Math.round(done/total*100):0;$("dashboardCompletion").textContent=pct+"%";const fill=$("dashboardOverallFill");if(fill)fill.style.width=pct+"%";const encouragement=$("dashboardEncouragement");if(encouragement){encouragement.textContent=!total?"Choose one small task to get started—your plan can change anytime.":done===total?"Nice work—your planned tasks are complete. Rest or choose another small goal.":pct>=75?"You're close to finishing your plan. Keep the next step manageable.":done>0?"You've made progress. Pick the next task when you're ready.":"Start with one manageable task. You can adjust your plan anytime.";}$("dashboardSessions").textContent=String(state.sessions.length);const minutes=state.sessions.reduce((n,s)=>n+s.minutes,0);$("dashboardMinutes").textContent=minutes>=60?Math.floor(minutes/60)+"h "+(minutes%60)+"m":minutes+" min";
    const root=$("dashboardSubjectProgress");root.replaceChildren();subjects.forEach(subject=>{const tasks=state.tasks.filter(t=>t.subject===subject);if(!tasks.length)return;const complete=tasks.filter(t=>t.done).length,pct=Math.round(complete/tasks.length*100),wrap=element("div","space-y-2"),line=element("div","flex items-center justify-between gap-2 text-xs");line.append(element("span","text-gray-200 font-semibold",subject),element("span","text-gray-400",complete+"/"+tasks.length+" · "+pct+"%"));const track=element("div","dashboard-progress-track"),fill=element("div","dashboard-progress-fill");fill.style.width=pct+"%";track.append(fill);wrap.append(line,track);root.append(wrap);});if(!root.children.length)root.append(element("p","text-sm text-gray-500","Add tasks to see subject-wise progress."));
  }
  function stopTimerInterval(){ if(timerInterval!==null){ clearInterval(timerInterval); timerInterval=null; } }
  function timerModeDuration(){ return TIMER_MODES[timerMode].minutes * 60000; }
  function formatTimer(ms){ const total=Math.ceil(Math.max(0,ms)/1000),m=Math.floor(total/60),s=total%60; return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); }
  function updateTimerUI(){
    const remaining=timerEndAt===null?timerRemainingMs:Math.max(0,timerEndAt-Date.now());
    const clock=$("dashboardTimerClock"),label=$("dashboardTimerModeLabel"),fill=$("dashboardTimerFill"),track=$("dashboardTimerTrack"),toggle=$("dashboardTimerToggle");
    if(clock){clock.textContent=formatTimer(remaining);clock.setAttribute("aria-label",formatTimer(remaining)+" remaining");}
    if(label)label.textContent=TIMER_MODES[timerMode].label;
    const pct=Math.round(remaining/timerModeDuration()*100);
    if(fill)fill.style.width=pct+"%";
    if(track)track.setAttribute("aria-valuenow",String(pct));
    if(toggle){const running=timerInterval!==null;toggle.innerHTML=running?'<i class="fa-solid fa-pause" aria-hidden="true"></i> Pause':'<i class="fa-solid fa-play" aria-hidden="true"></i> '+(remaining===0?"Start again":running?"Pause":timerEndAt===null&&remaining<timerModeDuration()?"Resume":timerMode==="focus"?"Start focus":"Start break");}
    document.querySelectorAll("[data-pomodoro-mode]").forEach(b=>{const active=b.dataset.pomodoroMode===timerMode;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
  }
  function completeTimer(){
    stopTimerInterval();timerEndAt=null;timerRemainingMs=0;updateTimerUI();
    if(timerMode==="focus"){
      const minutes=TIMER_MODES.focus.minutes;
      state.sessions.push({id:id(),subject:timerSubjectAtStart,minutes,date:today(),createdAt:Date.now(),source:"pomodoro"});
      save();render();
      const hint=$("dashboardTimerHint");if(hint)hint.textContent="Focus round complete — "+minutes+" minutes logged for "+timerSubjectAtStart+". Take a break if you need one.";
      setStatus("Focus round complete. "+minutes+" minutes were added to your study history.");
    } else { const hint=$("dashboardTimerHint");if(hint)hint.textContent="Break complete. Start another focus round whenever you are ready.";setStatus("Break complete. Ready for another round when you are."); }
  }
  function tickTimer(){timerRemainingMs=Math.max(0,timerEndAt-Date.now());if(timerRemainingMs<=0)completeTimer();else updateTimerUI();}
  function setTimerMode(mode){if(!Object.prototype.hasOwnProperty.call(TIMER_MODES,mode))return;stopTimerInterval();timerEndAt=null;timerMode=mode;timerRemainingMs=timerModeDuration();updateTimerUI();const hint=$("dashboardTimerHint");if(hint)hint.textContent=mode==="focus"?"A focus round logs to your study history when it finishes.":"Break time is for resting; it will not add study minutes.";}
  function toggleTimer(){
    if(timerInterval!==null){timerRemainingMs=Math.max(0,timerEndAt-Date.now());timerEndAt=null;stopTimerInterval();updateTimerUI();const hint=$("dashboardTimerHint");if(hint)hint.textContent="Timer paused. Resume when you are ready.";return;}
    if(timerRemainingMs<=0)timerRemainingMs=timerModeDuration();
    if(timerMode==="focus")timerSubjectAtStart=$("dashboardTimerSubject")?.value||"Other";
    timerEndAt=Date.now()+timerRemainingMs;timerInterval=setInterval(tickTimer,250);updateTimerUI();const hint=$("dashboardTimerHint");if(hint)hint.textContent=timerMode==="focus"?"Focus on one task. You can pause any time.":"Take a comfortable break; the timer will not log study time.";
  }
  function render(){if($("dashboardDate"))$("dashboardDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});renderTasks();renderProgress();document.querySelectorAll("[data-task-filter]").forEach(b=>b.classList.toggle("active",b.dataset.taskFilter===filter));}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="icse-masterclass-dashboard-backup-"+today()+".json";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);setStatus("Backup exported. Keep it somewhere private; it contains your tasks and study history.");}
  window.exportDashboardData=exportData;
  window.clearDashboardData=function(){if(!confirm("Clear all dashboard tasks and study sessions from this browser? Export a backup first if you may need it."))return;state={version:1,tasks:[],sessions:[],syllabusProgress:{}};save();render();if(window.renderSyllabusTracker)window.renderSyllabusTracker();};
  document.addEventListener("DOMContentLoaded",()=>{load();document.querySelectorAll("[data-pomodoro-mode]").forEach(b=>b.addEventListener("click",()=>setTimerMode(b.dataset.pomodoroMode)));$("dashboardTimerToggle")?.addEventListener("click",toggleTimer);$("dashboardTimerReset")?.addEventListener("click",()=>{stopTimerInterval();timerEndAt=null;timerRemainingMs=timerModeDuration();updateTimerUI();const hint=$("dashboardTimerHint");if(hint)hint.textContent="Timer reset. Ready when you are.";});updateTimerUI();const taskForm=$("dashboardTaskForm");taskForm?.addEventListener("submit",e=>{e.preventDefault();const title=$("dashboardTaskTitle").value.trim();if(!title)return;state.tasks.push({id:id(),title,subject:$("dashboardTaskSubject").value,due:$("dashboardTaskDue").value||"",done:false,createdAt:Date.now(),completedAt:null});taskForm.reset();save();render();$("dashboardTaskTitle").focus();});$("dashboardSessionForm")?.addEventListener("submit",e=>{e.preventDefault();const minutes=Number($("dashboardSessionMinutes").value);if(!Number.isInteger(minutes)||minutes<1||minutes>600){setStatus("Enter a whole number of minutes from 1 to 600.",true);return;}state.sessions.push({id:id(),subject:$("dashboardSessionSubject").value,minutes,date:today(),createdAt:Date.now()});save();render();});document.querySelectorAll("[data-task-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.taskFilter;render();}));$("dashboardImportFile")?.addEventListener("change",async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error("Backup is larger than 2 MB.");const parsed=JSON.parse(await file.text());if(!validState(parsed))throw Error("This file is not a valid Study Vault dashboard backup.");if(!confirm("Import this backup and replace the tasks and study sessions currently saved in this browser?"))return;state={...parsed,syllabusProgress:parsed.syllabusProgress||{}};save();render();if(window.renderSyllabusTracker)window.renderSyllabusTracker();setStatus("Backup imported and saved on this device.");}catch(err){setStatus(err.message||"Could not import that backup file.",true);}finally{e.target.value="";}});$("dashboardTaskDue").min=today();render();});
})();