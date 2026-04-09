#!/usr/bin/env python3
"""Generate benchmark charts from stored JSON benchmark runs.

Run from the performance-experiments directory:
  python3 plot-benchmarks.py

Optional custom paths:
  python3 plot-benchmarks.py --zkp benchmark-results.json --nft benchmark-nft-results.json --out charts
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean, pstdev

import matplotlib.pyplot as plt

PROTOCOLS = ["plonk", "fflonk", "groth16"]
PROTOCOL_LABELS = {
    "plonk": "PLONK",
    "fflonk": "FFLONK",
    "groth16": "GROTH16",
}


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_runs(payload: dict) -> list[dict]:
    runs = payload.get("runs", [])
    return runs if isinstance(runs, list) else []


def safe_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: object, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def save_fig(out_dir: Path, filename: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(out_dir / filename, dpi=180)
    plt.close()


def extract_time_series(zkp_runs: list[dict], metric_key: str) -> dict[str, list[float]]:
    series = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        timings = run.get("timings", {})
        for protocol in PROTOCOLS:
            value = timings.get(protocol, {}).get(metric_key)
            series[protocol].append(safe_float(value, 0.0))
    return series


def plot_time_series(zkp_runs: list[dict], out_dir: Path) -> None:
    run_ids = list(range(1, len(zkp_runs) + 1))

    for metric_key, title, y_label, filename in [
        ("proofGenerationMs", "Proof Generation Over Time", "Milliseconds", "01-time-series-proof.png"),
        ("verificationMs", "Verification Over Time", "Milliseconds", "02-time-series-verification.png"),
    ]:
        series = extract_time_series(zkp_runs, metric_key)
        plt.figure(figsize=(10, 5))
        for protocol in PROTOCOLS:
            plt.plot(
                run_ids,
                series[protocol],
                marker="o",
                linewidth=2,
                label=PROTOCOL_LABELS[protocol],
            )
        plt.title(title)
        plt.xlabel("Run #")
        plt.ylabel(y_label)
        plt.xticks(run_ids)
        plt.grid(True, linestyle="--", linewidth=0.5, alpha=0.6)
        plt.legend()
        save_fig(out_dir, filename)


def protocol_metric_values(zkp_runs: list[dict], metric_key: str) -> dict[str, list[float]]:
    values = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        timings = run.get("timings", {})
        for protocol in PROTOCOLS:
            values[protocol].append(safe_float(timings.get(protocol, {}).get(metric_key), 0.0))
    return values


def plot_grouped_means_with_error(zkp_runs: list[dict], out_dir: Path) -> None:
    proof_vals = protocol_metric_values(zkp_runs, "proofGenerationMs")
    verify_vals = protocol_metric_values(zkp_runs, "verificationMs")

    labels = [PROTOCOL_LABELS[p] for p in PROTOCOLS]
    proof_means = [mean(proof_vals[p]) for p in PROTOCOLS]
    verify_means = [mean(verify_vals[p]) for p in PROTOCOLS]
    proof_err = [pstdev(proof_vals[p]) for p in PROTOCOLS]
    verify_err = [pstdev(verify_vals[p]) for p in PROTOCOLS]

    x = list(range(len(PROTOCOLS)))
    width = 0.36

    plt.figure(figsize=(10, 5))
    plt.bar([i - width / 2 for i in x], proof_means, width, yerr=proof_err, capsize=5, label="Proof Gen")
    plt.bar([i + width / 2 for i in x], verify_means, width, yerr=verify_err, capsize=5, label="Verification")
    plt.xticks(x, labels)
    plt.ylabel("Milliseconds")
    plt.title("Average Timing by Protocol (with Std Dev)")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    plt.legend()
    save_fig(out_dir, "03-grouped-means-errorbars.png")


def plot_timing_boxplots(zkp_runs: list[dict], out_dir: Path) -> None:
    proof_vals = protocol_metric_values(zkp_runs, "proofGenerationMs")
    verify_vals = protocol_metric_values(zkp_runs, "verificationMs")

    labels = [PROTOCOL_LABELS[p] for p in PROTOCOLS]

    plt.figure(figsize=(10, 5))
    plt.boxplot([proof_vals[p] for p in PROTOCOLS], tick_labels=labels, showmeans=True)
    plt.title("Proof Generation Distribution")
    plt.ylabel("Milliseconds")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    save_fig(out_dir, "04-boxplot-proof.png")

    plt.figure(figsize=(10, 5))
    plt.boxplot([verify_vals[p] for p in PROTOCOLS], tick_labels=labels, showmeans=True)
    plt.title("Verification Distribution")
    plt.ylabel("Milliseconds")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    save_fig(out_dir, "05-boxplot-verification.png")


def get_gas_values(zkp_runs: list[dict], field: str) -> dict[str, list[int]]:
    values = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        gas_results = run.get("gas", {}).get("results", [])
        for row in gas_results:
            protocol_label = str(row.get("protocol", "")).strip().lower()
            if protocol_label == "plonk":
                protocol = "plonk"
            elif protocol_label == "fflonk":
                protocol = "fflonk"
            elif protocol_label == "groth16":
                protocol = "groth16"
            else:
                continue
            values[protocol].append(safe_int(row.get(field), 0))
    return values


def plot_gas_grouped(zkp_runs: list[dict], out_dir: Path) -> None:
    verify_vals = get_gas_values(zkp_runs, "verifyProofTxGas")
    submit_vals = get_gas_values(zkp_runs, "submitComplianceProofGas")

    labels = [PROTOCOL_LABELS[p] for p in PROTOCOLS]
    verify_means = [mean(verify_vals[p]) for p in PROTOCOLS]
    submit_means = [mean(submit_vals[p]) for p in PROTOCOLS]

    x = list(range(len(PROTOCOLS)))
    width = 0.36

    plt.figure(figsize=(10, 5))
    plt.bar([i - width / 2 for i in x], verify_means, width, label="verifyProofTxGas")
    plt.bar([i + width / 2 for i in x], submit_means, width, label="submitComplianceProofGas")
    plt.xticks(x, labels)
    plt.ylabel("Gas")
    plt.title("Average Gas by Protocol")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    plt.legend()
    save_fig(out_dir, "06-gas-grouped.png")


def plot_relative_improvement(zkp_runs: list[dict], out_dir: Path) -> None:
    proof_vals = protocol_metric_values(zkp_runs, "proofGenerationMs")
    verify_vals = protocol_metric_values(zkp_runs, "verificationMs")
    gas_verify_vals = get_gas_values(zkp_runs, "verifyProofTxGas")
    gas_submit_vals = get_gas_values(zkp_runs, "submitComplianceProofGas")

    baseline = "plonk"
    metrics = [
        ("Proof Gen", proof_vals),
        ("Verification", verify_vals),
        ("verifyProofTxGas", gas_verify_vals),
        ("submitComplianceProofGas", gas_submit_vals),
    ]

    labels = []
    deltas = []
    for protocol in ["fflonk", "groth16"]:
        for metric_name, metric_map in metrics:
            base = mean(metric_map[baseline])
            target = mean(metric_map[protocol])
            pct = ((target - base) / base) * 100 if base else 0.0
            labels.append(f"{PROTOCOL_LABELS[protocol]}\n{metric_name}")
            deltas.append(pct)

    colors = ["#2E8B57" if d < 0 else "#B22222" for d in deltas]

    plt.figure(figsize=(12, 5))
    plt.bar(range(len(labels)), deltas, color=colors)
    plt.axhline(0, color="black", linewidth=1)
    plt.xticks(range(len(labels)), labels, rotation=20, ha="right")
    plt.ylabel("% vs PLONK (negative is better)")
    plt.title("Relative Improvement Compared to PLONK")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    save_fig(out_dir, "07-relative-improvement-vs-plonk.png")


def plot_speed_vs_gas(zkp_runs: list[dict], out_dir: Path) -> None:
    proof_vals = protocol_metric_values(zkp_runs, "proofGenerationMs")
    submit_vals = get_gas_values(zkp_runs, "submitComplianceProofGas")

    plt.figure(figsize=(8, 6))
    for protocol in PROTOCOLS:
        x = mean(proof_vals[protocol])
        y = mean(submit_vals[protocol])
        plt.scatter([x], [y], s=130, label=PROTOCOL_LABELS[protocol])
        plt.text(x + 10, y + 60, PROTOCOL_LABELS[protocol], fontsize=9)

    plt.xlabel("Average Proof Generation (ms)")
    plt.ylabel("Average submitComplianceProofGas")
    plt.title("Speed vs Gas Tradeoff")
    plt.grid(True, linestyle="--", linewidth=0.5, alpha=0.6)
    plt.legend()
    save_fig(out_dir, "08-speed-vs-gas-scatter.png")


def nft_function_means(nft_runs: list[dict]) -> dict[str, float]:
    deploy_values = []
    function_values: dict[str, list[int]] = {}

    for run in nft_runs:
        deploy_values.append(safe_int(run.get("contract", {}).get("deployGas"), 0))
        functions = run.get("functions", {})
        for key, value in functions.items():
            function_values.setdefault(key, []).append(safe_int(value, 0))

    means: dict[str, float] = {"deploy": mean(deploy_values) if deploy_values else 0.0}
    for key, values in function_values.items():
        means[key] = mean(values) if values else 0.0
    return means


def plot_nft_gas_rank(nft_runs: list[dict], out_dir: Path) -> None:
    means = nft_function_means(nft_runs)

    label_map = {
        "deploy": "deployContract",
        "setEntityAuthorization": "setEntityAuthorization",
        "mintNFT": "mintNFT",
        "purchaseNFT": "purchaseNFT",
        "linkDIDToAddress": "linkDIDToAddress",
        "transferToDID": "transferToDID",
        "purchaseAndTransferNFT": "purchaseAndTransferNFT",
    }

    ordered_items = sorted(
        ((label_map.get(k, k), v) for k, v in means.items()),
        key=lambda t: t[1],
        reverse=True,
    )

    labels = [k for k, _ in ordered_items]
    values = [v for _, v in ordered_items]

    plt.figure(figsize=(10, 6))
    plt.barh(labels, values)
    plt.gca().invert_yaxis()
    plt.xlabel("Gas")
    plt.title("NFT Operations Gas Ranking")
    plt.grid(axis="x", linestyle="--", linewidth=0.5, alpha=0.6)
    save_fig(out_dir, "09-nft-gas-ranking.png")


def plot_nft_purchase_composition(nft_runs: list[dict], out_dir: Path) -> None:
    means = nft_function_means(nft_runs)
    purchase = means.get("purchaseNFT", 0.0)
    transfer = means.get("transferToDID", 0.0)
    link_did = means.get("linkDIDToAddress", 0.0)
    combined = means.get("purchaseAndTransferNFT", 0.0)
    separate_total = purchase + transfer + link_did
    delta = separate_total - combined

    labels = ["purchaseNFT", "transferToDID", "linkDIDToAddress", "separate total", "purchaseAndTransferNFT"]
    values = [purchase, transfer, link_did, separate_total, combined]
    colors = ["#6B8E23", "#4682B4", "#DAA520", "#CD853F", "#8B4513"]

    plt.figure(figsize=(9, 5))
    bars = plt.bar(labels, values, color=colors)
    plt.ylabel("Gas")
    plt.title(f"NFT Purchase Flow Gas Composition (saved: {int(delta)} gas)")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)

    for bar in bars:
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width() / 2, h + max(values) * 0.01, f"{int(h)}", ha="center", fontsize=8)

    save_fig(out_dir, "10-nft-purchase-composition.png")


def write_index(out_dir: Path) -> None:
    content = """# Benchmark Charts\n\nGenerated files:\n\n1. 01-time-series-proof.png\n2. 02-time-series-verification.png\n3. 03-grouped-means-errorbars.png\n4. 04-boxplot-proof.png\n5. 05-boxplot-verification.png\n6. 06-gas-grouped.png\n7. 07-relative-improvement-vs-plonk.png\n8. 08-speed-vs-gas-scatter.png\n9. 09-nft-gas-ranking.png\n10. 10-nft-purchase-composition.png\n"""
    (out_dir / "README.md").write_text(content, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate benchmark plots from benchmark JSON files.")
    parser.add_argument("--zkp", default="benchmark-results.json", help="Path to ZKP benchmark JSON")
    parser.add_argument("--nft", default="benchmark-nft-results.json", help="Path to NFT benchmark JSON")
    parser.add_argument("--out", default="charts", help="Output directory for generated charts")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    zkp_path = Path(args.zkp).resolve()
    nft_path = Path(args.nft).resolve()
    out_dir = Path(args.out).resolve()

    if not zkp_path.exists():
        raise FileNotFoundError(f"ZKP benchmark file not found: {zkp_path}")
    if not nft_path.exists():
        raise FileNotFoundError(f"NFT benchmark file not found: {nft_path}")

    zkp_payload = load_json(zkp_path)
    nft_payload = load_json(nft_path)

    zkp_runs = get_runs(zkp_payload)
    nft_runs = get_runs(nft_payload)

    if not zkp_runs:
        raise ValueError("No ZKP runs found in benchmark results file")
    if not nft_runs:
        raise ValueError("No NFT runs found in benchmark results file")

    plot_time_series(zkp_runs, out_dir)
    plot_grouped_means_with_error(zkp_runs, out_dir)
    plot_timing_boxplots(zkp_runs, out_dir)
    plot_gas_grouped(zkp_runs, out_dir)
    plot_relative_improvement(zkp_runs, out_dir)
    plot_speed_vs_gas(zkp_runs, out_dir)
    plot_nft_gas_rank(nft_runs, out_dir)
    plot_nft_purchase_composition(nft_runs, out_dir)
    write_index(out_dir)

    print(f"Generated charts in: {out_dir}")


if __name__ == "__main__":
    main()
