// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server"

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />

          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          {/* <link rel="preconnect" href="https://fonts.googleapis.com" /> */}
          {/* <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" /> */}

          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
))
