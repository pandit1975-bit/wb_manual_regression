/////////////////////////////////////////////////////
// GLOBALS
/////////////////////////////////////////////////////

let activeJobs = new Set();
let durationTimers = {};
let runStartTimes = {};

/////////////////////////////////////////////////////
// LOAD SERVICES FILTER DROPDOWN
/////////////////////////////////////////////////////

async function loadServicesFilter(){

const select = document.getElementById("filter-services")
if(!select) return

const res = await fetch("/workbench/services/catalog/")
const data = await res.json()

// clear existing
select.innerHTML = '<option value="">All</option>'

// sort ASC
const services = data.services.sort()

services.forEach(s=>{
const opt = document.createElement("option")
opt.value = s
opt.textContent = s
select.appendChild(opt)
})

}

/////////////////////////////////////////////////////
// CSRF
/////////////////////////////////////////////////////

function getCSRF(){
return document.querySelector("[name=csrfmiddlewaretoken]").value;
}


/////////////////////////////////////////////////////
// SHORT DATE
/////////////////////////////////////////////////////

function shortDT(str){
if(!str || str === "-") return "-"

const d = new Date(str)

return d.toLocaleString("en-US",{
month:"2-digit",
day:"2-digit",
year:"numeric",
hour:"numeric",
minute:"2-digit",
hour12:true
})
}

/////////////////////////////////////////////////////
// GLOBAL CLICK HANDLER (RECHECK)
/////////////////////////////////////////////////////

document.addEventListener("click", async function(e){

const btn = e.target.closest(".recheck-btn");
if(!btn) return;

const id = btn.dataset.id;

console.log("RECHECK CLICK", id);

try{

await fetch(`/workbench/recheck/${id}/`,{
method:"POST",
credentials:"same-origin",
headers:{
"X-CSRFToken": getCSRF(),
"X-Requested-With":"XMLHttpRequest"
}
});

runStartTimes[id] = new Date();
activeJobs.add(id);
moveRowToTop(id);
updateStatus(id);

}catch(err){
console.error("recheck error", err);
}

});


/////////////////////////////////////////////////////
// FILTER TABLE
/////////////////////////////////////////////////////

function filterTable(){

const env      = document.getElementById("filter-env")?.value.toUpperCase() || ""
const groupSelect = document.getElementById("filter-group")
const groups = groupSelect?.tomselect?.getValue() || []
const services = document.getElementById("filter-services")?.value.toUpperCase() || ""
const notes = document.getElementById("filter-notes")?.value.toUpperCase() || ""
const request  = document.getElementById("filter-request")?.value.toUpperCase() || ""
const status   = document.getElementById("filter-status")?.value.toUpperCase() || ""
const parent   = document.getElementById("filter-parent")?.value.toUpperCase() || ""
const child    = document.getElementById("filter-child")?.value.toUpperCase() || ""
const user     = document.getElementById("filter-user")?.value.toUpperCase() || ""

document.querySelectorAll("tbody tr").forEach(row=>{

const envText      = row.children[2]?.innerText.toUpperCase() || ""
const groupText    = row.children[3]?.innerText.toUpperCase() || ""
const servicesText = row.children[4]?.innerText.toUpperCase() || ""
const notesText =
row.children[5]?.dataset?.notes?.toUpperCase() || ""
const requestText  = row.children[6]?.innerText.toUpperCase() || ""
const statusText   = row.children[7]?.innerText.toUpperCase() || ""
const parentText   = row.children[8]?.innerText.toUpperCase() || ""
const childText    = row.children[9]?.innerText.toUpperCase() || ""
const userText     = row.children[10]?.innerText.toUpperCase() || ""

const show =
envText.includes(env) &&
(groups.length === 0 || groups.some(g => groupText.includes(g.toUpperCase()))) &&
servicesText.includes(services) &&
notesText.includes(notes) &&
requestText.includes(request) &&
statusText.includes(status) &&
parentText.includes(parent) &&
childText.includes(child) &&
userText.includes(user)

row.style.display = show ? "" : "none"

})

updateRowNumbers()
}

/////////////////////////////////////////////////////
// MOVE ROW
/////////////////////////////////////////////////////

function moveRowToTop(id){
const row = document.getElementById(`row-${id}`);
const tbody = document.querySelector("tbody");
if(row && tbody) tbody.prepend(row);
}


/////////////////////////////////////////////////////
// COUNTERS
/////////////////////////////////////////////////////

