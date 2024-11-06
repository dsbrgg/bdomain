module.exports = {
  client: {
    api: 'https://bdomain-dev.herokuapp.com'
  },
  server: {
    port: 8000
  },
  pdf: {
    chromium: {
      executablePath: process.env.CHROME_BIN,
      headless: true,
      args: [
        '--no-sandbox',
        '--enable-font-antialiasing',
        '--font-render-hinting=none',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    },
    viewport: {
      width: 1800,
      height: 2400,
      deviceScaleFactor: 2
    },
    media: 'print',
    filename: 'diego_braga_cv',
    format: {
      width: 1800,
      height: 2600,
      printBackground: true
    },
    url: 'https://bdomain-dev.herokuapp.com/pdf',
    parameters: {
      waitUntil: 'networkidle0'
    }
  }
};
