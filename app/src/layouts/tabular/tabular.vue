<script setup lang="ts">
import { HeaderRaw } from '@/components/v-table/types';
import { AliasFields, useAliasFields } from '@/composables/use-alias-fields';
import { usePageSize } from '@/composables/use-page-size';
import { useCollectionPermissions } from '@/composables/use-permissions';
import { useShortcut } from '@/composables/use-shortcut';
import { Collection } from '@/types/collections';
import { useSync } from '@directus/composables';
import type { ShowSelect } from '@directus/extensions';
import type { Field, Filter, Item } from '@directus/types';
import { ComponentPublicInstance, Ref, inject, ref, toRefs, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api';
import { useItem } from '@/composables/use-item';
import type { User } from '@directus/types';


defineOptions({ inheritAttrs: false });

interface Props {
	collection: string;
	selection?: Item[];
	readonly: boolean;
	tableHeaders: HeaderRaw[];
	showSelect?: ShowSelect;
	items: Item[];
	loading: boolean;
	error?: any;
	totalPages: number;
	tableSort?: { by: string; desc: boolean } | null;
	onRowClick: (item: Item) => void;
	tableRowHeight: number;
	page: number;
	toPage: (newPage: number) => void;
	itemCount?: number;
	fields: string[];
	limit: number;
	primaryKeyField?: Field;
	info?: Collection;
	sortField?: string;
	changeManualSort: (data: any) => Promise<void>;
	resetPresetAndRefresh: () => Promise<void>;
	selectAll: () => void;
	filterUser?: Filter;
	search?: string;
	aliasedFields: Record<string, AliasFields>;
	aliasedKeys: string[];
	onSortChange: (newSort: { by: string; desc: boolean }) => void;
	onAlignChange?: (field: 'string', align: 'left' | 'center' | 'right') => void;
}

const props = withDefaults(defineProps<Props>(), {
	selection: () => [],
	showSelect: 'none',
	error: null,
	itemCount: undefined,
	tableSort: undefined,
	primaryKeyField: undefined,
	info: undefined,
	sortField: undefined,
	filterUser: undefined,
	search: undefined,
	onAlignChange: () => undefined,
});

const emit = defineEmits(['update:selection', 'update:tableHeaders', 'update:limit', 'update:fields']);

const { t } = useI18n();
const { collection } = toRefs(props);

const { sortAllowed } = useCollectionPermissions(collection);

const selectionWritable = useSync(props, 'selection', emit);
const tableHeadersWritable = useSync(props, 'tableHeaders', emit);
const limitWritable = useSync(props, 'limit', emit);

const mainElement = inject<Ref<Element | undefined>>('main-element');

const table = ref<ComponentPublicInstance>();
const showMappingBtn = ref(false);
const showAkeneoBtn = ref(false);

onMounted(() => {
  checkURL(); // This will check the URL when the component mounts
});

watch(
	() => props.page,
	() => mainElement?.value?.scrollTo({ top: 0, behavior: 'smooth' }),
);

useShortcut(
	'meta+a',
	() => {
		props.selectAll();
	},
	table,
);

const { sizes: pageSizes, selected: selectedSize } = usePageSize<string>(
	[25, 50, 100, 250, 500, 1000],
	(value) => String(value),
	props.limit,
);

function checkURL() {
  const resURL = window.location.href; // or however you obtain your URL dynamically

  if (resURL.includes("akeneo_products_mapping")) {
    showMappingBtn.value = true;
    console.log("mapping"); // This is just to verify that the condition was met
  }

  if (resURL.includes("get_akeneo_products")) {
    showAkeneoBtn.value = true;
    console.log("akeneo"); // This is just to verify that the condition was met
  }
}

// const url = window.location.href;
// const parts = url.split('/');
// const contentIndex = parts.indexOf('content');
// const resurl = contentIndex !== -1 && contentIndex + 1 < parts.length ? parts[contentIndex + 1] : null;
// console.log("url: ",resurl);

// if(resurl == "get_akeneo_products"){
// 	console.log("akeno");
// 	document.getElementById("akeneoprbtn").style.display = "block";
// }

// if(resurl == "akeneo_products_mapping"){
// 	console.log("mapping");
// 	const mappingakeneobtn =  document.getElementById("mappingakeneobtn");

// 	if(mappingakeneobtn){
// 		mappingakeneobtn.style.display = "block";
// 	}
// }
// const { save } = useItem<User>(ref('get_akeneo_products'));

if (limitWritable.value !== selectedSize) {
	limitWritable.value = selectedSize;
}

async function fetchData(url = '', data = {}) {
		const formData = new URLSearchParams();

		for (const key in data) {
			formData.append(key, data[key]);
		}

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData
		});

		if (response.ok) {
			const data = await response.json();
			const url = 'https://pim.groep-e.be/api/rest/v1/products?page=1&with_count=false&pagination_type=page&limit=10';
			const accessToken = data.access_token;
			const clientId = '4_5x9b008ra78k4oogoskwc8kswoo8g8sgc40ccs0skwwck04wc8';
			const clientSecret = '1uhdfg69ppdwoocwssc40gk08gsc084c80osocwcgsk44w44wc';
			
			fetchDataRepeatedly(url, accessToken, clientId, clientSecret)
				.then(data => {
					console.log('First Data:', data);
				})
				.catch(error => {
					console.log('Error:', error);
					document.getElementById("getall").innerText = `Get All Products`;
				});

			return data;
		} else {
			document.getElementById("getall").innerHTML = `Get All Products`;
			throw new Error('Failed to fetch data');
		}
}

