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
    // 静默执行git fetch，减少输出
    execSync('git fetch --all', { cwd: REPO_DIR, stdio: 'pipe' });
    
    // 检查是否有新的提交
    const currentBranch = execSync('git branch --show-current', { cwd: REPO_DIR, encoding: 'utf8' }).trim();
    const localCommit = execSync('git rev-parse HEAD', { cwd: REPO_DIR, encoding: 'utf8' }).trim();
    const remoteCommit = execSync(`git rev-parse origin/${currentBranch}`, { cwd: REPO_DIR, encoding: 'utf8' }).trim();
    
    if (localCommit !== remoteCommit) {
      console.log('🔄 发现远程更新，正在拉取...');
      execSync(`git pull origin ${currentBranch}`, { cwd: REPO_DIR, stdio: 'inherit' });
    } else {
      // 只在调试模式下输出
      if (process.env.DEBUG) {
        console.log('📡 远程仓库已是最新');
      }
    }
  } catch (e) { 
    if (process.env.DEBUG) {
      console.warn('Git 操作失败:', e.message); 
    }
  }
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
  
  if (patches.length > 0) {
    console.log(`🔍 发现 ${patches.length} 个补丁文件`);
  }
  
  for (const p of patches) {
    if (seen.has(p)) continue;
    seen.add(p);
    console.log('🛠️ 处理新补丁:', path.basename(p));
    runCursorOnce(p);
  }
  
  setTimeout(loop, POLL_MS);
}

console.log('🔁 Cursor 守护进程启动，监控目录：', PATCH_DIR);
loop();
