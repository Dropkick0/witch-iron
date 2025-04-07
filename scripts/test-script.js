// Simple test script to verify loading
console.log("===== TEST SCRIPT LOADED SUCCESSFULLY =====");

// Add a style to body to verify script execution
document.addEventListener("DOMContentLoaded", function() {
  console.log("TEST SCRIPT DOM LOADED EVENT FIRED");
  document.body.style.borderTop = "10px solid purple";
});

// Hook into Foundry's init to verify Foundry integration
Hooks.once("init", function() {
  console.log("TEST SCRIPT INIT HOOK FIRED");
}); 