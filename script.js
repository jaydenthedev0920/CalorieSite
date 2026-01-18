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

// Add meal button
addMealBtn.addEventListener("click", async () => {
    const text = mealInput.value.trim();
    if (!text) return;

    // Placeholder AI calorie estimate
    const calories = await estimateCalories(text);

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

// Placeholder AI function
async function estimateCalories(mealText) {
    // Replace this with your API call later
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