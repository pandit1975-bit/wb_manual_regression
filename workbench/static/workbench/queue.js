const MAX_PARALLEL = 5

let wbQueue = []
let wbRunning = new Set()

function getCSRF(){
    return document.querySelector("[name=csrfmiddlewaretoken]").value
}

function wbUpdateStatus(id, text){
    const el = document.getElementById(`status-${id}`)
    if(el) el.innerText = text
}

function wbProcessQueue(){
    while(wbRunning.size < MAX_PARALLEL && wbQueue.length > 0){
        const id = wbQueue.shift()
        wbRunJob(id)
    }
}

async function wbRunJob(id){

    wbRunning.add(id)

    wbUpdateStatus(id,"Queued → Running")

    try{

        const res = await fetch(`/workbench/run/${id}/`,{
            method:"POST",
            credentials:"same-origin",
            headers:{
                "X-CSRFToken": getCSRF(),
                "X-Requested-With": "XMLHttpRequest"
            }
        })

        console.log("submitted", id, res.status)

        activeJobs.add(id)

        if(typeof updateStatus === "function"){
            updateStatus(id)
        }

    }catch(e){

        console.error("Queue error:", e)
        wbUpdateStatus(id,"Error")

    } finally {

        // 🔥 THIS FIXES RERUN
        wbRunning.delete(id)

        // process next job
        wbProcessQueue()
    }

}

function wbAddToQueue(id){

if(wbQueue.includes(id) || wbRunning.has(id)) return

wbQueue.push(id)
wbUpdateStatus(id,"Queued")
updateRowStyle(id, "queued", "")
wbProcessQueue()
}

function wbMarkFinished(id){
    wbRunning.delete(id)
    wbProcessQueue()
}