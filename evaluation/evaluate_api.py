"""
Independent REST API and System Quality Evaluator.
Measures real response latency, throughput, error rates, and endpoint correctness.
Can evaluate against an HTTP endpoint or via in-process ASGI TestClient.
"""

import os
import sys
# Ensure root in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
import json
import argparse
import requests
import numpy as np
from typing import Dict, Any, List

SAMPLE_PREDICT_PAYLOADS = [
    {
        "watch_time": 2450.0,
        "session_duration": 58.0,
        "visit_frequency": 22,
        "completion_rate": 0.91,
        "action_preference": 0.82,
        "family_preference": 0.05,
        "comedy_preference": 0.08,
        "drama_preference": 0.05,
        "primary_device": "SmartTV",
        "subscription_tier": "Premium",
        "weekend_watch_ratio": 0.45,
        "skip_intro_rate": 0.88
    },
    {
        "watch_time": 950.0,
        "session_duration": 46.0,
        "visit_frequency": 8,
        "completion_rate": 0.65,
        "action_preference": 0.05,
        "family_preference": 0.75,
        "comedy_preference": 0.12,
        "drama_preference": 0.08,
        "primary_device": "SmartTV",
        "subscription_tier": "Standard",
        "weekend_watch_ratio": 0.70,
        "skip_intro_rate": 0.40
    },
    {
        "watch_time": 420.0,
        "session_duration": 18.0,
        "visit_frequency": 6,
        "completion_rate": 0.40,
        "action_preference": 0.20,
        "family_preference": 0.10,
        "comedy_preference": 0.55,
        "drama_preference": 0.15,
        "primary_device": "Mobile",
        "subscription_tier": "Free",
        "weekend_watch_ratio": 0.35,
        "skip_intro_rate": 0.30
    }
]

def evaluate_api(
    base_url: str = "http://localhost:8000",
    num_requests: int = 100,
    concurrency: int = 1
) -> Dict[str, Any]:
    """
    Measures latency, throughput, error rates, and endpoint functionality.
    """
    print(f"[API Evaluator] Testing API at: {base_url}")
    session = requests.Session()

    # 1. Health check verification
    health_ok = False
    model_loaded = False
    try:
        resp = session.get(f"{base_url}/health", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if "model_loaded" in data and data.get("model_loaded"):
                health_ok = (data.get("status") == "healthy")
                model_loaded = True
                print(f"[API Evaluator] GET /health -> HTTP 200 (healthy={health_ok}, model_loaded={model_loaded})")
            else:
                print(f"[API Evaluator] Port {base_url} returned generic response, falling back to ASGI TestClient.")
    except Exception as e:
        print(f"[API Evaluator] Health check connection failed: {e}")

    # Fallback to in-process TestClient if base_url is not responding
    use_test_client = False
    client = None
    if not health_ok:
        print("[API Evaluator] Server not reachable over HTTP; falling back to FastAPI ASGI TestClient...")
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)
        resp = client.get("/health")
        health_ok = (resp.status_code == 200)
        model_loaded = bool(resp.json().get("model_loaded"))
        use_test_client = True
        print(f"[API Evaluator] TestClient GET /health -> HTTP 200 (healthy={health_ok})")

    def perform_request(method: str, path: str, json_data: Any = None):
        t0 = time.perf_counter()
        if use_test_client:
            if method == "GET":
                r = client.get(path)
            else:
                r = client.post(path, json=json_data)
            status_code = r.status_code
        else:
            if method == "GET":
                r = session.get(f"{base_url}{path}", timeout=5)
            else:
                r = session.post(f"{base_url}{path}", json=json_data, timeout=5)
            status_code = r.status_code
        dur_ms = (time.perf_counter() - t0) * 1000.0
        return status_code, dur_ms

    # 2. Functional endpoint tests
    endpoints_verified = {}
    for path in ["/info", "/segments"]:
        code, _ = perform_request("GET", path)
        endpoints_verified[f"GET {path}"] = (code == 200)

    # Segment detail test
    code, _ = perform_request("GET", "/segments/0")
    endpoints_verified["GET /segments/0"] = (code == 200)

    # Valid predict test
    code, _ = perform_request("POST", "/predict", SAMPLE_PREDICT_PAYLOADS[0])
    endpoints_verified["POST /predict"] = (code == 200)

    # Batch predict test
    code, _ = perform_request("POST", "/predict/batch", {"viewers": SAMPLE_PREDICT_PAYLOADS})
    endpoints_verified["POST /predict/batch"] = (code == 200)

    # Validation rejection test (should return 422 for invalid negative number)
    bad_payload = dict(SAMPLE_PREDICT_PAYLOADS[0])
    bad_payload["completion_rate"] = 5.5 # invalid range
    code, _ = perform_request("POST", "/predict", bad_payload)
    endpoints_verified["POST /predict (validation 422 check)"] = (code == 422)

    # 3. Latency & Throughput Benchmark
    print(f"[API Evaluator] Benchmarking POST /predict with {num_requests} requests...")
    latencies = []
    errors = 0

    benchmark_start = time.perf_counter()
    for i in range(num_requests):
        payload = SAMPLE_PREDICT_PAYLOADS[i % len(SAMPLE_PREDICT_PAYLOADS)]
        try:
            code, lat_ms = perform_request("POST", "/predict", payload)
            if code == 200:
                latencies.append(lat_ms)
            else:
                errors += 1
        except Exception:
            errors += 1

    benchmark_total_dur = time.perf_counter() - benchmark_start
    total_successful = len(latencies)
    error_rate = round((errors / num_requests) * 100.0, 2)
    throughput = round(total_successful / max(benchmark_total_dur, 0.001), 2)

    if latencies:
        avg_lat = round(float(np.mean(latencies)), 2)
        med_lat = round(float(np.median(latencies)), 2)
        p95_lat = round(float(np.percentile(latencies, 95)), 2)
        min_lat = round(float(np.min(latencies)), 2)
        max_lat = round(float(np.max(latencies)), 2)
    else:
        avg_lat, med_lat, p95_lat, min_lat, max_lat = 0.0, 0.0, 0.0, 0.0, 0.0

    results = {
        "health_check": health_ok,
        "model_loaded": model_loaded,
        "endpoints_verified": endpoints_verified,
        "total_requests": num_requests,
        "successful_requests": total_successful,
        "failed_requests": errors,
        "error_rate_pct": error_rate,
        "throughput_req_per_sec": throughput,
        "latency_ms": {
            "average": avg_lat,
            "median": med_lat,
            "p95": p95_lat,
            "min": min_lat,
            "max": max_lat
        },
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    print("\n----------------------------------------")
    print("INDEPENDENT API EVALUATION RESULTS")
    print("----------------------------------------")
    print(f"Health Check:            {'PASSED' if health_ok else 'FAILED'}")
    print(f"Model Loaded:            {'YES' if model_loaded else 'NO'}")
    print(f"Total Requests:          {num_requests}")
    print(f"Throughput:              {throughput} req/s")
    print(f"Average Latency:         {avg_lat} ms")
    print(f"Median Latency:          {med_lat} ms")
    print(f"P95 Latency:             {p95_lat} ms")
    print(f"Error Rate:              {error_rate}%")
    print("----------------------------------------\n")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate OTT REST API")
    parser.add_argument("--url", type=str, default="http://localhost:8000")
    parser.add_argument("--n", type=int, default=100)
    args = parser.parse_args()
    evaluate_api(args.url, args.n)