function updateCounters(){

let running=0, completed=0, failed=0, hold=0;

document.querySelectorAll("tbody tr").forEach(row=>{

const statusEl = row.querySelector("[id^='status-']");
const childEl  = row.querySelector("[id^='child-']");

const status = statusEl ? statusEl.textContent.toUpperCase() : "";
const child  = childEl  ? childEl.textContent.toUpperCase()  : "";

if(child.includes("ON HOLD") || child.includes("ON_HOLD")) hold++;

if(status.includes("RUNNING") || status.includes("PROCESSING")) running++;
else if(status.includes("COMPLETED")) completed++;
else if(status.includes("FAILED") || status.includes("ABANDONED") || status.includes("ERRORED")) failed++;

});

document.getElementById("count-running").innerText = running;
document.getElementById("count-completed").innerText = completed;
document.getElementById("count-failed").innerText = failed;
document.getElementById("count-hold").innerText = hold;
}


/////////////////////////////////////////////////////
// BUILD JOB URL
/////////////////////////////////////////////////////

function buildJobUrl(env, jid){

if(!jid) return "#"

if(env === "prod"){
return `http://wbstatus.intra.infousa.com/JobRequest/JobRequest/?JobID=${jid}`
}

return `http://stagewbstatus/JobRequest/JobRequest/?JobID=${jid}`
}

/////////////////////////////////////////////////////
// RENDER PARENT + SUB
/////////////////////////////////////////////////////

function renderParentChild(id, data){

const parentEl = document.getElementById(`parent-${id}`)
const childEl  = document.getElementById(`child-${id}`)

if(!parentEl || !childEl) return

const env = data.environment || "stage"

const parentJid = data.job_id
const parentStatus = data.overall_status || "-"

let childJid = null
let childStatus = "-"

if(data.current_status){
const parts = data.current_status.split(" ")
childJid = parts[0]
childStatus = parts.slice(1).join(" ")
}

parentEl.innerHTML = parentJid
? `<a href="${buildJobUrl(env,parentJid)}"
target="_blank"
class="text-blue-400 hover:underline font-mono">
${parentJid}
</a>
<span class="text-gray-400 ml-2">${parentStatus}</span>`
: "-"

childEl.innerHTML = childJid
? `<a href="${buildJobUrl(env,childJid)}"
target="_blank"
class="text-blue-400 hover:underline font-mono">
${childJid}
</a>
<span class="text-gray-400 ml-2">${childStatus}</span>`
: "-"
}

/////////////////////////////////////////////////////
// LOAD GROUP FILTER
/////////////////////////////////////////////////////

async function loadGroupFilter(){

const select = document.getElementById("filter-group")
if(!select) return

const res = await fetch("/workbench/groups/json/")
const data = await res.json()

select.innerHTML = ""

data.groups.sort().forEach(g=>{
const opt = document.createElement("option")
opt.value = g
opt.textContent = g
select.appendChild(opt)
})

/////////////////////////////////////////////////////
// TOM SELECT GROUP FILTER
/////////////////////////////////////////////////////

const ts = new TomSelect(select,{
plugins:['checkbox_options'],
closeAfterSelect:false,
hideSelected:false,

render:{
option:function(data,escape){
return `<div class="ts-opt">${escape(data.text)}</div>`
}
},

onInitialize:function(){
updateGroupLabel(this)
},

onChange:function(){
updateGroupLabel(this)
filterTable()
}

})

function updateGroupLabel(ts){

const count = ts.items.length

if(count === 0){
ts.control_input.placeholder = "All"
}
else if(count === 1){
ts.control_input.placeholder =
ts.options[ts.items[0]].text
}
else{
ts.control_input.placeholder =
count + " groups"
}

}
}

/////////////////////////////////////////////////////
// UPDATE STATUS
/////////////////////////////////////////////////////

