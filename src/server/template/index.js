'use strict';

export default ({ html, css, head, state }) => `
  <html>
    <head>
      ${head}
      <style>
        ${css.code}
      </style>

      <link rel='icon' type='image/png' href='/favicon.png'>
      <link rel='stylesheet' href='/normalize.css'>
      <link rel='stylesheet' href='/build/bundle.css'>
      <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;700&family=Permanent+Marker&family=Shadows+Into+Light&family=Roboto+Mono:ital,wght@0,100;0,400;0,700;1,100&display=swap" rel="stylesheet">
    </head>
    <body>
      ${html}
      <script src="https://kit.fontawesome.com/5063aa095a.js" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/p5@1.0.0/lib/p5.js"></script>
      <script>
        window.__PRELOADED_STATE__ = ${JSON.stringify(state).replace(
          /</g,
          '\\u003c'
        )};
      </script>
      <script src='/build/bundle.js'></script>
    </body>
  </html>
`;