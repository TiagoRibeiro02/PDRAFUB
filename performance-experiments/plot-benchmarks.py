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

#PROTOCOLS = ["plonk", "fflonk", "groth16", "halo2"]
#PROTOCOL_LABELS = {
    #"plonk": "PLONK",
    #"fflonk": "FFLONK",
    #"groth16": "GROTH16",
    #"halo2": "HALO2",
#}

PROTOCOLS = ["plonk", "fflonk", "groth16", "noir", "halo2"]
PROTOCOL_LABELS = {
    "plonk": "PLONK",
    "fflonk": "FFLONK",
    "groth16": "GROTH16",
    "noir": "NOIR",
    "halo2": "HALO2",
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


def safe_mean(values: list[float | int]) -> float:
    return mean(values) if values else 0.0


def safe_pstdev(values: list[float | int]) -> float:
    return pstdev(values) if values else 0.0


def moving_average(values: list[float], window: int) -> list[float]:
    if window <= 1 or len(values) <= 1:
        return values[:]

    averages: list[float] = []
    running_total = 0.0
    for index, value in enumerate(values):
        running_total += value
        if index >= window:
            running_total -= values[index - window]
        divisor = min(index + 1, window)
        averages.append(running_total / divisor)
    return averages


def add_bar_labels(ax: plt.Axes, bars: list[plt.Axes], fmt: str = "{:.2f}", offset_ratio: float = 0.01) -> None:
    heights = [bar.get_height() for bar in bars]
    if not heights:
        return

    offset = max(heights) * offset_ratio if max(heights) else offset_ratio
    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            height + offset,
            fmt.format(height),
            ha="center",
            va="bottom",
            fontsize=8,
        )


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


def extract_protocol_run_gas_sums(zkp_runs: list[dict]) -> dict[str, list[int]]:
    sums: dict[str, list[int]] = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        run_totals: dict[str, int] = {p: 0 for p in PROTOCOLS}
        gas_results = run.get("gas", {}).get("results", [])
        for row in gas_results:
            protocol = str(row.get("protocol", "")).strip().lower()
            if protocol not in run_totals:
                continue
            run_totals[protocol] += safe_int(row.get("verifyProofTxGas"), 0)
            run_totals[protocol] += safe_int(row.get("submitComplianceProofGas"), 0)

        for protocol in PROTOCOLS:
            sums[protocol].append(run_totals[protocol])

    return sums


def cumulative(values: list[int]) -> list[int]:
    total = 0
    out: list[int] = []
    for value in values:
        total += value
        out.append(total)
    return out


def spaced_run_ticks(run_count: int, step: int = 50) -> list[int]:
    if run_count <= 0:
        return []
    ticks = [1]
    ticks.extend(list(range(step, run_count + 1, step)))
    if ticks[-1] != run_count:
        ticks.append(run_count)
    return ticks


