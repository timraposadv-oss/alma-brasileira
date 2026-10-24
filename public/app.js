"use strict";
const CFG=window.ALMA_CONFIG||{};
const L=["fr","nl","de","en","pt"];
const T={
fr:{s:"Rechercher un plat, un ingrédient…",r:"Recettes",sp:"Ma liste d’épices",f:"Forum",all:"Toutes",c1:"Entrées",c2:"Plats",c3:"Accompagnements",c4:"Desserts",ing:"Ingrédients",st:"Préparation",add:"Ajouter les épices à ma liste",ok:"Ajouté à ma liste",bel:"Adaptation belge",sph:"Ajouter une épice (ex. cumin)",spa:"Ajouter",spe:"Votre liste est vide. Ajoutez vos épices ou ouvrez une recette.",nm:"Votre prénom",ti:"Titre (question, recette à partager…)",ms:"Votre message",pub:"Publier",none:"Aucune recette trouvée. Essayez un autre mot.",min:"min",pers:"personnes",ft:"Prototype : listes et messages sont enregistrés uniquement sur cet appareil. Ingrédients et étapes disponibles en français pour l’instant.",ph:"Posez une question ou partagez une recette avec la communauté.",dl:"Supprimer"},
nl:{s:"Zoek een gerecht of ingrediënt…",r:"Recepten",sp:"Mijn kruidenlijst",f:"Forum",all:"Alle",c1:"Voorgerechten",c2:"Hoofdgerechten",c3:"Bijgerechten",c4:"Desserts",ing:"Ingrediënten",st:"Bereiding",add:"Kruiden aan mijn lijst toevoegen",ok:"Toegevoegd aan mijn lijst",bel:"Belgische aanpassing",sph:"Kruid toevoegen (bv. komijn)",spa:"Toevoegen",spe:"Je lijst is leeg. Voeg kruiden toe of open een recept.",nm:"Je voornaam",ti:"Titel (vraag, recept om te delen…)",ms:"Je bericht",pub:"Plaatsen",none:"Geen recepten gevonden. Probeer een ander woord.",min:"min",pers:"personen",ft:"Prototype: lijsten en berichten worden alleen op dit toestel bewaard. Ingrediënten en stappen voorlopig in het Frans.",ph:"Stel een vraag of deel een recept met de community.",dl:"Verwijderen"},
de:{s:"Gericht oder Zutat suchen…",r:"Rezepte",sp:"Meine Gewürzliste",f:"Forum",all:"Alle",c1:"Vorspeisen",c2:"Hauptgerichte",c3:"Beilagen",c4:"Desserts",ing:"Zutaten",st:"Zubereitung",add:"Gewürze zu meiner Liste hinzufügen",ok:"Zur Liste hinzugefügt",bel:"Belgische Anpassung",sph:"Gewürz hinzufügen (z. B. Kreuzkümmel)",spa:"Hinzufügen",spe:"Deine Liste ist leer. Füge Gewürze hinzu oder öffne ein Rezept.",nm:"Dein Vorname",ti:"Titel (Frage, Rezept zum Teilen…)",ms:"Deine Nachricht",pub:"Veröffentlichen",none:"Keine Rezepte gefunden. Versuche ein anderes Wort.",min:"Min.",pers:"Personen",ft:"Prototyp: Listen und Nachrichten werden nur auf diesem Gerät gespeichert. Zutaten und Schritte vorerst auf Französisch.",ph:"Stelle eine Frage oder teile ein Rezept mit der Community.",dl:"Löschen"},
en:{s:"Search a dish or ingredient…",r:"Recipes",sp:"My spice list",f:"Forum",all:"All",c1:"Starters",c2:"Mains",c3:"Sides",c4:"Desserts",ing:"Ingredients",st:"Method",add:"Add these spices to my list",ok:"Added to my list",bel:"Belgian adaptation",sph:"Add a spice (e.g. cumin)",spa:"Add",spe:"Your list is empty. Add spices or open a recipe.",nm:"Your first name",ti:"Title (question, recipe to share…)",ms:"Your message",pub:"Post",none:"No recipes found. Try another word.",min:"min",pers:"servings",ft:"Prototype: lists and messages are saved on this device only. Ingredients and steps are in French for now.",ph:"Ask a question or share a recipe with the community.",dl:"Remove"},
pt:{s:"Buscar um prato ou ingrediente…",r:"Receitas",sp:"Minha lista de temperos",f:"Fórum",all:"Todas",c1:"Entradas",c2:"Pratos principais",c3:"Acompanhamentos",c4:"Sobremesas",ing:"Ingredientes",st:"Modo de preparo",add:"Adicionar temperos à minha lista",ok:"Adicionado à minha lista",bel:"Adaptação belga",sph:"Adicionar tempero (ex. cominho)",spa:"Adicionar",spe:"Sua lista está vazia. Adicione temperos ou abra uma receita.",nm:"Seu nome",ti:"Título (pergunta, receita para compartilhar…)",ms:"Sua mensagem",pub:"Publicar",none:"Nenhuma receita encontrada. Tente outra palavra.",min:"min",pers:"porções",ft:"Protótipo: listas e mensagens ficam salvas só neste aparelho. Ingredientes e passos, por enquanto, em francês.",ph:"Faça uma pergunta ou compartilhe uma receita com a comunidade.",dl:"Remover"}};
const X={"fr": {"gone": "Compte supprimé", "login": "Connexion", "out": "Se déconnecter", "account": "Mon compte", "err": "Impossible de joindre le serveur.", "rep": "Répondre", "reps": "réponses", "back": "← Retour", "em": "Adresse e-mail", "code": "Code à 6 chiffres", "send": "Recevoir un code", "verify": "Valider", "sent": "Un code a été envoyé à votre adresse e-mail. Pensez à vérifier vos courriers indésirables.", "nm2": "Prénom (affiché dans le forum)", "consent": "J’accepte les conditions d’utilisation et la politique de confidentialité.", "legalL": "Mentions légales et confidentialité", "support": "Soutenir le projet", "export": "Télécharger mes données", "delacc": "Supprimer mon compte", "delconf": "Supprimer définitivement votre compte et votre liste d’épices ? Vos messages du forum seront anonymisés.", "report": "Signaler", "reported": "Merci, votre signalement a été transmis.", "reason": "Motif du signalement", "mod": "Modération", "nomod": "Aucun signalement en attente.", "dismiss": "Ignorer", "share": "Partager", "copied": "Lien copié", "allergy": "En cas d’allergie ou d’intolérance, vérifiez les étiquettes de tous vos produits.", "spl": "Connectez-vous pour retrouver votre liste sur tous vos appareils.", "need": "Connectez-vous pour utiliser cette fonction.", "ft": "Recettes brésiliennes adaptées aux goûts belges. Ingrédients et étapes disponibles en français pour l’instant.", "close": "Fermer", "mine": "Votre liste est enregistrée sur cet appareil.", "wrongcode": "Code invalide ou expiré."}, "nl": {"gone": "Verwijderd account", "login": "Inloggen", "out": "Uitloggen", "account": "Mijn account", "err": "Server niet bereikbaar.", "rep": "Reageren", "reps": "reacties", "back": "← Terug", "em": "E-mailadres", "code": "Code van 6 cijfers", "send": "Code ontvangen", "verify": "Bevestigen", "sent": "Er is een code naar je e-mailadres gestuurd. Kijk ook in je spam.", "nm2": "Voornaam (zichtbaar op het forum)", "consent": "Ik aanvaard de gebruiksvoorwaarden en het privacybeleid.", "legalL": "Wettelijke vermeldingen en privacy", "support": "Steun het project", "export": "Mijn gegevens downloaden", "delacc": "Mijn account verwijderen", "delconf": "Je account en kruidenlijst definitief verwijderen? Je forumberichten worden geanonimiseerd.", "report": "Melden", "reported": "Bedankt, je melding is doorgegeven.", "reason": "Reden van de melding", "mod": "Moderatie", "nomod": "Geen openstaande meldingen.", "dismiss": "Negeren", "share": "Delen", "copied": "Link gekopieerd", "allergy": "Bij allergie of intolerantie: controleer de etiketten van al je producten.", "spl": "Log in om je lijst op al je toestellen terug te vinden.", "need": "Log in om deze functie te gebruiken.", "ft": "Braziliaanse recepten aangepast aan de Belgische smaak. Ingrediënten en stappen voorlopig in het Frans.", "close": "Sluiten", "mine": "Je lijst wordt op dit toestel bewaard.", "wrongcode": "Ongeldige of verlopen code."}, "de": {"gone": "Gelöschtes Konto", "login": "Anmelden", "out": "Abmelden", "account": "Mein Konto", "err": "Server nicht erreichbar.", "rep": "Antworten", "reps": "Antworten", "back": "← Zurück", "em": "E-Mail-Adresse", "code": "6-stelliger Code", "send": "Code erhalten", "verify": "Bestätigen", "sent": "Ein Code wurde an deine E-Mail-Adresse gesendet. Schau auch im Spam-Ordner nach.", "nm2": "Vorname (im Forum sichtbar)", "consent": "Ich akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.", "legalL": "Impressum und Datenschutz", "support": "Projekt unterstützen", "export": "Meine Daten herunterladen", "delacc": "Mein Konto löschen", "delconf": "Konto und Gewürzliste endgültig löschen? Deine Forenbeiträge werden anonymisiert.", "report": "Melden", "reported": "Danke, deine Meldung wurde übermittelt.", "reason": "Grund der Meldung", "mod": "Moderation", "nomod": "Keine offenen Meldungen.", "dismiss": "Ignorieren", "share": "Teilen", "copied": "Link kopiert", "allergy": "Bei Allergien oder Unverträglichkeiten: Prüfe die Etiketten aller Produkte.", "spl": "Melde dich an, um deine Liste auf allen Geräten zu behalten.", "need": "Melde dich an, um diese Funktion zu nutzen.", "ft": "Brasilianische Rezepte für den belgischen Geschmack. Zutaten und Schritte vorerst auf Französisch.", "close": "Schließen", "mine": "Deine Liste ist auf diesem Gerät gespeichert.", "wrongcode": "Ungültiger oder abgelaufener Code."}, "en": {"gone": "Deleted account", "login": "Log in", "out": "Log out", "account": "My account", "err": "Cannot reach the server.", "rep": "Reply", "reps": "replies", "back": "← Back", "em": "Email address", "code": "6-digit code", "send": "Get a code", "verify": "Confirm", "sent": "A code was sent to your email address. Check your spam folder too.", "nm2": "First name (shown in the forum)", "consent": "I accept the terms of use and the privacy policy.", "legalL": "Legal notice and privacy", "support": "Support the project", "export": "Download my data", "delacc": "Delete my account", "delconf": "Permanently delete your account and spice list? Your forum posts will be anonymised.", "report": "Report", "reported": "Thank you, your report was sent.", "reason": "Reason for the report", "mod": "Moderation", "nomod": "No pending reports.", "dismiss": "Dismiss", "share": "Share", "copied": "Link copied", "allergy": "If you have an allergy or intolerance, check the labels of all your products.", "spl": "Log in to keep your list on all your devices.", "need": "Log in to use this feature.", "ft": "Brazilian recipes adapted to Belgian tastes. Ingredients and steps are in French for now.", "close": "Close", "mine": "Your list is saved on this device.", "wrongcode": "Invalid or expired code."}, "pt": {"gone": "Conta excluída", "login": "Entrar", "out": "Sair", "account": "Minha conta", "err": "Não foi possível acessar o servidor.", "rep": "Responder", "reps": "respostas", "back": "← Voltar", "em": "E-mail", "code": "Código de 6 dígitos", "send": "Receber código", "verify": "Confirmar", "sent": "Enviamos um código para o seu e-mail. Veja também a caixa de spam.", "nm2": "Nome (exibido no fórum)", "consent": "Aceito os termos de uso e a política de privacidade.", "legalL": "Aviso legal e privacidade", "support": "Apoiar o projeto", "export": "Baixar meus dados", "delacc": "Excluir minha conta", "delconf": "Excluir definitivamente sua conta e sua lista de temperos? Suas mensagens no fórum serão anonimizadas.", "report": "Denunciar", "reported": "Obrigado, sua denúncia foi enviada.", "reason": "Motivo da denúncia", "mod": "Moderação", "nomod": "Nenhuma denúncia pendente.", "dismiss": "Ignorar", "share": "Compartilhar", "copied": "Link copiado", "allergy": "Em caso de alergia ou intolerância, confira os rótulos de todos os produtos.", "spl": "Entre para manter sua lista em todos os aparelhos.", "need": "Entre para usar este recurso.", "ft": "Receitas brasileiras adaptadas ao paladar belga. Ingredientes e passos, por enquanto, em francês.", "close": "Fechar", "mine": "Sua lista fica salva neste aparelho.", "wrongcode": "Código inválido ou expirado."}};
L.forEach(l=>Object.assign(T[l],X[l]));

