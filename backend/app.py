from flask import Flask, request, jsonify, session, send_from_directory
import math
import os

app = Flask(__name__, static_folder="../frontend", static_url_path="")
app.secret_key = "supersecretkey"

STANDARD_PRICING = {
    "S": {"cpu_max": 8, "monthly": 413.46},
    "M": {"cpu_max": 16, "monthly": 583.84},
    "L": {"cpu_max": 32, "monthly": 1102.56},
    "XL": {"cpu_max": 64, "monthly": 2205.12}
}

def get_standard_cost(cpu_cores):
    for size, info in STANDARD_PRICING.items():
        if cpu_cores <= info["cpu_max"]:
            return size, info["monthly"]
    return "XL", STANDARD_PRICING["XL"]["monthly"]

def compute_summary_per_env(results):
    summary_env = {}
    for env, env_entries in results.items():
        total_namespaces = len(env_entries)
        total_cpu = sum(row.get("cpu_core_ns", 0) for row in env_entries)
        total_cpu_buffered = math.ceil(total_cpu * 1.3)
        size, monthly_cost_per_ns = get_standard_cost(total_cpu_buffered)
        total_monthly = monthly_cost_per_ns * total_namespaces
        total_annual = total_monthly * 12

        summary_env[env] = {
            "total_namespaces": total_namespaces,
            "total_cpu": total_cpu,
            "total_cpu_buffered": total_cpu_buffered,
            "standard_size": size,
            "monthly_cost": total_monthly,
            "annual_cost": total_annual
        }
    return summary_env

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# NEW: Serve config JSON files explicitly
@app.route("/assets/config/<path:filename>")
def serve_config(filename):
    config_path = os.path.join(app.static_folder, "assets", "config")
    return send_from_directory(config_path, filename)

@app.route("/api/results", methods=["GET"])
def get_results():
    return jsonify(session.get("results", {}))

@app.route("/api/add", methods=["POST"])
def add_entry():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    env = data.get("env")
    cpu_core_ns = 128000 if env == "prod" else 6000

    new_entry = {**data, "cpu_core_ns": cpu_core_ns}

    results = session.get("results", {})
    results.setdefault(env, []).append(new_entry)
    session["results"] = results

    return jsonify({"success": True, "results": results})

@app.route("/api/summary", methods=["GET"])
def get_summary():
    results = session.get("results", {})
    summary = compute_summary_per_env(results)
    return jsonify(summary)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