def plot_time_series(zkp_runs: list[dict], out_dir: Path) -> None:
    run_ids = list(range(1, len(zkp_runs) + 1))
    protocol_run_gas_sums = extract_protocol_run_gas_sums(zkp_runs)
    cumulative_protocol_gas_sums = {
        protocol: cumulative(protocol_run_gas_sums[protocol]) for protocol in PROTOCOLS
    }
    scale = 1_000_000
    cumulative_protocol_gas_sums_scaled = {
        protocol: [value / scale for value in values]
        for protocol, values in cumulative_protocol_gas_sums.items()
    }
    run_ticks = spaced_run_ticks(len(zkp_runs), step=50)
    marker_step = max(1, len(zkp_runs) // 20)

    for metric_key, title, y_label, filename in [
        ("proofGenerationMs", "Proof Generation Over Time", "Milliseconds", "01-time-series-proof.png"),
        ("verificationMs", "Verification Over Time", "Milliseconds", "02-time-series-verification.png"),
    ]:
        fig, ax = plt.subplots(figsize=(10, 5))
        if metric_key == "proofGenerationMs":
            for protocol in PROTOCOLS:
                ax.plot(
                    run_ids,
                    cumulative_protocol_gas_sums_scaled[protocol],
                    marker="o",
                    markersize=2.5,
                    markevery=marker_step,
                    linewidth=1.1,
                    alpha=0.95,
                    label=PROTOCOL_LABELS[protocol],
                )
            ax.set_title("Cumulative Gas Sum Over Runs by Protocol")
            ax.set_xlabel("Run / User #")
            ax.set_ylabel("Cumulative Gas x10⁶")
            ax.set_xticks(run_ticks)
            ax.grid(axis="y", linestyle="--", linewidth=0.45, alpha=0.55)
            ax.grid(axis="x", linestyle=":", linewidth=0.35, alpha=0.35)
            ax.legend(loc="upper left", ncol=3, frameon=False)
        else:
            series = extract_time_series(zkp_runs, metric_key)
            colors = ["#4682B4","#DAA520","#6B8E23", "#CD853F", "#8B4513"]
            window = max(10, len(run_ids) // 40)
            for protocol, color in zip(PROTOCOLS, colors):
                values = series[protocol]
                ax.plot(run_ids, values, color=color, alpha=0.04, linewidth=0.8)
                ax.plot(
                    run_ids,
                    moving_average(values, window),
                    color=color,
                    linewidth=1.8,
                    label=PROTOCOL_LABELS[protocol],
                )
            ax.set_title(f"Verification Time Over Runs ({window}-Run Moving Average)")
            ax.set_xlabel("Run / User #")
            ax.set_ylabel(y_label)
            ax.set_xticks(run_ticks)
            ax.grid(axis="y", linestyle="--", linewidth=0.45, alpha=0.55)
            ax.grid(axis="x", linestyle=":", linewidth=0.35, alpha=0.2)
            ax.legend(loc="upper left", ncol=3, frameon=False)

        save_fig(out_dir, filename)


def protocol_metric_values(zkp_runs: list[dict], metric_key: str) -> dict[str, list[float]]:
    values = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        timings = run.get("timings", {})
        for protocol in PROTOCOLS:
            values[protocol].append(safe_float(timings.get(protocol, {}).get(metric_key), 0.0))
    return values


def plot_grouped_means_with_error(zkp_runs: list[dict], out_dir: Path) -> None:
    verify_vals = protocol_metric_values(zkp_runs, "verificationMs")

    labels = [PROTOCOL_LABELS[p] for p in PROTOCOLS]
    verify_means = [safe_mean(verify_vals[p]) for p in PROTOCOLS]
    verify_err = [safe_pstdev(verify_vals[p]) for p in PROTOCOLS]
    colors = ["#6B8E23", "#4682B4", "#DAA520", "#CD853F", "#8B4513"]

    x = list(range(len(PROTOCOLS)))
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(x, verify_means, color=colors, alpha=0.85, edgecolor="none", linewidth=0)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Milliseconds")
    ax.set_title("Average Verification Time by Protocol")
    add_bar_labels(ax, bars, fmt="{:.2f}")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    save_fig(out_dir, "03-grouped-means-errorbars.png")


def get_gas_values(zkp_runs: list[dict], field: str) -> dict[str, list[int]]:
    values = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        gas_results = run.get("gas", {}).get("results", [])
        for row in gas_results:
            protocol_label = str(row.get("protocol", "")).strip().lower()
            if protocol_label not in values:
                continue
            values[protocol_label].append(safe_int(row.get(field), 0))
    return values


def get_total_gas_values(zkp_runs: list[dict]) -> dict[str, list[int]]:
    values = {p: [] for p in PROTOCOLS}
    for run in zkp_runs:
        run_totals: dict[str, int] = {p: 0 for p in PROTOCOLS}
        gas_results = run.get("gas", {}).get("results", [])
        for row in gas_results:
            protocol = str(row.get("protocol", "")).strip().lower()
            if protocol not in run_totals:
                continue
            run_totals[protocol] += safe_int(row.get("verifyProofTxGas"), 0)
            run_totals[protocol] += safe_int(row.get("submitComplianceProofGas"), 0)

        for protocol in PROTOCOLS:
            values[protocol].append(run_totals[protocol])

    return values


def plot_gas_grouped(zkp_runs: list[dict], out_dir: Path) -> None:
    gas_vals = get_total_gas_values(zkp_runs)

    labels = [PROTOCOL_LABELS[p] for p in PROTOCOLS]
    gas_means = [safe_mean(gas_vals[p]) for p in PROTOCOLS]
    colors = ["#6B8E23", "#4682B4", "#DAA520", "#CD853F", "#8B4513"]

    x = list(range(len(PROTOCOLS)))
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(x, gas_means, color=colors, alpha=0.85)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Gas")
    ax.set_title("Average Gas by Protocol")
    ax.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    add_bar_labels(ax, bars, fmt="{:.0f}")

    save_fig(out_dir, "06-gas-grouped.png")


def plot_speed_vs_gas(zkp_runs: list[dict], out_dir: Path) -> None:
    proof_vals = protocol_metric_values(zkp_runs, "proofGenerationMs")
    submit_vals = get_gas_values(zkp_runs, "submitComplianceProofGas")

    plt.figure(figsize=(8, 6))
    for protocol in PROTOCOLS:
        x = safe_mean(proof_vals[protocol])
        y = safe_mean(submit_vals[protocol])
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


def plot_nft_purchase_composition(nft_runs: list[dict], out_dir: Path) -> None:
    means = nft_function_means(nft_runs)
    purchase = means.get("purchaseNFT", 0.0)
    transfer = means.get("transferToDID", 0.0)
    link_did = means.get("linkDIDToAddress", 0.0)
    combined = means.get("purchaseAndTransferNFT", 0.0)
    separate_total = purchase + transfer + link_did
    delta = separate_total - combined

    labels = [
        "NFT\nPurchase",
        "Transfer\nto DID",
        "DID\nLinking",
        "Sequential\nExecution\nTotal",
        "Integrated Purchase, \nTransfer and Linking",
    ]
    values = [purchase, transfer, link_did, separate_total, combined]
    colors = ["#6B8E23", "#4682B4", "#DAA520", "#CD853F", "#8B4513"]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(labels, values, color=colors)
    plt.ylabel("Gas")
    plt.title(f"NFT Purchase Flow Gas Composition (saved: {int(delta)} gas)")
    plt.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    plt.xticks(rotation=0, ha="center")

    for bar in bars:
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width() / 2, h + max(values) * 0.01, f"{int(h)}", ha="center", fontsize=8)

    save_fig(out_dir, "10-nft-purchase-composition.png")


def write_index(out_dir: Path) -> None:
    content = """# Benchmark Charts\n\nGenerated files:\n\n1. 01-time-series-proof.png\n2. 02-time-series-verification.png\n3. 03-grouped-means-errorbars.png\n4. 06-gas-grouped.png\n5. 08-speed-vs-gas-scatter.png\n6. 10-nft-purchase-composition.png\n"""
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
    plot_gas_grouped(zkp_runs, out_dir)
    plot_speed_vs_gas(zkp_runs, out_dir)
    plot_nft_purchase_composition(nft_runs, out_dir)
    write_index(out_dir)

    print(f"Generated charts in: {out_dir}")


if __name__ == "__main__":
    main()