const CATS=["","entree","plat","accompagnement","dessert"];
const VIEWS=["recettes","epices","forum","mod"];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const ST={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let lang=ST.get("lang","");if(!L.includes(lang)){lang=(navigator.language||"fr").slice(0,2);if(!L.includes(lang))lang="fr"}
let RECIPES=[],view="recettes",cat=0,q="",seq=0,timer,openThread=null,pend=null,msgTimer;
let token=ST.get("token",""),user=ST.get("user",null);
const tt=k=>T[lang][k]||T.fr[k]||k;
const who=a=>a==="Compte supprimé"?tt("gone"):a;
const fmt=d=>new Date(d).toLocaleDateString(lang==="pt"?"pt-BR":lang);
const setAuth=(t,u)=>{token=t;user=u;ST.set("token",t);ST.set("user",u)};
const needLogin=t=>`<h2>${esc(t)}</h2><p>${esc(tt("need"))}</p><button class="btn" type="button" data-auth>${esc(tt("login"))}</button>`;

function msg(text){const b=$("#banner");b.textContent=text;b.hidden=false;clearTimeout(msgTimer);msgTimer=setTimeout(()=>{b.hidden=true},4000)}
async function api(path,method="GET",body){
 const h={"Content-Type":"application/json"};if(token)h.Authorization="Bearer "+token;
 let r;
 try{r=await fetch("/api"+path,{method,headers:h,body:body?JSON.stringify(body):undefined})}catch(e){throw new Error(tt("err"))}
 const j=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status===401&&token){setAuth("",null);render()}throw new Error(j.error||tt("err"))}
 return j;
}
const showErr=e=>{const m=$("#dlg[open] .err")||$("#main .err");if(m)m.textContent=e.message;else msg(e.message)};

