import { isDirectusError } from '@directus/errors';
import express from 'express';
import { ErrorCode } from '@directus/errors';
import { respond } from '../middleware/respond.js';
import useCollection from '../middleware/use-collection.js';
// import { validateBatch } from '../middleware/validate-batch.js';
// import { MetaService } from '../services/meta.js';
import { AkeneoProductsService } from '../services/akeneoproducts.js';
import type { PrimaryKey } from '../types/index.js';
import asyncHandler from '../utils/async-handler.js';
// import { sanitizeQuery } from '../utils/sanitize-query.js';

const router = express.Router();

router.use(useCollection('get_akeneo_products'));

router.post(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new AkeneoProductsService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		if (Array.isArray(req.body)) {
			const keys = await service.createMany(req.body);
			savedKeys.push(...keys);
		} else {
			const key = await service.createOne(req.body);
			savedKeys.push(key);
		}

		try {
			if (Array.isArray(req.body)) {
				const items = await service.readMany(savedKeys, req.sanitizedQuery);
				res.locals['payload'] = { data: items };
			} else {
				const item = await service.readOne(savedKeys[0]!, req.sanitizedQuery);
				res.locals['payload'] = { data: item };
			}
		} catch (error: any) {
			if (isDirectusError(error, ErrorCode.Forbidden)) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond,
);

export default router;
