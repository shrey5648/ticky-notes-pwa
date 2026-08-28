import fs from "node:fs";
import { GoogleAuth } from "google-auth-library";

const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n")
  .filter(l=>l.includes("=")&&!l.trim().startsWith("#"))
  .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));

const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
// cloud-platform, not the narrower datastore scope: the Firestore Admin API
// rejects the latter for index management.
const auth = new GoogleAuth({
  credentials: {
    client_email: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    private_key: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g,"\n"),
  },
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const { token } = await (await auth.getClient()).getAccessToken();
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;

const { indexes } = JSON.parse(fs.readFileSync("firestore.indexes.json","utf8"));
const ops = [];

for (const idx of indexes) {
  const spec = idx.fields.map(f => `${f.fieldPath} ${f.order === "ASCENDING" ? "asc" : "desc"}`).join(", ");
  const res = await fetch(`${base}/collectionGroups/${idx.collectionGroup}/indexes`, {
    method: "POST", headers: H,
    body: JSON.stringify({
      queryScope: idx.queryScope,
      fields: idx.fields.map(f => ({ fieldPath: f.fieldPath, order: f.order })),
    }),
  });
  const out = await res.json();
  if (res.ok) {
    ops.push([idx.collectionGroup, out.name]);
    console.log(`created  ${idx.collectionGroup.padEnd(9)} ${spec}`);
  } else if (/already exists/i.test(out.error?.message ?? "")) {
    console.log(`exists   ${idx.collectionGroup.padEnd(9)} ${spec}`);
  } else {
    console.log(`FAILED   ${idx.collectionGroup.padEnd(9)} ${res.status} ${out.error?.message?.slice(0,120)}`);
  }
}

// Index builds are async; poll until each reports READY.
if (ops.length) {
  console.log("\nwaiting for builds…");
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    let pending = 0;
    for (const [cg] of ops) {
      const r = await fetch(`${base}/collectionGroups/${cg}/indexes`, { headers: H });
      const b = await r.json();
      for (const i of b.indexes ?? []) if (i.state !== "READY") pending++;
    }
    if (pending === 0) { console.log("all indexes READY"); break; }
    if (attempt % 4 === 0) console.log(`  ${pending} still building…`);
  }
}

// Final state.
console.log("\nfinal:");
for (const cg of ["notes","tasks","snippets"]) {
  const r = await fetch(`${base}/collectionGroups/${cg}/indexes`, { headers: H });
  const b = await r.json();
  for (const i of b.indexes ?? []) {
    const f = i.fields.filter(x => x.fieldPath !== "__name__")
      .map(x => `${x.fieldPath} ${x.order === "ASCENDING" ? "asc" : "desc"}`).join(", ");
    console.log(`  ${cg.padEnd(9)} ${i.state.padEnd(9)} ${f}`);
  }
}
process.exit(0);
