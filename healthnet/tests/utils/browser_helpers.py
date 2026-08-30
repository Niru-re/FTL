import os
from typing import List, Dict

class BrowserErrorTracker:
    def __init__(self):
        self.console_errors: List[str] = []
        self.page_errors: List[str] = []
        self.failed_requests: List[Dict[str, str]] = []

    def attach(self, page):
        page.on("console", lambda msg: self.console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: self.page_errors.append(str(err)))
        page.on("requestfailed", lambda req: self.failed_requests.append({
            "url": req.url,
            "failure": str(req.failure) if req.failure else "Unknown failure"
        }))

    def get_summary(self):
        # Filter benign vite / harmless dev warnings
        filtered_console = [
            e for e in self.console_errors 
            if "favicon.ico" not in e and "[vite]" not in e and "WebSocket connection to" not in e
        ]
        filtered_reqs = [
            r for r in self.failed_requests
            if "favicon.ico" not in r["url"] and not r["url"].endswith(".png")
        ]
        return {
            "console_errors": len(filtered_console),
            "page_errors": len(self.page_errors),
            "failed_requests": len(filtered_reqs),
            "errors_detail": filtered_console,
            "exceptions_detail": self.page_errors
        }
