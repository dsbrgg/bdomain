module.exports = {
  server: {
    port: 5001
  },
  pdf: {
    format: 'A4',
    url: 'http://localhost:5000',
    parameters: {
      waitUntil: 'networkidle0'
    }
  }
}