function updateStatus(id){

fetch(`/status/${id}/`)
.then(res=>res.json())
.then(data=>{

if(!data) return;

const parentStatusText = (data.overall_status || "").toUpperCase()
const childStatusText  = (data.current_status || "").toUpperCase()

let displayStatus = parentStatusText

if(childStatusText.includes("ON_HOLD")){
displayStatus = "ON_HOLD"
}
else if(childStatusText.includes("ERRORED")){
displayStatus = "ERRORED"
}
else if(childStatusText.includes("ABANDONED")){
displayStatus = "ABANDONED"
}
else if(childStatusText.includes("FAILED")){
displayStatus = "FAILED"
}

document.getElementById(`status-${id}`).innerHTML = statusBadge(displayStatus);

const parentEl = document.getElementById(`parent-${id}`);
const childEl  = document.getElementById(`child-${id}`);

//////////////////////////////////////////////////
// ADD THIS BLOCK (job url builder)
//////////////////////////////////////////////////

const env = (data.environment || "stage").toLowerCase()

function jobUrl(jid){
if(!jid) return "#"

if(env === "prod"){
return `http://wbstatus.intra.infousa.com/JobRequest/JobRequest/?JobID=${jid}`
}
return `http://stagewbstatus/JobRequest/JobRequest/?JobID=${jid}`
}

//////////////////////////////////////////////////
// PARENT
//////////////////////////////////////////////////

const parentJid = data.job_id;
const parentStatus = data.overall_status || "-";

if(parentJid){
parentEl.innerHTML =
`<a href="${jobUrl(parentJid)}"
target="_blank"
class="text-blue-400 hover:underline font-mono">
${parentJid}
</a>
<span class="text-gray-400 ml-2">${parentStatus}</span>`;
}else{
parentEl.innerHTML="-";
}

//////////////////////////////////////////////////
// SUB
//////////////////////////////////////////////////

let childJid = null;
let childStatus = "-";

if(data.current_status){
const parts = data.current_status.split(" ");
childJid = parts[0];
childStatus = parts.slice(1).join(" ");
}

if(childJid){
childEl.innerHTML =
`<a href="${jobUrl(childJid)}"
target="_blank"
class="text-blue-400 hover:underline font-mono">
${childJid}
</a>
<span class="text-gray-400 ml-2">${childStatus}</span>`;
}else{
childEl.innerHTML="-";
}

document.getElementById(`user-${id}`).innerText = data.submitter || "-";
document.getElementById(`started-${id}`).innerText = shortDT(data.started_at);
document.getElementById(`completed-${id}`).innerText = shortDT(data.completed_at);

const status = (data.status || "").toLowerCase();
const child  = (data.current_status || "").toUpperCase();

updateRowStyle(id, data.status, data.current_status)

const parentTerminal =
parentStatusText.includes("COMPLETED") ||
parentStatusText.includes("FAILED") ||
parentStatusText.includes("ABANDONED")

const childTerminal =
childStatusText.includes("ERRORED")

const terminal = parentTerminal

if(terminal){
activeJobs.delete(id)
stopDurationTimer(id)
}else{
activeJobs.add(id)
}

const onHold = child.includes("ON_HOLD");

// always keep polling unless terminal
if(terminal){
activeJobs.delete(id)
stopDurationTimer(id)
}else{
activeJobs.add(id)
}

// duration logic only
if(!terminal && !onHold){
startDurationTimer(id, data.started_at)
}else{
stopDurationTimer(id)
document.getElementById(`duration-${id}`).innerText = data.duration || "-";
}

updateCounters();

});

}

/////////////////////////////////////////////////////
// LIVE DURATION
/////////////////////////////////////////////////////

function startDurationTimer(id, startedAt){

if(!startedAt || startedAt === "-") return

if(durationTimers[id]){
clearInterval(durationTimers[id])
}

const start =
runStartTimes[id]
? new Date(runStartTimes[id])
: new Date(startedAt)

durationTimers[id] = setInterval(()=>{

const now = new Date()
const diff = Math.floor((now - start)/1000)

const mins = Math.floor(diff/60)
const secs = diff % 60

const text =
mins>0 ? `${mins}m ${secs}s` : `${secs}s`

const el = document.getElementById(`duration-${id}`)
if(el) el.innerText = text

},1000)

}

function stopDurationTimer(id){
if(durationTimers[id]){
clearInterval(durationTimers[id])
delete durationTimers[id]
}
}

/////////////////////////////////////////////////////
// MAIN
/////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", function () {

const selectAll = document.getElementById("selectAll");

if(selectAll){
selectAll.addEventListener("change", function(){
document.querySelectorAll(".row-select")
.forEach(cb => cb.checked = this.checked)
});
}

const runSelected = document.getElementById("runSelected");

if(runSelected){
runSelected.addEventListener("click", function(){
document.querySelectorAll(".row-select:checked").forEach(cb=>{
const id = cb.value;
wbAddToQueue(id);
updateStatus(id);
});
});
}

