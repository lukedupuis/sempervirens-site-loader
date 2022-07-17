import { expect } from 'chai';
import express from 'express';
import superagent from 'superagent';
import { startServer, stopAllServers } from '@sempervirens/tools';
import { RequestHandler } from '@sempervirens/endpoint';

import SiteLoader from '../index.js';

class Test1RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('Success 1');
  }
}
class Test2RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('Success 2');
  }
}
class Test3RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.res.send(this.data);
  }
}

describe('1. SiteLoader', () => {

  describe('1.1. When parameters are not valid', () => {
    // return;

    describe('1.1.1. When "domain" is not provided', () => {
      it('1.1.1.1. Should throw an error', () => {
        try {
          new SiteLoader();
        } catch(err) {
          expect(err.message).to.equal('"domain" is required.');
        }
      });
    });

    describe('1.1.2. When an "endpoints" path is formatted incorrectly', () => {
      it('1.1.2.1. Should throw an error', () => {
        try {
          new SiteLoader({
            domain: 'site-1',
            endpoints: [
              {
                path: '/api/test-1',
                handler: Test1RequestHandler
              }
            ]
          });
        } catch(error) {
          expect(error.message).to.include('Endpoint paths must have a method, a space, and a path.');
        }
      });
    });

  });

  describe('1.2. When one site is loaded', () => {
    // return;

    const app = express();
    const siteLoader1 = new SiteLoader({ domain: 'site-1' });
    siteLoader1.load(app);
    startServer({ app, port: 8080 });

    it('1.2.1. Should make the site available at http://{domain}', async () => {
      const res = await superagent.get('http://site-1:8080');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 1</title>');
    });

    it('1.2.2. Should make the site available at http://localhost/{domain}', async () => {
      const res = await superagent.get('http://localhost:8080/site-1');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 1</title>');
    });

    it('1.2.3. Should make static resources available at http://{domain}/static', async () => {
      const { text } = await superagent.get('http://site-1:8080/static/styles.css');
      expect(text).to.include('#site-1');
    });

    it('1.2.4. Should make static resources available at http://localhost/{domain}/static', async () => {
      const { text } = await superagent.get('http://localhost:8080/site-1/static/styles.css');
      expect(text).to.include('#site-1');
    });

    describe('1.2.5. When the resource does not exist', () => {

      it('1.2.5.1. Should return a 404 on http://{domain}/static', async () => {
        try {
          await superagent.get('http://site-1:8080/static/styles-1.css');
        } catch({ status }) {
          expect(status).to.equal(404);
        }
      });

      it('1.2.5.2. Should return a 404 on http://localhost/{domain}/static', async () => {
        try {
          await superagent.get('http://site-1:8080/site-1/static/styles-1.css');
        } catch({ status }) {
          expect(status).to.equal(404);
        }
      });

    });

  });

  describe('1.3. When multiple sites are loaded', async () => {
    // return;

    const app = express();
    const siteLoader1 = new SiteLoader({ domain: 'site-1' });
    siteLoader1.load(app);
    const siteLoader2 = new SiteLoader({ domain: 'site-2' });
    siteLoader2.load(app);
    startServer({ app, port: 8081 });

    it('1.3.1. Should make the first site available at http://{domain}', async () => {
      const res = await superagent.get('http://site-1:8081');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 1</title>');
    });

    it('1.3.2. Should make the first site available at http://localhost/{domain}', async () => {
      const res = await superagent.get('http://localhost:8081/site-1');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 1</title>');
    });

    it('1.3.3. Should make the first site static resources available at http://{domain}/static', async () => {
      const { text } = await superagent.get('http://site-1:8081/static/styles.css');
      expect(text).to.include('#site-1');
    });

    it('1.3.4. Should make the first site static resources available at http://localhost/{domain}/static', async () => {
      const { text } = await superagent.get('http://localhost:8081/site-1/static/styles.css');
      expect(text).to.include('#site-1');
    });

    it('1.3.5. Should make the second site available at http://{domain}', async () => {
      const res = await superagent.get('http://site-2:8081');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 2</title>');
    });

    it('1.3.6. Should make the second site available at http://localhost/{domain}', async () => {
      const res = await superagent.get('http://localhost:8081/site-2');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 2</title>');
    });

    it('1.3.7. Should make the second site static resources available at http://{domain}/static', async () => {
      const { text } = await superagent.get('http://site-2:8081/static/styles.css');
      expect(text).to.include('#site-2');
    });

    it('1.3.8. Should make the second site static resources available at http://localhost/{domain}/static', async () => {
      const { text } = await superagent.get('http://localhost:8081/site-2/static/styles.css');
      expect(text).to.include('#site-2');
    });

  });

  describe('1.4. When "endpoints" are given for one site', () => {
    // return;

    describe('1.4.1. When it is an API endpoint', () => {
      // return;

      const app = express();
      const siteLoader = new SiteLoader({
        domain: 'site-1',
        endpoints: [
          {
            path: 'GET /api/test-1',
            handler: Test1RequestHandler
          }
        ]
      });
      siteLoader.load(app);
      startServer({ app, port: 8082 });

      it('1.4.1.1. Should make the endpoint available at http://{domain}/{path}', async () => {
        const { text } = await superagent.get('http://site-1:8082/api/test-1');
        expect(text).to.equal('Success 1');
      });

      it('1.4.1.2. Should make the endpoint available at http://localhost/{domain}/{path}', async () => {
        const { text } = await superagent.get('http://localhost:8082/site-1/api/test-1');
        expect(text).to.equal('Success 1');
      });

      it('1.4.1.3. Should return a 404 if the request path contains the API endpoint prefix but the endpoint does not exist', async () => {
        try {
          await superagent.get('http://localhost:8082/site-1/api/test-2');
        } catch(error) {
          expect(error.status).to.equal(404);
        }
      });

      it('1.4.1.4. Should return a 404 if the domain is not in the URL before the endpoint path', async () => {
        try {
          await superagent.get('http://localhost:8082/api/test-1');
        } catch(error) {
          expect(error.status).to.equal(404);
        }
      });

    });

    describe('1.4.2. When "apiBasePath" is specified', () => {
      // return;

      const app = express();
      const siteLoader = new SiteLoader({
        domain: 'site-1',
        apiBasePath: 'api-1',
        endpoints: [
          {
            path: 'GET /api-1/test-1',
            handler: Test1RequestHandler
          }
        ]
      });
      siteLoader.load(app);
      startServer({ app, port: 8083 });

      it('1.4.2.1. Should make the endpoint available at http://{domain}/{path}', async () => {
        const { text } = await superagent.get('http://site-1:8083/api-1/test-1');
        expect(text).to.equal('Success 1');
      });

      it('1.4.2.2. Should make the endpoint available at http://localhost/{domain}/{path}', async () => {
        const { text } = await superagent.get('http://localhost:8083/site-1/api-1/test-1');
        expect(text).to.equal('Success 1');
      });

      it('1.4.2.3. Should return a 404 if the request path contains the API endpoint prefix but the endpoint does not exist', async () => {
        try {
          await superagent.get('http://localhost:8083/site-1/api-1/test-2');
        } catch(error) {
          expect(error.status).to.equal(404);
        }
      });

      it('1.4.2.4. Should return a 404 if the domain is not in the URL before the endpoint path', async () => {
        try {
          await superagent.get('http://localhost:8083/api-1/test-1');
        } catch(error) {
          expect(error.status).to.equal(404);
        }
      });

    });

  });

  describe('1.5. When "endpoints" are given for multiple sites', () => {
    // return;

    const app = express();
    const siteLoader1 = new SiteLoader({
      domain: 'site-1',
      endpoints: [
        {
          path: 'GET /api/test-1',
          handler: Test1RequestHandler
        }
      ]
    });
    siteLoader1.load(app);
    const siteLoader2 = new SiteLoader({
      domain: 'site-2',
      endpoints: [
        {
          path: 'GET /api/test-1',
          handler: Test2RequestHandler
        },
        {
          path: 'GET /api/test-2',
          handler: Test2RequestHandler
        }
      ]
    });
    siteLoader2.load(app);
    startServer({ app, port: 8085 });

    it('1.5.1. Should make first site endpoints available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-1:8085/api/test-1');
      expect(text).to.equal('Success 1');
    });

    it('1.5.2. Should make first site endpoints available at http://localhost/{domain}/{path}', async () => {
      const { text } = await superagent.get('http://localhost:8085/site-1/api/test-1');
      expect(text).to.equal('Success 1');
    });

    it('1.5.3. Should make second site endpoints available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-2:8085/api/test-2');
      expect(text).to.equal('Success 2');
    });

    it('1.5.4. Should make second site endpoints available at http://localhost/{domain}/{path}', async () => {
      const { text } = await superagent.get('http://localhost:8085/site-2/api/test-2');
      expect(text).to.equal('Success 2');
    });

    describe('1.5.6. When one site has the same endpoint path as another site', () => {
      it('1.5.6.1. Should make the endpoint available on both sites separately', async () => {
        const { text: text1 } = await superagent.get('http://site-1:8085/api/test-1');
        const { text: text2 } = await superagent.get('http://site-2:8085/api/test-1');
        expect(text1).to.equal('Success 1');
        expect(text2).to.equal('Success 2');
      });
    });

  });

  describe('1.6. When "endpoints" are given with a function as the handler instead of the RequestHandler class', () => {
    // return;

    const app = express();
    const siteLoader = new SiteLoader({
      domain: 'site-1',
      endpoints: [
        {
          path: 'GET /api/test-1',
          handler: ({ req, res, isSecure }) => {
            res.send('Success 1');
          }
        },
        {
          path: 'GET /test-2',
          handler: ({ req, res, isSecure }) => {
            res.send('Success 2');
          }
        }
      ]
    });
    siteLoader.load(app);
    startServer({ app, port: 8086 });

    it('1.6.1. Should make an API endpoint available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-1:8086/api/test-1');
      expect(text).to.equal('Success 1');
    });

    it('1.6.2. Should make a non-API endpoint available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-1:8086/test-2');
      expect(text).to.equal('Success 2');
    });

  });

  describe('1.7. When endpoints are given with "data"', () => {

    const app = express();
    const siteLoader = new SiteLoader({
      domain: 'site-1',
      data: { prop1: 'val1', prop2: 'val2a' },
      endpoints: [
        {
          path: 'GET /api/test-3a',
          handler: Test3RequestHandler,
        },
        {
          path: 'GET /api/test-3b',
          handler: Test3RequestHandler,
          data: { prop3: 'val3' }
        },
        {
          path: 'GET /api/test-3c',
          handler: Test3RequestHandler,
          data: { prop2: 'val2b', prop3: 'val3' }
        }
      ]
    });
    siteLoader.load(app);
    startServer({ app, port: 8087 });

    describe('1.7.1. When "data" is passed only into the SiteLoader', () => {
      it('1.7.1.1. Should make the data available in all endpoints', async () => {
        const { body: body1 } = await superagent.get('http://site-1:8087/api/test-3a');
        expect(body1).to.deep.equal({ prop1: 'val1', prop2: 'val2a' });
      });
    });

    describe('1.7.2. When "data" is passed into SiteLoader and into an endpoint', () => {

      it('1.7.2.1. Should make both the SiteLoader data and the endpoint data available to the endpoint', async () => {
        const { body } = await superagent.get('http://site-1:8087/api/test-3b');
        expect(body).to.deep.equal({ prop1: 'val1', prop2: 'val2a', prop3: 'val3' });
      });

      describe('1.7.2.2. When "data" passed into SiteLoader and "data" passed into the endpoint share a property', () => {
        it('1.7.2.2.1. Should use the endpoint property', async () => {
          const { body } = await superagent.get('http://site-1:8087/api/test-3c');
          expect(body).to.deep.equal({ prop1: 'val1', prop2: 'val2b', prop3: 'val3' });
        });
      });
    });
  });

  describe('1.8. When "middleware" is given for one site', () => {
    // return;

    const app = express();
    const siteLoader1 = new SiteLoader({
      domain: 'site-1',
      middleware: [
        {
          path: 'GET /test-1',
          handler: (req, res, next) => {
            res.set('Custom-Header-1', 'Custom header 1 value');
            next();
          }
        },
        {
          handler: (req, res, next) => {
            res.set('Custom-Header-2', 'Custom header 2 value');
            next();
          }
        }
      ]
    });
    siteLoader1.load(app);
    const siteLoader2 = new SiteLoader({
      domain: 'site-2'
    });
    siteLoader2.load(app);
    startServer({ app, port: 8088 });

    it('1.8.1. Should only apply the middleware to the specified site', async () => {
      const { text, headers } = await superagent.get('http://localhost:8088/site-2');
      expect(text).to.include('This is site-2.');
      expect(headers['custom-header-1']).not.to.exist;
      expect(headers['custom-header-2']).not.to.exist;
    });

    describe('1.8.2. When "path" is included', () => {

      it('1.8.2.1 Should apply the middleware to the specified path', async () => {
        const { text, headers } = await superagent.get('http://localhost:8088/site-1/test-1');
        expect(text).to.include('This is site-1.');
        expect(headers['custom-header-1']).to.equal('Custom header 1 value');
      });

      it('1.8.2.2 Should not apply the middleware to the request at other paths', async () => {
        const { text, headers } = await superagent.get('http://localhost:8088/site-1');
        expect(text).to.include('This is site-1.');
        expect(headers['custom-header-1']).not.to.exist;
      });

    });

    describe('1.8.3. When "path" is not included', () => {
      it('1.8.3.1 Should apply the middleware to the request on all paths', async () => {
        const { text: text1, headers: headers1 } = await superagent.get('http://localhost:8088/site-1');
        expect(text1).to.include('This is site-1.');
        expect(headers1['custom-header-2']).to.equal('Custom header 2 value');
        const { text: text2, headers: headers2 } = await superagent.get('http://localhost:8088/site-1/test-1');
        expect(text2).to.include('This is site-1.');
        expect(headers2['custom-header-2']).to.equal('Custom header 2 value');
      });
    });

  });

  after(async () => {
    await stopAllServers();
    setTimeout(() => process.exit(), 100);
  });

});