/* ---------- Données ---------- */
async function loadRecipes(){
 try{const r=await fetch("recipes.json");RECIPES=await r.json()}catch(e){RECIPES=[]}
}

/* ---------- Liste d'épices (locale si non connecté) ---------- */
const localSp=()=>ST.get("spices",[]);
async function getSpices(){return token?(await api("/spices")).spices:localSp()}
async function addSpices(names){
 if(token)return (await api("/spices/bulk","POST",{names})).spices;
 const cur=localSp();names.forEach(n=>{n=String(n).trim();if(n&&!cur.some(x=>norm(x)===norm(n)))cur.push(n)});ST.set("spices",cur);return cur;
}
async function delSpice(name){
 if(token)return (await api("/spices/"+encodeURIComponent(name),"DELETE")).spices;
 const cur=localSp().filter(x=>norm(x)!==norm(name));ST.set("spices",cur);return cur;
}

/* ---------- Affichage général ---------- */
function render(){
 document.documentElement.lang=lang==="pt"?"pt-BR":lang;$("#lang").value=lang;$("#q").placeholder=tt("s");
 $("#auth").textContent=user?user.name:tt("login");
 const modBtn=document.querySelector('nav [data-v="mod"]');modBtn.hidden=!(user&&user.admin);
 if(view==="mod"&&modBtn.hidden)view="recettes";
 document.querySelectorAll("nav button").forEach(b=>{const v=b.dataset.v;b.textContent=tt({recettes:"r",epices:"sp",forum:"f",mod:"mod"}[v]);b.setAttribute("aria-current",String(v===view))});
 const safe=u=>/^https:\/\//.test(u||"")?u:"";
 $("#foot").innerHTML=`<p>${esc(tt("ft"))}</p><p><a href="legal.html" target="_blank" rel="noopener">${esc(tt("legalL"))}</a>`+(safe(CFG.SUPPORT_URL)?` · <a href="${esc(safe(CFG.SUPPORT_URL))}" target="_blank" rel="noopener noreferrer">${esc(tt("support"))}</a>`:"")+`</p>`;
 if(view==="recettes")recipesView();else if(view==="epices")spicesView();else if(view==="forum")forumView();else modView();
}
function recipesView(){
 const nq=norm(q.trim());
 const list=RECIPES.filter(r=>(!cat||r.category===CATS[cat])&&(!nq||norm(Object.values(r.title).join(" ")+" "+r.ingredients.join(" ")+" "+r.spices.join(" ")+" "+tt("c"+CATS.indexOf(r.category))).includes(nq)));
 $("#main").innerHTML=`<div class="chips">${[0,1,2,3,4].map(c=>`<button class="chip" type="button" data-cat="${c}" aria-pressed="${c===cat}">${esc(c?tt("c"+c):tt("all"))}</button>`).join("")}</div>`+
  (list.length?`<div class="grid">${list.map(r=>`<button class="card" type="button" data-r="${esc(r.slug)}"><div class="ph" aria-hidden="true">${esc(r.emoji)}</div><div class="b"><span class="tag">${esc(tt("c"+CATS.indexOf(r.category)))} · ${r.minutes} ${esc(tt("min"))}</span><h3>${esc(r.title[lang])}</h3><p>${esc(r.description[lang])}</p></div></button>`).join("")}</div>`:`<p class="empty">${esc(tt("none"))}</p>`);
}
function showDlg(html,labelled=true){
 const d=$("#dlg");d.innerHTML=html;if(labelled)d.setAttribute("aria-labelledby","dt");else d.removeAttribute("aria-labelledby");
 if(!d.open)d.showModal();
}
const dlgHead=t=>`<div class="dh"><h2 id="dt">${t}</h2><button class="x" type="button" aria-label="${esc(tt("close"))}" data-close>×</button></div>`;

