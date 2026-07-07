function showDescription(serviceId) {
            // Fermer toutes les descriptions
            const allDescriptions = document.querySelectorAll('.pop-up .contact');
            allDescriptions.forEach(desc => {
                if (desc.id !== serviceId) {
                    desc.classList.remove('active');
                }
            });
            // Afficher ou cacher la description cliquée
            const description = document.getElementById(serviceId);
            description.classList.toggle('active');
            
            // Scroll vers la description
            if (description.classList.contains('active')) {
                setTimeout(() => {
                    description.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        }

        function closePop(serviceId) {
            
            const description = document.getElementById(serviceId);
            description.classList.remove('active');
        }

        // Fermer la description si on clique sur le lien à nouveau
        document.querySelectorAll('.subscriber').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
            });
        });

        
// bouton
const btn = document.getElementById("toggle");

// récupérer thème sauvegardé
let theme = localStorage.getItem("theme");

// si aucun → utiliser système
if (!theme) {
  theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// appliquer
document.documentElement.setAttribute("data-theme", theme);
updateIcon();

// toggle
btn.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  updateIcon();
});

// icône
function updateIcon() {
  btn.textContent = theme === "dark" ? "☀️" : "🌙";
}





/* ══ State ══ */
let articles = [];
let currentImg = null;      // aperçu
let currentFile = null;     // fichier réel
let condition  = null;
let faculty    = null;
let currentFilter = 'all';
let favs = new Set();

const COLORS = ['#b5814a','#c78238','#9f682d','#774e22','#6d4e2c','#91673b','#966c36'];
const FAC_EMOJI = {Droit:'⚖️',Sciences:'🔬',Lettres:'📖',Informatique:'💻',Économie:'📊',Arts:'🎨'};


/* =========================
   CHARGEMENT DES ANNONCES
========================= */
async function chargerAnnonces() {

  console.log("chargerAnnonces exécutée");

  try {
    // Remplacer "annonces" par l'URL complète de ton serveur Node
    const response = await fetch(
      "http://localhost:3000/annonces"
    );

    const data = await response.json();

    console.log(data);

    articles = data.map(a => ({

      id: a.id,

      userId: a.utilisateur_id,

      title: a.titre,

      seller: a.vendeur,

      price: Number(a.prix),

      desc: a.description,

      cat: a.categorie,

      condition: a.etat,

      faculty: a.faculte,

      delivery: a.mode_remise,

      img: a.image,

      color: COLORS[Math.floor(Math.random() * COLORS.length)],

      initials: (a.vendeur || "")
        .split(" ")
        .map(w => w[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2),

      ts: Date.now()

    }));

    renderGrid();

  } catch(err) {

    console.error(
      "Erreur chargement annonces :",
      err
    );

  }

}



/* ══ Publish ══ */
async function publish(){

  const title  = document.getElementById('f-title').value.trim();
  const seller = document.getElementById('f-seller').value.trim();
  const price  = document.getElementById('f-price').value.trim();
  const cat    = document.getElementById('f-cat').value;

  if(!title)    { toast('⚠️ Entre un titre'); return; }
  if(!seller)   { toast('⚠️ Entre le nom du vendeur'); return; }
  if(!price)    { toast('⚠️ Entre un prix'); return; }
  if(!cat)      { toast('⚠️ Choisis une catégorie'); return; }
  if(!condition){ toast('⚠️ Indique l\'état de l\'article'); return; }

  let imageUrl = null;

  // Upload image vers Node.js
  if(currentFile){

    try{

      const formData = new FormData();

      formData.append("images", currentFile);

      const response = await fetch(
        "http://localhost:3000/upload",
        {
          method: "POST",
          body: formData
        }
      );
      const data = await response.json();

      if(data.images && data.images.length){
        imageUrl = data.images[0];
      }

    }catch(err){

      console.error(err);
      toast("❌ Erreur upload image");
      return;

    }

  }

  const art = {

    id: Date.now(),

    userId: getUtilisateur()?.id,

    title,
    seller,

    price: parseFloat(price),

    desc: document.getElementById('f-desc').value.trim(),

    cat,
    condition,

    faculty: faculty || null,

    delivery: document.getElementById('f-delivery').value,

    img: imageUrl,  
    

    color: COLORS[Math.floor(Math.random()*COLORS.length)],

    initials: seller
      .split(' ')
      .map(w=>w[0]||'')
      .join('')
      .toUpperCase()
      .slice(0,2),

    ts: Date.now()

  };

  try {

  const utilisateur =
  JSON.parse(localStorage.getItem("utilisateur"));


  const response = await fetch(
    "http://localhost:3000/annonces",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: art.id,
        utilisateur_id: utilisateur.id, 
        titre: art.title,
        vendeur: art.seller,
        description: art.desc,
        categorie: art.cat,
        etat: art.condition,
        faculte: art.faculty,
        mode_remise: art.delivery,
        prix: art.price,
        image: imageUrl
      })
    }
  );

  const result = await response.json();

  console.log(result);

} catch(err) {

  console.error(err);
  toast("❌ Erreur lors de l'enregistrement");
  return;

}


  articles.unshift(art);
  renderGrid();
  await chargerAnnonces();
  resetForm();

  toast('🎉 Annonce publiée !');

  setTimeout(()=>{
    document
      .getElementById('marketSection')
      .scrollIntoView({behavior:'smooth'});
  },450);

}



