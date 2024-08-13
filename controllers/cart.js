const { User } = require('../models/user');
const { CartProduct } = require('../models/cart_product');
const { Product } = require('../models/product');
const { default: mongoose } = require('mongoose');

exports.getUserCart = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cartProducts = await CartProduct.find({ _id: { $in: user.cart } });
    if (!cartProducts) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    const cart = [];
    for (const cartProduct of cartProducts) {
      const product = await Product.findById(cartProduct.product);
      if (!product) {
        cart.push({
          ...cartProduct._doc,
          productExists: false,
          productOutOfStock: false,
        });
      } else {
        cartProduct.productName = product.name;
        cartProduct.productImage = product.image;
        cartProduct.productPrice = product.price;
        if (product.countInStock < cartProduct.quantity) {
          cart.push({
            ...cartProduct._doc,
            productExists: true,
            productOutOfStock: true,
          });
        } else {
          cart.push({
            ...cartProduct._doc,
            productExists: true,
            productOutOfStock: false,
          });
        }
      }
    }
    return res.json(cart);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};

exports.getUserCartCount = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json(user.cart.length);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
exports.getCartProductById = async function (req, res) {
  try {
    const cartProduct = await CartProduct.findById(req.params.cartProductId);
    if (!cartProduct) {
      return res.status(404).json({ message: 'Cart Product not found!' });
    }

    const product = await Product.findById(cartProduct.product);
    if (!product) {
      cart.push({
        ...cartProduct._doc,
        productExists: false,
        productOutOfStock: false,
      });
    } else {
      cartProduct.productName = product.name;
      cartProduct.productImage = product.image;
      cartProduct.productPrice = product.price;
      if (product.countInStock < cartProduct.quantity) {
        cart.push({
          ...cartProduct._doc,
          productExists: true,
          productOutOfStock: true,
        });
      } else {
        cart.push({
          ...cartProduct._doc,
          productExists: true,
          productOutOfStock: false,
        });
      }
    }
    return res.json(cartProduct);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
exports.addToCart = async function (req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    const userCartProducts = await CartProduct.find({
      _id: { $in: user.cart },
    });
    const existingCartItem = userCartProducts.find(
      (item) =>
        item.product.equals(new mongoose.Schema.Types.ObjectId(productId)) &&
        item.selectedSize === req.body.selectedSize &&
        item.selectedColour === req.body.selectedColour
    );

    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Product not found' });
    }
    if (existingCartItem) {
      let condition = product.countInStock >= existingCartItem.quantity + 1;
      if (existingCartItem.reserved) {
        condition = product.countInStock >= 1;
      }
      if (condition) {
        existingCartItem.quantity += 1;
        await existingCartItem.save({ session });

        await Product.findOneAndUpdate(
          { _id: productId },
          { $inc: { countInStock: -1 } }
        ).session(session);

        await session.commitTransaction();
        return res.status(200).end();
      }
      await session.abortTransaction();
      return res.status(400).json({ message: 'Out of stock' });
    }
    const { quantity, selectedSize, selectedColour } = req.body;
    const cartProduct = await new CartProduct({
      quantity,
      selectedSize,
      selectedColour,
      product: productId,
      productName: product.name,
      productImage: product.image,
      productPrice: product.price,
    }).save({ session });

    if (!cartProduct) {
      await session.abortTransaction();
      return res
        .status(500)
        .json({ message: 'The product could not added to your cart.' });
    }

    user.cart.push(cartProduct.id);
    await user.save({ session });

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, countInStock: { $gte: cartProduct.quantity } },
      { $inc: { countInStock: -cartProduct.quantity } },
      { new: true, session }
    );

    if (!updatedProduct) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: 'Insufficient stock or concurrency issue' });
    }

    await session.commitTransaction();
    return res.status(201).json(cartProduct);
  } catch (error) {
    console.error(error);
    await session.abortTransaction();
    return res.status(500).json({ type: error.name, message: error.message });
  } finally {
    await session.endSession();
  }
};
exports.modifyProductQuantity = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { quantity } = req.body;

    let cartProduct = await CartProduct.findById(req.params.cartProductId);
    if (!cartProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const actualProduct = await Product.findById(cartProduct.product);
    if (!actualProduct) {
      return res.status(404).json({ message: 'Product does not exist' });
    }

    if (quantity > actualProduct.countInStock) {
      return res
        .status(400)
        .json({ message: 'Insufficient stock for the requested quantity' });
    }

    cartProduct = await CartProduct.findByIdAndUpdate(
      req.params.cartProductId,
      quantity,
      { new: true }
    );

    if (!cartProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(cartProduct);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
exports.removeFromCart = async function (req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.cart.includes(req.params.cartProductId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Product not in your cart' });
    }

    const cartItemToRemove = await CartProduct.findById(
      req.params.cartProductId
    );
    if (!cartItemToRemove) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Cart Item not found' });
    }

    if (cartItemToRemove.reserved) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: cartItemToRemove.product },
        { $inc: { countInStock: cartItemToRemove.quantity } },
        { new: true, session }
      );
      if (!updatedProduct) {
        await session.abortTransaction();
        return res.status(500).json({ message: 'Internal Server Error' });
      }
    }

    user.cart.pull(cartItemToRemove.id);
    await user.save({ session });

    const cartProduct = await CartProduct.findByIdAndDelete(
      cartItemToRemove.id
    ).session(session);

    if (!cartProduct) {
      return res.status(500).json({ message: 'Internal Server Error' });
    }
    await session.commitTransaction();
    return res.status(204).end();
  } catch (error) {
    console.error(error);
    await session.abortTransaction();
    return res.status(500).json({ type: error.name, message: error.message });
  } finally {
    await session.endSession();
  }
};
