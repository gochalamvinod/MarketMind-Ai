const MarketPrice = require('../models/MarketPrice');

const APMC_MARKET_COMMODITIES = [
  { commodity: 'Potato', variety: 'Local', modalPrice: 1850, pricePerKg: 18.50, market: 'Bowenpally APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Tomato', variety: 'Hybrid', modalPrice: 1950, pricePerKg: 19.50, market: 'Bowenpally APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Wheat', variety: 'Sharbati', modalPrice: 2580, pricePerKg: 25.80, market: 'Nizamabad APMC', state: 'Telangana', district: 'Nizamabad' },
  { commodity: 'Wheat (Lokwan)', variety: 'Lokwan', modalPrice: 2650, pricePerKg: 26.50, market: 'Warangal APMC', state: 'Telangana', district: 'Warangal' },
  { commodity: 'Onion', variety: 'Red', modalPrice: 3550, pricePerKg: 35.50, market: 'Malakpet APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Rice', variety: 'Common', modalPrice: 3800, pricePerKg: 38.00, market: 'Miryalaguda APMC', state: 'Telangana', district: 'Nalgonda' },
  { commodity: 'Rice (Sona Masoori)', variety: 'Sona Masoori', modalPrice: 3950, pricePerKg: 39.50, market: 'Nizamabad APMC', state: 'Telangana', district: 'Nizamabad' },
  { commodity: 'Jaggery', variety: 'Gur', modalPrice: 4620, pricePerKg: 46.20, market: 'Anakapalle APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Sugar', variety: 'M-30', modalPrice: 5035, pricePerKg: 50.35, market: 'Hyderabad APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Masoor Dal', variety: 'Whole', modalPrice: 6400, pricePerKg: 64.00, market: 'Suryapet APMC', state: 'Telangana', district: 'Suryapet' },
  { commodity: 'Mustard', variety: 'Yellow', modalPrice: 7300, pricePerKg: 73.00, market: 'Adilabad APMC', state: 'Telangana', district: 'Adilabad' },
  { commodity: 'Sunflower Oil', variety: 'Refined', modalPrice: 7425, pricePerKg: 74.25, market: 'Hyderabad APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Groundnut', variety: 'Pod', modalPrice: 7525, pricePerKg: 75.25, market: 'Mahabubnagar APMC', state: 'Telangana', district: 'Mahabubnagar' },
  { commodity: 'Urad Dal', variety: 'Split', modalPrice: 7550, pricePerKg: 75.50, market: 'Suryapet APMC', state: 'Telangana', district: 'Suryapet' },
  { commodity: 'Chana Dal', variety: 'Desi', modalPrice: 7700, pricePerKg: 77.00, market: 'Nizamabad APMC', state: 'Telangana', district: 'Nizamabad' },
  { commodity: 'Rice (Basmati)', variety: '1121', modalPrice: 7800, pricePerKg: 78.00, market: 'Hyderabad APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Moong Dal', variety: 'Washed', modalPrice: 8050, pricePerKg: 80.50, market: 'Warangal APMC', state: 'Telangana', district: 'Warangal' },
  { commodity: 'Tamarind', variety: 'With Seed', modalPrice: 8500, pricePerKg: 85.00, market: 'Khammam APMC', state: 'Telangana', district: 'Khammam' },
  { commodity: 'Rajma', variety: 'Chitra', modalPrice: 9500, pricePerKg: 95.00, market: 'Hyderabad APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Toor Dal', variety: 'Fatka', modalPrice: 11300, pricePerKg: 113.00, market: 'Tandur APMC', state: 'Telangana', district: 'Vikarabad' },
  { commodity: 'Turmeric', variety: 'Finger', modalPrice: 13500, pricePerKg: 135.00, market: 'Nizamabad APMC', state: 'Telangana', district: 'Nizamabad' },
  { commodity: 'Coriander', variety: 'Green', modalPrice: 15000, pricePerKg: 150.00, market: 'Warangal APMC', state: 'Telangana', district: 'Warangal' },
  { commodity: 'Dry Chillies', variety: 'Teja', modalPrice: 27100, pricePerKg: 271.00, market: 'Khammam APMC', state: 'Telangana', district: 'Khammam' },
  { commodity: 'Jeera', variety: 'Machine Clean', modalPrice: 28500, pricePerKg: 285.00, market: 'Hyderabad APMC', state: 'Telangana', district: 'Hyderabad' },
  { commodity: 'Black Pepper', variety: 'Garbled', modalPrice: 57800, pricePerKg: 578.00, market: 'Hyderabad APMC', state: 'Telangana', district: 'Hyderabad' }
];

const seedMarketPrices = async () => {
  try {
    for (const item of APMC_MARKET_COMMODITIES) {
      const exists = await MarketPrice.findOne({ commodity: new RegExp(`^${item.commodity}$`, 'i') });
      if (!exists) {
        await MarketPrice.create({
          ...item,
          minPrice: Math.round(item.modalPrice * 0.95),
          maxPrice: Math.round(item.modalPrice * 1.05),
          unit: 'kg',
          source: 'AGMARKNET',
          observationDate: new Date(),
          fetchTime: new Date()
        });
      }
    }
    console.log('[MarketPrices] Telangana APMC wholesale benchmarks seeded successfully');
  } catch (err) {
    console.warn('[MarketPrices] Seeding failed:', err.message);
  }
};

module.exports = { seedMarketPrices, APMC_MARKET_COMMODITIES };
