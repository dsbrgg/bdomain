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
            width: 2000,
            height: 2300,
            deviceScaleFactor: 2
        },
        media: 'print',
        filename: 'diego_braga_cv',
        format: {
            width: 2000,
            height: 2300,
            printBackground: true,
            preferCSSPageSize: true
        },
        url: 'http://localhost:8000/pdf',
        parameters: {
            waitUntil: 'networkidle0'
        }
    }
};