async function fetchDataRepeatedly(url, accessToken, clientId, clientSecret) {
    let nextUrl = url;
    let responseData;
    // const responseData;

    // Continue fetching data until there is no next URL
    while (nextUrl) {
        // Call the fetchResponseData function
        responseData = await fetchResponseData(nextUrl, accessToken, clientId, clientSecret);
        // console.log('Repeative New Data:', responseData);

        if (responseData) {
            	nextUrl = responseData;
				// console.log("nextURL: ",nextUrl);

				if(responseData == "https://pim.groep-e.be/api/rest/v1/products?page=50&with_count=false&pagination_type=page&limit=10"){
					document.getElementById("loadmsg").innerHTML = '10% Uploaded';
					document.getElementById("loadmsg").style.display = "block";
				}
				else if(responseData == "https://pim.groep-e.be/api/rest/v1/products?page=400&with_count=false&pagination_type=page&limit=10"){
					document.getElementById("loadmsg").innerHTML = '50% Uploaded';
					document.getElementById("loadmsg").style.display = "block";
				}
				else if(responseData == "https://pim.groep-e.be/api/rest/v1/products?page=800&with_count=false&pagination_type=page&limit=10"){
					document.getElementById("loadmsg").innerHTML = '90% Uploaded';
					document.getElementById("loadmsg").style.display = "block";
				}

        } else {
			console.log('Data Pagination Reached!');
			document.getElementById("getall").innerText = `Get All Products`;
			document.getElementById("successmsg").style.display = "block";
            nextUrl = null;
        }
    }

    return responseData;
}

