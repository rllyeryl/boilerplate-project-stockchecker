'use strict';
const crypto = require('crypto');
const StockModel = require('../models'); 
const fetch = require('node-fetch');

function getIPHash(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

async function fetchStock(stock) {
  try {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
    const data = await response.json();
    if (!data || typeof data === 'string' || !data.symbol) {
      return { symbol: stock.toUpperCase(), price: 0 };
    }
    return { symbol: data.symbol, price: data.latestPrice };
  } catch (e) {
    return { symbol: stock.toUpperCase(), price: 0 };
  }
}

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      const clientIp = req.ip;
      const hashedIp = getIPHash(clientIp);
      const stockSymbols = Array.isArray(stock) ? stock : [stock];

      try {
        const stockData = [];

        // SEQUENTIAL LOOP: This prevents the "stall" on Render/MongoDB Free Tier
        for (let symbol of stockSymbols) {
          const { symbol: name, price } = await fetchStock(symbol);
          
          let stockDoc = await StockModel.findOne({ symbol: name });
          if (!stockDoc) {
            stockDoc = await StockModel.create({ symbol: name, likes: [] });
          }

          if (like === 'true' && !stockDoc.likes.includes(hashedIp)) {
            stockDoc.likes.push(hashedIp);
            await stockDoc.save();
          }

          stockData.push({
            stock: name,
            price: price,
            likesCount: stockDoc.likes.length
          });
        }

        // FORMATTING THE RESPONSE
        if (stockData.length === 1) {
          return res.json({
            stockData: {
              stock: stockData[0].stock,
              price: stockData[0].price,
              likes: stockData[0].likesCount
            }
          });
        } else {
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
        console.error("Route Error:", err);
        res.status(500).json({ error: "Server Error" });
      }
    });
};