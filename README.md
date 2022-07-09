# Sempervirens SiteLoader

Provides pre-configurations and simplified configuration for loading a website on an Express app.

![Tests badge](https://github.com/lukedupuis/sempervirens-site-loader/actions/workflows/main.yml/badge.svg?event=push) ![Version badge](https://img.shields.io/static/v1?label=Node.js&labelColor=30363c&message=16.x&color=blue)

## Features

- Works with a consistent file structure based on the given `domain`, and optionally `siteDir`.
- Sets the static path to the public folder in the domain directory.
- Enables loading multiple sites on one Express app and Node server.
- Enables configuring API endpoints and Server-Side rendered endpoints in a structured way.
- Enables serving index.html of a Single-Page Application by default from the website's public directory.

## Installation

`npm i @sempervirens/site-loader`

## Usage

_Note 1: Although `@sempervirens/endpoint` `RequestHandler` has some nice features (like easy authorization and standardized return objects), it's not strictly necessary and a plain function with parameters `({ req, res, isSecure })` can be used as a handler instead._

1. `npm init` in a root directory
2. `npm install epress @sempervirens/site-loader @sempervirens/endpoint`
3. Create the following `sites` structure.
```
{root}/
  node_modules/
  sites/ <- Can be customized with "sitesDir" property of SiteLoader
    site-1/ <- Your site's domain name
      public/
        index.html
  server.js
  package-lock.json
  package.json
```
2. Import `express`, `http`, and `@sempervirens/site-loader`.
3. Import `RequestHandler` from `@sempervirens/endpoint` and extend.
4. Create an Express app.
5. Create a SiteLoader.
6. Create and start the Node server.
7. Run `node server` from the directory where `server.js` is located.

_server.js_
```
import express from 'express';
import http from 'http';
import SiteLoader from '@sempervirens/site-loader';
import { RequestHandler } from '@sempervirens/endpoint';

const app = express();
// The following are useful but not necessary for the example
// app.use(helmet());
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Examples only, separate files recommended
class Test1RequestHandler extends RequestHandler {
  constructor({ req, res, isSecure }) {
    super({ req, res, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('Success 1');
  }
}
class Test2RequestHandler extends RequestHandler {
  constructor({ req, res, isSecure }) {
    super({ req, res, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('<html><head><title>Test 1</title></head><body>Hello World!</body></html>');
  }
}

// Example only, separate file recommended
const siteLoader = new SiteLoader({
  domain: 'site-1',
  endpoints: [
    {
      // /api is the default base API path
      // It's used to validate if an API endpoint exists.
      // It can be changed by padding "apiBasePath" to SiteLoader.
      path: 'GET /api/test-1',
      handler: Test1RequestHandler,
      // handler: ({ req, res, isSecure }) => {}
    },
    {
      // Here we return a Server-Side Rendered (SSR) HTML file
      path: 'GET /test-2',
      handler: Test2RequestHandler
    }
  ],
  middleware: [
    // Here we set a custom header on all responses from site-1.
    {
      handler: (req, res, next) => {
        res.set('Custom-Header-1', 'Custom header 1 value');
        next();
      }
    },
    {
      // Here we set a custom header when returning the resource from /api/test-1.
      path: 'GET /api/test-1',
      handler: (req, res, next) => {
        res.set('Custom-Header-2', 'Custom header 2 value');
        next();
      }
    }
  ]
});
siteLoader.load(app);

http.createServer(app).listen(80, () => console.log('Server started on port 80'));
```

- Now you can make requests locally at `http://localhost/site-1` (returns `index.html`), `http://localhost/site-1/api/test-1`, and `http://localhost/site-1/test-2`.
- Or, if you set up your `hosts` file locally to point `site-1` at `localhost`, you can load on `http://site-1`.
- Also, after setting up a domain with an A Record pointing to a server in the cloud, pass `SiteLoader` your domain name and start the server on the remote machine, and it will load on a public remote machine.

## API

### SiteLoader

#### constructor

| Param  | Type | Description |
|--------|------|-------------|
| `apiBasePath` | string | Sets the API base path. Useful for validating if an API endpoint exists, returning a 404 rather than `index.html` if not found. Default: `/api`. |
| `domain` | string | The website domain. |
| `endpoints` | Object[] | `{ path: 'METHOD /path', handler: RequestHandler or Function, isSecure?: boolean }` Defines endopints for the site. Endpoints include API endpoints and SSR page endpoints. (Note: SPA webpages are loaded automatically via `index.html`, for which no endpoint should be defined.) `handler` function params are `({ req, res, isSecure })` See `@sempervirens/endpoint` and `@sempervirens/authorizer` for `isSecure` usage. |
| `middleware` | Object[] | `{ path?: 'METHOD /path', handler: Function }` Defines site-level or path-level middleware. If `path` is omitted, then the middleware is called for all requests to the site. If `path` is provided, then the middleware is called only for requests to the path. `handler` params are `(req, res, next)`.|
| `sitesDir` | string | The directory under the project's root directory where the website directories are located. Default: `/sites`. |

### loadd

Loads the site onto the Express app.

| Param  | Type | Description |
|--------|------|-------------|
| `app` | Express app | The server's Express app. |
