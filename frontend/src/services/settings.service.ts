import api from './api';

export const settingsService = {
  clearDatabase: () => api.post('/settings/clear-db'),
};
