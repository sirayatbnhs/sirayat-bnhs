// SIRAYAT CMS connection settings.
// Create a Supabase project, then replace these placeholders with the Project URL and anon/public key.
// Never place a service_role key in browser code.
const SUPABASE_URL = "https://elidsfdxjowuvpqmzefq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vD4mcf115FSQj-yVkBDi9g_ayxo5Q57";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const $ = id => document.getElementById(id);
let client = null, currentUser = null, currentProfile = null, articles = [];
if (configured && window.supabase) client = window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
if (configured) $("setupNotice").hidden = true;
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!client){$("loginMessage").textContent="Backend not configured yet. Follow the setup instructions in README_PHASE2.txt.";return;}
 $("loginMessage").textContent="Signing in…";
 const {data,error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});
 if(error){$("loginMessage").textContent=error.message;return;}
 await loadSession(data.user);
});
async function loadSession(user){
 currentUser=user;
 const {data:profile,error}=await client.from("profiles").select("display_name,role,section").eq("id",user.id).single();
 if(error||!profile){$("loginMessage").textContent="Your profile is not configured. Ask the administrator to assign your role.";await client.auth.signOut();return;}
 currentProfile=profile;$("loginPanel").hidden=true;$("dashboard").hidden=false;
 $("userRole").textContent=`Signed in as ${profile.display_name||user.email} · ${profile.role.replaceAll("_"," ")}`;
 $("roleStat").textContent=profile.role.replaceAll("_"," ");await loadArticles();
}
async function loadArticles(){
 $("articleList").innerHTML="<p class='muted'>Loading…</p>";
 const {data,error}=await client.from("articles").select("id,title,title_fil,category,status,excerpt,body,body_fil,created_at,author_id").order("created_at",{ascending:false}).limit(100);
 if(error){$("articleList").innerHTML=`<p class='message'>${escapeHtml(error.message)}</p>`;return;}
 articles=data||[];$("countStat").textContent=articles.length;
 $("articleList").innerHTML=articles.length?articles.map(a=>`<article class="article-item"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.category)} · ${escapeHtml(a.status.replaceAll("_"," "))}</p><p>${escapeHtml((a.excerpt||"").slice(0,130))}</p><div class="item-actions"><button data-edit="${a.id}">Edit</button>${canReview()?`<button data-review="${a.id}">Approve & publish</button>`:""}<button class="danger" data-delete="${a.id}">Delete</button></div></article>`).join(""):"<p class='muted'>No articles yet. Create your first article.</p>";
 $("articleList").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editArticle(b.dataset.edit));
 $("articleList").querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>publishArticle(b.dataset.review));
 $("articleList").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteArticle(b.dataset.delete));
}
function canReview(){return ["admin","editor_in_chief","section_editor"].includes(currentProfile?.role);}
function editArticle(id){
 const a=articles.find(x=>x.id===id);if(!a)return;
 $("articleId").value=a.id;$("articleTitle").value=a.title;$("articleTitleFil").value=a.title_fil||"";
 $("articleCategory").value=a.category;$("articleStatus").value=a.status==="published"?"for_review":a.status;
 $("articleExcerpt").value=a.excerpt||"";$("articleBody").value=a.body;$("articleBodyFil").value=a.body_fil||"";
 $("formHeading").textContent="Edit article";window.scrollTo({top:0,behavior:"smooth"});
}
$("articleForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!client||!currentUser)return;
 const id=$("articleId").value;
 const payload={title:$("articleTitle").value.trim(),title_fil:$("articleTitleFil").value.trim()||null,category:$("articleCategory").value,status:$("articleStatus").value,excerpt:$("articleExcerpt").value.trim(),body:$("articleBody").value.trim(),body_fil:$("articleBodyFil").value.trim()||null};
 $("formMessage").textContent="Saving…";
 let result;
 if(id) result=await client.from("articles").update(payload).eq("id",id);
 else result=await client.from("articles").insert({...payload,author_id:currentUser.id});
 if(result.error){$("formMessage").textContent=result.error.message;return;}
 $("formMessage").textContent="Saved successfully.";clearForm(false);await loadArticles();
});
function clearForm(clearMessage=true){$("articleForm").reset();$("articleId").value="";$("formHeading").textContent="Create an article";if(clearMessage)$("formMessage").textContent="";}
$("clearBtn").onclick=()=>clearForm();
$("refreshBtn").onclick=loadArticles;
async function publishArticle(id){
 if(!confirm("Publish this article to the public website?"))return;
 const {error}=await client.from("articles").update({status:"published",published_at:new Date().toISOString()}).eq("id",id);
 if(error)alert(error.message);else await loadArticles();
}
async function deleteArticle(id){
 if(!confirm("Delete this article? This cannot be undone."))return;
 const {error}=await client.from("articles").delete().eq("id",id);
 if(error)alert(error.message);else await loadArticles();
}
$("logoutBtn").onclick=async()=>{await client.auth.signOut();currentUser=null;currentProfile=null;$("dashboard").hidden=true;$("loginPanel").hidden=false;};
client?.auth.onAuthStateChange((_event,session)=>{if(session?.user&&!currentUser)loadSession(session.user);});
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
