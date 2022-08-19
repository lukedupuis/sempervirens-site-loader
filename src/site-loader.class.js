import express from 'express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { registerEndpoints, registerMiddleware } from '@sempervirens/endpoint';

/**
 * @class SiteLoader
 * @description Loads a site into the server's Epress app.
 */
class SiteLoader {

  #domain;
  #isProd;
  #isMultiSite;
  #data;
  #endpoints;
  #middleware;

  #app;
  #apiBasePath;
  #sitesDir;

  publicDir;

  constructor({
    domain = '',
    isProd = false,
    isMultiSite = false,
    apiBasePath = '/api',
    sitesDir = 'sites',
    data = {},
    endpoints = [],
    middleware = []
  } = {}) {
    this.#domain = domain;
    this.#isProd = isProd;
    this.#isMultiSite = isMultiSite;
    this.#apiBasePath = apiBasePath.charAt(0) == '/' ? apiBasePath :`/${apiBasePath}`;
    this.#sitesDir = sitesDir;
    this.#data = data;
    this.#endpoints = endpoints;
    this.#middleware = middleware;
    this.#validate();
  }

  /**
   * @function #validate
   * @returns {void}
   * @description Validates the parameters passed into the constructor.
   */
  #validate() {
    if (!this.#domain) {
      throw new Error('"domain" is required.');
    }
    let invalidEndpoint = this.#endpoints.find(({ path }) => {
      return path.split(' ').length != 2;
    });
    if (invalidEndpoint) {
      throw new Error([
        `Endpoint path "${invalidEndpoint.path}" is not valid.`,
        'Endpoint paths must have a method, a space, and a path.',
        'For example, "POST /path-1" and "GET /api/path-1" are valid paths.'
      ].join(' '));
    }
  }

  /**
   * @function load
   * @param {express} app The server's main Express app
   * @returns {void}
   * @description The entry point for calling the class's functions in order.
   */
  load(app) {
    this.#initInstanceProperties(app);
    this.#initRequestProperties();
    this.#initStaticPath();
    this.#initMiddleware();
    this.#initCommonResources();
    this.#initEndpointValidation();
    this.#initEndpoints();
    this.#initCatchAll();
  }

  /**
   * @function #initInstanceProperties
   * @param {express} app The server's main Express app
   * @returns {void}
   * @description Sets instance properties on load.
   */
  #initInstanceProperties(app) {
    this.#app = app;
    this.publicDir = join(
      process.cwd(),
      this.#sitesDir,
      this.#domain,
      this.#isProd ? 'dist' : 'public'
    );
  }

  /**
   * @function #initRequestProperties
   * @returns {void}
   * @description Adds properties to the request object for use in subsequent
   * middleware.
   */
  #initRequestProperties() {
    this.#app.use((req, res, next) => {
      req.pathParts = req.path.split('/').filter(Boolean);
      req.isSite =
        !this.#isMultiSite
        || req.hostname.includes(this.#domain)
        || req.pathParts[0] == this.#domain
        || req.pathParts[1] == this.#domain
        || req.pathParts[2] == this.#domain;
      next();
    });
  }

  /**
   * @function #initStaticPath
   * @returns {void}
   * @description Sets the site's static path to "{star}/static". The star
   * ensures it matches the site's domain in the domain, and also as a path for
   * loading on localhost. When the path is called, the middleware checks if it
   * is for the current site, and if so, it serves the resource from the site's
   * public directory.
   */
  #initStaticPath() {
    const handle = (req, res, next) => {
      if (req.isSite) {
        const path = req.path.split('/static').join('/static');
        if (!existsSync(join(this.publicDir, path))) {
          res.status(404).send();
        } else {
          express.static(this.publicDir)(req, res, next);
        }
      } else {
        next();
      }
    };
    this.#app.use('/static', handle);
    this.#app.use(`/${this.#domain}/static`, handle);
  }

  /**
   * @function #initMiddleware
   * @returns {void}
   * @description Defines site-specific middleware on the app before registering
   * the endpoints, so the middleware is called before the endpoints, because
   * the endpoints are intended to be the last middleware the request passes
   * through before sending the response.
   */
  #initMiddleware() {
    registerMiddleware({
      app: this.#app,
      middleware: this.#middleware,
      isProd: this.#isProd,
      isMultiSite: this.#isMultiSite,
      domain: this.#domain
    });
  }

  /**
   * @function #initCommonResources
   * @returns {void}
   * @description Returns common resources requested at the root path (e.g.,
   * sitemap.xml, robots.txt, etc.).
   */
   #initCommonResources() {
    this.#app.use((req, res, next) => {
      if (req.isSite) {
        const pathParts = req.pathParts;
        if (pathParts[0] == this.#domain) {
          pathParts.shift();
        }
        if ([
          'sitemap.xml',
          'robots.txt',
          '.well-known'
        ].includes(pathParts[0])) {
          const path = join(this.publicDir, pathParts.join('/'));
          if (!existsSync(path)) {
            res.status(404).send();
          } else {
            res.setHeader('content-type', 'text/plain');
            res.sendFile(path);
          }
        } else {
          next();
        }
      } else {
        next();
      }
    });
   }

  /**
   * @function #initEndpointValidator
   * @returns {void}
   * @description If the request is for the current site, and the request path
   * has the base path of one the valid API endpoints (e.g., /api), and the API
   * endpoint does not actually exist, then a 404 is returned.
   */
  #initEndpointValidation() {
    this.#app.use((req, res, next) => {
      // TODO: Optimize
      const [ p1, p2 ] = req.pathParts;
      if (
        req.isSite
        && (
          `/${p1}` == this.#apiBasePath
          || `/${p2}` == this.#apiBasePath
        )
        && !this.#endpoints.find(({ path }) => {
          const _path = path
            .split(' ')[1]
            .split(':')[0]
            .split('/')
            .filter(Boolean)
            .join('/');
          return req.path.includes(_path);
        })
      ) {
        res.status(404).send();
      } else {
        next();
      }
    });
  }

  /**
   * @function #initEndpoints
   * @returns {void}
   * @description Uses @sempervirens/endpoint registerEndpoints to load the
   * endpoints onto the app.
   */
  #initEndpoints() {
    registerEndpoints({
      app: this.#app,
      endpoints: this.#endpoints,
      data: this.#data,
      isProd: this.#isProd,
      isMultiSite: this.#isMultiSite,
      domain: this.#domain
    });
  }

  /**
   * @function #initCatchAll
   * @returns {void}
   * @description For each site that does not have "siteRoutes" defined, a
   * catch-all GET route is defined. It defined in the request chain after the
   * static route and endpoints, and it returns index.html.
   */
  #initCatchAll() {
    this.#app.get('*', (req, res, next) => {
      if (req.isSite) {
        const indexPath = join(this.publicDir, 'index.html');
        if (existsSync(indexPath)) {
          let indexContent = readFileSync(indexPath, 'utf8');
          if (!this.#isProd) {
            indexContent = indexContent
              .replace(new RegExp(`${this.#domain}/static`, 'gi'), 'static')
              .replace(/static/g, `${this.#domain}/static`);
          }
          res.send(indexContent);
        } else {
          res.status(404).send();
        }
      } else {
        next();
      }
    });
  }

}

export default SiteLoader;