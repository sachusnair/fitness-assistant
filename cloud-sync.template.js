/* Cloud sync layer. Values are injected by GitHub Actions from repository secrets. */
(() => {
  const SUPABASE_URL = '__SUPABASE_URL__';
  const SUPABASE_KEY = '__SUPABASE_PUBLISHABLE_KEY__';
  const READY = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('__SUPABASE_') && !SUPABASE_KEY.includes('__SUPABASE_');

  let client = null;
  let currentUser = null;
  const originalSaveToday = window.saveToday;
  const originalSaveFood = window.saveFood;
  const originalMarkWorkout = window.markWorkout;
  const originalDeleteFood = window.deleteFood;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `.cloud-badge{position:fixed;right:14px;bottom:14px;z-index:20;background:#173b2a;color:#fff;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:700;box-shadow:0 5px 20px rgba(0,0,0,.15);cursor:pointer}.cloud-badge.off{background:#fff;color:#526057;border:1px solid #dbe3dd}.cloud-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:30;padding:18px}.cloud-box{background:#fff;width:min(420px,100%);border-radius:18px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.2)}.cloud-box h2{margin:0 0 6px}.cloud-box p{font-size:12px;color:#69756d;line-height:1.5}.cloud-box input{width:100%;padding:12px;border:1px solid #d5ddd7;border-radius:10px;margin:6px 0;font:inherit}.cloud-actions{display:flex;gap:8px;margin-top:10px}.cloud-actions button{flex:1}.cloud-status{font-size:12px;margin-top:9px;color:#2e7d52}`;
    document.head.appendChild(style);
  }

  function badge() {
    const b = document.createElement('button');
    b.id = 'cloudBadge';
    b.className = 'cloud-badge off';
    b.textContent = READY ? '☁ Cloud: Sign in' : '☁ Cloud: Setup needed';
    b.onclick = openAuth;
    document.body.appendChild(b);
    return b;
  }

  function openAuth() {
    if (!READY) {
      alert('Cloud database is prepared, but the Supabase project details have not been added yet. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY as GitHub Actions secrets, then redeploy.');
      return;
    }
    if (currentUser) {
      if (confirm('Sign out of the cloud account? Your local browser copy will remain on this device.')) client.auth.signOut();
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'cloud-modal';
    modal.innerHTML = `<div class="cloud-box"><h2>☁ Private cloud sync</h2><p>Sign in with your email to keep your check-ins and food diary synced across devices. Your data is protected by Supabase authentication and row-level security.</p><input id="cloudEmail" type="email" placeholder="Email"><input id="cloudPassword" type="password" placeholder="Password"><div class="cloud-actions"><button class="btn" id="cloudSignIn">Sign in</button><button class="btn secondary" id="cloudSignUp">Create account</button></div><div class="cloud-actions"><button class="btn secondary" id="cloudClose">Cancel</button></div><div id="cloudStatus" class="cloud-status"></div></div>`;
    document.body.appendChild(modal);
    const status = modal.querySelector('#cloudStatus');
    async function auth(mode) {
      const email = modal.querySelector('#cloudEmail').value.trim();
      const password = modal.querySelector('#cloudPassword').value;
      if (!email || password.length < 6) { status.textContent = 'Enter an email and a password of at least 6 characters.'; return; }
      status.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';
      const result = mode === 'signup' ? await client.auth.signUp({email,password}) : await client.auth.signInWithPassword({email,password});
      if (result.error) { status.textContent = result.error.message; return; }
      if (mode === 'signup' && !result.data.session) status.textContent = 'Account created. Check your email if confirmation is enabled, then sign in.';
      else modal.remove();
    }
    modal.querySelector('#cloudSignIn').onclick = () => auth('signin');
    modal.querySelector('#cloudSignUp').onclick = () => auth('signup');
    modal.querySelector('#cloudClose').onclick = () => modal.remove();
  }

  function setBadge(text, off=false) { const b = document.getElementById('cloudBadge'); if (b) { b.textContent = text; b.classList.toggle('off', off); } }
  function localData() { return JSON.parse(localStorage.getItem('fitnessAssistantDailyV2') || '{}'); }
  function localFood() { return JSON.parse(localStorage.getItem('fitnessAssistantFoodV2') || '{}'); }

  async function pushAll() {
    if (!currentUser) return;
    const data = localData();
    const rows = Object.entries(data).map(([date,d]) => ({user_id:currentUser.id,date,weight:d.weight ? Number(d.weight):null,steps:d.steps ? Number(d.steps):null,calories:d.calories ? Number(d.calories):null,protein:d.protein ? Number(d.protein):null,water:d.water ? Number(d.water):null,sleep:d.sleep ? Number(d.sleep):null,mood:d.mood || null,workout:!!d.workout}));
    if (rows.length) { const {error} = await client.from('checkins').upsert(rows,{onConflict:'user_id,date'}); if (error) throw error; }
    const food = localFood();
    for (const [date, items] of Object.entries(food)) {
      const {data: existing, error: readError} = await client.from('food_entries').select('id,created_at').eq('user_id',currentUser.id).eq('date',date);
      if (readError) throw readError;
      if (existing?.length) await client.from('food_entries').delete().eq('user_id',currentUser.id).eq('date',date);
      if (items.length) {
        const payload = items.map(m=>({user_id:currentUser.id,date,meal:m.meal,calories:Number(m.cal||0),protein:Number(m.protein||0),notes:m.notes||null,photo_data:m.photo||null,meal_time:m.time||null}));
        const {error} = await client.from('food_entries').insert(payload); if (error) throw error;
      }
    }
  }

  async function pullAll() {
    if (!currentUser) return;
    const {data: rows, error} = await client.from('checkins').select('*').eq('user_id',currentUser.id).order('date',{ascending:true});
    if (error) throw error;
    const checks = {};
    (rows||[]).forEach(d => checks[d.date] = {date:d.date,weight:d.weight,steps:d.steps,calories:d.calories,protein:d.protein,water:d.water,sleep:d.sleep,mood:d.mood||'',workout:!!d.workout});
    const {data: meals, error: foodError} = await client.from('food_entries').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:true});
    if (foodError) throw foodError;
    const foods = {};
    (meals||[]).forEach(m => (foods[m.date] ||= []).push({meal:m.meal,cal:m.calories,protein:m.protein,notes:m.notes||'',photo:m.photo_data||'',time:m.meal_time||''}));
    localStorage.setItem('fitnessAssistantDailyV2', JSON.stringify(checks));
    localStorage.setItem('fitnessAssistantFoodV2', JSON.stringify(foods));
    if (typeof loadToday === 'function') loadToday();
    if (typeof renderFood === 'function') renderFood();
    if (typeof renderHistory === 'function') renderHistory();
  }

  async function syncNow(label='Synced ✓') {
    if (!currentUser) return;
    try { setBadge('☁ Syncing…'); await pushAll(); await pullAll(); setBadge('☁ Cloud synced ✓'); setTimeout(()=>setBadge('☁ Cloud synced ✓'),1200); }
    catch (e) { console.error(e); setBadge('☁ Sync error',true); alert('Cloud sync failed: '+e.message); }
  }

  window.saveToday = async function(){ originalSaveToday(); await syncNow(); };
  window.saveFood = async function(){ originalSaveFood(); setTimeout(syncNow,150); };
  window.markWorkout = async function(){ originalMarkWorkout(); await syncNow(); };
  window.deleteFood = async function(i){ originalDeleteFood(i); await syncNow(); };

  async function start() {
    addStyles();
    badge();
    if (!READY) return;
    const {createClient} = window.supabase;
    client = createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data} = await client.auth.getSession();
    currentUser = data.session?.user || null;
    if (currentUser) { setBadge('☁ Cloud syncing…'); try { await pullAll(); setBadge('☁ Cloud synced ✓'); } catch(e) { console.error(e); setBadge('☁ Sync error',true); } }
    client.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      if (currentUser) { setBadge('☁ Cloud syncing…'); try { await pullAll(); await pushAll(); await pullAll(); setBadge('☁ Cloud synced ✓'); } catch(e) { console.error(e); setBadge('☁ Sync error',true); } }
      else setBadge('☁ Cloud: Sign in',true);
    });
  }
  const cdn = document.createElement('script');
  cdn.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  cdn.onload = start;
  cdn.onerror = () => { addStyles(); badge(); };
  document.head.appendChild(cdn);
})();
