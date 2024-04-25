import { ForbiddenError, InvalidPayloadError, UnprocessableContentError } from '@directus/errors';
// import type { Query, User } from '@directus/types';
import { getMatch } from 'ip-matching';
import type { AbstractServiceOptions, Alterations, Item, MutationOptions, PrimaryKey } from '../types/index.js';
import { ItemsService } from './items.js';
// import { PermissionsService } from './permissions/index.js';
// import { PresetsService } from './presets.js';
// import { UsersService } from './users.js';

export class AkeneoMappingService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('akeneo_products_mapping', options);
	}

	private isIpAccessValid(value?: any[] | null): boolean {
		if (value === undefined) return false;
		if (value === null) return true;
		if (Array.isArray(value) && value.length === 0) return true;

		for (const ip of value) {
			if (typeof ip !== 'string' || ip.includes('*')) return false;

			try {
				const match = getMatch(ip);
				if (match.type == 'IPMask') return false;
			} catch {
				return false;
			}
		}

		return true;
	}

	private assertValidIpAccess(partialItem: Partial<Item>): void {
		if ('ip_access' in partialItem && !this.isIpAccessValid(partialItem['ip_access'])) {
			throw new InvalidPayloadError({
				reason: 'IP Access contains an incorrect value. Valid values are: IP addresses, IP ranges and CIDR blocks',
			});
		}
	}

	override async createOne(mapId: string, entityType: string, code: string, externalId: string, relatedId: string, jobInstanceId: string, relatedSource: string, apiUrl: string, created: string, opts?: MutationOptions): Promise<PrimaryKey> {
		// mapId, entityType, code, externalId, relatedId, jobInstanceId, relatedSource, apiUrl, created)

		// console.log("mapId: ",mapId, "entityType: ",entityType, "code: ",code, "apiUrl: ",apiUrl);
		await this.knex('akeneo_products_mapping').insert({
			map_id: mapId,
			entityType: entityType,
			code: code,
			externalId: externalId,
			relatedId: relatedId,
			jobInstanceId: jobInstanceId,
			relatedSource: relatedSource,
			apiUrl: apiUrl,
			created: created, 
		});

		return "saved";
    }
}
