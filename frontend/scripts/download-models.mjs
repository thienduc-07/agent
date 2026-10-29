// scripts/download-models.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SKETCHFAB_TOKEN = process.env.SKETCHFAB_API_TOKEN;

const MODEL_MANIFEST = [
  { id: 'luffy', uid: 'cb70fdc72d0243e4aa88a1a061be8bb7', dest: 'public/models/characters/luffy.glb' },
  { id: 'zoro', uid: '96afd46b918b4327a0699f6d967ddf9e', dest: 'public/models/characters/zoro.glb' },
  { id: 'zoro-swords', uid: 'e029be9ef0ab4b80a6399bef7c7d633c', dest: 'public/models/characters/zoro-swords.glb' },
  { id: 'nami', uid: 'b9b097654aa046e9a228e93db787cbf1', dest: 'public/models/characters/nami.glb' },
  { id: 'chopper', uid: '50703f2f23064436ab8c2a7aad4fdd25', dest: 'public/models/characters/chopper.glb' },
  { id: 'robin', uid: '7fb6ca8b9f4c46f1ba6bc3ff93f164af', dest: 'public/models/characters/robin.glb' },
  { id: 'brook', uid: '59ffa657aae649c4a4338012a0d2aeeb', dest: 'public/models/characters/brook.glb' },
  { id: 'thousand-sunny', uid: '5a17d8fbb222436b90ca3cee64bd81f5', dest: 'public/models/ships/thousand-sunny.glb' }
];

const TAG_SEARCH_MODELS = [
  { id: 'usopp', query: 'usopp one piece', dest: 'public/models/characters/usopp.glb' },
  { id: 'sanji', query: 'sanji one piece', dest: 'public/models/characters/sanji.glb' },
  { id: 'franky', query: 'franky one piece', dest: 'public/models/characters/franky.glb' },
  { id: 'jinbe', query: 'jinbe one piece', dest: 'public/models/characters/jinbe.glb' }
];

async function findDownloadableUid(query) {
  const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(query)}&downloadable=true&sort_by=-likeCount`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.uid || null;
  } catch {
    return null;
  }
}

async function downloadGlb(uid, outputPath) {
  const fullPath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  if (!SKETCHFAB_TOKEN) return false;

  try {
    const metaRes = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
      headers: { Authorization: `Token ${SKETCHFAB_TOKEN}` }
    });
    if (!metaRes.ok) return false;

    const meta = await metaRes.json();
    const glbUrl = meta.glb?.url || meta.gltf?.url;
    if (!glbUrl) return false;

    const fileRes = await fetch(glbUrl);
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    if (meta.glb?.url) {
      fs.writeFileSync(fullPath, buffer);
      console.log(`Đã tải thành công: ${outputPath}`);
      return true;
    } else {
      const zipPath = `${fullPath}.zip`;
      const extractDir = `${fullPath}_extracted`;
      fs.writeFileSync(zipPath, buffer);
      execSync(`unzip -o "${zipPath}" -d "${extractDir}" && npx gltf-pipeline -i "${extractDir}/scene.gltf" -o "${fullPath}" -b`);
      fs.rmSync(zipPath, { force: true });
      fs.rmSync(extractDir, { recursive: true, force: true });
      console.log(`Đã chuyển đổi GLB thành công: ${outputPath}`);
      return true;
    }
  } catch {
    return false;
  }
}

async function run() {
  console.log('--- STARTING SKETCHFAB DOWNLOAD SCRIPT ---');
  for (const item of MODEL_MANIFEST) {
    if (fs.existsSync(path.resolve(process.cwd(), item.dest))) {
      console.log(`Đã tồn tại model sẵn có: ${item.dest}`);
      continue;
    }
    const ok = await downloadGlb(item.uid, item.dest);
    if (!ok) {
      const fallbackUid = await findDownloadableUid(`${item.id} one piece`);
      if (fallbackUid) await downloadGlb(fallbackUid, item.dest);
    }
  }
  for (const tagItem of TAG_SEARCH_MODELS) {
    if (fs.existsSync(path.resolve(process.cwd(), tagItem.dest))) {
      console.log(`Đã tồn tại model sẵn có: ${tagItem.dest}`);
      continue;
    }
    const uid = await findDownloadableUid(tagItem.query);
    if (uid) await downloadGlb(uid, tagItem.dest);
  }
  console.log('✅ Hoàn tất kiểm tra và đồng bộ model 3D.');
}

run();
