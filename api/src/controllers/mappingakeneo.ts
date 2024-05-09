import { isDirectusError } from '@directus/errors';
import express from 'express';
import { ErrorCode } from '@directus/errors';
import { respond } from '../middleware/respond.js';
import useCollection from '../middleware/use-collection.js';
import { AkeneoProductsService } from '../services/akeneoproducts.js';
import { AkeneoMappingService } from '../services/akeneomapping.js';
import type { PrimaryKey } from '../types/index.js';
import asyncHandler from '../utils/async-handler.js';
import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

const router = express.Router();

router.use(useCollection('akeneo_products_mapping'));

// router.post(
// 	'/',
// 	asyncHandler(async (req, res, next) => {
// 		const service = new AkeneoProductsService({
// 			accountability: req.accountability,
// 			schema: req.schema,
// 		});

// 		const savedKeys: PrimaryKey[] = [];

// 		if (Array.isArray(req.body)) {
// 			const keys = await service.createMany(req.body);
// 			savedKeys.push(...keys);
// 		} else {
// 			const key = await service.createOne(req.body);
// 			savedKeys.push(key);
// 		}

// 		try {
// 			if (Array.isArray(req.body)) {
// 				const items = await service.readMany(savedKeys, req.sanitizedQuery);
// 				res.locals['payload'] = { data: items };
// 			} else {
// 				const item = await service.readOne(savedKeys[0]!, req.sanitizedQuery);
// 				res.locals['payload'] = { data: item };
// 			}
// 		} catch (error: any) {
// 			if (isDirectusError(error, ErrorCode.Forbidden)) {
// 				return next();
// 			}

// 			throw error;
// 		}

// 		return next();
// 	}),
// 	respond,
// );

