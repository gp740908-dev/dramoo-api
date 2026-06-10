const axios = require('axios');
axios.get('https://klikfilm.com/v3/mobile/film/detail/5559/49', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  },
  maxRedirects: 0,
  validateStatus: status => status >= 200 && status <= 302,
}).then(res => console.log('Data length:', res.data.length)).catch(e => console.log('Error:', e.message));
