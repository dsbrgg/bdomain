module.exports = {
  client: {
    api: 'http://localhost:5001'
  },
  server: {
    port: 5001
  },
  pdf: {
    headless: true,
    filename: 'diebo_braga_cv',
    format: {
      width: 1800,
      height: 2400
    },
    url: 'http://localhost:5001/pdf',
    parameters: {
      waitUntil: 'networkidle0'
    }
  }
};