/* ══ Render ══ */
function renderGrid(){


   console.log("renderGrid");
   console.log("articles =", articles);

  const grid = document.getElementById('articlesGrid');
  grid.innerHTML = '';

  const list = currentFilter==='all' ? articles
    : articles.filter(a=>a.cat===currentFilter);

  const total = articles.length;
  document.getElementById('articleCount').textContent =
    total===0 ? '0 article' : total===1 ? '1 article' : `${total} articles`;

  if(list.length===0){
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏷️</div>
        <h4>${currentFilter==='all'?'Aucune annonce pour l\'instant':'Aucun article dans cette catégorie'}</h4>
        <p>${currentFilter==='all'?'Publie ton premier article ci-dessus — il apparaîtra ici instantanément.':'Essaie une autre catégorie ou publie le premier article !'}</p>
      </div>`;
    return;
  }

  list.forEach((a,i)=>{
    const card = makeCard(a,i);
    grid.appendChild(card);
  });
}


// registre d'inscription
const registerForm =
document.getElementById("registerForm");

registerForm.addEventListener(
"submit",
async function(e){

    e.preventDefault();

    const data = {
        nom:
        document.getElementById("nom").value,

        prenom:
        document.getElementById("prenom").value,

        email:
        document.getElementById("email").value,

        telephone:
        document.getElementById("telephone").value,

        password:
        document.getElementById("password").value
    };

    try{

        const response =
        await fetch(
        "http://localhost:3000/inscription",
        {
            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify(data)
        });

        const result =
        await response.json();

        alert(result.message);

        if(result.utilisateur){
            localStorage.setItem(
                "utilisateur",
                JSON.stringify(result.utilisateur)
            );
            closePop("inscription");
            majUIConnecte();
        }

    }
    catch(error){

        console.error(error);

        alert(
        "Erreur serveur"
        );

    }

});


async function connexion() {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    try {

        const response = await fetch(
            "http://localhost:3000/connexion",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {

            alert(result.message);
            return;

        }

        localStorage.setItem(
            "utilisateur",
            JSON.stringify(result.utilisateur)
        );

        toast("Connexion réussie");

        closePop("connexion");
        majUIConnecte();

    }
    catch(err) {

        console.error(err);

        toast("❌ Erreur de connexion");

    }

}



/* ══ Upload ══ */
function onFile(files){

  if(!files || !files[0]) return;

  currentFile = files[0];

  const r = new FileReader();

  r.onload = e => {
    showPreview(e.target.result);
  };

  r.readAsDataURL(currentFile);

}
function onDrop(e){
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag');
  onFile(e.dataTransfer.files);
}
function showPreview(src){
  currentImg = src;
  document.getElementById('previewImg').src = src;
  document.getElementById('uploadPh').classList.add('hide');
  document.getElementById('imgPreview').classList.add('show');
}
function resetPhoto(e){
  if(e) e.stopPropagation();
  currentImg = null;
  currentFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('previewImg').src = '';
  document.getElementById('uploadPh').classList.remove('hide');
  document.getElementById('imgPreview').classList.remove('show');
}

/* ══ Pills ══ */
function pickCond(btn){
  document.querySelectorAll('#condRow .cond-pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  condition = btn.dataset.val;
}
function pickFac(btn){
  document.querySelectorAll('#facRow .fac-pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  faculty = btn.dataset.val;
}


function resetForm(){
  ['f-title','f-seller','f-price','f-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-cat').value = '';
  document.getElementById('f-delivery').selectedIndex = 0;
  document.querySelectorAll('.cond-pill,.fac-pill').forEach(b=>b.classList.remove('on'));
  condition = null; faculty = null;
  resetPhoto();
}

/* ══ Filter ══ */
function setFilter(btn){
  currentFilter = btn.dataset.filter;
  document.querySelectorAll('.market-controls .chip').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderGrid();
}


function makeCard(a,i){
  const condClass = {
    'Neuf':'cond-neuf','Très bon':'cond-tres',
    'Bon état':'cond-bon','Correct':'cond-correct'
  }[a.condition]||'cond-bon';

  const facEmoji = a.faculty ? (FAC_EMOJI[a.faculty]||'🎓') : null;

  const d = document.createElement('div');
  d.className='card';
  d.style.animationDelay=(i*.07)+'s';
  d.innerHTML=`
    <div class="card-img">
      ${a.img
        // ? `<img src="${a.img}" alt="${esc(a.title)}"/>`
        ? `<img src="http://localhost:3000${a.img}" alt="${esc(a.title)}"/>`  
        : `<div class="card-placeholder">🏷️</div>`}
      <div class="card-img-grad"></div>
      <span class="card-cond ${condClass}">${esc(a.condition)}</span>
      <button class="card-fav ${favs.has(a.id)?'liked':''}"
        onclick="toggleFav(${a.id},this)">${favs.has(a.id)?'❤️':'🤍'}</button>
      <span class="price-ribbon">${a.price.toLocaleString('fr-FR')} Fcfa</span>
    </div>

    <div class="card-body">
      <div class="card-title">${esc(a.title)}</div>
      ${a.desc?`<div class="card-desc">${esc(a.desc)}</div>`:''}
      <div class="card-tags">
        <span class="card-tag">🗂️ ${esc(a.cat)}</span>
        ${facEmoji?`<span class="card-tag">${facEmoji} ${esc(a.faculty)}</span>`:''}
        <span class="card-tag">${esc(a.delivery)}</span>
      </div>
      <div class="seller-row">
        <div class="seller-ava" style="background:${a.color}">${a.initials}</div>
        <div class="seller-meta">
          <div class="seller-name">${esc(a.seller)}</div>
          <div class="seller-fac">${a.faculty||'Étudiant·e vérifié·e'}</div>
        </div>
        <div class="card-stars">⭐ Nouveau</div>
      </div>
    </div>

    <div class="card-foot">
      <button class="btn-add" onclick="toast('🛒 Ajouté au panier !')">+ Panier</button>
      <button class="btn-msg" title="Contacter">💬</button>
    </div>
  `;
  return d;
}

function toggleFav(id,btn){
  if(favs.has(id)){
    favs.delete(id);btn.textContent='🤍';btn.classList.remove('liked');
  } else {
    favs.add(id);btn.textContent='❤️';btn.classList.add('liked');toast('❤️ Ajouté aux favoris');
  }

  const u = getUtilisateur();
  if(u){
    sauverFavoris(u.id);
    // Si le pop-up "Mon compte" est ouvert, on répercute le changement en temps réel
    if(document.getElementById('moncompte').classList.contains('active')){
      renderCompte();
    }
  }
}

function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

let toastTimer;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}

/* ══ Seed data ══ */

window.addEventListener("DOMContentLoaded", async () => {
    await chargerAnnonces();
    majUIConnecte();
});

/* ══════════════════════════════
   MON COMPTE
═══════════════════════════════ */
let currentCompteTab = 'annonces';

function getUtilisateur(){
  try{
    return JSON.parse(localStorage.getItem("utilisateur")) || null;
  }catch(e){
    return null;
  }
}

function initiales(nom, prenom){
  const n = (prenom?.[0] || '') + (nom?.[0] || '');
  return n.toUpperCase() || '?';
}

/* Favoris persistés par utilisateur (localStorage), pour que le
   refresh de la page ne fasse rien perdre à l'utilisateur connecté */
function cleFavoris(userId){
  return `favoris_${userId}`;
}

function chargerFavoris(userId){
  try{
    const brut = localStorage.getItem(cleFavoris(userId));
    const ids = brut ? JSON.parse(brut) : [];
    favs = new Set(ids);
  }catch(e){
    favs = new Set();
  }
}

function sauverFavoris(userId){
  if(!userId) return;
  localStorage.setItem(cleFavoris(userId), JSON.stringify([...favs]));
}

/* Bascule l'affichage navbar selon l'état de connexion
   et synchronise l'en-tête du pop-up Mon compte */
function majUIConnecte(){
  const u = getUtilisateur();

  const navSignup  = document.getElementById('navSignup');
  const navLogin   = document.getElementById('navLogin');
  const navAccount = document.getElementById('navAccount');

  if(u){
    navSignup.style.display  = 'none';
    navLogin.style.display   = 'none';
    navAccount.style.display = 'flex';

    chargerFavoris(u.id);

    const ini = initiales(u.nom, u.prenom);
    document.getElementById('navAvatar').textContent = ini;
    document.getElementById('navName').textContent =
      (u.prenom ? u.prenom : 'Mon compte');

    document.getElementById('compteBigAva').textContent = ini;
    document.getElementById('compteNom').textContent =
      [u.prenom, u.nom].filter(Boolean).join(' ') || 'Utilisateur';
    document.getElementById('compteEmail').textContent = u.email || '';

    renderCompte();
  } else {
    navSignup.style.display  = '';
    navLogin.style.display   = '';
    navAccount.style.display = 'none';
  }
}

function setCompteTab(btn){
  document.querySelectorAll('.compte-tab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  currentCompteTab = btn.dataset.tab;
  renderCompte();
}

function nomComplet(u){
  return [u?.prenom, u?.nom].filter(Boolean).join(' ').trim().toLowerCase();
}

function renderCompte(){
  const u = getUtilisateur();
  if(!u) return;

  const moi = nomComplet(u);

  // Annonces publiées par l'utilisateur connecté : lien réel via utilisateur_id,
  // avec repli sur la correspondance de nom si l'annonce n'a pas encore d'id (ancien format)
  const mesAnnonces = articles.filter(a =>
    a.userId != null
      ? String(a.userId) === String(u.id)
      : (a.seller || '').trim().toLowerCase() === moi
  );

  // Favoris de l'utilisateur, persistés par utilisateur dans localStorage
  const mesFavoris = articles.filter(a => favs.has(a.id));

  // Statistiques
  document.getElementById('statAnnonces').textContent = mesAnnonces.length;
  document.getElementById('statFavoris').textContent  = mesFavoris.length;

  const body = document.getElementById('compteBody');
  body.innerHTML = '';

  let list = [];
  let emptyIcon = '🏷️';
  let emptyTitle = '';
  let emptyText = '';

  if(currentCompteTab === 'annonces'){
    list = mesAnnonces;
    emptyIcon = '🏷️';
    emptyTitle = 'Aucune annonce publiée';
    emptyText = 'Tes articles mis en vente apparaîtront ici.';
  } else if(currentCompteTab === 'favoris'){
    list = mesFavoris;
    emptyIcon = '❤️';
    emptyTitle = 'Aucun favori';
    emptyText = 'Touche le cœur 🤍 sur une annonce pour la retrouver ici.';
  }

  if(list.length === 0){
    body.innerHTML = `
      <div class="compte-empty">
        <div style="font-size:1.6rem;margin-bottom:.3rem">${emptyIcon}</div>
        <strong style="color:var(--t700)">${emptyTitle}</strong>
        <p style="margin-top:.25rem">${emptyText}</p>
      </div>`;
    return;
  }

  list.forEach(a => body.appendChild(makeCompteItem(a)));
}

function makeCompteItem(a){
  const d = document.createElement('div');
  d.className = 'compte-item';

  // Dans l'onglet Favoris, on précise le nom du vendeur de l'article
  const vendeurInfo = currentCompteTab === 'favoris'
    ? `<div class="ci-seller">👤 ${esc(a.seller || 'Vendeur inconnu')}</div>`
    : '';

  d.innerHTML = `
    ${a.img
      ? `<img src="http://localhost:3000${a.img}" alt="${esc(a.title)}"/>`
      : `<div class="ci-ph">🏷️</div>`}
    <div class="ci-info">
      <div class="ci-title">${esc(a.title)}</div>
      <div class="ci-meta">${esc(a.cat || '')}${a.condition ? ' · ' + esc(a.condition) : ''}</div>
      ${vendeurInfo}
    </div>
    <div class="ci-price">${Number(a.price).toLocaleString('fr-FR')} Fcfa</div>
  `;
  return d;
}

function deconnexion(){
  localStorage.removeItem("utilisateur");
  favs = new Set();
  closePop("moncompte");
  toast("👋 Déconnecté(e)");
  majUIConnecte();
}

/* 
(function(){
  [
    {title:'Pack manuels Licence 2 Droit',seller:'Camille Bernard',price:24,
     desc:'Lot de 3 livres, quelques annotations au crayon.',
     cat:'📚 Livres & Cours',condition:'Bon état',faculty:'Droit',delivery:'🤝 Main propre'},
    {title:'MacBook Air M1 — 8Go / 256Go',seller:'Thomas Moreau',price:680,
     desc:'Vendu avec chargeur MagSafe. Quelques micro-rayures sur le boîtier.',
     cat:'💻 High-Tech',condition:'Très bon',faculty:'Informatique',delivery:'🤝 Main propre'},
    {title:'Nike Air Force 1 Blanc — T.42',seller:'Sophie Chen',price:60,
     desc:'Portées 2-3 fois. Boîte d\'origine incluse.',
     cat:'👗 Mode',condition:'Très bon',faculty:'Économie',delivery:'📦 Livraison'},
  ].forEach(s=>{
    articles.push({
      ...s, id:Date.now()+Math.random(), img:null,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      initials:s.seller.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
      ts:Date.now(),
    });
  });
  renderGrid();
})();

*/ 