document.querySelectorAll(".run-btn").forEach(btn => {

const form = btn.closest("form");
if(!form) return;

form.addEventListener("submit", function(){

const id = btn.dataset.id;

runStartTimes[id] = new Date();
activeJobs.add(id);
moveRowToTop(id);
updateStatus(id);

});

});

/////////////////////////////////////////////////////
// RESILIENT POLLING (LONG RUN SAFE)
/////////////////////////////////////////////////////

setInterval(()=>{

document.querySelectorAll("tr[id^='row-']").forEach(row=>{

const id = row.id.replace("row-","")

const status =
row.querySelector("[id^='status-']")
?.innerText
?.toUpperCase() || ""

const terminal =
status.includes("COMPLETED") ||
status.includes("FAILED") ||
status.includes("ABANDONED") ||
status.includes("ERRORED")

if(!terminal){
updateStatus(id)
}

})

},10000)   // 10 sec safe for long jobs

setTimeout(updateCounters,500);
setTimeout(updateRowNumbers,100);
});


/////////////////////////////////////////////////////
// SELECT ALL
/////////////////////////////////////////////////////

const selectAll = document.getElementById("selectAll");

if(selectAll){
selectAll.addEventListener("change", function(){
document.querySelectorAll(".row-select")
.forEach(cb => cb.checked = this.checked)
});
}

/////////////////////////////////////////////////////
// RUN SELECTED
/////////////////////////////////////////////////////

const runSelected = document.getElementById("runSelected");

if(runSelected){

runSelected.addEventListener("click", function(){

const selected =
document.querySelectorAll(".row-select:checked");

selected.forEach(cb=>{

const id = cb.value;

wbAddToQueue(id);

updateStatus(id);

});

});
}

/////////////////////////////////////////////////////
// SINGLE RUN
/////////////////////////////////////////////////////

document.querySelectorAll(".run-btn").forEach(btn => {

const form = btn.closest("form");
if(!form) return;

form.addEventListener("submit", function(){

const id = btn.dataset.id;

activeJobs.add(id);
moveRowToTop(id);
updateStatus(id);

});

});

/////////////////////////////////////////////////////
// INITIAL LOAD (ONLY POLL ACTIVE JOBS)
/////////////////////////////////////////////////////

window.addEventListener("load",()=>{

loadServicesFilter()
restoreUI()
loadGroupFilter()

document.querySelectorAll("tr[id^='row-']")
.forEach(row=>{

const id = row.id.replace("row-","")

const statusText =
row.querySelector("[id^='status-']")
?.innerText
?.toUpperCase() || ""

const started =
row.querySelector(`[id^='started-${id}']`)?.innerText

const completed =
row.querySelector(`[id^='completed-${id}']`)?.innerText

const terminal =
statusText.includes("COMPLETED") ||
statusText.includes("FAILED") ||
statusText.includes("ABANDONED") ||
statusText.includes("ERRORED")

// start timer only if running
if(!terminal && started && started !== "-"){
startDurationTimer(id, started)
}

if(!terminal && (
statusText.includes("RUNNING") ||
statusText.includes("PROCESSING") ||
statusText.includes("QUEUED")
)){
activeJobs.add(id)
updateStatus(id)
}

})

setTimeout(updateCounters,500)

})

/////////////////////////////////////////////////////
// BADGES
/////////////////////////////////////////////////////

function statusBadge(text){

const t = (text || "").toUpperCase()

// PROCESSING
if(t.includes("PROCESSING"))
return `<span class="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">Processing</span>`

// RUNNING
if(t.includes("RUNNING"))
return `<span class="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">Running</span>`

// COMPLETED
if(t.includes("COMPLETED"))
return `<span class="bg-green-600/20 text-green-400 px-2 py-0.5 rounded">Completed</span>`

// ERRORED
if(t.includes("ERRORED"))
return `<span class="bg-red-600/20 text-red-400 px-2 py-0.5 rounded">Errored</span>`

// ABANDONED
if(t.includes("ABANDONED"))
return `<span class="bg-red-600/20 text-red-400 px-2 py-0.5 rounded">Abandoned</span>`

// FAILED
if(t.includes("FAILED"))
return `<span class="bg-red-600/20 text-red-400 px-2 py-0.5 rounded">Failed</span>`

// ON HOLD
if(t.includes("ON_HOLD") || t.includes("ON HOLD"))
return `<span class="bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded">On Hold</span>`

// QUEUED
if(t.includes("QUEUED"))
return `<span class="bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">Queued</span>`

return text
}