function setLD(r){
 let s=$("#ld");if(!s){s=document.createElement("script");s.type="application/ld+json";s.id="ld";document.head.appendChild(s)}
 s.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Recipe",name:r.title[lang],description:r.description[lang],recipeCategory:r.category,totalTime:"PT"+r.minutes+"M",recipeYield:String(r.servings),recipeIngredient:r.ingredients,recipeInstructions:r.steps.map(t=>({"@type":"HowToStep",text:t})),inLanguage:"fr"});
}
function openRecipe(slug){
 const r=RECIPES.find(x=>x.slug===slug);if(!r)return;
 document.title=r.title[lang]+" – Alma brasileira";setLD(r);
 showDlg(dlgHead(`${esc(r.emoji)} ${esc(r.title[lang])}`)+`<div class="db"><p>${esc(r.description[lang])}</p><p><b>${r.minutes} ${esc(tt("min"))}</b> · ${r.servings} ${esc(tt("pers"))}</p><h4>${esc(tt("ing"))}</h4><ul>${r.ingredients.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h4>${esc(tt("st"))}</h4><ol>${r.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><h4>${esc(tt("bel"))}</h4><p class="note">${esc(r.beNote)}</p><p class="small">${esc(tt("allergy"))}</p><div class="actions"><button class="btn y" type="button" data-addsp="${esc(r.slug)}">${esc(tt("add"))}</button><button class="btn ghost" type="button" data-share="${esc(r.slug)}">${esc(tt("share"))}</button></div><p class="err"></p></div>`);
}
async function share(slug){
 const r=RECIPES.find(x=>x.slug===slug),url=location.origin+location.pathname+"#recette/"+slug;
 if(navigator.share){try{await navigator.share({title:r.title[lang],url});return}catch(e){if(e&&e.name==="AbortError")return}}
 try{await navigator.clipboard.writeText(url);msg(tt("copied"))}catch(e){msg(url)}
}

