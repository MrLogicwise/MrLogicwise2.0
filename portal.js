import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const API = "https://vite-react-template.ck-brandivity.workers.dev";
const config = window.MRLOGICWISE_FIREBASE_CONFIG || {};
const firebaseReady = !!(config.apiKey && config.apiKey !== "ADD_FIREBASE_WEB_API_KEY");
let auth = null;
try { if (firebaseReady) auth = getAuth(initializeApp(config)); } catch (e) { console.error("Firebase setup:", e); }
const $ = id => document.getElementById(id);
const plans = { starter: 3000, growth: 6000, pro: 10000 };
const addOns = { extra_page: 500, contact_form: 700, whatsapp: 400, seo: 800, booking: 1200 };
const labels = { starter:"Starter website", growth:"Growth website", pro:"Advanced website", extra_page:"Extra page", contact_form:"Advanced enquiry form", whatsapp:"WhatsApp integration", seo:"Basic on-page SEO", booking:"Booking request form" };
const CART_KEY = "mlw_cart";
const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || "null"); } catch { return null; } };
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
function calculate(cart) {
  if (!cart || !plans[cart.plan]) return 0;
  let total = plans[cart.plan];
  (cart.addons || []).forEach(key => { total += addOns[key] || 0; });
  if ((cart.coupon || "").trim().toUpperCase() === "WELCOME10") total = Math.round(total * .9);
  return total;
}
function status(id, message) { const node=$(id); if(node){node.hidden=false;node.textContent=message;} }
let currentUser = null;

if ($("add-cart")) {
  const updateEstimate = () => {
    const plan = document.querySelector('input[name="plan"]:checked')?.value || "starter";
    const addons = [...document.querySelectorAll("#features input[type=checkbox]:checked")].map(x=>x.value);
    const coupon = $("coupon")?.value || "";
    $("estimate").textContent = "Estimated package: " + money(calculate({plan,addons,coupon}));
  };
  document.querySelectorAll('input[name="plan"], #features input, #coupon').forEach(x=>x.addEventListener("change",updateEstimate));
  $("coupon")?.addEventListener("input",updateEstimate);
  $("add-cart").onclick = () => {
    const cart={plan:document.querySelector('input[name="plan"]:checked')?.value||"starter",addons:[...document.querySelectorAll("#features input[type=checkbox]:checked")].map(x=>x.value),coupon:$("coupon")?.value.trim()||""};
    localStorage.setItem(CART_KEY,JSON.stringify(cart));
    status("store-status","Your package and selected features are saved. Continue to your account to check out.");
    $("store-status").insertAdjacentHTML("beforeend",' <a href="account.html">Go to checkout</a>');
  };
  updateEstimate();
}

async function refreshOrders() {
  if (!$("orders-view")) return;
  if (!currentUser) { $("orders-view").textContent="Sign in to view your order history."; return; }
  try {
    const token=await currentUser.getIdToken();
    const res=await fetch(API+"/api/my-orders",{headers:{Authorization:"Bearer "+token}});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"Unable to load orders");
    const root=$("orders-view");root.replaceChildren();
    if(!data.orders?.length){root.textContent="No orders yet. Your paid and pending orders will appear here.";return;}
    data.orders.forEach(order=>{
      const card=document.createElement("article");card.className="portal-row";
      const left=document.createElement("div");const title=document.createElement("b");title.textContent=labels[order.plan]||order.plan;
      const meta=document.createElement("small");meta.textContent=order.id+" · "+new Date(order.created_at).toLocaleString("en-IN");
      left.append(title,meta);const right=document.createElement("div");right.style.textAlign="right";
      const amount=document.createElement("b");amount.textContent=money(order.amount_paise/100);
      const state=document.createElement("small");state.textContent=String(order.status||"created").toUpperCase();
      right.append(amount,state);card.append(left,right);root.append(card);
    });
  } catch(e) { $("orders-view").textContent=e.message; }
}

