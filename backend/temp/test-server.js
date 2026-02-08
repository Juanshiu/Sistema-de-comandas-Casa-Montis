const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:3001/sistema/estado');
    console.log('Backend está funcionando:', res.data);
  } catch (err) {
    console.error('Backend no responde:', err.message);
  }
}

test();
