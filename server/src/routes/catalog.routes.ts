import { Router } from 'express';
import { getPublicSettings, listCategories, listItems } from '../controllers/catalog.controller.js';

export const catalogRouter = Router();

catalogRouter.get('/categories', listCategories);
catalogRouter.get('/items', listItems);
catalogRouter.get('/settings', getPublicSettings);