/* ---------- Épices ---------- */
async function spicesView(){
 const n=++seq,m=$("#main");m.innerHTML="…";
 try{
  const s=await getSpices();if(n!==seq)return;
  m.innerHTML=`<h2>${esc(tt("sp"))}</h2><form class="row" id="sf"><input id="si" placeholder="${esc(tt("sph"))}" required maxlength="40"><button class="btn y">${esc(tt("spa"))}</button></form><p class="err"></p>`+
   (s.length?`<div class="sp">${s.map((x,i)=>`<span>${esc(x)}<button type="button" data-del="${i}" aria-label="${esc(tt("dl"))} ${esc(x)}">×</button></span>`).join("")}</div>`:`<p class="empty">${esc(tt("spe"))}</p>`)+
   (token?"":`<p class="small">${esc(tt("mine"))} ${esc(tt("spl"))}</p><button class="btn ghost" type="button" data-auth>${esc(tt("login"))}</button>`);
  m.dataset.sp=JSON.stringify(s);
 }catch(e){m.innerHTML=`<p class="err">${esc(e.message)}</p>`}
}

/* ---------- Forum ---------- */
async function forumView(){
 if(openThread)return threadView(openThread);
 const n=++seq,m=$("#main");m.innerHTML="…";
 try{
  const {threads}=await api("/forum/threads");if(n!==seq)return;
  const form=token?`<form class="f" id="ff"><input id="ft" placeholder="${esc(tt("ti"))}" required minlength="3" maxlength="90"><textarea id="fm" rows="3" placeholder="${esc(tt("ms"))}" required maxlength="600"></textarea><button class="btn">${esc(tt("pub"))}</button><span class="err"></span></form>`:`<p>${esc(tt("need"))}</p><p><button class="btn" type="button" data-auth>${esc(tt("login"))}</button></p>`;
  m.innerHTML=`<h2>${esc(tt("f"))}</h2><p>${esc(tt("ph"))}</p>${form}`+threads.map(t=>`<button class="post postbtn" type="button" data-th="${esc(t.id)}"><h3>${esc(t.title)}</h3><small>${esc(who(t.author))} · ${fmt(t.createdAt)} · ${t.replyCount} ${esc(tt("reps"))}</small></button>`).join("");
 }catch(e){m.innerHTML=`<p class="err">${esc(e.message)}</p>`}
}
async function threadView(id){
 const n=++seq,m=$("#main");m.innerHTML="…";
 try{
  const {thread:t}=await api("/forum/threads/"+encodeURIComponent(id));if(n!==seq)return;
  const acts=(kind,x)=>`<div>${token?`<button class="link" type="button" data-rep="${kind}|${esc(x.id)}">${esc(tt("report"))}</button>`:""}${x.canDelete?`<button class="link" type="button" data-${kind==="thread"?"dth":"drp"}="${esc(x.id)}">${esc(tt("dl"))}</button>`:""}</div>`;
  m.innerHTML=`<button class="link" type="button" data-back>${esc(tt("back"))}</button><article class="post"><h3>${esc(t.title)}</h3><small>${esc(who(t.author))} · ${fmt(t.createdAt)}</small><p class="pre">${esc(t.body)}</p>${acts("thread",t)}</article>`+
   t.replies.map(r=>`<div class="reply"><small>${esc(who(r.author))} · ${fmt(r.createdAt)}</small><p class="pre">${esc(r.body)}</p>${acts("reply",r)}</div>`).join("")+
   (token?`<form class="f" id="rf" data-id="${esc(t.id)}"><textarea id="rm" rows="3" placeholder="${esc(tt("ms"))}" required maxlength="600"></textarea><button class="btn">${esc(tt("rep"))}</button><span class="err"></span></form>`:`<p><button class="btn" type="button" data-auth>${esc(tt("login"))}</button></p>`);
 }catch(e){m.innerHTML=`<button class="link" type="button" data-back>${esc(tt("back"))}</button><p class="err">${esc(e.message)}</p>`}
}
async function modView(){
 const n=++seq,m=$("#main");m.innerHTML="…";
 try{
  const {reports}=await api("/admin/reports");if(n!==seq)return;
  m.innerHTML=`<h2>${esc(tt("mod"))}</h2><p class="err"></p>`+(reports.length?reports.map(x=>`<article class="post"><small>${esc(x.kind)} · ${esc(who(x.author))} · ${fmt(x.createdAt)}</small><p class="pre">${esc(x.content)}</p><p><b>${esc(tt("reason"))}:</b> ${esc(x.reason)}</p><div class="actions"><button class="btn danger" type="button" data-mod="delete|${esc(x.id)}">${esc(tt("dl"))}</button><button class="btn ghost" type="button" data-mod="dismiss|${esc(x.id)}">${esc(tt("dismiss"))}</button></div></article>`).join(""):`<p class="empty">${esc(tt("nomod"))}</p>`);
 }catch(e){m.innerHTML=`<p class="err">${esc(e.message)}</p>`}
}

