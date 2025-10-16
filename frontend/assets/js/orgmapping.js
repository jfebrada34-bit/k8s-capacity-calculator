// assets/js/orgMapping.js
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("assets/config/orgMapping.json");
    const orgData = await response.json();
    console.log("✅ orgMapping.json loaded:", orgData.length);

    const approverSelect = document.getElementById("approver");
    const tribeSelect = document.getElementById("tribe");
    const squadSelect = document.getElementById("squad");

    // ✅ Populate Tribe dropdown
    const tribes = [];
    orgData.forEach(entry => {
      Object.keys(entry.tribes).forEach(tribe => {
        if (!tribes.includes(tribe)) tribes.push(tribe);
      });
    });

    tribes.forEach(tribe => {
      const opt = document.createElement("option");
      opt.value = tribe;
      opt.textContent = tribe;
      tribeSelect.appendChild(opt);
    });

    // ✅ When a tribe is selected → show squads + auto-fill approver
    tribeSelect.addEventListener("change", () => {
      const selectedTribe = tribeSelect.value;
      squadSelect.innerHTML = '<option value="">Select Squad</option>';
      approverSelect.value = "";

      const matchedEntry = orgData.find(entry =>
        Object.keys(entry.tribes).includes(selectedTribe)
      );

      if (matchedEntry) {
        // Populate squads
        matchedEntry.tribes[selectedTribe].forEach(sq => {
          const opt = document.createElement("option");
          opt.value = sq;
          opt.textContent = sq;
          squadSelect.appendChild(opt);
        });

        // Auto-fill approver
        approverSelect.value = matchedEntry.approver;
      }
    });
  } catch (err) {
    console.error("❌ Failed to load orgMapping.json:", err);
  }
});
