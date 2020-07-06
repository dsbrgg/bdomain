module.exports = {
  client: {
    api: 'https://bdomain-dev.herokuapp.com'
  },
  server: {
    port: 5001
  },
  pdf: {
    chromium: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    },
    viewport: {
      width: 1800,
      height: 2400,
      deviceScaleFactor: 2
    },
    media: 'print',
    filename: 'diebo_braga_cv',
    format: {
      width: 1800,
      height: 2400,
      printBackground: true
    },
    url: 'https://bdomain-dev.herokuapp.com/pdf',
    parameters: {
      waitUntil: 'networkidle0'
    }
  }
};
