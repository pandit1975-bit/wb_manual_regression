from django.utils.timezone import now
import requests
from requests_negotiate_sspi import HttpNegotiateAuth
from bs4 import BeautifulSoup
from django.conf import settings
import logging

from requests_ntlm import HttpNtlmAuth

from .jid_service import fetch_job_id

logger = logging.getLogger(__name__)

def log(*msg):
    logger.warning(" ".join(str(m) for m in msg))


def val(soup, field):
    el = soup.find(id=field)
    return el["value"] if el and el.has_attr("value") else ""


def submit_job(obj):

    session = requests.Session()
    session.auth = HttpNegotiateAuth()

    session.headers.update({"Connection": "close"})

    URL = obj.url
    BASE = URL.split("/Default.aspx")[0]

    try:
        log("🔥 Starting API Call")
        log(f"🚀 API Submit: {obj.request_id}")

        obj.status = "running"
        obj.started_at = now().replace(microsecond=0)
        obj.save()

        # -------------------------
        # LOAD PAGE
        # -------------------------
        r = session.get(URL)
        soup = BeautifulSoup(r.text, "html.parser")

        viewstate = val(soup, "__VIEWSTATE")
        eventvalidation = val(soup, "__EVENTVALIDATION")
        viewstategenerator = val(soup, "__VIEWSTATEGENERATOR")
        radscript = val(soup, "RadScriptManager1_TSM")

        # -------------------------
        # PRESERVE ALL FORM VALUES
        # -------------------------
        request_name = val(soup, "txtRequestName")
        job_name = val(soup, "txtJobName")
        heading1 = val(soup, "txtHeadingLine1")
        heading2 = val(soup, "txtHeadingLine2")

        division = val(soup, "ddlDivision")
        customer_id = val(soup, "txtCustomerID")
        project_id = val(soup, "txtProjectID")

        log("RequestName:", request_name)
        log("JobName:", job_name)
        log("Division:", division)
        log("Customer:", customer_id)
        log("Project:", project_id)

        headers_json = {
            "Content-Type": "application/json; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": URL,
            "Origin": BASE
        }

        # -------------------------
        # GET DIAGRAM
        # -------------------------
        r = session.post(
            f"{BASE}/ProcessRequestDetailsWS.asmx/GetDiagramJSON",
            json={"requestID": obj.request_id},
            headers=headers_json
        )

        diagram = r.json()["d"]

        # -------------------------
        # SAVE DIAGRAM
        # -------------------------
        session.post(
            f"{BASE}/ProcessRequestDetailsWS.asmx/SaveDiagramJSON",
            json={
                "requestID": obj.request_id,
                "jsonString": diagram
            },
            headers=headers_json
        )

        # -------------------------
        # SUBMIT
        # -------------------------
        payload = {
            "RadScriptManager1_TSM": radscript,
            "__EVENTTARGET": "ToolBar1$radToolBarHome",
            "__EVENTARGUMENT": "1",

            "__VIEWSTATE": viewstate,
            "__EVENTVALIDATION": eventvalidation,
            "__VIEWSTATEGENERATOR": viewstategenerator,

            "txtRequestID": obj.request_id,

            # retain values
            "txtRequestName": request_name,
            "txtJobName": job_name,
            "txtHeadingLine1": heading1,
            "txtHeadingLine2": heading2,

            "ddlDivision": division,
            "txtCustomerID": customer_id,
            "txtProjectID": project_id,

            "mySavedModel": diagram,

            "cbxProduction": "on",
            "currentUser": "kiranp",
            "createdBy": "kiranp",
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": URL,
            "Origin": BASE,
            "User-Agent": "Mozilla/5.0"
        }

        log("🚀 submitting to:", URL)

        r = session.post(
            URL,
            data=payload,
            headers=headers,
            allow_redirects=False,
            timeout=120
        )

        log("✅ Submit response:", r.status_code)
        log("➡️ submit finished, fetching job id...")

        job_id = fetch_job_id(session, BASE, obj.request_id)

        log("✅ JOB FOUND:", job_id)

        obj.job_id = job_id
        obj.status = "submitted"
        obj.completed_at = now().replace(microsecond=0)
        obj.save()

    except Exception as e:

        log("❌ API Submit Error:", str(e))

        obj.status = "failed"
        obj.error_message = str(e)
        obj.completed_at = now().replace(microsecond=0)
        obj.save()

        raise