// router.get(
// 	'/',
// 	asyncHandler(async (req, res, next) => {
// 		return "Hello world!";
// 	}),
// 	respond,
// );
router.get('/', asyncHandler(async (req, res) => {
	const akeneoservice = new AkeneoProductsService({
		accountability: req.accountability,
		schema: req.schema,
	});

	const akeneomappingservice = new AkeneoMappingService({
		accountability: req.accountability,
		schema: req.schema,
	});

	conn.on('ready', () => {
		console.log('Client :: ready');

		conn.shell(async (err, stream) => {
			if (err) throw err;
	
			stream.on('close', () => {
				console.log('Stream :: close');
				conn.end();
			});
	
			for (let startId = 1; startId < 97603; startId += 100) {
				const endId = Math.min(startId + 99, 97602);
				await sendQueryAndProcessResults(stream, startId, endId);
			}

			res.send("All data processed successfully");
			console.log("All data processed successfully");
		});
	}).connect({
		host: '35.169.51.156',
		username: 'bitnami',
		privateKey: fs.readFileSync('/Users/lalarukh/data/code/adminor/Akeneo.pem')
	});

	async function sendQueryAndProcessResults(stream, startId, endId) {
		return new Promise((resolve, reject) => {
			const sqlQuery = `SELECT * FROM wk_shopify_data_mapping WHERE id BETWEEN ${startId} AND ${endId};`;
			const mysqlCommand = `mysql -u root -pcrGAFLQXQjL2 -e "USE bitnami_akeneo; ${sqlQuery}"\n`;
	
			stream.write(mysqlCommand);
			stream.write("echo 'Ending our code here'\n");
			let dataBuffer = '';
	
			const onData = (data) => {
				dataBuffer += data.toString();
			};
	
			stream.on('data', onData);
	
			setTimeout(() => {
				stream.removeListener('data', onData);
	
				const startMarker = "can be insecure.";
				const endMarker = "Ending our code here";
				const startIndex = dataBuffer.indexOf(startMarker);
				const endIndex = dataBuffer.indexOf(endMarker);
	
				
				if (startIndex !== -1 && endIndex !== -1) {
					const extractedText = dataBuffer.substring(startIndex + startMarker.length, endIndex).trim();
					const lines = extractedText.split('\n');
					const dataLines = lines.filter(line => line.includes('|')).map(line => line.trim().split('|'));

					if (dataLines.length > 0) {
						const columns = dataLines[0].map(column => column.trim());

						const rows = dataLines.slice(1).map(row => {
							return row.reduce((acc, curr, idx) => {
								acc[columns[idx]] = curr.trim();
								return acc;
							}, {} as Record<string, string>);
						});

						for (const item of rows) {
							const mapId = item.id || '';
							const entityType = item.entityType || '';
							const code = item.code?.trim() || '';
							const externalId = item.externalId?.trim() || '';
							const relatedId = item.relatedId || '';
							const jobInstanceId = item.jobInstanceId || '';
							const relatedSource = item.relatedSource || '';
							const apiUrl = item.apiUrl || '';
							const created = item.created || '';
							// console.log("mapId",mapId, "apiUrl", apiUrl, "code", code);

							if(apiUrl !== "apiUrl"){
								updateAkeneoData(apiUrl, externalId, code);
								saveAkeneoMapping(mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created);
							}
							
						}
					}
				}
	
				resolve();
			}, 4000); // Adjust timeout to ensure data is fully received
		});
	}

	async function updateAkeneoData(apiUrl, externalId, code) {
		
		// console.log("APIURL: ",apiUrl);
		let eshockId = undefined;
		let zpId = undefined;

		if(apiUrl.includes("zelfbouwtest")){
			eshockId = externalId;
		}
		else{
			zpId = externalId;
		}

		const existingUserObj = await akeneoservice.updateOne(code, eshockId, zpId);
	
		if (!existingUserObj) {
			console.log('Failed to update or no entity found with identifier:', code);
		}
	}

	async function saveAkeneoMapping(mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created) {
		
		const savemapping = await akeneomappingservice.createOne(mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created);

		if (savemapping) {
			console.log('This identifier mapping updated and saved: ', code);
		}
	}

	// conn.on('ready', () => {
	// 	console.log('Client :: ready');

	// 	conn.shell((err, stream) => {
	// 		if (err) throw err;
	
	// 		stream.on('close', () => {
	// 			console.log('Stream :: close');
	// 			conn.end();
	// 		});

	// 		async function updateAkeneoData(apiUrl, externalId, code) {
				
	// 			// console.log("APIURL: ",apiUrl);
	// 			let eshockId = undefined;
	// 			let zpId = undefined;

	// 			if(apiUrl.includes("zelfbouwtest")){
	// 				eshockId = externalId;
	// 			}
	// 			else{
	// 				zpId = externalId;
	// 			}

	// 			const existingUserObj = await akeneoservice.updateOne(code, eshockId, zpId);
			
	// 			if (!existingUserObj) {
	// 				console.log('Failed to update or no entity found with identifier:', code);
	// 			}
	// 		}

	// 		async function saveAkeneoMapping(mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created) {
				
	// 			const savemapping = await akeneomappingservice.createOne(mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created);

	// 			if (savemapping) {
	// 				console.log('This identifier mapping updated and saved: ', code);
	// 			}
	// 		}

	// 		stream.setMaxListeners(20);  // Increase the limit before entering the loop

	// 		// Loop through IDs in increments (e.g., 1 to 97603, stepping by 100)
	// 		for (let startId = 1; startId < 97603; startId += 100) {
	// 			const endId = Math.min(startId + 99, 97602);
	// 			const sqlQuery = `SELECT * FROM wk_shopify_data_mapping WHERE id BETWEEN ${startId} AND ${endId};`;
	// 			const mysqlCommand = `mysql -u root -pcrGAFLQXQjL2 -e "USE bitnami_akeneo; ${sqlQuery}"\n`;
	
	// 			stream.write(mysqlCommand);
	
	// 			setTimeout(() => {
	// 				stream.write("echo 'Ending our code here'\n");
	// 				// Buffer to store received data
	// 				let dataBuffer = '';
	
	// 				// stream.on('data', (data: Buffer) => {
	// 				// 	dataBuffer += data.toString();
	// 				// });
	// 				const onData = (data: Buffer) => {
	// 					dataBuffer += data.toString();
	// 				};

	// 				stream.on('data', onData);
	
	// 				setTimeout(() => {
	// 					stream.removeListener('data', onData); // Remove the listener

	// 					const startMarker = "can be insecure.";
	// 					const endMarker = "Ending our code here";
	// 					const startIndex = dataBuffer.indexOf(startMarker);
	// 					const endIndex = dataBuffer.indexOf(endMarker);
	
	// 					if (startIndex !== -1 && endIndex !== -1) {
	// 						const extractedText = dataBuffer.substring(startIndex + startMarker.length, endIndex).trim();
	// 						const lines = extractedText.split('\n');
	// 						const dataLines = lines.filter(line => line.includes('|')).map(line => line.trim().split('|'));
	
	// 						if (dataLines.length > 0) {
	// 							const columns = dataLines[0].map(column => column.trim());

	// 							const rows = dataLines.slice(1).map(row => {
	// 								return row.reduce((acc, curr, idx) => {
	// 									acc[columns[idx]] = curr.trim();
	// 									return acc;
	// 								}, {} as Record<string, string>);
	// 							});

	// 							for (const item of rows) {
	// 								const mapId = item.id || '';
	// 								const entityType = item.entityType || '';
	// 								const code = item.code?.trim() || '';
	// 								const externalId = item.externalId?.trim() || '';
	// 								const relatedId = item.relatedId || '';
	// 								const jobInstanceId = item.jobInstanceId || '';
	// 								const relatedSource = item.relatedSource || '';
	// 								const apiUrl = item.apiUrl || '';
	// 								const created = item.created || '';
	// 								// console.log("mapId",mapId, "apiUrl", apiUrl, "code", code);

	// 								if(apiUrl !== "apiUrl"){
	// 									updateAkeneoData(apiUrl, externalId, code);
	// 									saveAkeneoMapping(mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created);
	// 								}
									
	// 							}
	// 						}
	// 					}
	// 				}, 2000); // Wait some time to collect output
	// 			}, 2000); // Wait for SQL command to execute
	// 		}

	// 		res.send("Data saved successfully!");
	// 	});
	// }).connect({
	// 	host: '35.169.51.156',
	// 	username: 'bitnami',
	// 	privateKey: fs.readFileSync('/Users/lalarukh/data/code/adminor/Akeneo.pem')
	// });
}));

// router.get('/', asyncHandler(async (req, res) => {
// 	console.log("hello_wolrd");
//     res.send("Hello world!");
// }));

export default router;
