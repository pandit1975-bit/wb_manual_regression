from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import base64


def build_workbench_url(env, request_id):

    if env == "stage":
        return f"http://workbench-stage:8765/Default.aspx?RequestId={request_id}"

    else:
        return f"http://workbench.intra.infousa.com:8765/Default.aspx?RequestId={request_id}"


def build_status_url(env, job_id):
    if env == "stage":
        return f"http://stagewbstatus/JobRequest/JobRequest/?JobID={job_id}"
    else:
        return f"http://wbstatus.intra.infousa.com/JobRequest/JobRequest/?JobID={job_id}"


