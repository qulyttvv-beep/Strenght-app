// Backup export (share sheet on Android, download in browser) and import.
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './net.js';
import { exportBackup, importBackup } from './store.js';
import { today } from './util.js';

export async function shareBackup() {
  const data = JSON.stringify(await exportBackup());
  const name = `forma-backup-${today()}.json`;
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Forma backup', text: 'Forma backup file', url: uri, dialogTitle: 'Save your backup' });
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  return name;
}
export async function restoreFromFile(file) {
  const text = await file.text();
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  await importBackup(obj);
}
