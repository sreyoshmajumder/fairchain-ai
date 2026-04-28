import os
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

# ── Dataset paths ─────────────────────────────────────────────────────────────
DATASETS = {
    "lending":          os.path.join(DATA_DIR, "lending",         "lending_data.csv"),
    "hiring":           os.path.join(DATA_DIR, "hiring",          "hiring_data.csv"),
    "healthcare":       os.path.join(DATA_DIR, "healthcare",      "healthcare_data.csv"),
    "insurance":        os.path.join(DATA_DIR, "insurance",       "insurance_data.csv"),
    "education":        os.path.join(DATA_DIR, "education",       "education_data.csv"),
    "criminal_justice": os.path.join(DATA_DIR, "criminal_justice","criminal_justice_data.csv"),
    "housing":          os.path.join(DATA_DIR, "housing",         "housing_data.csv"),
    "retail_credit":    os.path.join(DATA_DIR, "retail_credit",   "retail_credit_data.csv"),
}

# ── Known target columns per domain ──────────────────────────────────────────
TARGET_CANDIDATES = [
    # original 4
    "shortlisted", "hired", "selected",
    "loan_approved", "approved", "loan_status",
    "high_priority", "treatment_approved", "priority", "treated",
    "claim_approved", "claim_status",
    # new 4
    "admitted",
    "high_risk_score",
    "rental_approved",
    "credit_approved",
    # generic fallbacks
    "label", "target", "outcome", "decision", "result", "class",
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _detect_target(df: pd.DataFrame) -> str:
    for col in TARGET_CANDIDATES:
        if col in df.columns:
            return col
    binary_cols = [
        c for c in df.columns
        if df[c].nunique() == 2 and df[c].dtype in ["int64", "float64", "int32"]
    ]
    if binary_cols:
        return binary_cols[-1]
    raise ValueError(f"Cannot detect target column. Columns: {list(df.columns)}")


def _prepare_sensitive(series: pd.Series) -> pd.Series:
    """Bin continuous columns into Low/Medium/High for fairness grouping."""
    if series.dtype in ["int64", "float64", "int32"] and series.nunique() > 10:
        return pd.qcut(series, q=3, labels=["Low", "Medium", "High"],
                       duplicates="drop").astype(str)
    return series.astype(str)


def _encode_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in df.select_dtypes(include="object").columns:
        df[col] = LabelEncoder().fit_transform(df[col].astype(str))
    return df


def _load(domain_id: str) -> pd.DataFrame:
    path = DATASETS.get(domain_id)
    if not path or not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found: {path}")
    return pd.read_csv(path)


# ── Dataset audit ─────────────────────────────────────────────────────────────
def run_dataset_audit(df: pd.DataFrame, sensitive_cols: list, label_col: str) -> dict:
    audit = {}

    # Label balance
    if label_col in df.columns:
        pos_rate = float(df[label_col].mean())
        sev = "low" if 0.4 <= pos_rate <= 0.6 else "medium" if 0.25 <= pos_rate <= 0.75 else "high"
        audit["label_balance"] = {"positive_rate": round(pos_rate, 4), "severity": sev}

    # Representation per sensitive column
    rep = {}
    for col in sensitive_cols:
        if col in df.columns:
            rep[col] = {str(k): int(v) for k, v in df[col].value_counts().items()}
    audit["representation"] = rep

    # Outcome rate per group
    imb = {}
    for col in sensitive_cols:
        if col in df.columns and label_col in df.columns:
            imb[col] = {
                str(k): round(float(v), 4)
                for k, v in df.groupby(col)[label_col].mean().items()
            }
    audit["imbalance"] = imb

    # Proxy risk — high correlation between sensitive and feature cols
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
                feat_enc = (LabelEncoder().fit_transform(df[feat].astype(str))
                            if df[feat].dtype == object
                            else df[feat].fillna(0).values)
                c = abs(float(np.corrcoef(enc, feat_enc)[0, 1]))
                if c > 0.35:
                    corrs[feat] = round(c, 3)
            except Exception:
                pass
        if corrs:
            proxy[col] = corrs
    audit["proxy_risk"] = proxy

    # Missing values
    audit["missingness"] = {
        c: int(df[c].isna().sum())
        for c in df.columns if df[c].isna().sum() > 0
    }

    return audit


# ── Train baseline model ──────────────────────────────────────────────────────
def train_baseline(df: pd.DataFrame, feature_cols: list, label_col: str):
    df = df.copy().dropna(subset=[label_col])
    X  = df[feature_cols].copy()

    for col in X.select_dtypes(include="object").columns:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))
    X = X.fillna(0)

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    y        = df[label_col].values

    X_tr, X_te, y_tr, y_te, idx_tr, idx_te = train_test_split(
        X_scaled, y, df.index, test_size=0.3, random_state=42
    )

    model = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    model.fit(X_tr, y_tr)
    y_pred = model.predict(X_te)
    y_prob = model.predict_proba(X_te)[:, 1]

    return model, X_te, y_te, y_pred, y_prob, idx_te


