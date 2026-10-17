// Deploy this private project as a Web App, execute as its owner.
// No Gmail inbox access: MailApp sends only. Subscriber Sheet is never public.
var DHIVI_APP = 'https://dhivi-live-ai-news.netlify.app';
var DHIVI_OWNER = 'renduchinthalasaipraneethkumar@gmail.com';
var DHIVI_ZONE = 'America/Chicago';

function hashToken(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value).map(function(byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}
function newToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function newsletterSheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SUBSCRIBER_SHEET_ID');
  if (!id) throw new Error('Run setupNewsletter first.');
  return SpreadsheetApp.openById(id).getSheets()[0];
}
function setupNewsletter() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== DHIVI_OWNER) throw new Error('Sign in with the requested sender account.');
  var properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('BRIDGE_SECRET')) properties.setProperty('BRIDGE_SECRET', newToken());
  if (!properties.getProperty('SUBSCRIBER_SHEET_ID')) {
    var sheet = SpreadsheetApp.create('Dhivi Morning Signal — private subscribers').getSheets()[0];
    sheet.getRange('A:H').setNumberFormat('@');
    sheet.appendRow(['email','status','pendingHash','pendingExpires','lastRequest','unsubscribeToken','lastSentDay','deliveryState']);
    properties.setProperty('SUBSCRIBER_SHEET_ID', sheet.getParent().getId());
  }
  if (!ScriptApp.getProjectTriggers().some(function(trigger) { return trigger.getHandlerFunction() === 'runMorningDigest'; })) {
    ScriptApp.newTrigger('runMorningDigest').timeBased().everyMinutes(15).create();
  }
  // Trigger permission to send; this does not send a message.
  MailApp.getRemainingDailyQuota();
  properties.setProperty('READY', 'true');
  console.log('Newsletter initialized. Copy BRIDGE_SECRET from Project Settings > Script properties into the Netlify function environment. Do not put it in source code.');
}
function doPost(event) {
  var result;
  try {
    var raw = event.postData.contents;
    if (raw.length > 4096) throw new Error('Invalid request');
    var body = JSON.parse(raw), properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('BRIDGE_SECRET');
    if (!secret || body.secret !== secret || Session.getEffectiveUser().getEmail().toLowerCase() !== DHIVI_OWNER) throw new Error('Unauthorized');
    if (properties.getProperty('READY') !== 'true') throw new Error('Not ready');
    if (body.action === 'status') result = {ok:true,ready:true};
    else {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(5000)) throw new Error('Busy');
      try { result = updateSubscription(body); } finally { lock.releaseLock(); }
    }
  } catch (error) { result = {ok:false,code:'unavailable'}; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function updateSubscription(body) {
  var sheet = newsletterSheet(), rows = sheet.getDataRange().getValues(), now = Date.now();
  if (body.action === 'subscribe') {
    if (typeof body.email !== 'string' || body.email.length > 254 || !/^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(body.email)) return {ok:false,code:'invalid-email'};
    var index = rows.findIndex(function(row, i) { return i > 0 && row[0] === body.email; });
    var row = index >= 1 ? rows[index] : [body.email,'pending','','',0,newToken(),'',''];
    // No address enumeration; repeated requests neither mail-bomb nor reset consent.
    if (row[1] === 'active' || now - Number(row[4]) < 3600000) return {ok:true};
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily mail quota exhausted');
    var token = newToken(); row[2] = hashToken(token); row[3] = now + 86400000; row[4] = now;
    var target = index >= 1 ? index + 1 : rows.length + 1;
    // Store first so a repeated or interrupted request cannot create duplicate mail.
    sheet.getRange(target,1,1,8).setValues([row]); SpreadsheetApp.flush();
    var url = DHIVI_APP + '/#newsletter=confirm&token=' + token;
    MailApp.sendEmail({to:body.email,subject:'Confirm your Dhivi Morning Signal subscription',name:'Dhivi Live AI News',body:'Confirm your daily AI briefing: ' + url + '\n\nAround 8:00 AM America/Chicago. This link expires in 24 hours. If you did not request this email, ignore it. No subscription starts without confirmation.'});
    return {ok:true};
  }
  if (!/^[a-f0-9]{64}$/.test(body.token || '')) return {ok:false,code:'invalid-link'};
  if (body.action === 'confirm') {
    var tokenHash = hashToken(body.token);
    var found = rows.findIndex(function(row,i) { return i > 0 && row[2] === tokenHash && Number(row[3]) >= now; });
    if (found < 1) return {ok:false,code:'invalid-link'};
    var confirmed = rows[found]; confirmed[1] = 'active'; confirmed[2] = ''; confirmed[3] = '';
    // Rotate unsubscribe link on renewed consent. Old confirmation links cannot revive it.
    confirmed[5] = newToken(); sheet.getRange(found+1,1,1,8).setValues([confirmed]); return {ok:true};
  }
  if (body.action === 'unsubscribe') {
    var found = rows.findIndex(function(row,i) { return i > 0 && row[5] === body.token; });
    if (found < 1) return {ok:false,code:'invalid-link'};
    var unsubscribed = rows[found]; unsubscribed[1] = 'unsubscribed'; unsubscribed[2] = ''; unsubscribed[3] = '';
    sheet.getRange(found+1,1,1,8).setValues([unsubscribed]); return {ok:true};
  }
  return {ok:false,code:'invalid-action'};
}
function runMorningDigest() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== DHIVI_OWNER) throw new Error('Wrong sender');
  if (PropertiesService.getScriptProperties().getProperty('READY') !== 'true') return;
  var now = new Date();
  if (Utilities.formatDate(now, DHIVI_ZONE, 'HH') !== '08') return;
  var day = Utilities.formatDate(now, DHIVI_ZONE, 'yyyy-MM-dd');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var response = UrlFetchApp.fetch(DHIVI_APP + '/.netlify/functions/newsletter-digest', {muteHttpExceptions:true});
    if (response.getResponseCode() !== 200) throw new Error('Fresh digest unavailable');
    var digest = JSON.parse(response.getContentText());
    if (digest.date !== day || !Array.isArray(digest.articles) || !digest.articles.length) return;
    if (digest.articles.some(function(article) { var date = Date.parse(article.publishedAt); return !isFinite(date) || date > Date.now() || Date.now() - date > 86400000; })) throw new Error('Digest outside the strict 24-hour window');
    var sheet = newsletterSheet(), rows = sheet.getDataRange().getValues(), quota = MailApp.getRemainingDailyQuota(), sent = 0;
    for (var index=1; index<rows.length; index++) {
      var row = rows[index];
      if (row[1] !== 'active' || row[6] === day) continue;
      if (sent >= quota || Date.now() - now.getTime() > 240000) throw new Error('Daily delivery quota or runtime reached; remaining subscribers were not sent this edition.');
      var link = DHIVI_APP + '/#newsletter=unsubscribe&token=' + row[5];
      row[6] = day; row[7] = 'sending';
      sheet.getRange(index+1,1,1,8).setValues([row]); SpreadsheetApp.flush();
      // Reserve before send. An ambiguous crash stays flagged for manual review,
      // rather than silently sending duplicate editions on a retry.
      MailApp.sendEmail({to:row[0],subject:digest.subject,name:'Dhivi Live AI News',body:digest.text.split('{{UNSUBSCRIBE_URL}}').join(link),htmlBody:digest.html.split('{{UNSUBSCRIBE_URL}}').join(link.replace(/&/g,'&amp;'))});
      sheet.getRange(index+1,8).setValue('sent'); sent++;
    }
    PropertiesService.getScriptProperties().setProperty('LAST_DIGEST', JSON.stringify({day:day,sent:sent,checkedAt:new Date().toISOString()}));
  } finally { lock.releaseLock(); }
}

