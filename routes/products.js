const express = require('express');
const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/products - list with optional ?limit & ?search
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 50, search } = req.query;
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const products = await Product.find(query).limit(Number(limit));
  res.json(products);
}));

// GET /api/products/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
}));

// Optional: POST /api/products to add product (for testing)
// requires admin check in real app; here we allow for seeding during dev
router.post('/', asyncHandler(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    price: Joi.number().required(),
    stock: Joi.number().integer().min(0).required(),
    image: Joi.string().optional()
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }
  const product = await Product.create(value);
  res.status(201).json(product);
}));

module.exports = router;
