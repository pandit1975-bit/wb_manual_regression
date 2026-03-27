import time
import re
import requests
from bs4 import BeautifulSoup
from django.utils.timezone import now
from .workbench_service import build_status_url
from ..models import WorkbenchRequest
from requests_negotiate_sspi import HttpNegotiateAuth


# =========================
# Extract job tree from Kendo dataSource
# =========================
def extract_statuses(html, parent_job_id):

    matches = re.findall(r'"text":"([^"]+)"', html)

    jobs = []
    parent_status = None
    found_parent = False
    current_job = (None, None)

    for m in matches:

        parts = m.split(" - ")

        if len(parts) < 2:
            continue

        jid = parts[0].strip()
        status = parts[-1].strip()

        if not jid.isdigit():
            continue

        jobs.append((jid, status))

        # parent
        if jid == str(parent_job_id):
            parent_status = status
            found_parent = True
            continue

        # child AFTER parent only
        if found_parent:
            current_job = (jid, status)

    return parent_status, current_job, jobs


# =========================
# MAIN TRACKER
# =========================
def track_job(obj_id):
    obj = WorkbenchRequest.objects.get(pk=obj_id)

    print(f"📡 Tracking JobID={obj.job_id}")

    session = requests.Session()
    session.auth = HttpNegotiateAuth()

    for i in range(200):
        try:
            url = build_status_url(obj.environment, obj.job_id)

            print(f"\n🌐 Checking {url}")

            response = session.get(url, timeout=15)

            if response.status_code != 200:
                print("⚠️ Bad response:", response.status_code)
                time.sleep(10)
                continue

            html = response.text
            submitter = extract_user(html)

            if submitter:
                obj.submitter = submitter

            # =========================
            # EXTRACT
            # =========================
            parent_status, current_job, all_jobs = extract_statuses(
                html,
                obj.job_id
            )

            print(f"🎯 PARENT STATUS: {parent_status}")

            print("📦 JOB TREE:")
            for jid, status in all_jobs:
                print(f"   {jid} -> {status}")

            current_jid, current_status = current_job

            print(f"👉 CURRENT CHILD: {current_jid} -> {current_status}")

            # =========================
            # SAVE PARENT STATUS
            # =========================
            if parent_status:
                obj.overall_status = parent_status

                if parent_status.upper() == "COMPLETED":

                    obj.status = "completed"
                    obj.current_status = None
                    obj.completed_at = now().replace(microsecond=0)
                    obj.save()

                    print("🎉 COMPLETED")
                    return

                elif parent_status.upper() in ["FAILED", "ABANDONED"]:

                    obj.status = "failed"
                    obj.current_status = None
                    obj.completed_at = now().replace(microsecond=0)
                    obj.save()

                    print("❌ FAILED")
                    return

                else:
                    obj.status = "running"

            # =========================
            # SAVE CURRENT CHILD
            # =========================
            if current_jid:
                obj.current_status = f"{current_jid} {current_status}"

            obj.save()

        except Exception as e:
            print("❌ Tracker error:", str(e))

        time.sleep(10)

    # timeout
    obj.status = "failed"
    obj.error_message = "Tracking timeout"
    obj.completed_at = now().replace(microsecond=0)
    obj.save()

def extract_user(html):
    import re

    match = re.search(
        r'User ID</label>\s*</td>\s*<td>\s*([A-Z0-9._\\-]+)',
        html,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    return None