/* ---------- Connexion par code ---------- */
function authDlg(step){
 if(step==="code"){
  showDlg(dlgHead(esc(tt("login")))+`<div class="db"><p>${esc(tt("sent"))}</p><form class="f" id="af2"><input id="ac" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" autocomplete="one-time-code" placeholder="${esc(tt("code"))}" required aria-label="${esc(tt("code"))}"><button class="btn">${esc(tt("verify"))}</button><span class="err"></span></form></div>`);
  $("#ac").focus();return;
 }
 showDlg(dlgHead(esc(tt("login")))+`<div class="db"><form class="f" id="af1"><input id="an" placeholder="${esc(tt("nm2"))}" required minlength="2" maxlength="30" autocomplete="given-name"><input id="ae" type="email" placeholder="${esc(tt("em"))}" required maxlength="120" autocomplete="email"><label class="chk"><input type="checkbox" id="acc" required><span>${esc(tt("consent"))} <a href="legal.html" target="_blank" rel="noopener">${esc(tt("legalL"))}</a></span></label><button class="btn">${esc(tt("send"))}</button><span class="err"></span></form></div>`);
}
function accountDlg(){
 showDlg(dlgHead(esc(tt("account")))+`<div class="db"><p><b>${esc(user.name)}</b><br>${esc(user.email)}</p><div class="actions"><button class="btn ghost" type="button" data-export>${esc(tt("export"))}</button><button class="btn ghost" type="button" data-logout>${esc(tt("out"))}</button><button class="btn danger" type="button" data-delacc>${esc(tt("delacc"))}</button></div><p class="err"></p></div>`);
}
function reportDlg(kind,id){
 showDlg(dlgHead(esc(tt("report")))+`<div class="db"><form class="f" id="rpf" data-k="${esc(kind)}" data-i="${esc(id)}"><textarea id="rpr" rows="3" required minlength="3" maxlength="300" placeholder="${esc(tt("reason"))}"></textarea><button class="btn">${esc(tt("report"))}</button><span class="err"></span></form></div>`);
}
async function afterLogin(){
 const local=localSp();
 if(local.length){try{await api("/spices/bulk","POST",{names:local});ST.set("spices",[])}catch(e){}}
}

