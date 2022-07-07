import { expect } from 'chai';
import express from 'express';
import superagent from 'superagent';
import { startServer, stopAllServers } from '@sempervirens/tools';
import { RequestHandler } from '@sempervirens/endpoint';

import SiteLoader from '../index.js';

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
    this.res.send('Success 2');
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
      expect(true).to.be.true;
    });

    it('1.2.2. Should make the site available at http://localhost/{domain}', async () => {
      const res = await superagent.get('http://localhost:8080/site-1');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 1</title>');
      expect(true).to.be.true;
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
      expect(true).to.be.true;
    });

    it('1.3.2. Should make the first site available at http://localhost/{domain}', async () => {
      const res = await superagent.get('http://localhost:8081/site-1');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 1</title>');
      expect(true).to.be.true;
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
      expect(true).to.be.true;
    });

    it('1.3.6. Should make the second site available at http://localhost/{domain}', async () => {
      const res = await superagent.get('http://localhost:8081/site-2');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('<title>Site 2</title>');
      expect(true).to.be.true;
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

    describe('1.4.2. When "apiEndpointBasePath" is specified', () => {
      // return;

      const app = express();
      const siteLoader = new SiteLoader({
        domain: 'site-1',
        apiEndpointBasePath: 'api-1',
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
    startServer({ app, port: 8084 });

    it('1.5.1. Should make first site endpoints available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-1:8084/api/test-1');
      expect(text).to.equal('Success 1');
    });

    it('1.5.2. Should make first site endpoints available at http://localhost/{domain}/{path}', async () => {
      const { text } = await superagent.get('http://localhost:8084/site-1/api/test-1');
      expect(text).to.equal('Success 1');
    });

    it('1.5.3. Should make second site endpoints available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-2:8084/api/test-2');
      expect(text).to.equal('Success 2');
    });

    it('1.5.4. Should make second site endpoints available at http://localhost/{domain}/{path}', async () => {
      const { text } = await superagent.get('http://localhost:8084/site-2/api/test-2');
      expect(text).to.equal('Success 2');
    });

    describe('1.5.6. When one site has the same endpoint path as another site', () => {
      it('1.5.6.1. Should make the endpoint available on both sites separately', async () => {
        const { text: text1 } = await superagent.get('http://site-1:8084/api/test-1');
        const { text: text2 } = await superagent.get('http://site-2:8084/api/test-1');
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
    startServer({ app, port: 8085 });

    it('1.6.1. Should make an API endpoint available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-1:8085/api/test-1');
      expect(text).to.equal('Success 1');
    });

    it('1.6.2. Should make a non-API endpoint available at http://{domain}/{path}', async () => {
      const { text } = await superagent.get('http://site-1:8085/test-2');
      expect(text).to.equal('Success 2');
    });

  });

  after(async () => {
    await stopAllServers();
    setTimeout(() => process.exit(), 100);
  });

});