# ── Per-group metrics ─────────────────────────────────────────────────────────
def compute_group_metrics(df_test: pd.DataFrame, y_test, y_pred, sensitive_col: str) -> dict:
    df_test = df_test.copy().reset_index(drop=True)
    y_test  = np.array(y_test)
    y_pred  = np.array(y_pred)

    if sensitive_col not in df_test.columns:
        return {}

    # Bin continuous sensitive columns for readable group names
    df_test[sensitive_col] = _prepare_sensitive(df_test[sensitive_col])

    groups = {}
    for grp, idx in df_test.groupby(sensitive_col).groups.items():
        idx = list(idx)
        yt  = y_test[idx]
        yp  = y_pred[idx]
        tp  = int(((yp == 1) & (yt == 1)).sum())
        fp  = int(((yp == 1) & (yt == 0)).sum())
        tn  = int(((yp == 0) & (yt == 0)).sum())
        fn  = int(((yp == 0) & (yt == 1)).sum())
        groups[str(grp)] = {
            "count":              len(idx),
            "selection_rate":     round(float(yp.mean()), 4),
            "accuracy":           round(float((yp == yt).mean()), 4),
            "true_positive_rate": round(tp / (tp + fn) if (tp + fn) > 0 else 0.0, 4),
            "false_positive_rate":round(fp / (fp + tn) if (fp + tn) > 0 else 0.0, 4),
            "precision":          round(tp / (tp + fp) if (tp + fp) > 0 else 0.0, 4),
        }
    return groups


# ── Fairness metrics summary ──────────────────────────────────────────────────
def compute_fairness_metrics(group_metrics: dict) -> dict:
    if len(group_metrics) < 2:
        return {"severity": "low", "error": "Not enough groups to compare"}

    sel  = {g: v["selection_rate"]     for g, v in group_metrics.items()}
    tpr  = {g: v["true_positive_rate"] for g, v in group_metrics.items()}
    fpr  = {g: v["false_positive_rate"] for g, v in group_metrics.items()}

    spd = round(max(sel.values()) - min(sel.values()), 4)
    eod = round(max(tpr.values()) - min(tpr.values()), 4)
    fpd = round(max(fpr.values()) - min(fpr.values()), 4)

    most_favored  = max(sel, key=sel.get)
    least_favored = min(sel, key=sel.get)
    severity      = "low" if spd < 0.1 else "medium" if spd < 0.2 else "high"

    return {
        "statistical_parity_diff":  spd,
        "equal_opportunity_diff":   eod,
        "false_positive_rate_diff": fpd,
        "most_favored":             most_favored,
        "least_favored":            least_favored,
        "severity":                 severity,
    }


# ── Reweighing mitigation ─────────────────────────────────────────────────────
def apply_reweighing(df: pd.DataFrame, sensitive_col: str, label_col: str) -> np.ndarray:
    df = df.copy()
    if sensitive_col not in df.columns:
        return np.ones(len(df))

    # Bin continuous sensitive before reweighing
    df[sensitive_col] = _prepare_sensitive(df[sensitive_col])

    weights = np.ones(len(df))
    n       = len(df)

    for grp in df[sensitive_col].unique():
        for lbl in df[label_col].unique():
            mask   = (df[sensitive_col] == grp) & (df[label_col] == lbl)
            n_grp  = (df[sensitive_col] == grp).sum()
            n_lbl  = (df[label_col]     == lbl).sum()
            n_both = mask.sum()
            if n_both > 0:
                weights[mask] = round((n_grp * n_lbl) / (n * n_both), 4)

    return weights


