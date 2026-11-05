import { Router } from 'express';
import { listCategories, listItems } from '../controllers/catalog.controller.js';

export const catalogRouter = Router();

catalogRouter.get('/categories', listCategories);
catalogRouter.get('/items', listItems);
