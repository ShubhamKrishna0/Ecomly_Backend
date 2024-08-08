const { Schema, model } = require('mongoose');

const orderItemSchema = Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productImage: { type: String, required: true },
  productPrice: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  selectedSize: String,
  selectedColour: String,
});

orderItemSchema.set('toObject', { virtuals: true });
orderItemSchema.set('toJSON', { virtuals: true });

exports.OrderItem = model('OrderItem', orderItemSchema);
