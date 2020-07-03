module.exports = {
  server: {
    port: 5001
  },
  pdf: {
    headless: true,
    filename: 'diebo_braga_cv',
    format: 'Tabloid',
    url: 'http://localhost:5001/pdf',
    parameters: {
      waitUntil: 'networkidle0'
    }
  }
};
