import subprocess
import sys
import os
import time
import requests
import json
from tests.utils.report_generator import generate_qa_report

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"

def run_step(name, cmd):
    print(f"\n[{name}] Running: {cmd}")
    start = time.time()
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    duration = round(time.time() - start, 2)
    success = (res.returncode == 0)
    print(f"[{name}] Result: {'PASS' if success else 'FAIL'} ({duration}s)")
    if not success:
        print("--- STDERR ---")
        print(res.stderr[-800:] if res.stderr else "None")
        print("--- STDOUT ---")
        print(res.stdout[-800:] if res.stdout else "None")
    return success, res.stdout, res.stderr

def audit_client_code():
    """Audits client src directory for placeholder strings."""
    findings = []
    keywords = ["FIXME", "temporary alert()"]
    src_dir = "client/src"
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".tsx", ".ts")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        for idx, line in enumerate(f, 1):
                            for kw in keywords:
                                if kw in line:
                                    findings.append(f"{path}:{idx} -> {line.strip()}")
                except Exception:
                    pass
    return findings

def main():
    print("=" * 60)
    print("HEALTHNET PHASE 9: FULL AUTOMATED QA & END-TO-END SUITE")
    print("=" * 60)

    # 1. Verify Startup
    print("\n[Step 1] Verifying System Startup & Readiness...")
    try:
        r_backend = requests.get(f"{BASE_URL}/api/health", timeout=5)
        assert r_backend.status_code == 200
        print(f"[PASS] Backend Online: {r_backend.json().get('service')}")
    except Exception as e:
        print(f"[FAIL] Backend not responding at {BASE_URL}: {e}")
        sys.exit(1)

    try:
        r_front = requests.get(FRONTEND_URL, timeout=5)
        assert r_front.status_code == 200
        print("[PASS] Frontend Dev Server Online: HTTP 200")
    except Exception as e:
        print(f"[FAIL] Frontend not responding at {FRONTEND_URL}: {e}")
        sys.exit(1)

    from tests.fixtures.database import reset_test_database
    # Reset test database
    if reset_test_database():
        print("[PASS] Test database reset cleanly.")
    else:
        print("[WARN] Test database reset returned non-200.")

    # 2. Run Pytest Suites
    modules_results = {}
    total_tests = 0
    passed_tests = 0
    failed_tests = 0

    suites = [
        ("Backend & Consistency", "python -m pytest tests/backend/ -v --tb=short"),
        ("REST API Suite", "python -m pytest tests/api/ -v --tb=short"),
        ("WebSocket Event Bus", "python -m pytest tests/websocket/ -v --tb=short"),
        ("Frontend Playwright E2E", "python -m pytest tests/e2e/ -v --tb=short"),
        ("Phase 8 Regression", "python -u test_phase8.py"),
        ("Phase 7 AI Regression", "python -u test_phase7.py"),
        ("Phase 6 Realtime Regression", "python -u test_phase6.py"),
        ("Phase 5 Emergency Regression", "python -u test_phase5.py"),
        ("Phase 4 Doctor Regression", "python -u test_phase4.py"),
        ("Phase 3 Nurse Regression", "python -u test_phase3.py"),
        ("Phase 2 Bed Regression", "python -u test_phase2.py"),
    ]

    for name, cmd in suites:
        success, out, err = run_step(name, cmd)
        # Parse passed count approx from output
        pass_count = out.count("PASSED") + out.count("[PASS]")
        fail_count = out.count("FAILED") + out.count("[FAIL]")
        if not success and fail_count == 0:
            fail_count = 1

        total = pass_count + fail_count
        if total == 0:
            total = 1
            if success:
                pass_count = 1

        total_tests += total
        passed_tests += pass_count
        failed_tests += fail_count

        modules_results[name] = {
            "status": "PASS" if success else "FAIL",
            "total": total,
            "passed": pass_count,
            "failed": fail_count
        }

    # Code Audit
    audit_findings = audit_client_code()

    # Generate Reports
    results_payload = {
        "total": total_tests,
        "passed": passed_tests,
        "failed": failed_tests,
        "skipped": 0,
        "modules": modules_results,
        "code_audit": {"unintended_placeholders": audit_findings}
    }

    json_path, html_path = generate_qa_report(results_payload)
    print(f"\n[PASS] QA Reports generated:")
    print(f"       JSON: {json_path}")
    print(f"       HTML: {html_path}")

    # Final Summary
    pass_rate = round((passed_tests / total_tests * 100), 1) if total_tests > 0 else 100.0
    print("\n" + "=" * 60)
    print("FINAL QA EXECUTION SUMMARY")
    print("=" * 60)
    print(f"TOTAL TESTS : {total_tests}")
    print(f"PASSED      : {passed_tests}")
    print(f"FAILED      : {failed_tests}")
    print(f"SKIPPED     : 0")
    print(f"PASS RATE   : {pass_rate}%")
    print("=" * 60)

    if failed_tests > 0:
        print("[FAIL] One or more QA tests failed. Application requires fixes.")
        sys.exit(1)
    else:
        print("[SUCCESS] ALL AUTOMATED QA & E2E TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
