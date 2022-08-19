# Sempervirens SiteLoader

Providing pre-configurations and simplified configuration for loading websites on an Express app, SiteLoader is especially useful for loading multiple websites with different domain names on one Node server.

![Tests badge](https://github.com/lukedupuis/sempervirens-site-loader/actions/workflows/main.yml/badge.svg?event=push) ![Version badge](https://img.shields.io/static/v1?label=Node&labelColor=30363c&message=16.x&color=blue)

## Features

- Works with a consistent file structure based on the given `domain`, and optionally `siteDir`.
- Sets the static path to the `public` folder in the `domain` directory.
- Enables loading multiple websites with different domains on one Express app and Node server.
- Enables configuring API endpoints and Server-Side Rendered (SSR) page endpoints in a structured way.
- Enables serving index.html of a Single-Page Application (SPA) by default from the website's public directory.

## Installation

`npm i @sempervirens/site-loader`

## Usage

_Note 1: Although `@sempervirens/endpoint` `RequestHandler` has some nice features (like easy authorization and standardized return objects), it's not strictly necessary and a plain function with parameters `({ req, res, isSecure })` can be used as a handler instead._<br><br>
_Note 2: A catch-all is defined to return `index.html` if no other path is matched, which enables serving Single-Page Applications with client-side routing. If not serving a SPA, consider having a "Not Found" message in `index.html`. Or, remove `index.html` from the site's public directory so that an HTTP 404 error response is returned if no path is matched._<br><br>
_Note 3: `@sempervirens/site-loader` is designed to work with `@sempervirens/server`, so although it is possible to use it separately with the following steps, it's recommended to use Sempervirens SiteLoader with Sempervirens Server._

1. `npm init` in a root directory
2. `npm install express @sempervirens/site-loader @sempervirens/endpoint`
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
4. Import `express`, `http`, and `@sempervirens/site-loader`.
5. Import `RequestHandler` from `@sempervirens/endpoint` and extend.
6. Create an Express app.
5. Create a SiteLoader.
8. Create and start the Node server.
9. Run `node server` from the directory where `server.js` is located.

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
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    console.log(this.data);
    // -> { prop1: 'val1', prop2: 'val2a', prop3: 'val3a' }
    this.res.send('Success 1');
  }
}
class Test2RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    console.log(this.data);
    // -> { prop1: 'val1', prop2: 'val2b', prop3: 'val3b' }
    this.res.send('<html><head><title>Test 1</title></head><body>Hello World!</body></html>');
  }
}

// Example only, separate file recommended
const siteLoader = new SiteLoader({
  domain: 'site-1',
  isMultiSite: false,
  data: { prop1: 'val1', prop2: 'val2a' }
  endpoints: [
    {
      path: 'GET /api/test-1',
      handler: Test1RequestHandler,
      // handler: ({ req, res, data, isSecure }) => {}
      data: { prop3: 'val3a' }
    },
    {
      // Here we return a Server-Side Rendered (SSR) HTML file
      path: 'GET /test-2',
      handler: Test2RequestHandler
      data: { prop2: 'val2b', prop3: 'val3b' }
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
    // Here we set a custom header when returning the resource from /api/test-1.
    {
      path: 'GET /api/test-1',
      handler: (req, res, next) => {
        res.set('Custom-Header-2', 'Custom header 2 value');
        next();
      }
    }
  ]
});
siteLoader.load(app);

// Initialize and load another SiteLoader instance and set `isMultiSite` to true to serve one or more additional websites with a different domains.

http.createServer(app).listen(80, () => console.log('Server started on port 80'));
```

- Now you can make requests locally at `http://localhost` (returns `index.html`), `http://localhost/test-1`, and `http://localhost/test-2`.
- Also, after setting up a domain with an A Record pointing to a server IP in the cloud, pass `SiteLoader` your domain name and start the server, and it will load on the public remote machine.
- If an additional sites are loaded, and `isMultiSite` is set to `true`, then the sites will be available locally at `http://localhost/site-1{/path}`, `http://localhost/site-2{/path}`, etc.

## API

### SiteLoader

#### constructor

| Param  | Type | Description |
|--------|------|-------------|
| `apiBasePath` | string | Sets the API base path. Useful for validating if an API endpoint exists returning a 404 rather than `index.html` if not found. Default: `/api`. |
| `data` | object | A set of data common across the site provided to all endpoints. If `data` is also passed into the `RequestHandler` at the endpoint level, then enpoint `data` merges into `SiteLoader` `data`, with the narrower-scope endpoint data taking precedence when the `data` objects have one or more of the same property. |
| `domain` | string | The website domain. |
| `endpoints` | object[] | `{ path: 'METHOD /path', handler: RequestHandler or function, isSecure?: boolean }` Defines endopints for the site. Endpoints include API endpoints and SSR page endpoints. (Note: SPA webpages are loaded automatically via `index.html`, for which no endpoint should be defined.) `handler` function params are `({ req, res, isSecure })`. See `@sempervirens/endpoint` and `@sempervirens/authorizer` for `isSecure` usage. |
| `isMultiSite` | boolean | Indicates if the site is loaded on the server with other sites. Used for development on `localhost` to serve the sites respectively at `http://localhost{:port}/{domain}/{path}`. If only one site is loaded, then `isMultiSite` should be falsey and the site loads at `http://localhost{:port}/{path}`. |
| `isProd` | boolean | Indicates if the site is loading on production, where a domain name rather than "localhost" is the host. |
| `middleware` | object[] | `{ path?: 'METHOD /path', handler: function }` Defines site-level or path-level middleware. If `path` is omitted, then the middleware is called for all requests to the site. If `path` is provided, then the middleware is called only for requests to the path. `handler` params are `(req, res, next)`. |4
| `sitesDir` | string | The directory under the project's root directory where the website directories are located. Default: `/sites`. |

### load

Loads the site onto the Express app.

| Param  | Type | Description |
|--------|------|-------------|
| `app` | Express app | The server's Express app. |