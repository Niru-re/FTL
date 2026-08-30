import json
import os
import time

def generate_qa_report(results, report_dir="tests/reports"):
    os.makedirs(report_dir, exist_ok=True)
    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")

    total = results.get("total", 0)
    passed = results.get("passed", 0)
    failed = results.get("failed", 0)
    skipped = results.get("skipped", 0)
    pass_rate = round((passed / total * 100), 1) if total > 0 else 100.0

    report_data = {
        "timestamp": timestamp,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "pass_rate_pct": pass_rate
        },
        "modules": results.get("modules", {}),
        "failures": results.get("failures", []),
        "console_audit": results.get("console_audit", {}),
        "code_audit": results.get("code_audit", {})
    }

    # Write JSON report
    json_path = os.path.join(report_dir, f"qa_report_{timestamp}.json")
    latest_json = os.path.join(report_dir, "qa_report_latest.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    with open(latest_json, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Write HTML report
    html_path = os.path.join(report_dir, f"qa_report_{timestamp}.html")
    latest_html = os.path.join(report_dir, "qa_report_latest.html")
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>HealthNet Automated QA Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155; }}
        h1, h2, h3 {{ margin-top: 0; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; }}
        .badge-pass {{ background: #064e3b; color: #34d399; }}
        .badge-fail {{ background: #7f1d1d; color: #f87171; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
        th, td {{ text-align: left; padding: 10px; border-bottom: 1px solid #334155; }}
        th {{ background: #0f172a; color: #94a3b8; font-size: 12px; text-transform: uppercase; }}
        .metric-val {{ font-size: 28px; font-weight: 800; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>HealthNet Full Automated QA Test Report</h1>
        <p style="color: #94a3b8;">Executed at {timestamp} • Comprehensive Multi-Layer Test Gate</p>
        <div style="display: flex; gap: 24px; margin-top: 16px;">
            <div><div style="color: #94a3b8; font-size: 12px;">TOTAL TESTS</div><div class="metric-val">{total}</div></div>
            <div><div style="color: #34d399; font-size: 12px;">PASSED</div><div class="metric-val" style="color: #34d399;">{passed}</div></div>
            <div><div style="color: #f87171; font-size: 12px;">FAILED</div><div class="metric-val" style="color: #f87171;">{failed}</div></div>
            <div><div style="color: #38bdf8; font-size: 12px;">PASS RATE</div><div class="metric-val" style="color: #38bdf8;">{pass_rate}%</div></div>
        </div>
    </div>

    <div class="card">
        <h2>Module Execution Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Module</th>
                    <th>Status</th>
                    <th>Passed / Total</th>
                </tr>
            </thead>
            <tbody>
"""
    for mod_name, mod_info in results.get("modules", {}).items():
        status_badge = '<span class="badge badge-pass">PASSED</span>' if mod_info.get("failed", 0) == 0 else '<span class="badge badge-fail">FAILED</span>'
        html_content += f"""
                <tr>
                    <td><strong>{mod_name}</strong></td>
                    <td>{status_badge}</td>
                    <td>{mod_info.get("passed", 0)} / {mod_info.get("total", 0)}</td>
                </tr>"""

    html_content += """
            </tbody>
        </table>
    </div>
</body>
</html>"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    with open(latest_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    return latest_json, latest_html
