import api from './api';

export const settingsService = {
  clearDatabase: () => api.post('/settings/clear-db'),
  exportBackup: () =>
    api.get('/settings/backup/export', { responseType: 'blob', timeout: 5 * 60 * 1000 }),
  importBackup: (file: File) => {
    const formData = new FormData();
    formData.append('backup', file);
    return api.post('/settings/backup/import', formData, { timeout: 5 * 60 * 1000 });
  },
};
