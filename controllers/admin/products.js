const { Product } = require('../../models/product');
const { Review } = require('../../models/review');
const media_helper = require('../../helpers/media_helper');
const util = require('util');
const { Category } = require('../../models/category');
const multer = require('multer');
const { default: mongoose } = require('mongoose');

exports.getProductsCount = async function (req, res) {
  try {
    const count = await Product.countDocuments();
    if (!count) {
      return res.status(500).json({ message: 'Could not count products' });
    }
    return res.json({ count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
exports.addProduct = async function (req, res) {
  try {
    const uploadImage = util.promisify(
      media_helper.upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 10 },
      ])
    );
    try {
      await uploadImage(req, res);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        type: error.code,
        message: `${error.message}{${err.field}}`,
        storageErrors: error.storageErrors,
      });
    }

    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({ message: 'Invalid Category.' });
    }
    if (category.markedForDeletion) {
      return res.status(404).json({
        message:
          'Category marked for deletion, you cannot add products to this category.',
      });
    }
    const image = req.files['image'][0];
    if (!image) return res.status(404).json({ message: 'No file found!' });

    req.body['image'] = `${req.protocol}://${req.get('host')}/${image.path}`;

    const gallery = req.files['images'];
    const imagePaths = [];
    if (gallery) {
      for (const image of gallery) {
        const imagePath = `${req.protocol}://${req.get('host')}/${image.path}`;
        imagePaths.push(imagePath);
      }
    }
    if (imagePaths.length > 0) {
      req.body['images'] = imagePaths;
    }

    const product = await new Product(req.body).save();
    if (!product) {
      return res
        .status(500)
        .json({ message: 'The product could not be created' });
    }
    return res.status(201).json(product);
  } catch (error) {
    console.error(error);
    if (err instanceof multer.MulterError) {
      return res.status(err.code).json({ message: err.message });
    }
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
exports.editProduct = async function (req, res) {
  try {
    if (
      !mongoose.isValidObjectId(req.params.id) ||
      !(await Product.findById(req.params.id))
    ) {
      return res.status(404).json({ message: 'Invalid Product' });
    }
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(404).json({ message: 'Invalid Category' });
      }
      if (category.markedForDeletion) {
        return res.status(404).json({
          message:
            'Category marked for deletion, you cannot add products to this category.',
        });
      }

      const product = await Product.findById(req.params.id);

      if (req.body.images) {
        const limit = 10 - product.images.length;
        const uploadGallery = util.promisify(
          media_helper.upload.fields([{ name: 'images', maxCount: limit }])
        );
        try {
          await uploadGallery(req, res);
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            type: error.code,
            message: `${error.message}{${err.field}}`,
            storageErrors: error.storageErrors,
          });
        }
        const imageFiles = req.files['images'];
        const updateGallery = imageFiles && imageFiles.length > 0;
        if (updateGallery) {
          const imagePaths = [];
          for (const image of gallery) {
            const imagePath = `${req.protocol}://${req.get('host')}/${
              image.path
            }`;
            imagePaths.push(imagePath);
          }
          req.body['images'] = [...product.images, ...imagePaths];
        }
      }
      if (req.body.image) {
        const uploadImage = util.promisify(
          media_helper.upload.fields([{ name: 'image', maxCount: 1 }])
        );
        try {
          await uploadImage(req, res);
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            type: error.code,
            message: `${error.message}{${err.field}}`,
            storageErrors: error.storageErrors,
          });
        }
        const image = req.files['image'][0];
        if (!image) return res.status(404).json({ message: 'No file found!' });

        req.body['image'] = `${req.protocol}://${req.get('host')}/${
          image.path
        }`;
      }
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    if (err instanceof multer.MulterError) {
      return res.status(err.code).json({ message: err.message });
    }
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
exports.deleteProductImages = async function (req, res) {
  try {
    const productId = req.params.id;
    const { deletedImageUrls } = req.body;

    if (
      !mongoose.isValidObjectId(productId) ||
      !Array.isArray(deletedImageUrls)
    ) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    await media_helper.deleteImages(deletedImageUrls);
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.images = product.images.filter(
      (image) => !deletedImageUrls.includes(image)
    );

    await product.save();

    return res.status(204).end();
  } catch (error) {
    console.error(`Error deleting product: ${error.message}`);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Image not found' });
    }
    return res.status(500).json({ message: error.message });
  }
};
exports.deleteProduct = async function (req, res) {
  try {
    const productId = req.params.id;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(404).json('Invalid Product');
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await media_helper.deleteImages(
      [...product.images, product.image],
      'ENOENT'
    );

    await Review.deleteMany({ _id: { $in: product.reviews } });

    await Product.findByIdAndDelete(productId);
    return res.status(204).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};

exports.getProducts = async function (req, res) {
  try {
    const page = req.query.page || 1;
    const pageSize = 10;
    const products = await Product.find()
      .select('-reviews -rating')
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (!products) {
      return res.status(404).json({ message: 'Products not found' });
    }
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};
