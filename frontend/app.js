// Vanilla frontend script connecting to FastAPI REST API
const API_BASE = "";

async function initDashboard() {
  try {
    const healthResp = await fetch(`${API_BASE}/health`);
    if (healthResp.ok) {
      document.querySelector(".status-dot").classList.add("online");
      document.getElementById("api-status-text").innerText = "REST API Online";
    }

    const infoResp = await fetch(`${API_BASE}/info`);
    if (infoResp.ok) {
      const info = await infoResp.json();
      document.getElementById("val-total-users").innerText = info.dataset_rows.toLocaleString();
      document.getElementById("val-n-clusters").innerText = info.n_clusters;
      document.getElementById("val-silhouette").innerText = info.metrics.silhouette_score;
      document.getElementById("val-algo").innerText = info.algorithm;
    }

    const segResp = await fetch(`${API_BASE}/segments`);
    if (segResp.ok) {
      const data = await segResp.json();
      renderSegments(data.segments);
    }
  } catch (err) {
    console.warn("API not reachable yet, waiting for service startup...", err);
    document.getElementById("api-status-text").innerText = "API Offline (check server)";
  }
}

async function renderSegments(segments) {
  const container = document.getElementById("segments-container");
  container.innerHTML = "";

  for (const seg of segments) {
    // Fetch details
    let traits = [];
    try {
      const detailResp = await fetch(`${API_BASE}/segments/${seg.cluster_id}`);
      if (detailResp.ok) {
        const detail = await detailResp.json();
        traits = detail.dominant_characteristics || [];
      }
    } catch (e) {}

    const card = document.createElement("div");
    card.className = "segment-card";
    card.innerHTML = `
      <h4>${seg.segment_name}</h4>
      <div class="seg-meta">Cluster ${seg.cluster_id} &bull; ${seg.user_count.toLocaleString()} Viewers (${seg.percentage}%)</div>
      <div class="traits">
        ${traits.map(t => `<span class="traits-pill">${t}</span>`).join("")}
      </div>
    `;
    container.appendChild(card);
  }
}

document.getElementById("predict-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btn-predict");
  btn.innerText = "Classifying...";
  btn.disabled = true;

  const payload = {
    watch_time: parseFloat(document.getElementById("inp-watch").value),
    session_duration: parseFloat(document.getElementById("inp-session").value),
    visit_frequency: parseInt(document.getElementById("inp-visits").value),
    completion_rate: parseFloat(document.getElementById("inp-completion").value),
    action_preference: parseFloat(document.getElementById("inp-action").value),
    family_preference: parseFloat(document.getElementById("inp-family").value),
    comedy_preference: parseFloat(document.getElementById("inp-comedy").value),
    drama_preference: parseFloat(document.getElementById("inp-drama").value)
  };

  try {
    const resp = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      const res = await resp.json();
      document.getElementById("prediction-result").style.display = "block";
      document.getElementById("res-segment-name").innerText = res.segment_name;
      document.getElementById("res-cluster-id").innerText = res.cluster_id;
      document.getElementById("res-similarity").innerText = `${res.similarity_indicator.normalized_similarity * 100}% (Euclidean dist: ${res.similarity_indicator.distance})`;
      
      const traitsContainer = document.getElementById("res-traits");
      traitsContainer.innerHTML = (res.dominant_characteristics || [])
        .map(t => `<span class="traits-pill">${t}</span>`)
        .join("");
    } else {
      alert("Inference request failed with code " + resp.status);
    }
  } catch (err) {
    alert("Could not reach API: " + err.message);
  } finally {
    btn.innerText = "Predict Audience Segment";
    btn.disabled = false;
  }
});

window.addEventListener("DOMContentLoaded", initDashboard);
