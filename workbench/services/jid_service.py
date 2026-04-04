import time
import json


def fetch_job_id(session, base, request_id):

    print("🔎 Fetching Job ID...")

    headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
    }

    for i in range(20):

        print(f"\n👉 attempt {i+1}")

        time.sleep(2)

        r = session.post(
            f"{base}/ProcessRequestDetailsWS.asmx/GetJobsByRequestIdJSON",
            json={"requestId": int(request_id)},
            headers=headers
        )

        print("STATUS:", r.status_code)
        print("RAW:", r.text[:200])

        try:
            data = r.json()
        except Exception as e:
            print("json error:", e)
            continue

        # first unwrap
        d = data.get("d")
        if not d:
            continue

        try:
            level1 = json.loads(d)
        except:
            continue

        # second unwrap
        return_value = level1.get("ReturnValue")
        if not return_value:
            continue

        try:
            level2 = json.loads(return_value)
        except:
            continue

        jobs = level2.get("Data")
        if not jobs:
            continue

        print("✅ JOB LIST:", jobs[:2])

        # newest job = first item
        job_id = jobs[0].get("jobNumber")

        if job_id:
            return str(job_id)

    raise Exception("Job ID not found")