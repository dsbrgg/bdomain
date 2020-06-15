module.exports = {
  server: {
    port: 5001
  },
  pdf: {
    format: 'A4',
    url: 'http://localhost:5001/pdf',
    parameters: {
      waitUntil: 'networkidle0'
    }
  }
}
