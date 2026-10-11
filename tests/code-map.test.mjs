import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {checkCodeMap,sourceInventory} from '../.agents/skills/code-map/scripts/check-code-map.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'code-map-test-'));
  t.after(async () => {
    const relative = path.relative(os.tmpdir(),root);
    assert.ok(relative.startsWith('code-map-test-') && !relative.includes(path.sep));
    await fs.rm(root,{recursive:true,force:true});
  });
  const write = async (file,body) => {await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true}); await fs.writeFile(path.join(root,file),body);};
  await write('src/App.tsx','export default function App(){return null;}');
  await write('src/hooks/useSave.ts','export const useSave = () => null;');
  await write('src/styles.css','body { margin: 0; }');
  const document = '| 파일 | 역할 |\n|---|---|\n| `src/App.tsx` | 화면 연결 |\n| `src/hooks/useSave.ts` | 저장 상태 |\n| `src/styles.css` | 화면 스타일 |\n';
  await write('docs/code-map.md',document);
  return {root,write,document};
}

test('변경한 소스는 재검토 전 실패하며 검토 기준 기록 후 통과한다',async t => {
  const {root,write} = await fixture(t);
  assert.equal((await checkCodeMap({root})).ok,false);
  assert.equal((await checkCodeMap({root,stamp:true})).ok,true);
  await write('src/App.tsx','export default function App(){return null;}\n');
  await checkCodeMap({root,stamp:true});
  await write('src/App.tsx','export default function App(){return null;}\r\n');
  assert.equal((await checkCodeMap({root})).ok,true);
  await write('src/hooks/useSave.ts','export const useSave = () => "changed";');
  assert.deepEqual((await checkCodeMap({root})).changed,['src/hooks/useSave.ts']);
  assert.equal((await checkCodeMap({root,stamp:true})).ok,true);
});

test('누락 파일·삭제된 경로·중복 행은 stamp로 숨길 수 없다',async t => {
  const {root,write,document} = await fixture(t);
  await write('src/New.tsx','export const New = 1;');
  const before = await fs.readFile(path.join(root,'docs/code-map.md'),'utf8');
  const missing = await checkCodeMap({root,stamp:true});
  assert.deepEqual(missing.missing,['src/New.tsx']);
  assert.equal(await fs.readFile(path.join(root,'docs/code-map.md'),'utf8'),before);
  await fs.unlink(path.join(root,'src/New.tsx'));
  await write('docs/code-map.md',document+'| `src/Gone.ts` | 삭제된 코드 |\n| `src/App.tsx` | 중복 |\n');
  const invalid = await checkCodeMap({root,stamp:true});
  assert.deepEqual(invalid.removed,['src/Gone.ts']);
  assert.deepEqual(invalid.duplicates,['src/App.tsx']);
});

test('생성물·개인 데이터는 제외하고 직접 제외한 경로만 범위에서 뺀다',async t => {
  const {root,write} = await fixture(t);
  await write('node_modules/dependency/index.js','secret-ish dependency');
  await write('data/personal.js','private');
  await write('dist/bundle.js','generated');
  await write('generated/types.d.ts','export declare const generated: true;');
  await write('src/data/model.ts','export const model = 1;');
  const files = Object.keys(await sourceInventory(root,['generated']));
  assert.deepEqual(files,['src/App.tsx','src/data/model.ts','src/hooks/useSave.ts','src/styles.css']);
});

test('문서 경로가 프로젝트 밖이면 쓰기를 거부한다',async t => {
  const {root} = await fixture(t);
  await assert.rejects(checkCodeMap({root,map:'../outside.md',stamp:true}),/대상 프로젝트/);
});