/////////////////////////////////////////////////////
// VISUAL CLUE OF THE JOB STATUSES
/////////////////////////////////////////////////////

function updateRowStyle(id, status, child){

const row = document.getElementById(`row-${id}`)
if(!row) return

row.classList.remove(
"bg-blue-900/20",
"bg-purple-900/20",
"bg-green-900/10",
"bg-red-900/20",
"animate-pulse"
)

const s = (status || "").toUpperCase()
const c = (child || "").toUpperCase()

if(s.includes("RUNNING") || s.includes("PROCESSING")){
row.classList.add("bg-blue-900/20","animate-pulse")
}
else if(s.includes("QUEUED")){
row.classList.add("bg-purple-900/20")
}
else if(s.includes("COMPLETED")){
row.classList.add("bg-green-900/10")
}
else if(s.includes("FAILED") || s.includes("ABANDONED")){
row.classList.add("bg-red-900/20")
}

if(c.includes("ON_HOLD")){
row.classList.add("bg-yellow-900/20")
}
}


/////////////////////////////////////////////////////
// DATE FILTER
/////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded",()=>{

const panel = document.getElementById("dateFilterPanel")

/////////////////////////////////////////////////////
// OPEN / CLOSE
/////////////////////////////////////////////////////

document.getElementById("filter-started-btn")?.addEventListener("click",()=>{
panel.classList.toggle("hidden")
})

document.getElementById("filter-completed-btn")?.addEventListener("click",()=>{
panel.classList.toggle("hidden")
})

/////////////////////////////////////////////////////
// QUICK BUTTONS
/////////////////////////////////////////////////////

document.querySelectorAll(".quick-time").forEach(btn=>{

btn.addEventListener("click",()=>{

const now = new Date()
let from = new Date()

const type = btn.dataset.range

if(type==="1h") from.setHours(now.getHours()-1)
if(type==="6h") from.setHours(now.getHours()-6)
if(type==="24h") from.setHours(now.getHours()-24)

if(type==="today"){
from = new Date()
from.setHours(0,0,0,0)
}

if(type==="yesterday"){

const start = new Date()
start.setDate(start.getDate()-1)
start.setHours(0,0,0,0)

const end = new Date()
end.setDate(end.getDate()-1)
end.setHours(23,59,59,999)

document.getElementById("timeFrom").value = toLocal(start)
document.getElementById("timeTo").value   = toLocal(end)
return
}

document.getElementById("timeFrom").value = toLocal(from)
document.getElementById("timeTo").value   = toLocal(now)

})

})


/////////////////////////////////////////////////////
// APPLY
/////////////////////////////////////////////////////

document.getElementById("applyDateFilter")?.addEventListener("click",()=>{

const fromVal = document.getElementById("timeFrom")?.value
const toVal   = document.getElementById("timeTo")?.value

const from = fromVal ? new Date(fromVal) : null
const to   = toVal   ? new Date(toVal)   : null

document.querySelectorAll("tbody tr").forEach(row=>{

const startedText = row.querySelector("[id^='started-']")?.innerText
const started = parseWBDate(startedText)

let show = true

if(from && (!started || started < from)) show=false
if(to && (!started || started > to)) show=false

row.style.display = show ? "" : "none"

})

panel.classList.add("hidden")

})

/////////////////////////////////////////////////////
// CLEAR
/////////////////////////////////////////////////////

document.getElementById("clearDateFilter")?.addEventListener("click",()=>{

document.getElementById("timeFrom").value=""
document.getElementById("timeTo").value=""

document.querySelectorAll("tbody tr")
.forEach(r=>r.style.display="")

panel.classList.add("hidden")

})

/////////////////////////////////////////////////////
// HELPERS
/////////////////////////////////////////////////////

function toLocal(date){
return new Date(date.getTime() - date.getTimezoneOffset()*60000)
.toISOString().slice(0,16)
}

function parseWBDate(str){

if(!str || str === "-") return null;

return new Date(str.replace(/,/g,""));

}

})

/////////////////////////////////////////////////////
// UPDATE ROW NUMBER
/////////////////////////////////////////////////////

function updateRowNumbers(){

let i = 1;

document.querySelectorAll("tbody tr").forEach(row => {

if(row.style.display === "none") return;

const cell = row.querySelector(".row-number")
if(cell){
cell.textContent = i++
}

})

}

