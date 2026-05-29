import Store from 'electron-store'

export const store = new Store({
  defaults: {
    theme: 'system',
    autoRefresh: true,
    autoBackupApk: false,
    downloadPath: '',
    adbPath: ''
  }
})
