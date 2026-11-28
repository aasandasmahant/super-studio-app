const SCREENS = [
  { id:"home", hi:"1. होम", en:"1. Home" },
  { id:"discover", hi:"2. खोजें", en:"2. Discover" },
  { id:"details", hi:"3. विवरण", en:"3. Details" },
  { id:"community", hi:"4. कम्युनिटी", en:"4. Community" },
  { id:"chat", hi:"5. चैट", en:"5. Chat" },
  { id:"notifications", hi:"6. सूचनाएं", en:"6. Alerts" },
  { id:"profile", hi:"7. प्रोफ़ाइल", en:"7. Profile" },
  { id:"auth", hi:"8. लॉगिन", en:"8. Auth" },
  { id:"settings", hi:"9. सेटिंग्स", en:"9. Settings" },
  { id:"admin", hi:"10. एडमिन", en:"10. Admin" }
];
const PRODUCTS = [
  { id:1, name:"Creator Mic Pro", price:1499, verdict:"Top Pick", tag:"Audio" },
  { id:2, name:"4GB RAM Lite Suite", price:599, verdict:"Fast & Light", tag:"Tools" },
  { id:3, name:"Affiliate Growth Kit", price:999, verdict:"High Value", tag:"Growth" }
];
const state = { screen:"home", lang:"hi", theme:"dark", query:"", maxPrice:2000, selected:PRODUCTS[0], items:["Phase 1 initialized in Termux"] };

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k === "textContent") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

function renderNav() {
  const side = document.getElementById("sidebarNav");
  const bot = document.getElementById("bottomNav");
  side.replaceChildren();
  bot.replaceChildren();
  SCREENS.forEach((s, idx) => {
    const label = state.lang === "hi" ? s.hi : s.en;
    side.appendChild(el("button", {
      type:"button", className:`nav-item ${state.screen===s.id?"active":""}`, textContent:label,
      onClick:()=>{ state.screen=s.id; render(); }
    }));
    if (idx < 5) {
      bot.appendChild(el("button", {
        type:"button", className:`nav-item ${state.screen===s.id?"active":""}`, textContent:label.split(" ")[1]||label,
        onClick:()=>{ state.screen=s.id; render(); }
      }));
    }
  });
}

function renderView() {
  const view = document.getElementById("appView");
  const cur = SCREENS.find((x) => x.id === state.screen) || SCREENS[0];
  const title = el("h2", { textContent: state.lang === "hi" ? cur.hi : cur.en });
  const hint = el("p", { className:"muted", textContent:"Step-by-step Frontend Builder (10 Screens)" });
  const card = el("div", { className:"card" });

  if (state.screen === "discover") {
    const q = el("input", { type:"search", placeholder:"Search...", value:state.query, onInput:(e)=>{ state.query=e.target.value; renderView(); } });
    const r = el("input", { type:"range", min:200, max:2500, step:100, value:state.maxPrice, onInput:(e)=>{ state.maxPrice=Number(e.target.value); renderView(); } });
    card.appendChild(el("div", { className:"row" }, [q, r, el("span", { className:"muted", textContent:`Max ₹${state.maxPrice}` })]));
    const grid = el("div", { className:"grid" });
    PRODUCTS.filter((p) => p.name.toLowerCase().includes(state.query.toLowerCase()) && p.price <= state.maxPrice).forEach((p) => {
      grid.appendChild(el("div", { className:"card" }, [
        el("h3", { textContent:p.name }),
        el("p", { className:"muted", textContent:`₹${p.price} • ${p.verdict}` }),
        el("button", { type:"button", className:"btn-primary", textContent:"Details", onClick:()=>{ state.selected=p; state.screen="details"; render(); } })
      ]));
    });
    view.replaceChildren(title, hint, card, grid);
    return;
  }

  if (state.screen === "details") {
    card.appendChild(el("h3", { textContent:state.selected.name }));
    card.appendChild(el("p", { textContent:`₹${state.selected.price} • ${state.selected.tag}` }));
    card.appendChild(el("p", { className:"muted", textContent:state.selected.verdict }));
    card.appendChild(el("button", { type:"button", className:"btn-primary", textContent:"Back", onClick:()=>{ state.screen="discover"; render(); } }));
    view.replaceChildren(title, hint, card);
    return;
  }

  const inp = el("input", { type:"text", placeholder:"Write update..." });
  const btn = el("button", { type:"button", className:"btn-primary", textContent:"Add", onClick:()=>{
    if (!inp.value.trim()) return;
    state.items.unshift(`${cur.id.toUpperCase()}: ${inp.value.trim()}`);
    inp.value = "";
    render();
  }});
  const ul = el("ul");
  state.items.forEach((x) => ul.appendChild(el("li", { textContent:x })));
  card.appendChild(el("div", { className:"row" }, [inp, btn]));
  card.appendChild(ul);
  view.replaceChildren(title, hint, card);
}

function render() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.getElementById("langSelect").value = state.lang;
  renderNav();
  renderView();
}

document.getElementById("langSelect").addEventListener("change", (e)=>{ state.lang=e.target.value; render(); });
document.getElementById("themeBtn").addEventListener("click", ()=>{ state.theme=state.theme==="dark"?"light":"dark"; render(); });
render();
