/////////////////////////////////////////////////////
// GLOBALS
/////////////////////////////////////////////////////

let activeJobs = new Set();
let durationTimers = {};

/////////////////////////////////////////////////////
// CSRF
/////////////////////////////////////////////////////

function getCSRF(){
return document.querySelector("[name=csrfmiddlewaretoken]").value;
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

moveRowToTop(id);
activeJobs.add(id);
updateStatus(id);

}catch(err){
console.error("recheck error", err);
}

});


/////////////////////////////////////////////////////
// FILTER TABLE
/////////////////////////////////////////////////////

function filterTable(){

const env     = document.getElementById("filter-env")?.value.toUpperCase() || "";
const request = document.getElementById("filter-request")?.value.toUpperCase() || "";
const status  = document.getElementById("filter-status")?.value.toUpperCase() || "";
const parent  = document.getElementById("filter-parent")?.value.toUpperCase() || "";
const child   = document.getElementById("filter-child")?.value.toUpperCase() || "";
const user    = document.getElementById("filter-user")?.value.toUpperCase() || "";

document.querySelectorAll("tbody tr").forEach(row=>{

const tds = row.querySelectorAll("td");

const envText     = tds[1]?.innerText.toUpperCase() || "";
const requestText = tds[2]?.innerText.toUpperCase() || "";
const statusText  = tds[3]?.innerText.toUpperCase() || "";
const parentText  = tds[4]?.innerText.toUpperCase() || "";
const childText   = tds[5]?.innerText.toUpperCase() || "";
const userText    = tds[6]?.innerText.toUpperCase() || "";

const show =
envText.includes(env) &&
requestText.includes(request) &&
statusText.includes(status) &&
parentText.includes(parent) &&
childText.includes(child) &&
userText.includes(user);

row.style.display = show ? "" : "none";

});

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
// UPDATE STATUS
/////////////////////////////////////////////////////

function updateStatus(id){

fetch(`/status/${id}/`)
.then(res=>res.json())
.then(data=>{

if(!data) return;

document.getElementById(`status-${id}`).innerHTML = statusBadge(data.status);

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
document.getElementById(`started-${id}`).innerText = data.started_at || "-";
document.getElementById(`completed-${id}`).innerText = data.completed_at || "-";

const status = (data.status || "").toLowerCase();
const child  = (data.current_status || "").toUpperCase();

updateRowStyle(id, data.status, data.current_status)

const terminal =
status === "completed" ||
status === "failed";

const onHold = child.includes("ON_HOLD");

if(!terminal){
activeJobs.add(id);
}else{
activeJobs.delete(id);

if(typeof wbMarkFinished === "function"){
wbMarkFinished(id)
}
}

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

const start = new Date(startedAt)

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

activeJobs.add(id);
moveRowToTop(id);
updateStatus(id);

});

});

setInterval(()=>{
activeJobs.forEach(id=>updateStatus(id))
},5000);

window.addEventListener("load",()=>{
document.querySelectorAll("tr[id^='row-']")
.forEach(row=>{
const id=row.id.replace("row-","")
updateStatus(id)
})
setTimeout(updateCounters,500);
});

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
// POLLING
/////////////////////////////////////////////////////

setInterval(()=>{
activeJobs.forEach(id=>updateStatus(id))
},5000);

/////////////////////////////////////////////////////
// INITIAL LOAD
/////////////////////////////////////////////////////

window.addEventListener("load",()=>{
document.querySelectorAll("tr[id^='row-']")
.forEach(row=>{
const id=row.id.replace("row-","")
updateStatus(id)
})
setTimeout(updateCounters,500);
});


/////////////////////////////////////////////////////
// BADGES
/////////////////////////////////////////////////////

function statusBadge(text){

const t = (text || "").toUpperCase();

if(t.includes("RUNNING") || t.includes("PROCESSING"))
return `<span class="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">Running</span>`;

if(t.includes("COMPLETED"))
return `<span class="bg-green-600/20 text-green-400 px-2 py-0.5 rounded">Completed</span>`;

if(t.includes("FAILED"))
return `<span class="bg-red-600/20 text-red-400 px-2 py-0.5 rounded">Failed</span>`;

return text;
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
