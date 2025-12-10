const express = require('express');
const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const { protect } = require('../middleware/auth');
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');

const router = express.Router();

// add to cart: POST /api/cart
router.post('/', protect, asyncHandler(async (req, res) => {
  const schema = Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required()
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }
  const { productId, quantity } = value;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (quantity > product.stock) {
    res.status(400);
    throw new Error('Requested quantity exceeds stock');
  }

  // upsert cart item
  const filter = { user: req.user._id, product: productId };
  const update = { $set: { quantity } };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  const cartItem = await CartItem.findOneAndUpdate(filter, update, options);
  res.status(201).json(cartItem);
}));

// update quantity: PUT /api/cart/:id
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const schema = Joi.object({ quantity: Joi.number().integer().min(1).required() });
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400); throw new Error(error.details[0].message); }
  const cartItem = await CartItem.findById(req.params.id);
  if (!cartItem) { res.status(404); throw new Error('Cart item not found'); }
  if (cartItem.user.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not allowed to update this item');
  }

  const product = await Product.findById(cartItem.product);
  if (!product) { res.status(404); throw new Error('Associated product not found'); }
  if (value.quantity > product.stock) { res.status(400); throw new Error('Requested quantity exceeds stock'); }

  cartItem.quantity = value.quantity;
  await cartItem.save();
  res.json(cartItem);
}));

// delete: DELETE /api/cart/:id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const cartItem = await CartItem.findById(req.params.id);
  if (!cartItem) { res.status(404); throw new Error('Cart item not found'); }
  if (cartItem.user.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not allowed to delete this item');
  }
  await cartItem.deleteOne();
  res.json({ message: 'Cart item removed' });
}));

// get all cart items for logged in user: GET /api/cart
router.get('/', protect, asyncHandler(async (req, res) => {
  const items = await CartItem.find({ user: req.user._id }).populate('product');
  res.json(items);
}));

module.exports = router;
