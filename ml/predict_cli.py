"""
CLI Inference Helper for single and batch predictions
Used for direct fast inference via subprocess or scripting.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
from app.model_service import model_service

def main():
    if not model_service.is_loaded:
        print(json.dumps({"error": "Model not loaded"}))
        sys.exit(1)

    input_raw = sys.stdin.read()
    if not input_raw.strip():
        print(json.dumps({"error": "Empty input"}))
        sys.exit(1)

    try:
        data = json.loads(input_raw)
        if isinstance(data, list):
            res = model_service.predict_batch(data)
            print(json.dumps({"results": res}))
        elif "viewers" in data and isinstance(data["viewers"], list):
            res = model_service.predict_batch(data["viewers"])
            print(json.dumps({"count": len(res), "results": res}))
        else:
            res = model_service.predict(data)
            print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
