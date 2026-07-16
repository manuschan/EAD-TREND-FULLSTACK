const API = "";

/* Ordre des statuts « normaux » d'une transaction, utilisé pour savoir
   quel est le statut suivant quand l'admin clique sur "Étape suivante" */
const ORDRE_STATUTS = [
  "reservee",
  "depot_attendu",
  "objet_recu",
  "objet_verifie",
  "paiement_recu",
  "remise_acheteur",
  "vendeur_paye"
];

const LABELS_STATUT = {
  reservee: "Réservée",
  depot_attendu: "Dépôt attendu",
  objet_recu: "Objet reçu",
  objet_verifie: "Objet vérifié",
  paiement_recu: "Paiement reçu",
  remise_acheteur: "Remise à l'acheteur",
  vendeur_paye: "Vendeur payé",
  litige: "⚠️ Litige",
  annulee: "Annulée"
};

const COULEURS_STATUT = {
  reservee: "#9f682d",
  depot_attendu: "#b5814a",
  objet_recu: "#6d4e2c",
  objet_verifie: "#866646",
  paiement_recu: "#4a7c59",
  remise_acheteur: "#2f6f4e",
  vendeur_paye: "#1f5c3a",
  litige: "#c77c1f",
  annulee: "#b3261e"
};

let filtreActuel = "";

/* ══ Session admin (séparée du compte "utilisateur" classique) ══ */
function getAdmin(){
  try{
    return JSON.parse(localStorage.getItem("cm_admin")) || null;
  }catch(e){
    return null;
  }
}

function deconnexionAdmin(){
  localStorage.removeItem("cm_admin");
  afficherEcranConnexion();
}

