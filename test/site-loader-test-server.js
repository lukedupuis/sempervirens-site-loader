import express from 'express';
import http from 'http';
import { RequestHandler } from '@sempervirens/endpoint';

import SiteLoader from '../index.js';

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
  isMultiSite: false,
  endpoints: [
    {
      // /api is the default base API path
      // It's used to validate if an API endpoint exists.
      // It can be changed by padding "apiBasePath" to SiteLoader.
      path: 'GET /api/test-1',
      handler: Test1RequestHandler
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
        res.set('Custom-Header', 'Custom header value');
        next();
      }
    },
    {
      // Here we use middleware to set the CSP header when returning the resource from /api/test-1.
      path: 'GET /api/test-1',
      handler: (req, res, next) => {
        res.set('Content-Security-Policy', "script-src 'self'");
        next();
      }
    }
  ]
});
siteLoader.load(app);

http.createServer(app).listen(80, () => console.log('Server started on port 80'));