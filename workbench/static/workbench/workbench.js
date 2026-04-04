document.addEventListener("DOMContentLoaded", function () {

    const runBtn = document.getElementById("run-selected")

    if (!runBtn) return

    runBtn.addEventListener("click", async function () {

        const selected = document.querySelectorAll(".row-select:checked")

        if (selected.length === 0) {
            alert("Select at least one request")
            return
        }

        runBtn.disabled = true
        runBtn.innerText = "Running..."

        for (const cb of selected) {

            const id = cb.value

            await fetch(`/workbench/run/${id}/`, {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCSRFToken()
                }
            })

            // stagger selenium runs
            await sleep(5000)
        }

        runBtn.disabled = false
        runBtn.innerText = "Run Selected"

    })

})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function getCSRFToken() {
    return document.querySelector("[name=csrfmiddlewaretoken]").value
}