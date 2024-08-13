const express = require('express');
const router = express.Router();

const usersController = require('../controllers/admin/users');
const categoriesController = require('../controllers/admin/categories');
const ordersController = require('../controllers/admin/orders');
const productsController = require('../controllers/admin/products');

// https://dbestech.biz/admin/categories/s9d0fjw90ejf0e9
// USERS
router.get('/users/count', usersController.getUserCount);
router.delete('/users/:id', usersController.deleteUser);

// CATEGORIES
router.post('/categories', categoriesController.addCategory);
router.put('/categories/:id', categoriesController.editCategory);
router.delete('/categories/:id', categoriesController.deleteCategory);

// PRODUCTS
router.get('/products/count', productsController.getProductsCount);
router.get('/products', productsController.getProducts);
router.post('/products', productsController.addProduct);
router.put('/products/:id', productsController.editProduct);
router.delete('/products/:id/images', productsController.deleteProductImages);
router.delete('/products/:id', productsController.deleteProduct);

// ORDERS
router.get('/orders', ordersController.getOrders);
router.get('/orders/count', ordersController.getOrdersCount);
router.put('/orders/:id', ordersController.changeOrderStatus);
router.delete('/orders/:id', ordersController.deleteOrder);

module.exports = router;
