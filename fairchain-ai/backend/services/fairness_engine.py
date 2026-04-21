import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score

# ── Dataset audit ─────────────────────────────────────────────────────────────
def run_dataset_audit(df, sensitive_cols, label_col):
    audit = {}

    # Label balance
    if label_col in df.columns:
        pos_rate = df[label_col].mean()
        sev = "low" if 0.4 <= pos_rate <= 0.6 else "medium" if 0.25 <= pos_rate <= 0.75 else "high"
        audit["label_balance"] = {"positive_rate": round(pos_rate, 4), "severity": sev}

    # Representation per sensitive column
    rep = {}
    for col in sensitive_cols:
        if col in df.columns:
            rep[col] = df[col].value_counts().to_dict()
    audit["representation"] = rep

    # Outcome imbalance per group
    imb = {}
    for col in sensitive_cols:
        if col in df.columns and label_col in df.columns:
            rates = df.groupby(col)[label_col].mean().round(4).to_dict()
            imb[col] = rates
    audit["imbalance"] = imb

    # Proxy risk (correlation of sensitive cols with other features)
    proxy = {}
    for col in sensitive_cols:
        if col not in df.columns:
            continue
        enc = LabelEncoder().fit_transform(df[col].astype(str))
        corrs = {}
        for feat in df.columns:
            if feat in sensitive_cols or feat == label_col:
                continue
            try:
                feat_enc = LabelEncoder().fit_transform(df[feat].astype(str)) \
                    if df[feat].dtype == object else df[feat].fillna(0).values
                c = abs(np.corrcoef(enc, feat_enc)[0, 1])
                if c > 0.35:
                    corrs[feat] = round(c, 3)
            except Exception:
                pass
        if corrs:
            proxy[col] = corrs
    audit["proxy_risk"] = proxy

    # Missing values
    missing = {c: int(df[c].isna().sum()) for c in df.columns if df[c].isna().sum() > 0}
    audit["missingness"] = missing

    return audit


# ── Train baseline model ──────────────────────────────────────────────────────
def train_baseline(df, feature_cols, label_col):
    df = df.copy().dropna(subset=[label_col])
    X  = df[feature_cols].copy()

    for col in X.select_dtypes(include="object").columns:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))
    X = X.fillna(0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    y = df[label_col].values

    X_tr, X_te, y_tr, y_te, idx_tr, idx_te = train_test_split(
        X_scaled, y, df.index, test_size=0.3, random_state=42
    )

    model = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    model.fit(X_tr, y_tr)
    y_pred = model.predict(X_te)
    y_prob = model.predict_proba(X_te)[:, 1]

    return model, X_te, y_te, y_pred, y_prob, idx_te


# ── Compute per-group metrics ─────────────────────────────────────────────────
def compute_group_metrics(df_test, y_test, y_pred, sensitive_col):
    df_test = df_test.copy().reset_index(drop=True)
    y_test  = np.array(y_test)
    y_pred  = np.array(y_pred)

    if sensitive_col not in df_test.columns:
        return {}

    groups = {}
    for grp, idx in df_test.groupby(sensitive_col).groups.items():
        idx = list(idx)
        yt  = y_test[idx]
        yp  = y_pred[idx]
        tp  = ((yp == 1) & (yt == 1)).sum()
        fp  = ((yp == 1) & (yt == 0)).sum()
        tn  = ((yp == 0) & (yt == 0)).sum()
        fn  = ((yp == 0) & (yt == 1)).sum()
        groups[str(grp)] = {
            "count":             len(idx),
            "selection_rate":    round(yp.mean(), 4),
            "accuracy":          round((yp == yt).mean(), 4),
            "true_positive_rate": round(tp / (tp + fn) if (tp + fn) > 0 else 0, 4),
            "false_positive_rate":round(fp / (fp + tn) if (fp + tn) > 0 else 0, 4),
            "precision":         round(tp / (tp + fp) if (tp + fp) > 0 else 0, 4),
        }
    return groups


# ── Compute fairness metrics across groups ────────────────────────────────────
def compute_fairness_metrics(group_metrics):
    if len(group_metrics) < 2:
        return {"severity": "low", "error": "Not enough groups"}

    sel_rates = {g: v["selection_rate"]    for g, v in group_metrics.items()}
    tpr_rates = {g: v["true_positive_rate"] for g, v in group_metrics.items()}
    fpr_rates = {g: v["false_positive_rate"] for g, v in group_metrics.items()}

    max_sel = max(sel_rates.values()); min_sel = min(sel_rates.values())
    max_tpr = max(tpr_rates.values()); min_tpr = min(tpr_rates.values())
    max_fpr = max(fpr_rates.values()); min_fpr = min(fpr_rates.values())

    spd = round(max_sel - min_sel, 4)
    eod = round(max_tpr - min_tpr, 4)
    fpd = round(max_fpr - min_fpr, 4)

    most_favored  = max(sel_rates, key=sel_rates.get)
    least_favored = min(sel_rates, key=sel_rates.get)

    severity = "low" if spd < 0.1 else "medium" if spd < 0.2 else "high"

    return {
        "statistical_parity_diff":  spd,
        "equal_opportunity_diff":   eod,
        "false_positive_rate_diff": fpd,
        "most_favored":             most_favored,
        "least_favored":            least_favored,
        "severity":                 severity,
    }


# ── Reweighing mitigation ─────────────────────────────────────────────────────
def apply_reweighing(df, sensitive_col, label_col):
    df = df.copy()
    if sensitive_col not in df.columns:
        return np.ones(len(df))

    weights = np.ones(len(df))
    n       = len(df)

    for grp in df[sensitive_col].unique():
        for lbl in df[label_col].unique():
            mask     = (df[sensitive_col] == grp) & (df[label_col] == lbl)
            n_grp    = (df[sensitive_col] == grp).sum()
            n_lbl    = (df[label_col]     == lbl).sum()
            n_both   = mask.sum()
            if n_both > 0:
                w = (n_grp * n_lbl) / (n * n_both)
                weights[mask] = round(w, 4)

    return weights