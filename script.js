// ====== BASIC MEAL LOGIC ======

// Load saved meals on startup
document.addEventListener("DOMContentLoaded", () => {
    loadMeals();
    updateTotal();
});

// Elements
const mealInput = document.getElementById("mealInput");
const addMealBtn = document.getElementById("addMealBtn");
const mealList = document.getElementById("mealList");
const totalCaloriesEl = document.getElementById("totalCalories");

// Add meal button (text-based)
addMealBtn.addEventListener("click", async () => {
    const text = mealInput.value.trim();
    if (!text) return;

    const calories = await estimateCaloriesFromText(text);

    const meal = {
        text,
        calories,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    saveMeal(meal);
    addMealToDOM(meal);
    updateTotal();

    mealInput.value = "";
});

// Placeholder AI function for text
async function estimateCaloriesFromText(mealText) {
    // Replace this with your text-based AI call later
    return Math.floor(Math.random() * 400) + 100; // 100–500 calories
}

// Save meal to localStorage
function saveMeal(meal) {
    const meals = JSON.parse(localStorage.getItem("meals")) || [];
    meals.push(meal);
    localStorage.setItem("meals", JSON.stringify(meals));
}

// Load meals
function loadMeals() {
    const meals = JSON.parse(localStorage.getItem("meals")) || [];
    meals.forEach(addMealToDOM);
}

// Add meal to page
function addMealToDOM(meal) {
    const li = document.createElement("li");
    li.classList.add("meal-item");

    li.innerHTML = `
        <strong>${meal.time}</strong> — ${meal.text}
        <span class="meal-calories">(${meal.calories} cal)</span>
    `;

    mealList.appendChild(li);
}

// Update total calories
function updateTotal() {
    const meals = JSON.parse(localStorage.getItem("meals")) || [];
    const total = meals.reduce((sum, m) => sum + m.calories, 0);
    totalCaloriesEl.textContent = total;
}

// ====== CAMERA + IMAGE AI LOGIC ======

const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const cameraContainer = document.getElementById("cameraContainer");
const cameraPreview = document.getElementById("cameraPreview");
const cameraCanvas = document.getElementById("cameraCanvas");
const captureBtn = document.getElementById("captureBtn");
const retakeBtn = document.getElementById("retakeBtn");
const analyzePhotoBtn = document.getElementById("analyzePhotoBtn");
const cameraStatus = document.getElementById("cameraStatus");

let cameraStream = null;
let capturedImageData = null;

// Toggle camera card visibility
toggleCameraBtn.addEventListener("click", async () => {
    if (cameraContainer.classList.contains("hidden")) {
        cameraContainer.classList.remove("hidden");
        toggleCameraBtn.textContent = "Close Camera";
        await startCamera();
    } else {
        stopCamera();
        cameraContainer.classList.add("hidden");
        toggleCameraBtn.textContent = "Open Camera";
    }
});

// Start camera
async function startCamera() {
    cameraStatus.textContent = "Starting camera...";
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        cameraPreview.srcObject = cameraStream;
        cameraPreview.classList.remove("hidden");
        cameraCanvas.classList.add("hidden");
        captureBtn.classList.remove("hidden");
        retakeBtn.classList.add("hidden");
        analyzePhotoBtn.classList.add("hidden");
        cameraStatus.textContent = "Point your camera at your meal and tap Capture.";
    } catch (err) {
        console.error(err);
        cameraStatus.textContent = "Unable to access camera. Check permissions.";
    }
}

// Stop camera
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraStatus.textContent = "";
}

// Capture frame from video
captureBtn.addEventListener("click", () => {
    if (!cameraStream) return;

    const videoWidth = cameraPreview.videoWidth;
    const videoHeight = cameraPreview.videoHeight;

    cameraCanvas.width = videoWidth;
    cameraCanvas.height = videoHeight;

    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraPreview, 0, 0, videoWidth, videoHeight);

    cameraPreview.classList.add("hidden");
    cameraCanvas.classList.remove("hidden");

    captureBtn.classList.add("hidden");
    retakeBtn.classList.remove("hidden");
    analyzePhotoBtn.classList.remove("hidden");

    capturedImageData = cameraCanvas.toDataURL("image/jpeg", 0.9);
    cameraStatus.textContent = "Photo captured. Tap Analyze to estimate calories.";
});

// Retake photo
retakeBtn.addEventListener("click", () => {
    cameraCanvas.classList.add("hidden");
    cameraPreview.classList.remove("hidden");

    captureBtn.classList.remove("hidden");
    retakeBtn.classList.add("hidden");
    analyzePhotoBtn.classList.add("hidden");

    capturedImageData = null;
    cameraStatus.textContent = "Point your camera at your meal and tap Capture.";
});

// Analyze captured photo
analyzePhotoBtn.addEventListener("click", async () => {
    if (!capturedImageData) return;

    cameraStatus.textContent = "Analyzing meal with AI...";
    analyzePhotoBtn.disabled = true;

    try {
        const analysis = await estimateCaloriesFromImage(capturedImageData);

        const mealText = analysis.description || "Scanned meal";
        const calories = analysis.calories || 0;

        const meal = {
            text: mealText,
            calories,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        saveMeal(meal);
        addMealToDOM(meal);
        updateTotal();

        cameraStatus.textContent = `Estimated: ${calories} calories — ${mealText}`;
    } catch (err) {
        console.error(err);
        cameraStatus.textContent = "There was an error analyzing the image.";
    } finally {
        analyzePhotoBtn.disabled = false;
    }
});

// Placeholder AI function for image
async function estimateCaloriesFromImage(base64Image) {
    // base64Image is a data URL (e.g., "data:image/jpeg;base64,...")
    // In production, strip the prefix and send the base64 to your AI vision API.

    // Example structure for a real call (pseudo-code):
    /*
    const response = await fetch("YOUR_VISION_API_ENDPOINT", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY"
        },
        body: JSON.stringify({
            image: base64Image
        })
    });
    const data = await response.json();
    return {
        description: data.detected_foods_description,
        calories: data.estimated_calories
    };
    */

    // For now, return a fake but structured response:
    const fakeFoods = [
        "Bowl of pasta with sauce",
        "Grilled chicken with vegetables",
        "Burger and fries",
        "Salad with dressing",
        "Breakfast plate (eggs, toast, bacon)"
    ];
    const randomFood = fakeFoods[Math.floor(Math.random() * fakeFoods.length)];
    const randomCalories = Math.floor(Math.random() * 500) + 200; // 200–700

    return {
        description: randomFood,
        calories: randomCalories
    };
}