async function connexionAdmin(){
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const errBox = document.getElementById("loginError");
  errBox.textContent = "";

  if(!email || !password){
    errBox.textContent = "Renseigne l'e-mail et le mot de passe.";
    return;
  }

  try{
    const response = await fetch(`${API}/connexion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if(!response.ok){
      errBox.textContent = result.message || "Connexion refusée";
      return;
    }

    if(result.utilisateur.role !== "admin"){
      errBox.textContent = "Ce compte n'a pas les droits administrateur.";
      return;
    }

    localStorage.setItem("cm_admin", JSON.stringify(result.utilisateur));
    afficherDashboard();

  }catch(err){
    console.error(err);
    errBox.textContent = "Erreur serveur, réessaie plus tard.";
  }
}

function afficherEcranConnexion(){
  document.getElementById("loginScreen").style.display = "block";
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("topbarWho").style.display = "none";
}

function afficherDashboard(){
  const admin = getAdmin();
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("topbarWho").style.display = "flex";
  document.getElementById("adminNom").textContent =
    `👋 ${admin.prenom || ""} ${admin.nom || ""}`.trim();
  chargerCommandes();
}

/* ══ Filtres ══ */
function setFiltre(btn){
  document.querySelectorAll(".filtre-chip").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  filtreActuel = btn.dataset.statut;
  chargerCommandes();
}

/* ══ Chargement des commandes ══ */
async function chargerCommandes(){
  const admin = getAdmin();
  if(!admin) return;

  const liste = document.getElementById("listeCommandes");
  liste.innerHTML = `<div class="vide">Chargement…</div>`;

  try{
    const url = filtreActuel
      ? `${API}/admin/commandes?statut=${encodeURIComponent(filtreActuel)}`
      : `${API}/admin/commandes`;

    const response = await fetch(url, {
      headers: { "x-admin-id": admin.id }
    });

    if(response.status === 401 || response.status === 403){
      deconnexionAdmin();
      return;
    }

    const commandes = await response.json();
    renderCommandes(commandes);

  }catch(err){
    console.error(err);
    liste.innerHTML = `<div class="vide">❌ Erreur de chargement des commandes.</div>`;
  }
}

function renderCommandes(commandes){
  const liste = document.getElementById("listeCommandes");
  liste.innerHTML = "";

  if(!commandes.length){
    liste.innerHTML = `<div class="vide">Aucune commande dans cette catégorie.</div>`;
    return;
  }

  commandes.forEach(c => liste.appendChild(makeCommandeCard(c)));
}

function makeCommandeCard(c){
  const d = document.createElement("div");
  d.className = "commande-card";

  const couleur = COULEURS_STATUT[c.statut_transaction] || "#866646";
  const indexOrdre = ORDRE_STATUTS.indexOf(c.statut_transaction);
  const statutSuivant = indexOrdre >= 0 && indexOrdre < ORDRE_STATUTS.length - 1
    ? ORDRE_STATUTS[indexOrdre + 1]
    : null;

  const enCours = !["vendeur_paye", "litige", "annulee"].includes(c.statut_transaction);

  d.dataset.statut = c.statut_transaction;
  d.innerHTML = `
    <div class="cc-head">
      <div class="cc-titre">${esc(c.annonce_titre || "Article supprimé")}</div>
      <span class="badge-statut" style="background:${couleur}">${LABELS_STATUT[c.statut_transaction] || c.statut_transaction}</span>
      <div class="cc-prix">${Number(c.prix_final).toLocaleString('fr-FR')} Fcfa</div>
    </div>

    <div class="cc-parties">
      <div>🛒 Acheteur : <strong>${esc(c.acheteur_prenom || '')} ${esc(c.acheteur_nom || '')}</strong> ${c.acheteur_tel ? '· ' + esc(c.acheteur_tel) : ''}</div>
      <div>🏷️ Vendeur : <strong>${esc(c.vendeur_prenom || '')} ${esc(c.vendeur_nom || '')}</strong> ${c.vendeur_tel ? '· ' + esc(c.vendeur_tel) : ''}</div>
    </div>

    <div class="cc-dates">
      <span>Créée le ${formatDate(c.date_creation)}</span>
      ${c.date_depot ? `<span>Déposée le ${formatDate(c.date_depot)}</span>` : ''}
      ${c.date_paiement ? `<span>Payée le ${formatDate(c.date_paiement)}</span>` : ''}
      ${c.date_remise ? `<span>Remise le ${formatDate(c.date_remise)}</span>` : ''}
      ${c.date_reversement ? `<span>Reversée le ${formatDate(c.date_reversement)}</span>` : ''}
    </div>

    <textarea class="cc-notes" placeholder="Notes internes (visibles uniquement par toi)…">${esc(c.notes_admin || '')}</textarea>

    <div class="cc-actions">
      ${statutSuivant ? `<button class="btn-action btn-suivant" onclick="majStatut(${c.id}, '${statutSuivant}')">✅ Étape suivante : ${LABELS_STATUT[statutSuivant]}</button>` : ''}
      <button class="btn-action btn-notes" onclick="sauverNotes(${c.id}, this)">💾 Enregistrer les notes</button>
      ${enCours ? `<button class="btn-action btn-litige" onclick="majStatut(${c.id}, 'litige')">⚠️ Signaler un litige</button>` : ''}
      ${enCours ? `<button class="btn-action btn-annuler" onclick="confirmerAnnulation(${c.id})">✖ Annuler</button>` : ''}
    </div>
  `;

  return d;
}

async function majStatut(id, statut, notes_admin){
  const admin = getAdmin();
  if(!admin) return;

  try{
    const body = { statut };
    if(typeof notes_admin === "string") body.notes_admin = notes_admin;

    const response = await fetch(`${API}/admin/commandes/${id}/statut`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": admin.id
      },
      body: JSON.stringify(body)
    });

    if(response.status === 401 || response.status === 403){
      deconnexionAdmin();
      return;
    }

    if(!response.ok){
      const result = await response.json();
      alert(result.message || "Erreur lors de la mise à jour");
      return;
    }

    chargerCommandes();

  }catch(err){
    console.error(err);
    alert("❌ Erreur serveur");
  }
}

function confirmerAnnulation(id){
  if(confirm("Confirmer l'annulation de cette commande ? L'annonce redeviendra disponible.")){
    majStatut(id, "annulee");
  }
}

function sauverNotes(id, btn){
  const carte = btn.closest(".commande-card");
  const textarea = carte.querySelector(".cc-notes");
  const statutActuel = carte.dataset.statut;

  majStatut(id, statutActuel, textarea.value);
}

/* ══ Utilitaires ══ */
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}

/* ══ Démarrage ══ */
window.addEventListener("DOMContentLoaded", () => {
  const admin = getAdmin();
  if(admin){
    afficherDashboard();
  } else {
    afficherEcranConnexion();
  }
});