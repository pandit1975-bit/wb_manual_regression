/////////////////////////////////////////////////////
// CSRF
/////////////////////////////////////////////////////

function getCSRF(){
return document.querySelector("[name=csrfmiddlewaretoken]").value;
}

/////////////////////////////////////////////////////
// ADD TO GROUP
/////////////////////////////////////////////////////

document.addEventListener("click", function(e){

const btn = e.target.closest(".add-to-group")
if(!btn) return

const groupId = btn.dataset.group

const env = document.getElementById(`env-${groupId}`).value
const req = document.getElementById(`req-${groupId}`).value

if(!env || !req) return

fetch(`/groups/add/${groupId}/`,{
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
.then(()=>location.reload())

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