async function fetchResponseData(url, accessToken, clientId, clientSecret) {
		const newurl = `${url}&client_id=${clientId}&client_secret=${clientSecret}`;

		const response = await fetch(newurl, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`
			},
			withCredentials: true,
			crossorigin: true
		});

		if (response.ok) {
			const data = await response.json();
			const items = data._embedded.items;

			for (const item of items) {
				// eachdata.push(item.identifier);
				const identifier = item.identifier;
				const brand = item.values.merk?.[0]?.data ?? null;
				const image_link = item.values.Productfoto?.[0]?.data ?? null;
				const price_carbomat = item.values.inkoopprijs_carbomat?.[0]?.data ?? null;
				const stock = item.values.Stock?.[0]?.data ?? null;
				const carbomate_id = item.values.Carbomat_ID?.[0]?.data ?? null;
				const profit_eshock = item.values.Winstpercentage_totaal?.[0]?.data ?? null;
				const profit_zp = item.values.Winstpercentage_totaal?.[1]?.data ?? null;
				const price_eshock = item.values.prijs?.[0]?.data?.[0]?.amount ?? null;
				const price_zp = item.values.prijs?.[1]?.data?.[0]?.amount ?? null;
				const jsonData = {identifier: identifier, brand: brand, image_link: image_link, price_carbomat: price_carbomat, stock: stock, carbomate_id: carbomate_id, profit_eshock: profit_eshock, profit_zp: profit_zp, price_eshock: price_eshock, price_zp: price_zp};
				sendDataToBackend(jsonData);
				// console.log("ALL RESPONSE: ",jsonData);
			}

			return data._links.next.href;
		}

		if (!response.ok) {
			const data = await response.json();
			const message = data.message;

			if(message.includes("You have reached the maximum number of pages")){
				console.log('Data Pagination Reached!');
				document.getElementById("getall").innerText = `Get All Products`;
				document.getElementById("successmsg").style.display = "block";
				document.getElementById("loadmsg").style.display = "none";
			}
			else{
				document.getElementById("errormsg").style.display = "block";
				document.getElementById("getall").innerText = `Get All Products`;
			}
		}

		return response.json();
}

async function sendDataToBackend(data) {
		try {
			const response = await api.post('/akeneoproducts', {
				identifier: data.identifier,
				brand: data.brand,
				image_link: data.image_link,
				price_carbomat: data.price_carbomat,
				stock: data.stock,
				carbomate_id: data.carbomate_id,
				profit_eshock: data.profit_eshock,
				profit_zp: data.profit_zp,
				price_eshock: data.price_eshock,
				price_zp: data.price_zp,
			});

			if (response) {
				console.log('Data sent to backend successfully');
				// document.getElementById("getall").innerText = `Get All Products`;
				// document.getElementById("successmsg").style.display = "block";
			} else {
				console.log('Failed to send data to backend');
				document.getElementById("errormsg").style.display = "block";
				document.getElementById("getall").innerHTML = `Get All Products`;
			}
		} catch (error) {
			console.log('Error sending data to backend:', error);
			document.getElementById("errormsg").style.display = "block";
			document.getElementById("getall").innerHTML = `Get All Products`;
		}
}

function getall() {
	const element = document.getElementById("getall");

	if (element) {
		element.innerText = `Fetching All Products...`;

		fetchData('https://pim.groep-e.be/api/oauth/v1/token', { grant_type:"password", username:"bricke_1125", password:"256a6154c", client_id: "4_5x9b008ra78k4oogoskwc8kswoo8g8sgc40ccs0skwwck04wc8", client_secret: "1uhdfg69ppdwoocwssc40gk08gsc084c80osocwcgsk44w44wc" })
			.then((data: any) => {
				console.log('Data:', data);
			})
			.catch((error: any) => {
				console.error('Error:', error);
				const errorblk = document.getElementById("errormsg");

				if (errorblk) {
					errorblk.style.display = "block";
				}
			});
	} else {
		alert("Element with ID 'getall' was not found.");
	}
}

async function mappingakeneo() {
console.log("I'm clicked!");

	try {
			const response = await api.get('/mappingakeneo');

			if (response) {
				console.log("response: ",response);
				console.log('Data sent to backend successfully');
				document.getElementById("successmsg").style.display = "block";
			} else {
				console.log('Failed to send data to backend');
				document.getElementById("errormsg").style.display = "block";
				document.getElementById("mappingakeneo").innerHTML = `Re-Sync Products`;
			}
		} catch (error) {
			console.log('Error sending data to backend:', error);
			document.getElementById("errormsg").style.display = "block";
			document.getElementById("mappingakeneo").innerHTML = `Re-Sync Products`;
		}
}


const fieldsWritable = useSync(props, 'fields', emit);

const { getFromAliasedItem } = useAliasFields(fieldsWritable, collection);

function addField(fieldKey: string) {
	fieldsWritable.value = [...fieldsWritable.value, fieldKey];
}

function removeField(fieldKey: string) {
	fieldsWritable.value = fieldsWritable.value.filter((field) => field !== fieldKey);
}
</script>

<template>
	<div class="layout-tabular">
		<div style="text-align: right; margin-right: 3rem;">
			<!-- <div class="v-button"><a href="/admin/content/get_akeneo_products/+" class="button align-center normal" type="button" disabled="false"><span class="content" :class="{ invisible: loading }">Create Item</span>
				<div class="spinner"><slot v-if="loading" name="loading">
					<v-progress-circular :x-small="xSmall" :small="small" indeterminate />
				</slot>
				</div>
			</a></div> -->
			<div v-show="showAkeneoBtn" id="akeneoprbtn" data-v-28d526fe="" data-v-8be53c59="" class="v-button"><a data-v-28d526fe="" class="button align-center normal" disabled="false" @click="getall"><span id="getall" data-v-28d526fe="" class="content">Get All Products</span><div data-v-28d526fe="" class="spinner"><!--v-if--></div></a></div>
			<div v-show="showMappingBtn" id="mappingakeneobtn" data-v-28d526fe="" data-v-8be53c59="" class="v-button"><a data-v-28d526fe="" class="button align-center normal" disabled="false" @click="mappingakeneo"><span id="mappingakeneo" data-v-28d526fe="" class="content">Re-Sync Products</span><div data-v-28d526fe="" class="spinner"><!--v-if--></div></a></div>
			<br />
			<h3 id="loadmsg" class="card-title mb-1 mt-3" style="color: black; display: none;">All Products have been uploaded Successfully!</h3>
			<h3 id="errormsg" class="card-title mb-1 mt-3" style="color: red; display: none;">Unfortunately! Something Went Wrong.</h3>
			<h3 id="successmsg" class="card-title mb-1 mt-3" style="color: green; display: none;">All Products have been uploaded Successfully!</h3>
		</div>
		<v-table
			v-if="loading || (itemCount && itemCount > 0 && !error)"
			ref="table"
			v-model="selectionWritable"
			v-model:headers="tableHeadersWritable"
			class="table"
			fixed-header
			:show-select="showSelect ? showSelect : selection !== undefined"
			show-resize
			must-sort
			:sort="tableSort"
			:items="items"
			:loading="loading"
			:row-height="tableRowHeight"
			:item-key="primaryKeyField?.field"
			:show-manual-sort="sortAllowed"
			:manual-sort-key="sortField"
			allow-header-reorder
			selection-use-keys
			@click:row="onRowClick"
			@update:sort="onSortChange"
			@manual-sort="changeManualSort"
		>
			<template v-for="header in tableHeaders" :key="header.value" #[`item.${header.value}`]="{ item }">
				<render-display
					:value="getFromAliasedItem(item, header.value)"
					:display="header.field.display"
					:options="header.field.displayOptions"
					:interface="header.field.interface"
					:interface-options="header.field.interfaceOptions"
					:type="header.field.type"
					:collection="header.field.collection"
					:field="header.field.field"
				/>
			</template>

			<template #header-context-menu="{ header }">
				<v-list>
					<v-list-item
						:disabled="!header.sortable"
						:active="tableSort?.by === header.value && tableSort?.desc === false"
						clickable
						@click="onSortChange({ by: header.value, desc: false })"
					>
						<v-list-item-icon>
							<v-icon name="sort" class="flip" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t('sort_asc') }}
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						:active="tableSort?.by === header.value && tableSort?.desc === true"
						:disabled="!header.sortable"
						clickable
						@click="onSortChange({ by: header.value, desc: true })"
					>
						<v-list-item-icon>
							<v-icon name="sort" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t('sort_desc') }}
						</v-list-item-content>
					</v-list-item>

					<v-divider />

					<v-list-item :active="header.align === 'left'" clickable @click="onAlignChange?.(header.value, 'left')">
						<v-list-item-icon>
							<v-icon name="format_align_left" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t('left_align') }}
						</v-list-item-content>
					</v-list-item>
					<v-list-item :active="header.align === 'center'" clickable @click="onAlignChange?.(header.value, 'center')">
						<v-list-item-icon>
							<v-icon name="format_align_center" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t('center_align') }}
						</v-list-item-content>
					</v-list-item>
					<v-list-item :active="header.align === 'right'" clickable @click="onAlignChange?.(header.value, 'right')">
						<v-list-item-icon>
							<v-icon name="format_align_right" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t('right_align') }}
						</v-list-item-content>
					</v-list-item>

					<v-divider />

					<v-list-item :active="header.align === 'right'" clickable @click="removeField(header.value)">
						<v-list-item-icon>
							<v-icon name="remove" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t('hide_field') }}
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</template>

			<template #header-append>
				<v-menu placement="bottom-end" show-arrow :close-on-content-click="false">
					<template #activator="{ toggle, active }">
						<v-icon
							v-tooltip="t('add_field')"
							class="add-field"
							name="add"
							:class="{ active }"
							clickable
							@click="toggle"
						/>
					</template>

					<v-field-list
						:collection="collection"
						:disabled-fields="fields"
						:allow-select-all="false"
						@add="addField($event[0])"
					/>
				</v-menu>
			</template>

			<template #footer>
				<div class="footer">
					<div class="pagination">
						<v-pagination
							v-if="totalPages > 1"
							:length="totalPages"
							:total-visible="7"
							show-first-last
							:model-value="page"
							@update:model-value="toPage"
						/>
					</div>

					<div v-if="loading === false && (items.length >= 25 || limit < 25)" class="per-page">
						<span>{{ t('per_page') }}</span>
						<v-select
							:model-value="`${limit}`"
							:items="pageSizes"
							inline
							@update:model-value="limitWritable = +$event"
						/>
					</div>
				</div>
			</template>
		</v-table>

		<v-info v-else-if="error" type="danger" :title="t('unexpected_error')" icon="error" center>
			{{ t('unexpected_error_copy') }}

			<template #append>
				<v-error :error="error" />

				<v-button small class="reset-preset" @click="resetPresetAndRefresh">
					{{ t('reset_page_preferences') }}
				</v-button>
			</template>
		</v-info>

		<slot v-else-if="itemCount === 0 && (filterUser || search)" name="no-results" />
		<slot v-else-if="itemCount === 0" name="no-items" />
	</div>
</template>

<style lang="scss" scoped>
.layout-tabular {
	display: contents;
	margin: var(--content-padding);
	margin-bottom: var(--content-padding-bottom);
}

.v-table {
	--v-table-sticky-offset-top: var(--layout-offset-top);

	display: contents;

	& > :deep(table) {
		min-width: calc(100% - var(--content-padding)) !important;
		margin-left: var(--content-padding);

		tr {
			margin-right: var(--content-padding);
		}
	}
}

.footer {
	position: sticky;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 32px var(--content-padding);

	.pagination {
		display: inline-block;
	}

	.per-page {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		width: 240px;
		color: var(--theme--foreground-subdued);

		span {
			width: auto;
			margin-right: 4px;
		}

		.v-select {
			color: var(--theme--foreground);
		}
	}
}

.reset-preset {
	margin-top: 24px;
}

.add-field {
	--v-icon-color-hover: var(--theme--foreground);

	&.active {
		--v-icon-color: var(--theme--foreground);
	}
}

.flip {
	transform: scaleY(-1);
}
</style>
