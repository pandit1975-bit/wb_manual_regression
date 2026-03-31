/////////////////////////////////////////////////////
// CSRF
/////////////////////////////////////////////////////

function getCSRF(){
return document.querySelector("[name=csrfmiddlewaretoken]").value;
}


/////////////////////////////////////////////////////
// DELETE ITEM
/////////////////////////////////////////////////////

document.addEventListener("click", function(e){

const btn = e.target.closest(".delete-group-item")
if(!btn) return

const id = btn.dataset.id

fetch(`/groups/delete-item/${id}/`,{
method:"POST",
headers:{
"X-CSRFToken": getCSRF()
}
})
.then(()=>location.reload())

})

/////////////////////////////////////////////////////
// DELETE GROUP
/////////////////////////////////////////////////////

document.addEventListener("click", function(e){

const btn = e.target.closest(".delete-group")
if(!btn) return

const id = btn.dataset.id

fetch(`/groups/delete/${id}/`,{
method:"POST",
headers:{
"X-CSRFToken": getCSRF()
}
})
.then(()=>location.reload())

})

/////////////////////////////////////////////////////
// CSRF
/////////////////////////////////////////////////////

function getCSRF(){
return document.querySelector("[name=csrfmiddlewaretoken]").value;
}

/////////////////////////////////////////////////////
// ADD TO GROUP
/////////////////////////////////////////////////////

document.addEventListener("click", async function(e){

const btn = e.target.closest(".add-to-group")
if(!btn) return

const groupId = btn.dataset.group

const env = document.getElementById(`env-${groupId}`).value
const req = document.getElementById(`req-${groupId}`).value

if(!env || !req) return

await fetch(`/workbench/groups/add/${groupId}/`,{
method:"POST",
headers:{
"Content-Type":"application/json",
"X-CSRFToken": getCSRF()
},
body:JSON.stringify({
environment: env,
request_id: req
})
})

location.reload()

})

/////////////////////////////////////////////////////
// DELETE ITEM
/////////////////////////////////////////////////////

document.addEventListener("click", function(e){

const btn = e.target.closest(".delete-group-item")
if(!btn) return

const id = btn.dataset.id

fetch(`/groups/delete-item/${id}/`,{
method:"POST",
headers:{
"X-CSRFToken": getCSRF()
}
})
.then(()=>location.reload())

})

/////////////////////////////////////////////////////
// DELETE GROUP
/////////////////////////////////////////////////////

document.addEventListener("click", function(e){

const btn = e.target.closest(".delete-group")
if(!btn) return

const id = btn.dataset.id

fetch(`/groups/delete/${id}/`,{
method:"POST",
headers:{
"X-CSRFToken": getCSRF()
}
})
.then(()=>location.reload())

})

/////////////////////////////////////////////////////
// OPEN SERVICE POPUP (FIXED)
/////////////////////////////////////////////////////

let currentItem = null
let serviceSelectInstance = null

document.addEventListener("click", async function(e){

const btn = e.target.closest(".add-item-service")
if(!btn) return

currentItem = btn.dataset.id

const popup = document.getElementById("servicePopup")
const select = document.getElementById("serviceSelect")

popup.classList.remove("hidden")

// destroy previous
if(serviceSelectInstance){
serviceSelectInstance.destroy()
}

// clear
select.innerHTML = ""

// load services
const res = await fetch("/workbench/services/catalog/")
const data = await res.json()

data.services.forEach(s=>{
const opt = document.createElement("option")
opt.value = s
opt.textContent = s
select.appendChild(opt)
})

// init TomSelect AFTER options added
serviceSelectInstance = new TomSelect("#serviceSelect",{
plugins:["remove_button"],
create:true,
persist:false,
placeholder:"Search services..."
})

})

/////////////////////////////////////////////////////
// SAVE MULTIPLE SERVICES
/////////////////////////////////////////////////////

document.getElementById("saveService")
?.addEventListener("click", async ()=>{

const values = serviceSelectInstance.getValue()

for(const name of values){

await fetch(`/workbench/items/${currentItem}/add-service/`,{
method:"POST",
headers:{
"Content-Type":"application/json",
"X-CSRFToken": getCSRF()
},
body:JSON.stringify({name})
})

}

location.reload()

})

/////////////////////////////////////////////////////
// CANCEL SERVICE POPUP
/////////////////////////////////////////////////////

document.getElementById("cancelService")
?.addEventListener("click", ()=>{

document.getElementById("servicePopup")
.classList.add("hidden")

})


/////////////////////////////////////////////////////
// DELETE GROUP SERVICE
/////////////////////////////////////////////////////

document.addEventListener("click", async function(e){

const btn = e.target.closest(".delete-item-service")
if(!btn) return

const id = btn.dataset.id
const name = btn.dataset.name

await fetch(`/workbench/items/${id}/remove-service/`,{
method:"POST",
headers:{
"Content-Type":"application/json",
"X-CSRFToken": getCSRF()
},
body:JSON.stringify({name})
})

location.reload()

})

/////////////////////////////////////////////////////
// ADD REQUEST SERVICE
/////////////////////////////////////////////////////

document.addEventListener("click", async function(e){

const btn = e.target.closest(".add-item-service")
if(!btn) return

currentItem = btn.dataset.id

document.getElementById("servicePopup")
.classList.remove("hidden")

})
