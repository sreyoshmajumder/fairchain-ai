import os

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def get_gemini_explanation(context, fairness_metrics, group_metrics, sensitive_col):
    spd      = fairness_metrics.get("statistical_parity_diff", 0)
    eod      = fairness_metrics.get("equal_opportunity_diff", 0)
    severity = fairness_metrics.get("severity", "unknown")
    favored  = fairness_metrics.get("most_favored", "")
    disfav   = fairness_metrics.get("least_favored", "")

    # ── Try Gemini first ──────────────────────────────────────────────────────
    if GEMINI_AVAILABLE and GEMINI_API_KEY:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model  = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
You are a fairness auditor. Analyze this AI bias report and respond in JSON only.

Context: {context}
Sensitive attribute: {sensitive_col}
Statistical Parity Difference: {spd:.3f}
Equal Opportunity Difference: {eod:.3f}
Risk severity: {severity}
Most favored group: {favored}
Least favored group: {disfav}
Group metrics: {group_metrics}

Return ONLY valid JSON with these keys:
{{
  "summary": "2-3 sentence plain-language explanation of the bias found",
  "root_causes": ["cause1", "cause2"],
  "recommended_steps": ["step1", "step2", "step3"],
  "business_impact": "1 sentence on real-world harm",
  "compliance_flags": ["GDPR Article 22", "EU AI Act"]
}}
"""
            resp = model.generate_content(prompt)
            text = resp.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            import json
            return json.loads(text.strip())
        except Exception:
            pass  # fall through to rule-based

    # ── Rule-based fallback ───────────────────────────────────────────────────
    return _rule_based_explanation(context, sensitive_col, spd, eod, severity, favored, disfav)


def _rule_based_explanation(context, sensitive_col, spd, eod, severity, favored, disfav):
    severity_text = {
        "high":   "severe and legally risky",
        "medium": "moderate and worth addressing",
        "low":    "minor but worth monitoring",
    }.get(severity, "present")

    steps = [
        f"Apply sample reweighing to balance representation of '{sensitive_col}' groups in training data.",
        f"Audit historical decisions to identify where '{disfav}' group was systematically disadvantaged.",
        "Implement fairness constraints during model training (e.g., adversarial debiasing).",
        "Set up continuous monitoring with fairness dashboards post-deployment.",
        f"Consult legal/compliance team about implications for the {context}.",
    ]

    return {
        "summary": (
            f"The {context} shows {severity_text} bias against the '{disfav}' group "
            f"based on '{sensitive_col}'. The Statistical Parity Difference is {spd:.1%}, "
            f"meaning '{favored}' receives favorable outcomes {spd:.1%} more often. "
            f"This pattern likely reflects historical discrimination in the training data."
        ),
        "root_causes": [
            f"Historical underrepresentation of the '{disfav}' group in training data",
            f"'{sensitive_col}' or correlated proxy features creating disparate impact",
        ],
        "recommended_steps": steps,
        "business_impact": (
            f"Continued deployment risks regulatory penalties under GDPR Article 22 "
            f"and the EU AI Act, and may harm '{disfav}' group members in real {context} decisions."
        ),
        "compliance_flags": ["GDPR Article 22", "EU AI Act High-Risk", "Equal Credit Opportunity Act"],
    }