/* ---------- Événements ---------- */
document.addEventListener("click",async e=>{
 const t=e.target.closest("button");if(!t)return;const d=t.dataset;
 try{
  if(t.id==="auth"){user?accountDlg():authDlg()}
  else if(d.r)location.hash="recette/"+d.r;
  else if(d.cat!==undefined){cat=+d.cat;render()}
  else if(d.v){openThread=null;location.hash=d.v;if(view===d.v)render()}
  else if("close" in d)$("#dlg").close();
  else if("auth" in d)authDlg();
  else if(d.del!==undefined){const s=JSON.parse($("#main").dataset.sp||"[]");await delSpice(s[+d.del]);spicesView()}
  else if(d.addsp){const r=RECIPES.find(x=>x.slug===d.addsp);await addSpices(r.spices);t.textContent="✓ "+tt("ok")}
  else if(d.share)share(d.share);
  else if(d.th){openThread=d.th;threadView(d.th);scrollTo(0,0)}
  else if("back" in d){openThread=null;forumView()}
  else if(d.dth){await api("/forum/threads/"+encodeURIComponent(d.dth),"DELETE");openThread=null;forumView()}
  else if(d.drp){await api("/forum/replies/"+encodeURIComponent(d.drp),"DELETE");threadView(openThread)}
  else if(d.rep){const [k,i]=d.rep.split("|");reportDlg(k,i)}
  else if(d.mod){const [a,i]=d.mod.split("|");await api("/admin/reports/"+encodeURIComponent(i),"POST",{action:a});modView()}
  else if("export" in d){const j=await api("/me/export");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(j,null,2)],{type:"application/json"}));a.download="alma-mes-donnees.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
  else if("logout" in d){try{await api("/auth/logout","POST")}catch(x){}setAuth("",null);openThread=null;$("#dlg").close();render()}
  else if("delacc" in d){if(confirm(tt("delconf"))){await api("/me","DELETE");setAuth("",null);openThread=null;$("#dlg").close();render()}}
 }catch(err){showErr(err)}
});
document.addEventListener("submit",async e=>{
 e.preventDefault();const id=e.target.id;
 try{
  if(id==="af1"){
   pend={name:$("#an").value.trim(),email:$("#ae").value.trim().toLowerCase()};
   await api("/auth/request","POST",{...pend,consent:$("#acc").checked,lang});authDlg("code");
  }else if(id==="af2"){
   const j=await api("/auth/verify","POST",{...pend,code:$("#ac").value.trim(),consent:true});
   setAuth(j.token,j.user);await afterLogin();$("#dlg").close();render();
  }else if(id==="sf"){await addSpices([$("#si").value]);spicesView()}
  else if(id==="ff"){await api("/forum/threads","POST",{title:$("#ft").value,body:$("#fm").value});forumView()}
  else if(id==="rf"){await api("/forum/threads/"+encodeURIComponent(e.target.dataset.id)+"/replies","POST",{body:$("#rm").value});threadView(e.target.dataset.id)}
  else if(id==="rpf"){await api("/forum/report","POST",{kind:e.target.dataset.k,id:e.target.dataset.i,reason:$("#rpr").value});$("#dlg").close();msg(tt("reported"))}
 }catch(err){showErr(err)}
});
$("#q").addEventListener("input",e=>{q=e.target.value;clearTimeout(timer);timer=setTimeout(()=>{if(view!=="recettes"){view="recettes";openThread=null;location.hash="recettes"}else render()},250)});
$("#lang").addEventListener("change",e=>{lang=e.target.value;ST.set("lang",lang);render()});
$("#dlg").addEventListener("click",e=>{if(e.target===$("#dlg"))$("#dlg").close()});
$("#dlg").addEventListener("close",()=>{
 const l=$("#ld");if(l)l.remove();document.title="Alma brasileira – recettes brésiliennes pour les Belges";
 if(location.hash.startsWith("#recette/"))history.replaceState(null,"","#"+view);
});
function route(){
 const h=decodeURIComponent(location.hash.slice(1));
 if(h.startsWith("recette/")){if(view==="mod")view="recettes";render();openRecipe(h.slice(8));return}
 if($("#dlg").open&&$("#dlg").querySelector("[data-addsp]"))$("#dlg").close();
 if(VIEWS.includes(h))view=h;
 render();
}
window.addEventListener("hashchange",route);
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
loadRecipes().then(()=>{
 if(token)api("/me").then(j=>{user=j.user;ST.set("user",user);render()}).catch(()=>{});
 route();
});
