import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
const config = window.MRLOGICWISE_FIREBASE_CONFIG || {};
const ready = config.apiKey && config.apiKey !== "ADD_FIREBASE_WEB_API_KEY";
const auth = ready ? getAuth(initializeApp(config)) : null;
const el = id => document.getElementById(id);
const prices = {starter:3000,growth:6000,pro:10000};
const cartKey = "mlw_cart";
const cart = () => { try { return JSON.parse(localStorage.getItem(cartKey) || "null"); } catch { return null; } };
if (el("add-cart")) {
  const refresh = () => {
    const plan = document.querySelector('input[name="plan"]:checked')?.value || "starter";
    const total = prices[plan] || 3000;
    el("estimate").textContent = "Estimated package: ₹" + total.toLocaleString("en-IN");
  };
  document.querySelectorAll('input[name="plan"]').forEach(x => x.addEventListener("change", refresh));
  el("add-cart").onclick = () => {
    const plan = document.querySelector('input[name="plan"]:checked')?.value || "starter";
    localStorage.setItem(cartKey, JSON.stringify({plan}));
    el("store-status").hidden = false;
    el("store-status").textContent = "Package saved. Sign in to continue.";
  };
  refresh();
}
if (el("cart-view")) {
  const c = cart();
  el("cart-view").textContent = c ? "Selected: " + c.plan + " package" : "Your cart is empty. Choose a package first.";
  el("cart-total").textContent = c ? "₹" + (prices[c.plan] || 0).toLocaleString("en-IN") : "₹0";
}
let creating = false;
if (el("toggle-auth")) el("toggle-auth").onclick = () => {
  creating = !creating;
  el("auth-title").textContent = creating ? "Create account" : "Sign in";
  el("email-action").textContent = creating ? "Create account" : "Sign in";
};
if (el("email-action")) el("email-action").onclick = async () => {
  if (!auth) { el("auth-status").hidden = false; el("auth-status").textContent = "Add the Firebase Web API key to firebase-config.js to enable sign-in."; return; }
  try {
    const email = el("email").value.trim(), password = el("password").value;
    if (creating) await createUserWithEmailAndPassword(auth,email,password);
    else await signInWithEmailAndPassword(auth,email,password);
    el("auth-status").textContent = "Signed in successfully.";
  } catch (e) { el("auth-status").textContent = e.message; }
  el("auth-status").hidden = false;
};
if (el("google-action")) el("google-action").onclick = async () => {
  if (!auth) { el("auth-status").hidden = false; el("auth-status").textContent = "Add the Firebase Web API key to firebase-config.js to enable Google sign-in."; return; }
  try { await signInWithPopup(auth,new GoogleAuthProvider()); }
  catch (e) { el("auth-status").hidden = false; el("auth-status").textContent = e.message; }
};
if (auth) onAuthStateChanged(auth,user => {
  if (el("auth-title") && user) el("auth-title").textContent = "Signed in: " + user.email;
});
