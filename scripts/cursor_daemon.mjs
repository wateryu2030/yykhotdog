import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const REPO_DIR = process.env.REPO_DIR || process.cwd();
const POLL_MS = Number(process.env.POLL_MS || 30000); // 30s 轮询
const PATCH_DIR = path.join(REPO_DIR, 'auto-patches');
const APPLY_CMD = process.env.CURSOR_CMD || 'run-auto-commit'; // 你的 Cursor 命令

const seen = new Set();

function pull() {
  try {
    execSync('git fetch --all', { cwd: REPO_DIR, stdio: 'inherit' });
    execSync('git pull', { cwd: REPO_DIR, stdio: 'inherit' });
  } catch (e) { console.warn('Git pull 失败', e.message); }
}

function findPatches() {
  if (!fs.existsSync(PATCH_DIR)) return [];
  return fs.readdirSync(PATCH_DIR)
    .filter(f => /^patch_.*\.md$/.test(f))
    .map(f => path.join(PATCH_DIR, f))
    .sort((a,b)=> fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

function runCursorOnce(patchFile) {
  console.log('🛠️ 发现补丁：', patchFile);
  try {
    // 你已有的自动执行命令；若是 npm script 可改成 `npm run run-auto-commit`
    const child = spawn(APPLY_CMD, [], { cwd: REPO_DIR, shell: true, stdio: 'inherit' });
    child.on('close', (code)=> {
      console.log('Cursor 执行完成，退出码=', code);
      if (code === 0) {
        try {
          execSync('git status', { cwd: REPO_DIR, stdio: 'inherit' });
          execSync('git add .', { cwd: REPO_DIR, stdio: 'inherit' });
          execSync(`git commit -m "chore(cursor): apply ${path.basename(patchFile)}" || echo "nothing to commit"`, { cwd: REPO_DIR, stdio: 'inherit' });
          execSync('git push', { cwd: REPO_DIR, stdio: 'inherit' });
          console.log('✅ 变更已推送回 GitHub');
        } catch (e) { console.warn('Git 提交失败', e.message); }
      }
    });
  } catch (e) {
    console.error('Cursor 执行异常：', e.message);
  }
}

function loop() {
  pull();
  const patches = findPatches();
  for (const p of patches) {
    if (seen.has(p)) continue;
    seen.add(p);
    runCursorOnce(p);
  }
  setTimeout(loop, POLL_MS);
}

console.log('🔁 Cursor 守护进程启动，监控目录：', PATCH_DIR);
loop();