/////////////////////////////////////////////////////
// LOAD GROUP
/////////////////////////////////////////////////////

document.getElementById("loadGroup")
?.addEventListener("change", async function(){

const id = this.value
if(!id) return

await fetch(`/workbench/groups/load/${id}/`)

location.reload()

})

/////////////////////////////////////////////////////
// DELETE DASHBOARD ROW
/////////////////////////////////////////////////////

document.addEventListener("click", function(e){

const btn = e.target.closest(".delete-btn")
if(!btn) return

const id = btn.dataset.id

fetch(`/workbench/delete/${id}/`,{
method:"POST",
headers:{
"X-CSRFToken": getCSRF()
}
})
.then(()=>location.reload())

})

/////////////////////////////////////////////////////
// RESTORE UI AFTER REFRESH
/////////////////////////////////////////////////////

function restoreUI(){

document.querySelectorAll("tr[id^='row-']").forEach(row=>{

const id = row.id.replace("row-","")

const statusEl = document.getElementById(`status-${id}`)
const startedEl = document.getElementById(`started-${id}`)
const completedEl = document.getElementById(`completed-${id}`)

if(!statusEl) return

const statusText = statusEl.innerText.trim()

// restore badge
statusEl.innerHTML = statusBadge(statusText)

// restore row color
updateRowStyle(id, statusText, "")

// restore duration
const started = startedEl?.innerText
const completed = completedEl?.innerText

if(started && started !== "-"){

const start = new Date(started)

let end = new Date()

if(completed && completed !== "-"){
end = new Date(completed)
}

const diff = Math.floor((end - start)/1000)

const mins = Math.floor(diff/60)
const secs = diff % 60

const text =
mins>0 ? `${mins}m ${secs}s` : `${secs}s`

const durEl = document.getElementById(`duration-${id}`)
if(durEl) durEl.innerText = text
}

})

}

/////////////////////////////////////////////////////
// FOR NOTES
/////////////////////////////////////////////////////

let currentNotesId = null;

document.addEventListener("click", e => {

const add = e.target.closest(".notes-add, .notes-edit");
if(add){
currentNotesId = add.dataset.id;
document.getElementById("notesModal").classList.remove("hidden");
loadNotes(currentNotesId);
}

const del = e.target.closest(".notes-delete");
if(del){
deleteNotes(del.dataset.id);
}

});

document.getElementById("notesCancel").onclick = () =>
document.getElementById("notesModal").classList.add("hidden");

document.getElementById("notesSave").onclick = async () => {

const text = document.getElementById("notesText").value;

fetch(`/workbench/notes/${currentNotesId}/save/`,{
method:"POST",
headers:{
"Content-Type":"application/json",
"X-CSRFToken": getCSRF()
},
body: JSON.stringify({notes:text})
});

location.reload();

};

/////////////////////////////////////////////////////
// NOTES HELPERS
/////////////////////////////////////////////////////

async function loadNotes(id){

const r = await fetch(`/workbench/notes/${id}/`);
const data = await r.json();

document.getElementById("notesText").value =
data.notes || "";

}

async function deleteNotes(id){

if(!confirm("Delete notes?")) return;

await fetch(`/workbench/notes/${id}/delete/`,{
method:"POST",
headers:{
"X-CSRFToken": getCSRF()
}
});

location.reload();

}

/////////////////////////////////////////////////////
// NOTES TOOLTIP
/////////////////////////////////////////////////////

let notesTooltip;

document.addEventListener("mouseover", e => {

const btn = e.target.closest(".notes-edit");
if(!btn) return;

const text = btn.dataset.notes;
if(!text) return;

notesTooltip = document.createElement("div");

notesTooltip.className =
"fixed z-50 bg-gray-900 border border-gray-600 text-sm p-3 rounded-lg shadow-xl max-w-[450px] whitespace-pre-wrap leading-relaxed";

notesTooltip.innerText = text;

document.body.appendChild(notesTooltip);

const rect = btn.getBoundingClientRect();

notesTooltip.style.left = rect.left + "px";
notesTooltip.style.top  = (rect.bottom + 8) + "px";

});

document.addEventListener("mouseout", e => {

if(!notesTooltip) return;

if(e.target.closest(".notes-edit")){
notesTooltip.remove();
notesTooltip = null;
}

});;

