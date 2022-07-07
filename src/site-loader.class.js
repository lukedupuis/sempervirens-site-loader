import express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { registerEndpoints } from '@sempervirens/endpoint';

/**
 * @class SiteLoader
 * @description Loads a site into the server's Epress app.
 */
class SiteLoader {

  #domain;
  #isProd;
  #endpoints;

  #app;
  #apiEndpointBasePath;
  #sitesDir;
  publicDir;

  constructor({
    domain = '',
    isProd = false,
    apiEndpointBasePath = '/api',
    sitesDir = 'sites',
    endpoints = []
  } = {}) {
    this.#domain = domain;
    this.#isProd = isProd;
    this.#apiEndpointBasePath =
      apiEndpointBasePath.charAt(0) == '/'
        ? apiEndpointBasePath
        :`/${apiEndpointBasePath}`;
    this.#sitesDir = sitesDir;
    this.#endpoints = endpoints;
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
        req.hostname.includes(this.#domain)
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
    this.#app.use('*/static', (req, res, next) => {
      if (req.isSite) {
        const pathParts = req.path.split('/static');
        if (!existsSync(join(this.publicDir, pathParts[pathParts.length - 1]))) {
          res.status(404).send();
        } else {
          express.static(this.publicDir)(req, res, next);
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
      if (
        req.isSite
        && (
          req.pathParts[0] == this.#apiEndpointBasePath
          || req.pathParts[1] == this.#apiEndpointBasePath
        )
        && !this.#endpoints.find(({ path }) => path == req.path)
      ) {
        res.status(404).send();
      } else {
        next();
      }
    });
  }

  /**
   * @function #initEndpoints
   */
  #initEndpoints() {
    registerEndpoints({
      app: this.#app,
      endpoints: this.#endpoints
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
        const index = join(this.publicDir, 'index.html');
        if (existsSync(index)) {
          res.sendFile(index);
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
