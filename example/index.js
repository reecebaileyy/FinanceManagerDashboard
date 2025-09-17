
// Display a random financial tip
const tips = [
    "Set realistic monthly budgets to avoid overspending.",
    "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
    "Enable bill reminders to never miss a payment.",
    "Export your transactions regularly for tax season.",
    "Check spending by category to spot where your money goes.",
    "Use a strong password & enable 2FA for better protection."
  ];

const randomTip = tips[Math.floor(Math.random() * tips.length)];
document.getElementById("tipBox").innerHTML = `<strong>Tip</strong><p>${randomTip}</p>`;



// CLEAR BOTTOM TO REPLICATE LOGIN/ LOGOUT

// Show or hide protected sidebar links based on login status
const protectedLinks = document.getElementById("protectedLinks");
protectedLinks.style.display = "none"; // Hide by default (user not logged in)

// Listen for fake login (e.g., when "Login" button is clicked)
document.querySelectorAll('a[href="#dashboard"]').forEach(el => {
  el.addEventListener("click", () => {
    // Simulate login success
    protectedLinks.style.display = "block";

    // Optional: change user-chip text to show logged-in user
    const userChip = document.querySelector(".user-chip span:nth-child(2)");
    if (userChip) userChip.textContent = "Alex Doe"; // Replace with actual username
  });
});