// A deliberate operator action, never a timer or public bridge action.
// Only a confirmed subscription belonging to the service owner can receive it.
function sendTestDigest() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== DHIVI_OWNER) throw new Error('Wrong sender');
  if (PropertiesService.getScriptProperties().getProperty('READY') !== 'true') throw new Error('Newsletter not ready');
  var row = newsletterSheet().getDataRange().getValues().find(function(value,index) { return index > 0 && value[0] === DHIVI_OWNER && value[1] === 'active'; });
  if (!row) throw new Error('Confirm the owner test subscription first.');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily mail quota exhausted');
  var response = UrlFetchApp.fetch(DHIVI_APP + '/.netlify/functions/newsletter-digest', {muteHttpExceptions:true});
  if (response.getResponseCode() !== 200) throw new Error('Fresh digest unavailable');
  var digest = JSON.parse(response.getContentText());
  if (digest.date !== Utilities.formatDate(new Date(), DHIVI_ZONE, 'yyyy-MM-dd') || !Array.isArray(digest.articles) || !digest.articles.length) throw new Error('No current digest');
  if (digest.articles.some(function(article) { var date = Date.parse(article.publishedAt); return !isFinite(date) || date > Date.now() || Date.now() - date > 86400000; })) throw new Error('Digest outside the strict 24-hour window');
  var link = DHIVI_APP + '/#newsletter=unsubscribe&token=' + row[5];
  MailApp.sendEmail({to:DHIVI_OWNER,subject:'[TEST] ' + digest.subject,name:'Dhivi Live AI News',body:digest.text.split('{{UNSUBSCRIBE_URL}}').join(link),htmlBody:digest.html.split('{{UNSUBSCRIBE_URL}}').join(link.replace(/&/g,'&amp;'))});
  console.log('Owner test digest sent. Normal daily delivery state is unchanged.');
}