# ── Full end-to-end audit pipeline ────────────────────────────────────────────
def run_fairness_analysis(domain_id: str, sensitive_column: str, use_sample: bool = True) -> dict:
    # 1. Load
    df = _load(domain_id)
    if use_sample and len(df) > 1000:
        df = df.sample(1000, random_state=42)
    df = df.reset_index(drop=True)

    # 2. Detect target
    target_col = _detect_target(df)

    # 3. Validate sensitive column
    if sensitive_column not in df.columns:
        raise ValueError(
            f"'{sensitive_column}' not in dataset. Available: {list(df.columns)}"
        )

    # 4. Dataset audit (before encoding)
    sensitive_cols_all = [c for c in df.columns if c != target_col]
    dataset_audit      = run_dataset_audit(df, sensitive_cols_all, target_col)

    # 5. Feature cols = everything except target
    feature_cols = [c for c in df.columns if c != target_col]

    # 6. Baseline model
    model, X_te, y_te, y_pred_base, y_prob, idx_te = train_baseline(df, feature_cols, target_col)
    df_test       = df.loc[idx_te].reset_index(drop=True)
    base_accuracy = round(accuracy_score(y_te, y_pred_base) * 100, 1)

    grp_base    = compute_group_metrics(df_test, y_te, y_pred_base, sensitive_column)
    fair_base   = compute_fairness_metrics(grp_base)
    fair_base["model_accuracy"] = base_accuracy
    fair_base["target_column"]  = target_col

    # 7. Mitigated model (reweighing on full training set)
    train_idx  = df.index.difference(idx_te)
    df_train   = df.loc[train_idx].reset_index(drop=True)
    weights    = apply_reweighing(df_train, sensitive_column, target_col)

    # Re-encode for mitigated training
    X_full     = df.copy()
    for col in X_full.select_dtypes(include="object").columns:
        X_full[col] = LabelEncoder().fit_transform(X_full[col].astype(str))
    X_full = X_full.fillna(0)

    scaler       = StandardScaler()
    X_all_scaled = scaler.fit_transform(X_full[feature_cols])
    y_all        = df[target_col].values

    X_tr_mit = X_all_scaled[train_idx]
    y_tr_mit = y_all[train_idx]
    X_te_mit = X_all_scaled[idx_te]
    y_te_mit = y_all[idx_te]

    mit_model = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    mit_model.fit(X_tr_mit, y_tr_mit, sample_weight=weights)
    y_pred_mit   = mit_model.predict(X_te_mit)
    mit_accuracy = round(accuracy_score(y_te_mit, y_pred_mit) * 100, 1)

    grp_mit  = compute_group_metrics(df_test.copy(), y_te_mit, y_pred_mit, sensitive_column)
    fair_mit = compute_fairness_metrics(grp_mit)
    fair_mit["model_accuracy"] = mit_accuracy

    # 8. Selection rates per group for chart
    selection_rates = {
        grp: {
            "baseline":  grp_base.get(grp, {}).get("selection_rate", 0) * 100,
            "mitigated": grp_mit.get(grp, {}).get("selection_rate", 0) * 100,
            "count":     grp_base.get(grp, {}).get("count", 0),
        }
        for grp in set(list(grp_base.keys()) + list(grp_mit.keys()))
    }

    return {
        "domain_id":        domain_id,
        "sensitive_column": sensitive_column,
        "target_column":    target_col,
        "dataset_audit":    dataset_audit,
        "baseline":         fair_base,
        "mitigated":        fair_mit,
        "group_metrics": {
            "baseline":  grp_base,
            "mitigated": grp_mit,
        },
        "selection_rates": selection_rates,
        "delta": {
            "spd_reduction":   round(fair_base["statistical_parity_diff"] - fair_mit["statistical_parity_diff"], 4),
            "eod_reduction":   round(fair_base["equal_opportunity_diff"]  - fair_mit["equal_opportunity_diff"],  4),
            "accuracy_change": round(mit_accuracy - base_accuracy, 1),
        },
        "groups_analyzed": len(grp_base),
    }