'use strict';
const crypto = require('crypto');
const StockModel = require('../models'); // Ensure path to models.js is correct
const fetch = require('node-fetch'); // You may need to npm install node-fetch@2

// Helper to hash IP
function getIPHash(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Helper to fetch stock data from FCC Proxy
async function fetchStock(stock) {
  const symbolUpper = stock.toUpperCase();
  const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
  const { symbol, latestPrice } = await response.json();
  return { symbol, price: latestPrice };
}

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      const clientIp = req.ip;
      const hashedIp = getIPHash(clientIp);

      // 1. Normalize stock input (make it an array even if it's one string)
      const stockSymbols = Array.isArray(stock) ? stock : [stock];

      try {
        // 2. Process each stock
        const stockData = await Promise.all(stockSymbols.map(async (symbol) => {
          const { symbol: name, price } = await fetchStock(symbol);
          
          if (!name) return { error: "external source error", rel_likes: 0 };

          // 3. Find or Create stock in DB and handle likes
          let stockDoc = await StockModel.findOne({ symbol: name });
          if (!stockDoc) {
            stockDoc = await StockModel.create({ symbol: name, likes: [] });
          }

          if (like === 'true' && !stockDoc.likes.includes(hashedIp)) {
            stockDoc.likes.push(hashedIp);
            await stockDoc.save();
          }

          return {
            stock: name,
            price: price,
            likesCount: stockDoc.likes.length
          };
        }));

        // 4. Format Output (Single vs Double)
        if (stockData.length === 1) {
          return res.json({
            stockData: {
              stock: stockData[0].stock,
              price: stockData[0].price,
              likes: stockData[0].likesCount
            }
          });
        } else {
          // Calculate relative likes
          return res.json({
            stockData: [
              {
                stock: stockData[0].stock,
                price: stockData[0].price,
                rel_likes: stockData[0].likesCount - stockData[1].likesCount
              },
              {
                stock: stockData[1].stock,
                price: stockData[1].price,
                rel_likes: stockData[1].likesCount - stockData[0].likesCount
              }
            ]
          });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
      }
    });
};