const { Schema, model } = require('mongoose');

const cartProductSchema = Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  selectedSize: String,
  selectedColour: String,
  productName: { type: String, required: true },
  productImage: { type: String, required: true },
  productPrice: { type: Number, required: true },
  reservationExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000),
  },
  reserved: { type: Boolean, default: true },
});

cartProductSchema.set('toObject', { virtuals: true });
cartProductSchema.set('toJSON', { virtuals: true });

exports.CartProduct = model('CartProduct', cartProductSchema);
