// Supabase, DOM, and camera setup remain the same as your existing script.js

// ====== AI IMAGE ANALYSIS WITH DYNAMIC NUTRITION ======
analyzePhotoBtn.addEventListener("click", async () => {
  if (!capturedImageData || !currentUser) return;
  analyzePhotoBtn.disabled = true;
  cameraStatus.textContent = "Analyzing food...";

  try {
    const res = await fetch("https://caloriescanner.jtho09200920.workers.dev/api/analyze-food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: capturedImageData })
    });

    const data = await res.json();

    if (!data.has_food) {
      cameraStatus.textContent = `No food detected (${Math.round(data.confidence*100)}% confidence)`;
      return;
    }

    // Save total calories
    await saveMealToCloud({
      text: data.description,
      calories: data.calories_estimate,
      time: new Date().toISOString()
    });

    await loadCloudMeals();

    // Show per-item breakdown
    const objectsHtml = data.objects
      .map(o => `<li>${o.name} (${o.portion}) — ${o.calories} cal, P:${o.protein}g C:${o.carbs}g F:${o.fat}g, Confidence: ${Math.round(o.confidence*100)}%</li>`)
      .join("");

    cameraStatus.innerHTML = `
      Total: ${data.calories_estimate} cal — ${data.description}<br>
      <ul>${objectsHtml}</ul>
    `;

  } catch(err){
    console.error(err);
    cameraStatus.textContent = "AI analysis failed.";
  } finally {
    analyzePhotoBtn.disabled = false;
  }
});
