module.exports = {
    client: {
        api: 'http://localhost:8000'
    },
    server: {
        port: 8000
    },
    pdf: {
        chromium: {
            headless: true
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
            printBackground: true,
            preferCSSPageSize: true
        },
        url: 'http://localhost:8000/pdf',
        parameters: {
            waitUntil: 'networkidle0'
        }
    }
};
