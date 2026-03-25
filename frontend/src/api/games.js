import axios from './axios';

export const gamesAPI = {
  // Get online students
  getOnlineStudents: async () => {
    const { data } = await axios.get('/games/online-students');
    return data;
  },

  // Create game invite
  createInvite: async (inviteData) => {
    const { data } = await axios.post('/games/invite', inviteData);
    return data;
  },

  // Get active invitations
  getInvites: async () => {
    const { data } = await axios.get('/games/invites');
    return data;
  },

  // Respond to invite
  respondToInvite: async (inviteId, action) => {
    const { data } = await axios.post(`/games/invites/${inviteId}/respond`, { action });
    return data;
  },

  // Get battle details
  getBattle: async (battleId) => {
    const { data } = await axios.get(`/games/battles/${battleId}`);
    return data;
  },

  // Get battle history
  getBattleHistory: async () => {
    const { data } = await axios.get('/games/history');
    return data;
  },

  // Get game stats
  getGameStats: async () => {
    const { data } = await axios.get('/games/stats');
    return data;
  },
};
