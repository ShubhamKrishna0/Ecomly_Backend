const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products');
const reviewsController = require('../controllers/reviews');

router.get('/', productsController.getProducts);
router.get('/search', productsController.searchProducts);

router.get('/:id', productsController.getProductById);
router.post('/:id/reviews', reviewsController.leaveReview);
router.get('/:id/reviews', reviewsController.getProductReviews);

module.exports = router;