if ($("cart-view")) {
  const cart=readCart();
  if(!cart || !plans[cart.plan]) {
    $("cart-view").textContent="Your cart is empty. Choose a package first.";
    $("cart-total").textContent="₹0";
    $("checkout").disabled=true;
  } else {
    const list=document.createElement("div");
    const entries=[{name:labels[cart.plan],price:plans[cart.plan]},...(cart.addons||[]).filter(k=>addOns[k]).map(k=>({name:labels[k],price:addOns[k]}))];
    entries.forEach(item=>{const row=document.createElement("div");row.className="portal-row";const name=document.createElement("span");name.textContent=item.name;const price=document.createElement("b");price.textContent=money(item.price);row.append(name,price);list.append(row);});
    $("cart-view").replaceChildren(list);
    const total=calculate(cart);
    $("cart-total").textContent=money(total);
    if(cart.coupon?.trim()){const note=document.createElement("small");note.textContent=cart.coupon.toUpperCase()==="WELCOME10"?"WELCOME10 discount applied (10%).":"Coupon not recognised; no discount applied."; $("cart-view").append(note);}
    $("checkout").disabled=false;
  }
  $("checkout").onclick=async()=>{
    const cart=readCart();if(!cart||!plans[cart.plan])return;
    const email=$("checkout-email")?.value.trim()||currentUser?.email||"";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status("checkout-status","Enter a valid email address for your receipt.");return;}
    if(typeof Razorpay==="undefined"){status("checkout-status","Razorpay Checkout could not load. Refresh the page and try again.");return;}
    $("checkout").disabled=true;status("checkout-status","Creating your secure order…");
    try{
      const headers={"content-type":"application/json"};
      if(currentUser)headers.Authorization="Bearer "+await currentUser.getIdToken();
      const response=await fetch(API+"/api/create-order",{method:"POST",headers,body:JSON.stringify({plan:cart.plan,addons:cart.addons||[],coupon:cart.coupon||"",email})});
      const order=await response.json();if(!response.ok)throw new Error(order.error||"Order creation failed");
      const checkout=new Razorpay({key:order.key_id,amount:order.amount,currency:order.currency,name:"MrLogicwise",description:order.description,order_id:order.order_id,prefill:{email},theme:{color:"#ffb81c"},handler:async payment=>{
        status("checkout-status","Payment received. Verifying signature and payment status…");
        const verify=await fetch(API+"/api/verify-payment",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...payment,order_ref:order.order_ref})});
        const result=await verify.json();if(!verify.ok)throw new Error(result.error||"Verification failed");
        status("checkout-status","Order "+order.order_ref+" · "+result.status.toUpperCase()+". "+(result.status==="paid"?"Payment confirmed.":"Payment authorised; capture confirmation will update your order."));
        await refreshOrders();
      },modal:{ondismiss:()=>status("checkout-status","Checkout closed. Check your payment status before attempting another payment.")}});
      checkout.on("payment.failed",e=>status("checkout-status","Payment failed: "+(e.error?.description||"Please try again.")));
      checkout.open();
    }catch(e){status("checkout-status",e.message);}finally{$("checkout").disabled=false;}
  };
}

let creating=false;
if($("toggle-auth"))$("toggle-auth").onclick=()=>{creating=!creating;$("auth-title").textContent=creating?"Create account":"Sign in";$("email-action").textContent=creating?"Create account":"Sign in";};
if($("email-action"))$("email-action").onclick=async()=>{
  if(!auth){status("auth-status","Firebase is not configured yet. Add the Web API key from Firebase Console to firebase-config.js.");return;}
  try{const email=$("email").value.trim(),password=$("password").value;if(!email||!password)throw new Error("Enter your email and password.");if(creating)await createUserWithEmailAndPassword(auth,email,password);else await signInWithEmailAndPassword(auth,email,password);status("auth-status","Signed in successfully.");}
  catch(e){status("auth-status",e.message);}
};
if($("google-action"))$("google-action").onclick=async()=>{
  if(!auth){status("auth-status","Firebase is not configured yet. Add the Web API key from Firebase Console to firebase-config.js.");return;}
  try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){status("auth-status",e.message);}
};
if($("signout"))$("signout").onclick=async()=>{if(auth)await signOut(auth);};
if($("refresh-orders"))$("refresh-orders").onclick=refreshOrders;

if(auth)onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if($("auth-title"))$("auth-title").textContent=user?"Signed in: "+(user.email||"Customer"):"Sign in";
  if($("auth-status")&&user)status("auth-status","You are signed in.");
  if($("refresh-orders"))$("refresh-orders").disabled=!user;
  await refreshOrders();
});
