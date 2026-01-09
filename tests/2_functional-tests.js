const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  // 1. Viewing one stock
  test('Viewing one stock: GET /api/stock-prices?stock=goog', function(done) {
    chai.request(server)
     .get('/api/stock-prices')
     .query({ stock: 'goog' })
     .end(function(err, res) {
       assert.equal(res.status, 200);
       assert.equal(res.body.stockData.stock, 'GOOG');
       assert.exists(res.body.stockData.price);
       assert.exists(res.body.stockData.likes);
       done();
     });
  });

  // 2. Viewing one stock and liking it
  test('Viewing one stock and liking it: GET /api/stock-prices?stock=goog&like=true', function(done) {
    chai.request(server)
     .get('/api/stock-prices')
     .query({ stock: 'goog', like: 'true' })
     .end(function(err, res) {
       assert.equal(res.status, 200);
       assert.equal(res.body.stockData.stock, 'GOOG');
       assert.isAtLeast(res.body.stockData.likes, 1);
       done();
     });
  });

  // 3. Viewing the same stock and liking it again
  test('Viewing the same stock and liking it again: GET /api/stock-prices?stock=goog&like=true', function(done) {
    chai.request(server)
     .get('/api/stock-prices')
     .query({ stock: 'goog', like: 'true' })
     .end(function(err, res) {
      
       const firstLikeCount = res.body.stockData.likes;
       
       chai.request(server)
         .get('/api/stock-prices')
         .query({ stock: 'goog', like: 'true' })
         .end(function(err, res2) {
           assert.equal(res2.body.stockData.likes, firstLikeCount);
           done();
         });
     });
  });

 // 4. Viewing two stocks
  test('Viewing two stocks: GET /api/stock-prices?stock=goog&stock=msft', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['goog', 'msft'] })
      .end(function(err, res) {
        try {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.equal(res.body.stockData[0].stock, 'GOOG');
          assert.equal(res.body.stockData[1].stock, 'MSFT');
          done(); // Move to the next test no matter what
        } catch (e) {
          done(e); // Pass the error to Mocha so it logs it and continues
        }
      });
  });

  // 5. Viewing two stocks and liking them
  test('Viewing two stocks and liking them: GET /api/stock-prices?stock=goog&stock=msft&like=true', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['goog', 'msft'], like: 'true' })
      .end(function(err, res) {
        try {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.exists(res.body.stockData[0].rel_likes);
          assert.equal(res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 0);
          done();
        } catch (e) {
          done(e);
        }
      });
  });

});